import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bookingIdSchema,
  busSearchSchema,
  cancelBusBookingSchema,
  createBusBookingSchema,
  payBookingSchema,
  scheduleIdSchema,
  seatHoldSchema,
  supportTicketSchema,
  ticketReplySchema,
} from "./bus-schemas";
import { SEAT_HOLD_SECONDS, type BusFareSnapshot, type SeatState, type SeatType } from "./bus-shared";

/** Cities that currently have published trips, for the search form. */
export const listBusCities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const B = await import("./bus.server");
    const { data } = await B.db()
      .from("bus_schedules")
      .select("bus_routes!inner(origin_city, destination_city)")
      .in("status", ["SCHEDULED", "BOARDING"])
      .gte("departure_at", new Date().toISOString());
    const cities = new Set<string>();
    for (const row of data ?? []) {
      const route = row.bus_routes as unknown as { origin_city: string; destination_city: string };
      cities.add(route.origin_city);
      cities.add(route.destination_city);
    }
    return { cities: [...cities].sort() };
  });

/** Bus search. Validation happens before anything touches inventory. */
export const searchBuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => busSearchSchema.parse(input))
  .handler(async ({ data }) => {
    const B = await import("./bus.server");
    await B.releaseExpiredHolds();

    const dayStart = new Date(`${data.date}T00:00:00`);
    const dayEnd = new Date(`${data.date}T23:59:59`);
    const { data: rows, error } = await B.db()
      .from("bus_schedules")
      .select(
        `id, departure_at, arrival_estimate_at, base_fare, currency, status, booking_closes_at, total_seats,
         buses!inner(id, name, bus_type, is_ac, amenities, seating_capacity),
         bus_routes!inner(id, name, origin_city, destination_city, distance_km),
         bus_operators!inner(id, business_name, status)`,
      )
      .in("status", ["SCHEDULED", "BOARDING"])
      .gte("departure_at", dayStart.toISOString())
      .lte("departure_at", dayEnd.toISOString())
      .order("departure_at");
    if (error) throw new Error("NOT_FOUND");

    const matches = (rows ?? []).filter((row) => {
      const route = row.bus_routes as unknown as { origin_city: string; destination_city: string };
      const bus = row.buses as unknown as { is_ac: boolean; bus_type: string };
      const operator = row.bus_operators as unknown as { status: string };
      if (operator.status !== "ACTIVE") return false;
      if (route.origin_city.toLowerCase() !== data.originCity.toLowerCase()) return false;
      if (route.destination_city.toLowerCase() !== data.destinationCity.toLowerCase()) return false;
      if (data.acOnly && !bus.is_ac) return false;
      if (data.sleeperOnly && !/sleeper/i.test(bus.bus_type)) return false;
      if (data.maxPrice != null && Number(row.base_fare) > data.maxPrice) return false;
      if (new Date(row.booking_closes_at) < new Date()) return false;
      return true;
    });

    const seatCounts = new Map<string, number>();
    if (matches.length > 0) {
      const { data: seats } = await B.db()
        .from("bus_schedule_seats")
        .select("schedule_id, state")
        .in("schedule_id", matches.map((row) => row.id));
      for (const seat of seats ?? []) {
        if (seat.state === "AVAILABLE") {
          seatCounts.set(seat.schedule_id, (seatCounts.get(seat.schedule_id) ?? 0) + 1);
        }
      }
    }

    const results = matches.map((row) => {
      const bus = row.buses as unknown as {
        id: string; name: string; bus_type: string; is_ac: boolean; amenities: string[]; seating_capacity: number;
      };
      const route = row.bus_routes as unknown as { id: string; name: string; origin_city: string; destination_city: string; distance_km: number | null };
      const operator = row.bus_operators as unknown as { id: string; business_name: string };
      return {
        scheduleId: row.id,
        departureAt: row.departure_at,
        arrivalAt: row.arrival_estimate_at,
        fare: Number(row.base_fare),
        currency: row.currency,
        seatsAvailable: seatCounts.get(row.id) ?? 0,
        totalSeats: row.total_seats,
        bus: { name: bus.name, type: bus.bus_type, isAc: bus.is_ac, amenities: bus.amenities },
        route: { name: route.name, originCity: route.origin_city, destinationCity: route.destination_city, distanceKm: route.distance_km },
        operator: { id: operator.id, name: operator.business_name },
      };
    });

    const durationOf = (r: (typeof results)[number]) =>
      new Date(r.arrivalAt).getTime() - new Date(r.departureAt).getTime();
    switch (data.sort) {
      case "CHEAPEST": results.sort((a, b) => a.fare - b.fare); break;
      case "EARLIEST": results.sort((a, b) => a.departureAt.localeCompare(b.departureAt)); break;
      case "LATEST": results.sort((a, b) => b.departureAt.localeCompare(a.departureAt)); break;
      case "SHORTEST": results.sort((a, b) => durationOf(a) - durationOf(b)); break;
      default:
        // Deterministic recommendation: seats available first, then price, then time.
        results.sort(
          (a, b) =>
            Number(b.seatsAvailable > 0) - Number(a.seatsAvailable > 0) ||
            a.fare - b.fare ||
            a.departureAt.localeCompare(b.departureAt),
        );
    }
    return { results, searchedAt: new Date().toISOString() };
  });

