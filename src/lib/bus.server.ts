/**
 * Server-only bus platform internals: operator context + RBAC enforcement,
 * audit logging, seat layout generation, schedule publishing with conflict
 * detection, the bus fare engine, the seat-hold/booking lifecycle and revenue
 * aggregation. Never import this from client-reachable module scope.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  canTransitionBusBooking,
  canTransitionSchedule,
  cancellationFeePercent,
  canWrite,
  COMMITTED_BOOKING_STATUSES,
  DEFAULT_TAX_PERCENT,
  MAX_SEATS_PER_BOOKING,
  SEAT_HOLD_SECONDS,
  type BusBookingStatus,
  type BusFareSnapshot,
  type OperatorModule,
  type OperatorRole,
  type ScheduleStatus,
  type SeatType,
} from "./bus-shared";

export function busError(code: string, detail?: string): Error {
  if (detail) console.error(`[bus] ${code}: ${detail}`);
  return new Error(code);
}

export const db = () => supabaseAdmin;

// ---------------------------------------------------------------- operator context

export type OperatorContext = {
  operatorId: string;
  role: OperatorRole;
  status: string;
  businessName: string;
  staffId: string;
  userId: string;
};

/** Resolves the caller's operator membership. Never trusts client input. */
export async function operatorContext(userId: string): Promise<OperatorContext> {
  const { data, error } = await supabaseAdmin
    .from("operator_staff")
    .select("id, role, operator_id, is_active, bus_operators!inner(id, status, business_name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw busError("NOT_FOUND", error.message);
  if (!data) throw busError("OPERATOR_NOT_FOUND");
  const operator = data.bus_operators as unknown as { id: string; status: string; business_name: string };
  return {
    operatorId: data.operator_id,
    role: data.role as OperatorRole,
    status: operator.status,
    businessName: operator.business_name,
    staffId: data.id,
    userId,
  };
}

/** Read access: allowed while pending/suspended so the operator can see status. */
export function requireView(ctx: OperatorContext, module: OperatorModule) {
  if (!canView(ctx.role, module)) throw busError("FORBIDDEN");
}

/** Write access: role permission plus an ACTIVE operator account. */
export function requireWrite(ctx: OperatorContext, module: OperatorModule) {
  if (!canWrite(ctx.role, module)) throw busError("FORBIDDEN");
  if (ctx.status !== "ACTIVE") throw busError("OPERATOR_NOT_ACTIVE");
}

export async function audit(
  ctx: OperatorContext,
  action: string,
  objectType: string,
  objectId: string | null,
  metadata: Record<string, unknown> = {},
  result = "SUCCESS",
) {
  await supabaseAdmin.from("operator_audit_logs").insert({
    operator_id: ctx.operatorId,
    actor_user_id: ctx.userId,
    actor_role: ctx.role,
    action,
    object_type: objectType,
    object_id: objectId,
    result,
    metadata: metadata as never,
  });
}

export async function notifyOperator(
  operatorId: string,
  category: "BOOKINGS" | "TRIPS" | "FINANCE" | "SYSTEM",
  title: string,
  body: string,
  linkPath?: string,
) {
  await supabaseAdmin.from("operator_notifications").insert({
    operator_id: operatorId,
    category,
    title,
    body,
    link_path: linkPath ?? null,
  });
}

/** Ownership guard: a row must belong to the caller's operator. */
export async function ownedRow<T extends Record<string, unknown>>(
  table:
    | "buses"
    | "bus_drivers"
    | "bus_routes"
    | "bus_stops"
    | "bus_schedules"
    | "bus_discounts"
    | "bus_bookings"
    | "bus_settlements",
  id: string,
  operatorId: string,
  columns = "*",
): Promise<T> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns)
    .eq("id", id)
    .eq("operator_id", operatorId)
    .maybeSingle();
  if (error) throw busError("NOT_FOUND", error.message);
  if (!data) throw busError("NOT_FOUND");
  return data as unknown as T;
}

// ---------------------------------------------------------------- seat layout

export type SeatLayoutSpec = {
  rows: number;
  columnsPerRow: number;
  decks: number;
  seatType: SeatType;
  aisleAfterColumn: number;
  fareMultiplierUpper?: number;
};