/** Trip detail: stops, live seat map, policy. */
export const getBusSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleIdSchema.parse(input))
  .handler(async ({ data }) => {
    const B = await import("./bus.server");
    await B.releaseExpiredHolds();

    const { data: schedule, error } = await B.db()
      .from("bus_schedules")
      .select(
        `id, departure_at, arrival_estimate_at, base_fare, currency, status, booking_closes_at, total_seats, cancellation_policy,
         buses!inner(name, bus_type, is_ac, amenities, seating_capacity),
         bus_routes!inner(name, origin_city, destination_city, distance_km, estimated_duration_minutes),
         bus_operators!inner(id, business_name, status)`,
      )
      .eq("id", data.scheduleId)
      .in("status", ["SCHEDULED", "BOARDING", "DEPARTED", "COMPLETED"])
      .maybeSingle();
    if (error || !schedule) throw new Error("NOT_FOUND");

    const [{ data: stops }, { data: seats }] = await Promise.all([
      B.db().from("bus_schedule_stops").select("*").eq("schedule_id", data.scheduleId).order("sequence"),
      B.db()
        .from("bus_schedule_seats")
        .select("seat_code, seat_type, deck, row_index, column_index, fare, state")
        .eq("schedule_id", data.scheduleId)
        .order("seat_code"),
    ]);

    const bus = schedule.buses as unknown as { name: string; bus_type: string; is_ac: boolean; amenities: string[] };
    const route = schedule.bus_routes as unknown as {
      name: string; origin_city: string; destination_city: string; distance_km: number | null; estimated_duration_minutes: number | null;
    };
    const operator = schedule.bus_operators as unknown as { id: string; business_name: string };

    return {
      scheduleId: schedule.id,
      status: schedule.status,
      departureAt: schedule.departure_at,
      arrivalAt: schedule.arrival_estimate_at,
      bookingClosesAt: schedule.booking_closes_at,
      bookingOpen: schedule.status === "SCHEDULED" && new Date(schedule.booking_closes_at) > new Date(),
      fare: Number(schedule.base_fare),
      currency: schedule.currency,
      cancellationPolicy: schedule.cancellation_policy,
      bus: { name: bus.name, type: bus.bus_type, isAc: bus.is_ac, amenities: bus.amenities },
      route,
      operator: { id: operator.id, name: operator.business_name },
      stops: (stops ?? []).map((stop) => ({
        id: stop.id,
        sequence: stop.sequence,
        name: stop.stop_name,
        city: stop.city,
        address: stop.address,
        scheduledAt: stop.scheduled_at,
        pickupEnabled: stop.pickup_enabled,
        dropEnabled: stop.drop_enabled,
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
      seats: (seats ?? []).map((seat) => ({
        seatCode: seat.seat_code,
        seatType: seat.seat_type as SeatType,
        deck: seat.deck,
        row: seat.row_index,
        column: seat.column_index,
        fare: Number(seat.fare),
        state: seat.state as SeatState,
      })),
      seatsAvailable: (seats ?? []).filter((seat) => seat.state === "AVAILABLE").length,
    };
  });

/** Priced quote for a seat selection. No inventory is touched here. */
export const quoteBusSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => seatHoldSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    await assertStopOrder(B, data.scheduleId, data.boardingStopId, data.droppingStopId);
    const { snapshot } = await B.priceSeats({
      scheduleId: data.scheduleId,
      seatCodes: data.seatCodes,
      discountCode: data.discountCode ?? null,
      customerId: context.userId,
    });
    return snapshot;
  });

async function assertStopOrder(
  B: typeof import("./bus.server"),
  scheduleId: string,
  boardingStopId: string,
  droppingStopId: string,
) {
  const { data: stops } = await B.db()
    .from("bus_schedule_stops")
    .select("id, sequence, pickup_enabled, drop_enabled")
    .eq("schedule_id", scheduleId);
  const boarding = stops?.find((stop) => stop.id === boardingStopId);
  const dropping = stops?.find((stop) => stop.id === droppingStopId);
  if (!boarding || !dropping) throw new Error("NOT_FOUND");
  if (!boarding.pickup_enabled || !dropping.drop_enabled) throw new Error("INVALID_STOP_ORDER");
  if (dropping.sequence <= boarding.sequence) throw new Error("INVALID_STOP_ORDER");
}

/**
 * Creates a booking draft and atomically holds the seats. The hold expires
 * server-side; the UI countdown is only a hint.
 */
export const createBusBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createBusBookingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    await B.releaseExpiredHolds();
    if (data.passengers.length !== data.seatCodes.length) throw new Error("SEAT_UNAVAILABLE");
    const seatSet = new Set(data.seatCodes);
    if (seatSet.size !== data.seatCodes.length) throw new Error("SEAT_UNAVAILABLE");
    for (const passenger of data.passengers) {
      if (!seatSet.has(passenger.seatCode)) throw new Error("SEAT_UNAVAILABLE");
    }
    await assertStopOrder(B, data.scheduleId, data.boardingStopId, data.droppingStopId);

    const { snapshot, operatorId } = await B.priceSeats({
      scheduleId: data.scheduleId,
      seatCodes: data.seatCodes,
      discountCode: data.discountCode ?? null,
      customerId: context.userId,
    });

    const holdId = crypto.randomUUID();
    await B.holdSeats(data.scheduleId, data.seatCodes, holdId);

    const holdExpires = new Date(Date.now() + SEAT_HOLD_SECONDS * 1000).toISOString();
    const { data: booking, error } = await B.db()
      .from("bus_bookings")
      .insert({
        pnr: B.generatePnr(),
        customer_id: context.userId,
        operator_id: operatorId,
        schedule_id: data.scheduleId,
        boarding_stop_id: data.boardingStopId,
        dropping_stop_id: data.droppingStopId,
        seat_count: data.seatCodes.length,
        lead_passenger_name: data.leadPassengerName,
        lead_passenger_phone: data.leadPassengerPhone,
        lead_passenger_email: data.leadPassengerEmail || null,
        fare_snapshot: snapshot as unknown as never,
        seat_total: snapshot.seatTotal,
        discount_code: snapshot.discountCode,
        discount_amount: snapshot.discountAmount,
        tax_amount: snapshot.taxAmount,
        total_amount: snapshot.total,
        currency: snapshot.currency,
        status: "SEAT_HELD",
        payment_status: "PENDING",
        hold_expires_at: holdExpires,
      })
      .select("id, pnr")
      .single();
    if (error || !booking) {
      await B.db()
        .from("bus_schedule_seats")
        .update({ state: "AVAILABLE", hold_id: null, hold_expires_at: null })
        .eq("hold_id", holdId);
      throw new Error("SEAT_UNAVAILABLE");
    }

    await B.db()
      .from("bus_schedule_seats")
      .update({ booking_id: booking.id })
      .eq("schedule_id", data.scheduleId)
      .eq("hold_id", holdId);

    const passengerRows = data.passengers.map((passenger, index) => ({
      booking_id: booking.id,
      schedule_id: data.scheduleId,
      operator_id: operatorId,
      seat_code: passenger.seatCode,
      full_name: passenger.fullName,
      age: passenger.age ?? null,
      gender: passenger.gender ?? null,
      is_lead: index === 0,
      fare: snapshot.seats.find((seat) => seat.seatCode === passenger.seatCode)?.fare ?? 0,
    }));
    await B.db().from("bus_passengers").insert(passengerRows);

    return { bookingId: booking.id, pnr: booking.pnr, holdExpiresAt: holdExpires, fare: snapshot };
  });

/**
 * Payment verification step. Confirmation is server-authoritative and
 * idempotent: a repeated callback with the same key never double-confirms.
 */
export const payBusBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => payBookingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const { data: booking } = await B.db()
      .from("bus_bookings")
      .select("id, customer_id, status, payment_reference, pnr")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.customer_id !== context.userId) throw new Error("NOT_FOUND");
    if (booking.payment_reference === data.idempotencyKey) {
      return { pnr: booking.pnr, alreadyConfirmed: true };
    }
    return B.commitBooking(data.bookingId, data.idempotencyKey);
  });

export const listMyBusBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    await B.releaseExpiredHolds();
    const { data } = await B.db()
      .from("bus_bookings")
      .select(
        `id, pnr, status, payment_status, total_amount, currency, seat_count, created_at,
         bus_schedules!inner(departure_at, arrival_estimate_at, status,
           buses!inner(name, bus_type, is_ac), bus_routes!inner(origin_city, destination_city))`,
      )
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    return {
      bookings: (data ?? []).map((row) => {
        const schedule = row.bus_schedules as unknown as {
          departure_at: string; arrival_estimate_at: string; status: string;
          buses: { name: string; bus_type: string; is_ac: boolean };
          bus_routes: { origin_city: string; destination_city: string };
        };
        return {
          id: row.id,
          pnr: row.pnr,
          status: row.status,
          paymentStatus: row.payment_status,
          total: Number(row.total_amount),
          currency: row.currency,
          seatCount: row.seat_count,
          createdAt: row.created_at,
          departureAt: schedule.departure_at,
          arrivalAt: schedule.arrival_estimate_at,
          tripStatus: schedule.status,
          busName: schedule.buses.name,
          busType: schedule.buses.bus_type,
          isAc: schedule.buses.is_ac,
          originCity: schedule.bus_routes.origin_city,
          destinationCity: schedule.bus_routes.destination_city,
        };
      }),
    };
  });