export type GeneratedSeat = {
  seat_code: string;
  deck: number;
  row_index: number;
  column_index: number;
  seat_type: SeatType;
  fare_multiplier: number;
};

const COLUMN_LETTERS = "ABCDEF";

/** Deterministic seat identifiers; duplicates are impossible by construction. */
export function generateSeatLayout(spec: SeatLayoutSpec, capacity: number): GeneratedSeat[] {
  const seats: GeneratedSeat[] = [];
  for (let deck = 1; deck <= spec.decks; deck += 1) {
    for (let row = 1; row <= spec.rows; row += 1) {
      for (let col = 1; col <= spec.columnsPerRow; col += 1) {
        const letter = COLUMN_LETTERS[col - 1] ?? String(col);
        const seatType: SeatType =
          spec.seatType === "SEATER" ? "SEATER" : deck === 2 ? "SLEEPER_UPPER" : "SLEEPER_LOWER";
        seats.push({
          seat_code: `${deck > 1 ? `U` : `L`}${row}${letter}`,
          deck,
          row_index: row,
          column_index: col,
          seat_type: spec.seatType === "SEATER" ? "SEATER" : seatType,
          fare_multiplier: seatType === "SLEEPER_UPPER" ? (spec.fareMultiplierUpper ?? 1) : 1,
        });
      }
    }
  }
  if (seats.length !== capacity) throw busError("SEAT_LAYOUT_MISMATCH", `${seats.length} vs ${capacity}`);
  return seats;
}

export async function replaceSeatLayout(busId: string, seats: GeneratedSeat[]) {
  const { data: used } = await supabaseAdmin
    .from("bus_schedule_seats")
    .select("id, bus_schedules!inner(bus_id, status)")
    .eq("bus_schedules.bus_id", busId)
    .in("state", ["BOOKED", "HELD"])
    .limit(1);
  if (used && used.length > 0) throw busError("SEAT_ALREADY_BOOKED");

  await supabaseAdmin.from("bus_seats").delete().eq("bus_id", busId);
  const { error } = await supabaseAdmin
    .from("bus_seats")
    .insert(seats.map((seat) => ({ ...seat, bus_id: busId })));
  if (error) throw busError("SEAT_LAYOUT_MISMATCH", error.message);
}

// ---------------------------------------------------------------- schedules

/** Overlap check for bus and driver across non-terminal schedules. */
export async function assertNoScheduleConflict(params: {
  operatorId: string;
  busId: string;
  driverId: string | null;
  departureAt: string;
  arrivalAt: string;
  excludeScheduleId?: string;
}) {
  if (new Date(params.arrivalAt) <= new Date(params.departureAt)) {
    throw busError("SCHEDULE_CONFLICT", "arrival before departure");
  }
  let query = supabaseAdmin
    .from("bus_schedules")
    .select("id, bus_id, driver_id, departure_at, arrival_estimate_at")
    .eq("operator_id", params.operatorId)
    .in("status", ["DRAFT", "SCHEDULED", "BOARDING", "DEPARTED", "SUSPENDED"])
    .lt("departure_at", params.arrivalAt)
    .gt("arrival_estimate_at", params.departureAt);
  if (params.excludeScheduleId) query = query.neq("id", params.excludeScheduleId);
  const { data, error } = await query;
  if (error) throw busError("SCHEDULE_CONFLICT", error.message);
  for (const row of data ?? []) {
    if (row.bus_id === params.busId) throw busError("SCHEDULE_CONFLICT");
    if (params.driverId && row.driver_id === params.driverId) throw busError("DRIVER_CONFLICT");
  }
}

/**
 * Publishes a DRAFT schedule: snapshots the route stops and the bus seat
 * layout onto the trip so later route/price edits cannot rewrite history.
 */