/** Full ticket / booking detail for the owning customer. */
export const getMyBusBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const { data: booking } = await B.db()
      .from("bus_bookings")
      .select(
        `*, bus_schedules!inner(id, departure_at, arrival_estimate_at, status, cancellation_policy,
           buses!inner(name, bus_type, is_ac, amenities), bus_routes!inner(name, origin_city, destination_city)),
         bus_operators!inner(business_name, contact_phone)`,
      )
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (!booking) throw new Error("NOT_FOUND");

    const [{ data: passengers }, { data: stops }] = await Promise.all([
      B.db().from("bus_passengers").select("*").eq("booking_id", data.bookingId).order("seat_code"),
      B.db()
        .from("bus_schedule_stops")
        .select("id, stop_name, city, address, scheduled_at")
        .in("id", [booking.boarding_stop_id, booking.dropping_stop_id]),
    ]);

    const schedule = booking.bus_schedules as unknown as {
      id: string; departure_at: string; arrival_estimate_at: string; status: string; cancellation_policy: string | null;
      buses: { name: string; bus_type: string; is_ac: boolean; amenities: string[] };
      bus_routes: { name: string; origin_city: string; destination_city: string };
    };
    const operator = booking.bus_operators as unknown as { business_name: string; contact_phone: string };
    const cancellable = ["CONFIRMED"].includes(booking.status) && new Date(schedule.departure_at) > new Date();

    return {
      id: booking.id,
      pnr: booking.pnr,
      status: booking.status,
      paymentStatus: booking.payment_status,
      fare: booking.fare_snapshot as unknown as BusFareSnapshot,
      total: Number(booking.total_amount),
      currency: booking.currency,
      refundAmount: Number(booking.refund_amount),
      cancellationFee: Number(booking.cancellation_fee),
      cancellationReason: booking.cancellation_reason,
      holdExpiresAt: booking.hold_expires_at,
      createdAt: booking.created_at,
      confirmedAt: booking.confirmed_at,
      cancelledAt: booking.cancelled_at,
      leadPassenger: {
        name: booking.lead_passenger_name,
        phone: booking.lead_passenger_phone,
        email: booking.lead_passenger_email,
      },
      trip: {
        scheduleId: schedule.id,
        departureAt: schedule.departure_at,
        arrivalAt: schedule.arrival_estimate_at,
        status: schedule.status,
        cancellationPolicy: schedule.cancellation_policy,
        busName: schedule.buses.name,
        busType: schedule.buses.bus_type,
        isAc: schedule.buses.is_ac,
        amenities: schedule.buses.amenities,
        routeName: schedule.bus_routes.name,
        originCity: schedule.bus_routes.origin_city,
        destinationCity: schedule.bus_routes.destination_city,
      },
      operator: { name: operator.business_name, phone: operator.contact_phone },
      boarding: (stops ?? []).find((stop) => stop.id === booking.boarding_stop_id) ?? null,
      dropping: (stops ?? []).find((stop) => stop.id === booking.dropping_stop_id) ?? null,
      passengers: (passengers ?? []).map((passenger) => ({
        id: passenger.id,
        seatCode: passenger.seat_code,
        fullName: passenger.full_name,
        age: passenger.age,
        gender: passenger.gender,
        isLead: passenger.is_lead,
        fare: Number(passenger.fare),
        boardingStatus: passenger.boarding_status,
      })),
      cancellable,
    };
  });