export async function publishSchedule(ctx: OperatorContext, scheduleId: string) {
  const schedule = await ownedRow<{
    id: string;
    bus_id: string;
    route_id: string;
    driver_id: string | null;
    status: ScheduleStatus;
    departure_at: string;
    arrival_estimate_at: string;
    base_fare: number;
  }>("bus_schedules", scheduleId, ctx.operatorId);

  if (schedule.status !== "DRAFT") throw busError("INVALID_TRANSITION");
  if (!canTransitionSchedule(schedule.status, "SCHEDULED")) throw busError("INVALID_TRANSITION");

  const [{ data: bus }, { data: route }, { data: routeStops }, { data: seats }] = await Promise.all([
    supabaseAdmin.from("buses").select("id, status, seating_capacity").eq("id", schedule.bus_id).single(),
    supabaseAdmin.from("bus_routes").select("id, status").eq("id", schedule.route_id).single(),
    supabaseAdmin
      .from("bus_route_stops")
      .select("sequence, minutes_from_start, pickup_enabled, drop_enabled, is_active, bus_stops!inner(id, name, city, address, latitude, longitude)")
      .eq("route_id", schedule.route_id)
      .eq("is_active", true)
      .order("sequence"),
    supabaseAdmin.from("bus_seats").select("*").eq("bus_id", schedule.bus_id).eq("is_active", true).order("seat_code"),
  ]);

  if (!bus || bus.status !== "ACTIVE") throw busError("BUS_NOT_BOOKABLE");
  if (!route || route.status !== "ACTIVE") throw busError("ROUTE_NOT_READY");
  if (!routeStops || routeStops.length < 2) throw busError("ROUTE_NOT_READY");
  if (!seats || seats.length === 0) throw busError("SEAT_LAYOUT_MISMATCH");
  if (Number(schedule.base_fare) <= 0) throw busError("DISCOUNT_INVALID", "fare must be positive");

  await assertNoScheduleConflict({
    operatorId: ctx.operatorId,
    busId: schedule.bus_id,
    driverId: schedule.driver_id,
    departureAt: schedule.departure_at,
    arrivalAt: schedule.arrival_estimate_at,
    excludeScheduleId: schedule.id,
  });

  const departure = new Date(schedule.departure_at).getTime();
  await supabaseAdmin.from("bus_schedule_stops").delete().eq("schedule_id", scheduleId);
  const stopRows = routeStops.map((row) => {
    const stop = row.bus_stops as unknown as {
      id: string; name: string; city: string; address: string | null; latitude: number; longitude: number;
    };
    return {
      schedule_id: scheduleId,
      stop_id: stop.id,
      sequence: row.sequence,
      stop_name: stop.name,
      city: stop.city,
      address: stop.address,
      latitude: stop.latitude,
      longitude: stop.longitude,
      scheduled_at: new Date(departure + row.minutes_from_start * 60000).toISOString(),
      pickup_enabled: row.pickup_enabled,
      drop_enabled: row.drop_enabled,
    };
  });
  const stopsInsert = await supabaseAdmin.from("bus_schedule_stops").insert(stopRows);
  if (stopsInsert.error) throw busError("ROUTE_NOT_READY", stopsInsert.error.message);

  await supabaseAdmin.from("bus_schedule_seats").delete().eq("schedule_id", scheduleId);
  const seatRows = seats.map((seat) => ({
    schedule_id: scheduleId,
    seat_id: seat.id,
    seat_code: seat.seat_code,
    seat_type: seat.seat_type,
    deck: seat.deck,
    row_index: seat.row_index,
    column_index: seat.column_index,
    fare: Number((Number(schedule.base_fare) * Number(seat.fare_multiplier)).toFixed(2)),
    state: "AVAILABLE" as const,
  }));
  const seatInsert = await supabaseAdmin.from("bus_schedule_seats").insert(seatRows);
  if (seatInsert.error) throw busError("SEAT_LAYOUT_MISMATCH", seatInsert.error.message);

  const { error } = await supabaseAdmin
    .from("bus_schedules")
    .update({ status: "SCHEDULED", total_seats: seatRows.length, published_at: new Date().toISOString() })
    .eq("id", scheduleId)
    .eq("status", "DRAFT");
  if (error) throw busError("INVALID_TRANSITION", error.message);

  await audit(ctx, "SCHEDULE_PUBLISHED", "bus_schedule", scheduleId, { seats: seatRows.length });
  await notifyOperator(ctx.operatorId, "TRIPS", "Schedule published", `Trip on ${schedule.departure_at} is now live.`, `/operator/schedules/${scheduleId}`);
  return { seats: seatRows.length, stops: stopRows.length };
}

export async function setScheduleStatus(ctx: OperatorContext, scheduleId: string, next: ScheduleStatus, reason?: string) {
  const schedule = await ownedRow<{ id: string; status: ScheduleStatus }>("bus_schedules", scheduleId, ctx.operatorId);
  if (!canTransitionSchedule(schedule.status, next)) throw busError("INVALID_TRANSITION");

  if (next === "CANCELLED") return cancelSchedule(ctx, scheduleId, reason ?? "Cancelled by operator");

  const { error } = await supabaseAdmin
    .from("bus_schedules")
    .update({ status: next })
    .eq("id", scheduleId)
    .eq("status", schedule.status);
  if (error) throw busError("INVALID_TRANSITION", error.message);

  if (next === "COMPLETED") {
    await supabaseAdmin
      .from("bus_bookings")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("schedule_id", scheduleId)
      .eq("status", "CONFIRMED");
  }
  await audit(ctx, `SCHEDULE_${next}`, "bus_schedule", scheduleId, { reason: reason ?? null });
  return { status: next };
}

/** Controlled trip cancellation: cancels bookings, refunds and ledger entries. */
export async function cancelSchedule(ctx: OperatorContext, scheduleId: string, reason: string) {
  const schedule = await ownedRow<{ id: string; status: ScheduleStatus }>("bus_schedules", scheduleId, ctx.operatorId);
  if (!canTransitionSchedule(schedule.status, "CANCELLED")) throw busError("INVALID_TRANSITION");

  const { data: bookings } = await supabaseAdmin
    .from("bus_bookings")
    .select("id, total_amount, status, customer_id")
    .eq("schedule_id", scheduleId)
    .in("status", COMMITTED_BOOKING_STATUSES);

  await supabaseAdmin.from("bus_schedules").update({ status: "CANCELLED", cancelled_reason: reason }).eq("id", scheduleId);

  for (const booking of bookings ?? []) {
    const refund = Number(booking.total_amount);
    await supabaseAdmin
      .from("bus_bookings")
      .update({
        status: "REFUND_PENDING",
        payment_status: "REFUNDED",
        cancellation_reason: `Trip cancelled: ${reason}`,
        cancellation_fee: 0,
        refund_amount: refund,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    await supabaseAdmin.from("bus_ledger_entries").insert({
      operator_id: ctx.operatorId,
      booking_id: booking.id,
      schedule_id: scheduleId,
      entry_type: "REFUND",
      amount: -refund,
      description: "Operator trip cancellation refund",
    });
    await supabaseAdmin.from("bus_passengers").update({ boarding_status: "CANCELLED" }).eq("booking_id", booking.id);
  }

  await supabaseAdmin
    .from("bus_schedule_seats")
    .update({ state: "UNAVAILABLE", hold_id: null, hold_expires_at: null })
    .eq("schedule_id", scheduleId);

  await audit(ctx, "SCHEDULE_CANCELLED", "bus_schedule", scheduleId, {
    reason,
    affectedBookings: bookings?.length ?? 0,
  });
  await notifyOperator(ctx.operatorId, "TRIPS", "Trip cancelled", `${bookings?.length ?? 0} booking(s) moved to refund.`, `/operator/schedules/${scheduleId}`);
  return { affectedBookings: bookings?.length ?? 0 };
}

// ---------------------------------------------------------------- fare engine

export async function priceSeats(params: {
  scheduleId: string;
  seatCodes: string[];
  discountCode?: string | null;
  customerId: string;
}): Promise<{ snapshot: BusFareSnapshot; operatorId: string }> {
  if (params.seatCodes.length === 0 || params.seatCodes.length > MAX_SEATS_PER_BOOKING) {
    throw busError("SEAT_UNAVAILABLE", "invalid seat count");
  }
  const { data: schedule, error } = await supabaseAdmin
    .from("bus_schedules")
    .select("id, operator_id, base_fare, currency, route_id, status, booking_closes_at")
    .eq("id", params.scheduleId)
    .maybeSingle();
  if (error || !schedule) throw busError("NOT_FOUND");
  if (schedule.status !== "SCHEDULED" && schedule.status !== "BOARDING") throw busError("BOOKING_CLOSED");
  if (new Date(schedule.booking_closes_at) < new Date()) throw busError("BOOKING_CLOSED");

  const { data: seats } = await supabaseAdmin
    .from("bus_schedule_seats")
    .select("seat_code, seat_type, fare, state")
    .eq("schedule_id", params.scheduleId)
    .in("seat_code", params.seatCodes);
  if (!seats || seats.length !== params.seatCodes.length) throw busError("SEAT_UNAVAILABLE");

  const seatLines = seats.map((seat) => ({
    seatCode: seat.seat_code,
    seatType: seat.seat_type as SeatType,
    fare: Number(seat.fare),
  }));
  const seatTotal = Number(seatLines.reduce((sum, seat) => sum + seat.fare, 0).toFixed(2));

  let discountAmount = 0;
  let discountCode: string | null = null;
  if (params.discountCode) {
    const code = params.discountCode.trim().toUpperCase();
    const { data: discount } = await supabaseAdmin
      .from("bus_discounts")
      .select("*")
      .eq("operator_id", schedule.operator_id)
      .eq("code", code)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!discount) throw busError("DISCOUNT_INVALID");
    const now = new Date();
    if (new Date(discount.starts_at) > now) throw busError("DISCOUNT_INVALID");
    if (discount.ends_at && new Date(discount.ends_at) < now) throw busError("DISCOUNT_INVALID");
    if (discount.route_id && discount.route_id !== schedule.route_id) throw busError("DISCOUNT_INVALID");
    if (seatTotal < Number(discount.min_booking_amount)) throw busError("DISCOUNT_INVALID");
    if (discount.usage_limit != null && discount.used_count >= discount.usage_limit) throw busError("DISCOUNT_INVALID");

    const { count } = await supabaseAdmin
      .from("bus_bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", params.customerId)
      .eq("discount_code", code)
      .in("status", COMMITTED_BOOKING_STATUSES);
    if ((count ?? 0) >= discount.per_user_limit) throw busError("DISCOUNT_INVALID");

    discountAmount =
      discount.discount_type === "PERCENT"
        ? (seatTotal * Number(discount.value)) / 100
        : Number(discount.value);
    if (discount.max_discount_amount != null) {
      discountAmount = Math.min(discountAmount, Number(discount.max_discount_amount));
    }
    discountAmount = Number(Math.min(discountAmount, seatTotal).toFixed(2));
    discountCode = code;
  }

  const taxable = seatTotal - discountAmount;
  const taxAmount = Number(((taxable * DEFAULT_TAX_PERCENT) / 100).toFixed(2));
  const total = Number((taxable + taxAmount).toFixed(2));

  return {
    operatorId: schedule.operator_id,
    snapshot: {
      baseFare: Number(schedule.base_fare),
      seats: seatLines,
      seatTotal,
      discountCode,
      discountAmount,
      taxPercent: DEFAULT_TAX_PERCENT,
      taxAmount,
      total,
      currency: schedule.currency,
      capturedAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------- booking flow

function pnr(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "WW";
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function releaseExpiredHolds() {
  const { error } = await supabaseAdmin.rpc("release_expired_bus_holds");
  if (error) console.error("[bus] hold release failed", error.message);
}

/** Atomic hold via the transactional SQL function. */
export async function holdSeats(scheduleId: string, seatCodes: string[], holdId: string) {
  const { error } = await supabaseAdmin.rpc("hold_bus_seats", {
    _schedule_id: scheduleId,
    _seat_codes: seatCodes,
    _hold_id: holdId,
    _ttl_seconds: SEAT_HOLD_SECONDS,
  });
  if (error) throw busError("SEAT_UNAVAILABLE", error.message);
}

export async function assertBookingTransition(bookingId: string, next: BusBookingStatus) {
  const { data } = await supabaseAdmin.from("bus_bookings").select("status").eq("id", bookingId).maybeSingle();
  if (!data) throw busError("NOT_FOUND");
  if (!canTransitionBusBooking(data.status as BusBookingStatus, next)) throw busError("INVALID_TRANSITION");
  return data.status as BusBookingStatus;
}

export async function commitBooking(bookingId: string, paymentReference: string) {
  const { data: booking } = await supabaseAdmin
    .from("bus_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw busError("NOT_FOUND");
  if (booking.status === "CONFIRMED") return { alreadyConfirmed: true, pnr: booking.pnr };
  if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) throw busError("HOLD_EXPIRED");
  if (!canTransitionBusBooking(booking.status as BusBookingStatus, "CONFIRMED")) throw busError("INVALID_TRANSITION");

  // Idempotency: the payment reference is unique, so a duplicate callback
  // cannot confirm twice.
  const { data: confirmed, error } = await supabaseAdmin
    .from("bus_bookings")
    .update({
      status: "CONFIRMED",
      payment_status: "PAID",
      payment_reference: paymentReference,
      confirmed_at: new Date().toISOString(),
      hold_expires_at: null,
    })
    .eq("id", bookingId)
    .in("status", ["SEAT_HELD", "PAYMENT_PENDING"])
    .select("id, pnr, total_amount, discount_amount, tax_amount, seat_total, operator_id, schedule_id, discount_code")
    .maybeSingle();
  if (error) throw busError("PAYMENT_ALREADY_SETTLED", error.message);
  if (!confirmed) throw busError("PAYMENT_ALREADY_SETTLED");

  await supabaseAdmin
    .from("bus_schedule_seats")
    .update({ state: "BOOKED", booking_id: bookingId, hold_id: null, hold_expires_at: null })
    .eq("schedule_id", confirmed.schedule_id)
    .eq("booking_id", bookingId);

  const { data: operator } = await supabaseAdmin
    .from("bus_operators")
    .select("commission_percent")
    .eq("id", confirmed.operator_id)
    .single();
  const commission = Number(
    ((Number(confirmed.seat_total) - Number(confirmed.discount_amount)) * Number(operator?.commission_percent ?? 10) / 100).toFixed(2),
  );

  await supabaseAdmin.from("bus_ledger_entries").insert([
    { operator_id: confirmed.operator_id, booking_id: bookingId, schedule_id: confirmed.schedule_id, entry_type: "BOOKING", amount: Number(confirmed.seat_total), description: "Ticket sales" },
    ...(Number(confirmed.discount_amount) > 0
      ? [{ operator_id: confirmed.operator_id, booking_id: bookingId, schedule_id: confirmed.schedule_id, entry_type: "DISCOUNT" as const, amount: -Number(confirmed.discount_amount), description: `Discount ${confirmed.discount_code ?? ""}`.trim() }]
      : []),
    ...(Number(confirmed.tax_amount) > 0
      ? [{ operator_id: confirmed.operator_id, booking_id: bookingId, schedule_id: confirmed.schedule_id, entry_type: "TAX" as const, amount: Number(confirmed.tax_amount), description: "Taxes & fees collected" }]
      : []),
    { operator_id: confirmed.operator_id, booking_id: bookingId, schedule_id: confirmed.schedule_id, entry_type: "COMMISSION", amount: -commission, description: "WayneWay platform commission" },
  ]);

  if (confirmed.discount_code) {
    const { data: discount } = await supabaseAdmin
      .from("bus_discounts")
      .select("id, used_count")
      .eq("operator_id", confirmed.operator_id)
      .eq("code", confirmed.discount_code)
      .maybeSingle();
    if (discount) {
      await supabaseAdmin.from("bus_discounts").update({ used_count: discount.used_count + 1 }).eq("id", discount.id);
    }
  }

  await notifyOperator(
    confirmed.operator_id,
    "BOOKINGS",
    "New booking confirmed",
    `PNR ${confirmed.pnr} — ${confirmed.total_amount}`,
    `/operator/bookings/${bookingId}`,
  );
  return { alreadyConfirmed: false, pnr: confirmed.pnr };
}

export async function computeCancellation(bookingId: string) {
  const { data: booking } = await supabaseAdmin
    .from("bus_bookings")
    .select("id, total_amount, status, schedule_id, bus_schedules!inner(departure_at)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw busError("NOT_FOUND");
  const departure = new Date((booking.bus_schedules as unknown as { departure_at: string }).departure_at);
  const hours = (departure.getTime() - Date.now()) / 3_600_000;
  const feePercent = cancellationFeePercent(Math.max(0, hours));
  const fee = Number(((Number(booking.total_amount) * feePercent) / 100).toFixed(2));
  return {
    feePercent,
    fee,
    refund: Number((Number(booking.total_amount) - fee).toFixed(2)),
    total: Number(booking.total_amount),
    hoursBeforeDeparture: Math.max(0, Number(hours.toFixed(1))),
  };
}

export async function cancelBooking(bookingId: string, actor: "CUSTOMER" | "OPERATOR", reason: string) {
  const quote = await computeCancellation(bookingId);
  const current = await assertBookingTransition(bookingId, "CANCELLED");
  if (!COMMITTED_BOOKING_STATUSES.includes(current)) throw busError("INVALID_TRANSITION");

  const { data: booking, error } = await supabaseAdmin
    .from("bus_bookings")
    .update({
      status: quote.refund > 0 ? "REFUND_PENDING" : "CANCELLED",
      payment_status: quote.refund > 0 ? "PARTIALLY_REFUNDED" : "PAID",
      cancellation_reason: reason,
      cancellation_fee: quote.fee,
      refund_amount: quote.refund,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .in("status", COMMITTED_BOOKING_STATUSES)
    .select("id, operator_id, schedule_id, pnr")
    .maybeSingle();
  if (error || !booking) throw busError("INVALID_TRANSITION", error?.message);

  await supabaseAdmin
    .from("bus_schedule_seats")
    .update({ state: "AVAILABLE", booking_id: null, hold_id: null, hold_expires_at: null })
    .eq("booking_id", bookingId);
  await supabaseAdmin.from("bus_passengers").update({ boarding_status: "CANCELLED" }).eq("booking_id", bookingId);

  if (quote.refund > 0) {
    await supabaseAdmin.from("bus_ledger_entries").insert({
      operator_id: booking.operator_id,
      booking_id: bookingId,
      schedule_id: booking.schedule_id,
      entry_type: "REFUND",
      amount: -quote.refund,
      description: `${actor === "CUSTOMER" ? "Customer" : "Operator"} cancellation refund`,
    });
  }
  await notifyOperator(booking.operator_id, "BOOKINGS", "Booking cancelled", `PNR ${booking.pnr} cancelled.`, `/operator/bookings/${bookingId}`);
  return quote;
}

// ---------------------------------------------------------------- revenue

export type RevenueTotals = {
  gross: number;
  discounts: number;
  taxes: number;
  refunds: number;
  commission: number;
  adjustments: number;
  netPayable: number;
};

export function emptyRevenue(): RevenueTotals {
  return { gross: 0, discounts: 0, taxes: 0, refunds: 0, commission: 0, adjustments: 0, netPayable: 0 };
}

export async function revenueTotals(operatorId: string, from?: string, to?: string, scheduleId?: string) {
  let query = supabaseAdmin
    .from("bus_ledger_entries")
    .select("entry_type, amount, schedule_id, occurred_at")
    .eq("operator_id", operatorId);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);
  if (scheduleId) query = query.eq("schedule_id", scheduleId);
  const { data, error } = await query;
  if (error) throw busError("NOT_FOUND", error.message);

  const totals = emptyRevenue();
  for (const row of data ?? []) {
    const amount = Number(row.amount);
    if (row.entry_type === "BOOKING") totals.gross += amount;
    else if (row.entry_type === "DISCOUNT") totals.discounts += Math.abs(amount);
    else if (row.entry_type === "TAX") totals.taxes += amount;
    else if (row.entry_type === "REFUND") totals.refunds += Math.abs(amount);
    else if (row.entry_type === "COMMISSION") totals.commission += Math.abs(amount);
    else totals.adjustments += amount;
  }
  totals.netPayable = Number(
    (totals.gross - totals.discounts - totals.refunds - totals.commission + totals.adjustments).toFixed(2),
  );
  for (const key of Object.keys(totals) as (keyof RevenueTotals)[]) {
    totals[key] = Number(totals[key].toFixed(2));
  }
  return totals;
}

export { pnr as generatePnr };