export const quoteBusCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const { data: booking } = await B.db()
      .from("bus_bookings")
      .select("id, customer_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.customer_id !== context.userId) throw new Error("NOT_FOUND");
    return B.computeCancellation(data.bookingId);
  });

export const cancelMyBusBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelBusBookingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const { data: booking } = await B.db()
      .from("bus_bookings")
      .select("id, customer_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.customer_id !== context.userId) throw new Error("NOT_FOUND");
    return B.cancelBooking(data.bookingId, "CUSTOMER", data.reason);
  });

// ---------------------------------------------------------------- support

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => supportTicketSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    let operatorId: string | null = null;
    if (data.bookingId) {
      const { data: booking } = await B.db()
        .from("bus_bookings")
        .select("id, operator_id, customer_id")
        .eq("id", data.bookingId)
        .maybeSingle();
      if (!booking || booking.customer_id !== context.userId) throw new Error("NOT_FOUND");
      operatorId = booking.operator_id;
    }
    const reference = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const { data: ticket, error } = await B.db()
      .from("support_tickets")
      .insert({
        reference,
        operator_id: operatorId,
        created_by: context.userId,
        category: data.category,
        subject: data.subject,
        description: data.description,
        booking_id: data.bookingId ?? null,
        schedule_id: data.scheduleId ?? null,
      })
      .select("id, reference")
      .single();
    if (error || !ticket) throw new Error("NOT_FOUND");
    return ticket;
  });

export const listMySupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const { data } = await B.db()
      .from("support_tickets")
      .select("id, reference, category, subject, status, created_at")
      .eq("created_by", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { tickets: data ?? [] };
  });

export const replyToMyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ticketReplySchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const { data: ticket } = await B.db()
      .from("support_tickets")
      .select("id, created_by, status")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket || ticket.created_by !== context.userId) throw new Error("NOT_FOUND");
    if (ticket.status === "CLOSED") throw new Error("INVALID_TRANSITION");
    await B.db().from("support_ticket_messages").insert({
      ticket_id: data.ticketId,
      author_user_id: context.userId,
      author_type: "CUSTOMER",
      body: data.body,
    });
    return { ok: true };
  });
