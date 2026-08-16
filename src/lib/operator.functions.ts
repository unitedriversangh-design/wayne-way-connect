import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  boardingUpdateSchema,
  bookingIdSchema,
  busInputSchema,
  busUpdateSchema,
  discountInputSchema,
  discountUpdateSchema,
  driverAssignmentSchema,
  driverInputSchema,
  driverUpdateSchema,
  notificationReadSchema,
  operatorBookingFilterSchema,
  operatorProfileSchema,
  operatorRegistrationSchema,
  reportFilterSchema,
  routeInputSchema,
  routeStopsSchema,
  routeUpdateSchema,
  scheduleIdSchema,
  scheduleInputSchema,
  scheduleStatusSchema,
  scheduleUpdateSchema,
  seatBlockSchema,
  seatLayoutSchema,
  staffInputSchema,
  staffUpdateSchema,
  stopInputSchema,
  stopUpdateSchema,
  supportTicketSchema,
  ticketReplySchema,
  ticketValidationSchema,
} from "./bus-schemas";
import {
  DEFAULT_BOOKING_CUTOFF_MINUTES,
  OPERATOR_PERMISSIONS,
  type OperatorRole,
  type ScheduleStatus,
} from "./bus-shared";

/** Who am I in the operator portal? Drives navigation and permission gating. */
export const getOperatorSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    try {
      const ctx = await B.operatorContext(context.userId);
      const { data: operator } = await B.db()
        .from("bus_operators")
        .select("*")
        .eq("id", ctx.operatorId)
        .single();
      return {
        registered: true as const,
        operatorId: ctx.operatorId,
        role: ctx.role,
        permissions: OPERATOR_PERMISSIONS[ctx.role],
        status: ctx.status,
        businessName: ctx.businessName,
        operator: operator
          ? {
              contactPerson: operator.contact_person,
              contactPhone: operator.contact_phone,
              contactEmail: operator.contact_email,
              address: operator.address,
              city: operator.city,
              state: operator.state,
              gstNumber: operator.gst_number,
              verifiedAt: operator.verified_at,
              commissionPercent: Number(operator.commission_percent),
              bankAccountName: operator.bank_account_name,
              bankAccountLast4: operator.bank_account_last4,
              bankIfsc: operator.bank_ifsc,
            }
          : null,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "OPERATOR_NOT_FOUND") {
        return { registered: false as const };
      }
      throw error;
    }
  });

export const registerOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => operatorRegistrationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const { data: existing } = await B.db()
      .from("operator_staff")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) throw new Error("DUPLICATE_CODE");

    const { data: operator, error } = await B.db()
      .from("bus_operators")
      .insert({
        owner_user_id: context.userId,
        business_name: data.businessName,
        contact_person: data.contactPerson,
        contact_phone: data.contactPhone,
        contact_email: data.contactEmail || null,
        city: data.city,
        state: data.state,
        address: data.address ?? null,
        gst_number: data.gstNumber ?? null,
        status: "ACTIVE",
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !operator) throw new Error("NOT_FOUND");

    await B.db().from("operator_staff").insert({
      operator_id: operator.id,
      user_id: context.userId,
      role: "OWNER",
      full_name: data.contactPerson,
      email: data.contactEmail || null,
    });
    await B.notifyOperator(operator.id, "SYSTEM", "Welcome to WayneWay", "Add a bus, a route and a schedule to start selling tickets.", "/operator/buses");
    return { operatorId: operator.id };
  });

// ---------------------------------------------------------------- dashboard

export const getOperatorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "dashboard");
    await B.releaseExpiredHolds();

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const [todayBookings, activeBuses, upcomingTrips, seatRows, cancelled, todayRevenue, pendingSchedules, recentBookings] =
      await Promise.all([
        B.db()
          .from("bus_bookings")
          .select("id, total_amount, status", { count: "exact" })
          .eq("operator_id", ctx.operatorId)
          .gte("created_at", dayStart)
          .lt("created_at", dayEnd),
        B.db().from("buses").select("id", { count: "exact", head: true }).eq("operator_id", ctx.operatorId).eq("status", "ACTIVE"),
        B.db()
          .from("bus_schedules")
          .select("id, departure_at, status, buses!inner(name), bus_routes!inner(origin_city, destination_city)")
          .eq("operator_id", ctx.operatorId)
          .in("status", ["SCHEDULED", "BOARDING"])
          .gte("departure_at", now.toISOString())
          .order("departure_at")
          .limit(5),
        B.db()
          .from("bus_schedule_seats")
          .select("state, bus_schedules!inner(operator_id, status)")
          .eq("bus_schedules.operator_id", ctx.operatorId)
          .in("bus_schedules.status", ["SCHEDULED", "BOARDING"]),
        B.db()
          .from("bus_bookings")
          .select("id", { count: "exact", head: true })
          .eq("operator_id", ctx.operatorId)
          .in("status", ["CANCELLED", "REFUND_PENDING", "REFUNDED"])
          .gte("updated_at", dayStart),
        B.revenueTotals(ctx.operatorId, dayStart, dayEnd),
        B.db().from("bus_schedules").select("id", { count: "exact", head: true }).eq("operator_id", ctx.operatorId).eq("status", "DRAFT"),
        B.db()
          .from("bus_bookings")
          .select("id, pnr, status, total_amount, created_at, seat_count")
          .eq("operator_id", ctx.operatorId)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    const confirmedToday = (todayBookings.data ?? []).filter((row) => row.status === "CONFIRMED");
    const seats = seatRows.data ?? [];
    const { data: settlement } = await B.db()
      .from("bus_settlements")
      .select("id, status, net_amount, period_end")
      .eq("operator_id", ctx.operatorId)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      role: ctx.role,
      status: ctx.status,
      businessName: ctx.businessName,
      cards: {
        todayBookings: todayBookings.count ?? 0,
        todayRevenue: confirmedToday.reduce((sum, row) => sum + Number(row.total_amount), 0),
        activeBuses: activeBuses.count ?? 0,
        upcomingTrips: upcomingTrips.data?.length ?? 0,
        seatsAvailable: seats.filter((seat) => seat.state === "AVAILABLE").length,
        seatsOccupied: seats.filter((seat) => seat.state === "BOOKED").length,
        cancelledToday: cancelled.count ?? 0,
        pendingActions: pendingSchedules.count ?? 0,
      },
      revenueToday: todayRevenue,
      upcomingTrips: (upcomingTrips.data ?? []).map((row) => {
        const bus = row.buses as unknown as { name: string };
        const route = row.bus_routes as unknown as { origin_city: string; destination_city: string };
        return {
          id: row.id,
          departureAt: row.departure_at,
          status: row.status,
          busName: bus.name,
          route: `${route.origin_city} → ${route.destination_city}`,
        };
      }),
      recentBookings: (recentBookings.data ?? []).map((row) => ({
        id: row.id,
        pnr: row.pnr,
        status: row.status,
        total: Number(row.total_amount),
        seatCount: row.seat_count,
        createdAt: row.created_at,
      })),
      settlement: settlement
        ? { id: settlement.id, status: settlement.status, netAmount: Number(settlement.net_amount), periodEnd: settlement.period_end }
        : null,
    };
  });

// ---------------------------------------------------------------- buses

export const listOperatorBuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "buses");
    const { data } = await B.db()
      .from("buses")
      .select("*, bus_drivers!buses_assigned_driver_fk(id, full_name)")
      .eq("operator_id", ctx.operatorId)
      .order("created_at", { ascending: false });

    const ids = (data ?? []).map((bus) => bus.id);
    const nextTrips = new Map<string, string>();
    const seatCounts = new Map<string, number>();
    if (ids.length > 0) {
      const [{ data: trips }, { data: seats }] = await Promise.all([
        B.db()
          .from("bus_schedules")
          .select("bus_id, departure_at")
          .in("bus_id", ids)
          .in("status", ["SCHEDULED", "BOARDING"])
          .gte("departure_at", new Date().toISOString())
          .order("departure_at"),
        B.db().from("bus_seats").select("bus_id").in("bus_id", ids),
      ]);
      for (const trip of trips ?? []) if (!nextTrips.has(trip.bus_id)) nextTrips.set(trip.bus_id, trip.departure_at);
      for (const seat of seats ?? []) seatCounts.set(seat.bus_id, (seatCounts.get(seat.bus_id) ?? 0) + 1);
    }

    return {
      role: ctx.role,
      buses: (data ?? []).map((bus) => {
        const driver = bus.bus_drivers as unknown as { id: string; full_name: string } | null;
        return {
          id: bus.id,
          name: bus.name,
          registrationNumber: bus.registration_number,
          busType: bus.bus_type,
          isAc: bus.is_ac,
          seatingCapacity: bus.seating_capacity,
          configuredSeats: seatCounts.get(bus.id) ?? 0,
          amenities: bus.amenities,
          status: bus.status,
          driver: driver ? { id: driver.id, name: driver.full_name } : null,
          nextTripAt: nextTrips.get(bus.id) ?? null,
        };
      }),
    };
  });

export const createBus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => busInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "buses");

    const { data: bus, error } = await B.db()
      .from("buses")
      .insert({
        operator_id: ctx.operatorId,
        name: data.name,
        registration_number: data.registrationNumber.toUpperCase(),
        bus_type: data.busType,
        is_ac: data.isAc,
        vehicle_category: data.vehicleCategory ?? null,
        manufacturer_model: data.manufacturerModel ?? null,
        seating_capacity: data.seatingCapacity,
        amenities: data.amenities,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("DUPLICATE_REGISTRATION");
      throw new Error("NOT_FOUND");
    }
    await B.audit(ctx, "BUS_CREATED", "bus", bus.id, { registration: data.registrationNumber });
    return { busId: bus.id };
  });

export const updateBus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => busUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "buses");
    await B.ownedRow("buses", data.busId, ctx.operatorId, "id");

    // Capacity changes invalidate the seat layout used by live trips.
    if (data.seatingCapacity != null || data.status === "ARCHIVED") {
      const { count } = await B.db()
        .from("bus_schedules")
        .select("id", { count: "exact", head: true })
        .eq("bus_id", data.busId)
        .in("status", ["SCHEDULED", "BOARDING", "DEPARTED"]);
      if ((count ?? 0) > 0) throw new Error("HAS_CONFIRMED_BOOKINGS");
    }
    if (data.assignedDriverId) {
      const driver = await B.ownedRow<{ id: string; status: string }>("bus_drivers", data.assignedDriverId, ctx.operatorId, "id, status");
      if (driver.status !== "ACTIVE") throw new Error("DRIVER_CONFLICT");
    }

    const patch: Record<string, unknown> = {};
    if (data.name != null) patch["name"] = data.name;
    if (data.busType != null) patch["bus_type"] = data.busType;
    if (data.isAc != null) patch["is_ac"] = data.isAc;
    if (data.vehicleCategory != null) patch["vehicle_category"] = data.vehicleCategory;
    if (data.manufacturerModel != null) patch["manufacturer_model"] = data.manufacturerModel;
    if (data.seatingCapacity != null) patch["seating_capacity"] = data.seatingCapacity;
    if (data.amenities != null) patch["amenities"] = data.amenities;
    if (data.notes != null) patch["notes"] = data.notes;
    if (data.status != null) patch["status"] = data.status;
    if (data.assignedDriverId !== undefined) patch["assigned_driver_id"] = data.assignedDriverId;
    if (data.registrationNumber != null) patch["registration_number"] = data.registrationNumber.toUpperCase();

    const { error } = await B.db().from("buses").update(patch as never).eq("id", data.busId).eq("operator_id", ctx.operatorId);
    if (error) {
      if (error.code === "23505") throw new Error("DUPLICATE_REGISTRATION");
      throw new Error("NOT_FOUND");
    }
    await B.audit(ctx, "BUS_UPDATED", "bus", data.busId, patch);
    return { ok: true };
  });

export const configureSeatLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => seatLayoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "seats");
    const bus = await B.ownedRow<{ id: string; seating_capacity: number }>("buses", data.busId, ctx.operatorId, "id, seating_capacity");

    const seats = B.generateSeatLayout(
      {
        rows: data.rows,
        columnsPerRow: data.columnsPerRow,
        decks: data.decks,
        seatType: data.seatType,
        aisleAfterColumn: data.aisleAfterColumn,
        fareMultiplierUpper: data.fareMultiplierUpper,
      },
      bus.seating_capacity,
    );
    await B.replaceSeatLayout(data.busId, seats);
    await B.audit(ctx, "SEAT_LAYOUT_CONFIGURED", "bus", data.busId, { seats: seats.length });
    return { seats: seats.length };
  });

export const getBusDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ busId: String((input as { busId: string }).busId) }))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "buses");
    const bus = await B.ownedRow<Record<string, unknown>>("buses", data.busId, ctx.operatorId);

    const [{ data: seats }, { data: schedules }, { data: driver }, { data: audits }] = await Promise.all([
      B.db().from("bus_seats").select("*").eq("bus_id", data.busId).order("seat_code"),
      B.db()
        .from("bus_schedules")
        .select("id, departure_at, status, total_seats, bus_routes!inner(origin_city, destination_city)")
        .eq("bus_id", data.busId)
        .order("departure_at", { ascending: false })
        .limit(20),
      bus["assigned_driver_id"]
        ? B.db().from("bus_drivers").select("id, full_name, phone, status, document_status").eq("id", bus["assigned_driver_id"] as string).maybeSingle()
        : Promise.resolve({ data: null }),
      B.db().from("operator_audit_logs").select("action, created_at, metadata, actor_role").eq("object_id", data.busId).order("created_at", { ascending: false }).limit(20),
    ]);

    const scheduleIds = (schedules ?? []).map((row) => row.id);
    let revenue = B.emptyRevenue();
    let bookings = 0;
    if (scheduleIds.length > 0) {
      const [{ data: ledger }, { count }] = await Promise.all([
        B.db().from("bus_ledger_entries").select("entry_type, amount").eq("operator_id", ctx.operatorId).in("schedule_id", scheduleIds),
        B.db().from("bus_bookings").select("id", { count: "exact", head: true }).in("schedule_id", scheduleIds),
      ]);
      bookings = count ?? 0;
      for (const row of ledger ?? []) {
        const amount = Number(row.amount);
        if (row.entry_type === "BOOKING") revenue.gross += amount;
        else if (row.entry_type === "COMMISSION") revenue.commission += Math.abs(amount);
        else if (row.entry_type === "REFUND") revenue.refunds += Math.abs(amount);
        else if (row.entry_type === "DISCOUNT") revenue.discounts += Math.abs(amount);
      }
      revenue.netPayable = Number((revenue.gross - revenue.discounts - revenue.refunds - revenue.commission).toFixed(2));
    }

    return {
      role: ctx.role,
      bus: {
        id: bus["id"] as string,
        name: bus["name"] as string,
        registrationNumber: bus["registration_number"] as string,
        busType: bus["bus_type"] as string,
        isAc: bus["is_ac"] as boolean,
        vehicleCategory: bus["vehicle_category"] as string | null,
        manufacturerModel: bus["manufacturer_model"] as string | null,
        seatingCapacity: bus["seating_capacity"] as number,
        amenities: bus["amenities"] as string[],
        status: bus["status"] as string,
        notes: bus["notes"] as string | null,
        createdAt: bus["created_at"] as string,
      },
      seats: (seats ?? []).map((seat) => ({
        seatCode: seat.seat_code,
        deck: seat.deck,
        row: seat.row_index,
        column: seat.column_index,
        seatType: seat.seat_type,
      })),
      schedules: (schedules ?? []).map((row) => {
        const route = row.bus_routes as unknown as { origin_city: string; destination_city: string };
        return {
          id: row.id,
          departureAt: row.departure_at,
          status: row.status,
          totalSeats: row.total_seats,
          route: `${route.origin_city} → ${route.destination_city}`,
        };
      }),
      driver,
      bookings,
      revenue,
      activity: audits ?? [],
    };
  });

// ---------------------------------------------------------------- drivers

export const listOperatorDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "drivers");
    const { data } = await B.db()
      .from("bus_drivers")
      .select("*, buses!bus_drivers_assigned_bus_id_fkey(id, name)")
      .eq("operator_id", ctx.operatorId)
      .order("created_at", { ascending: false });
    return {
      role: ctx.role,
      drivers: (data ?? []).map((driver) => {
        const bus = driver.buses as unknown as { id: string; name: string } | null;
        return {
          id: driver.id,
          fullName: driver.full_name,
          phone: driver.phone,
          status: driver.status,
          documentStatus: driver.document_status,
          licenceExpiry: driver.licence_expiry,
          assignedBus: bus ? { id: bus.id, name: bus.name } : null,
        };
      }),
    };
  });

export const createDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => driverInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "drivers");
    const { data: driver, error } = await B.db()
      .from("bus_drivers")
      .insert({
        operator_id: ctx.operatorId,
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        licence_number: data.licenceNumber,
        licence_expiry: data.licenceExpiry ?? null,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("DUPLICATE_CODE");
      throw new Error("NOT_FOUND");
    }
    await B.audit(ctx, "DRIVER_CREATED", "bus_driver", driver.id, { name: data.fullName });
    return { driverId: driver.id };
  });

export const updateDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => driverUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "drivers");
    await B.ownedRow("bus_drivers", data.driverId, ctx.operatorId, "id");
    const patch: Record<string, unknown> = {};
    if (data.fullName != null) patch["full_name"] = data.fullName;
    if (data.phone != null) patch["phone"] = data.phone;
    if (data.email != null) patch["email"] = data.email || null;
    if (data.licenceNumber != null) patch["licence_number"] = data.licenceNumber;
    if (data.licenceExpiry != null) patch["licence_expiry"] = data.licenceExpiry;
    if (data.status != null) patch["status"] = data.status;
    if (data.documentStatus != null) patch["document_status"] = data.documentStatus;
    const { error } = await B.db().from("bus_drivers").update(patch as never).eq("id", data.driverId).eq("operator_id", ctx.operatorId);
    if (error) throw new Error("NOT_FOUND");
    await B.audit(ctx, "DRIVER_UPDATED", "bus_driver", data.driverId, patch);
    return { ok: true };
  });

export const assignDriverToBus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => driverAssignmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "drivers");
    const driver = await B.ownedRow<{ id: string; status: string; document_status: string; assigned_bus_id: string | null }>(
      "bus_drivers",
      data.driverId,
      ctx.operatorId,
      "id, status, document_status, assigned_bus_id",
    );

    if (data.busId) {
      if (driver.status !== "ACTIVE") throw new Error("DRIVER_CONFLICT");
      if (driver.document_status !== "VERIFIED") throw new Error("DRIVER_CONFLICT");
      await B.ownedRow("buses", data.busId, ctx.operatorId, "id");
      const { data: clash } = await B.db()
        .from("bus_drivers")
        .select("id")
        .eq("operator_id", ctx.operatorId)
        .eq("assigned_bus_id", data.busId)
        .neq("id", data.driverId)
        .maybeSingle();
      if (clash) throw new Error("DRIVER_CONFLICT");
    }

    await B.db().from("bus_drivers").update({ assigned_bus_id: data.busId }).eq("id", data.driverId).eq("operator_id", ctx.operatorId);
    if (driver.assigned_bus_id) {
      await B.db().from("buses").update({ assigned_driver_id: null }).eq("id", driver.assigned_bus_id).eq("operator_id", ctx.operatorId);
    }
    if (data.busId) {
      await B.db().from("buses").update({ assigned_driver_id: data.driverId }).eq("id", data.busId).eq("operator_id", ctx.operatorId);
    }
    await B.audit(ctx, data.busId ? "DRIVER_ASSIGNED" : "DRIVER_UNASSIGNED", "bus_driver", data.driverId, { busId: data.busId });
    return { ok: true };
  });

// ---------------------------------------------------------------- stops & routes

export const listOperatorStops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "stops");
    const { data } = await B.db().from("bus_stops").select("*").eq("operator_id", ctx.operatorId).order("city").order("name");
    return {
      role: ctx.role,
      stops: (data ?? []).map((stop) => ({
        id: stop.id,
        name: stop.name,
        city: stop.city,
        address: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
        isActive: stop.is_active,
      })),
    };
  });

export const createStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => stopInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "stops");
    const { data: stop, error } = await B.db()
      .from("bus_stops")
      .insert({
        operator_id: ctx.operatorId,
        name: data.name,
        city: data.city,
        address: data.address ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
      })
      .select("id")
      .single();
    if (error) throw new Error("NOT_FOUND");
    await B.audit(ctx, "STOP_CREATED", "bus_stop", stop.id, { name: data.name });
    return { stopId: stop.id };
  });

export const updateStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => stopUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "stops");
    await B.ownedRow("bus_stops", data.stopId, ctx.operatorId, "id");
    const patch: Record<string, unknown> = {};
    if (data.name != null) patch["name"] = data.name;
    if (data.city != null) patch["city"] = data.city;
    if (data.address != null) patch["address"] = data.address;
    if (data.latitude != null) patch["latitude"] = data.latitude;
    if (data.longitude != null) patch["longitude"] = data.longitude;
    if (data.isActive != null) patch["is_active"] = data.isActive;
    await B.db().from("bus_stops").update(patch as never).eq("id", data.stopId).eq("operator_id", ctx.operatorId);
    await B.audit(ctx, "STOP_UPDATED", "bus_stop", data.stopId, patch);
    return { ok: true };
  });

export const listOperatorRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "routes");
    const { data } = await B.db()
      .from("bus_routes")
      .select("*, bus_route_stops(id, sequence, minutes_from_start, pickup_enabled, drop_enabled, is_active, bus_stops!inner(id, name, city))")
      .eq("operator_id", ctx.operatorId)
      .order("created_at", { ascending: false });
    return {
      role: ctx.role,
      routes: (data ?? []).map((route) => ({
        id: route.id,
        name: route.name,
        originCity: route.origin_city,
        destinationCity: route.destination_city,
        distanceKm: route.distance_km ? Number(route.distance_km) : null,
        estimatedDurationMinutes: route.estimated_duration_minutes,
        baseFare: Number(route.base_fare),
        status: route.status,
        stops: ((route.bus_route_stops as unknown as Array<{
          id: string; sequence: number; minutes_from_start: number; pickup_enabled: boolean; drop_enabled: boolean; is_active: boolean;
          bus_stops: { id: string; name: string; city: string };
        }>) ?? [])
          .sort((a, b) => a.sequence - b.sequence)
          .map((stop) => ({
            id: stop.id,
            stopId: stop.bus_stops.id,
            name: stop.bus_stops.name,
            city: stop.bus_stops.city,
            sequence: stop.sequence,
            minutesFromStart: stop.minutes_from_start,
            pickupEnabled: stop.pickup_enabled,
            dropEnabled: stop.drop_enabled,
            isActive: stop.is_active,
          })),
      })),
    };
  });

export const createRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => routeInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "routes");
    if (data.originCity.toLowerCase() === data.destinationCity.toLowerCase()) throw new Error("ROUTE_NOT_READY");
    const { data: route, error } = await B.db()
      .from("bus_routes")
      .insert({
        operator_id: ctx.operatorId,
        name: data.name,
        origin_city: data.originCity,
        destination_city: data.destinationCity,
        distance_km: data.distanceKm ?? null,
        estimated_duration_minutes: data.estimatedDurationMinutes,
        base_fare: data.baseFare,
      })
      .select("id")
      .single();
    if (error) throw new Error("NOT_FOUND");
    await B.audit(ctx, "ROUTE_CREATED", "bus_route", route.id, { name: data.name });
    return { routeId: route.id };
  });

export const updateRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => routeUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "routes");
    await B.ownedRow("bus_routes", data.routeId, ctx.operatorId, "id");

    if (data.status === "ACTIVE") {
      const { count } = await B.db()
        .from("bus_route_stops")
        .select("id", { count: "exact", head: true })
        .eq("route_id", data.routeId)
        .eq("is_active", true);
      if ((count ?? 0) < 2) throw new Error("ROUTE_NOT_READY");
    }
    const patch: Record<string, unknown> = {};
    if (data.name != null) patch["name"] = data.name;
    if (data.originCity != null) patch["origin_city"] = data.originCity;
    if (data.destinationCity != null) patch["destination_city"] = data.destinationCity;
    if (data.distanceKm != null) patch["distance_km"] = data.distanceKm;
    if (data.estimatedDurationMinutes != null) patch["estimated_duration_minutes"] = data.estimatedDurationMinutes;
    if (data.baseFare != null) patch["base_fare"] = data.baseFare;
    if (data.status != null) patch["status"] = data.status;
    await B.db().from("bus_routes").update(patch as never).eq("id", data.routeId).eq("operator_id", ctx.operatorId);
    await B.audit(ctx, "ROUTE_UPDATED", "bus_route", data.routeId, patch);
    return { ok: true };
  });

/** Replaces the stop sequence. Published trips keep their own snapshot. */
export const setRouteStops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => routeStopsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "routes");
    await B.ownedRow("bus_routes", data.routeId, ctx.operatorId, "id");

    const seen = new Set<string>();
    for (const stop of data.stops) {
      if (seen.has(stop.stopId)) throw new Error("DUPLICATE_STOP");
      seen.add(stop.stopId);
      await B.ownedRow("bus_stops", stop.stopId, ctx.operatorId, "id");
    }
    const ordered = [...data.stops].sort((a, b) => a.minutesFromStart - b.minutesFromStart);
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i]!.minutesFromStart === ordered[i - 1]!.minutesFromStart) throw new Error("INVALID_STOP_ORDER");
    }

    await B.db().from("bus_route_stops").delete().eq("route_id", data.routeId);
    const { error } = await B.db().from("bus_route_stops").insert(
      ordered.map((stop, index) => ({
        route_id: data.routeId,
        stop_id: stop.stopId,
        sequence: index + 1,
        minutes_from_start: stop.minutesFromStart,
        pickup_enabled: stop.pickupEnabled,
        drop_enabled: stop.dropEnabled,
        is_active: stop.isActive,
      })),
    );
    if (error) throw new Error("INVALID_STOP_ORDER");
    await B.audit(ctx, "ROUTE_STOPS_UPDATED", "bus_route", data.routeId, { stops: ordered.length });
    return { stops: ordered.length };
  });

// ---------------------------------------------------------------- schedules

export const listOperatorSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "schedules");
    const { data } = await B.db()
      .from("bus_schedules")
      .select("*, buses!inner(name, registration_number), bus_routes!inner(name, origin_city, destination_city), bus_drivers(full_name)")
      .eq("operator_id", ctx.operatorId)
      .order("departure_at", { ascending: false })
      .limit(100);

    const ids = (data ?? []).map((row) => row.id);
    const booked = new Map<string, number>();
    if (ids.length > 0) {
      const { data: seats } = await B.db().from("bus_schedule_seats").select("schedule_id, state").in("schedule_id", ids);
      for (const seat of seats ?? []) {
        if (seat.state === "BOOKED") booked.set(seat.schedule_id, (booked.get(seat.schedule_id) ?? 0) + 1);
      }
    }

    return {
      role: ctx.role,
      schedules: (data ?? []).map((row) => {
        const bus = row.buses as unknown as { name: string; registration_number: string };
        const route = row.bus_routes as unknown as { name: string; origin_city: string; destination_city: string };
        const driver = row.bus_drivers as unknown as { full_name: string } | null;
        return {
          id: row.id,
          departureAt: row.departure_at,
          arrivalAt: row.arrival_estimate_at,
          bookingClosesAt: row.booking_closes_at,
          status: row.status as ScheduleStatus,
          baseFare: Number(row.base_fare),
          totalSeats: row.total_seats,
          bookedSeats: booked.get(row.id) ?? 0,
          busName: bus.name,
          registration: bus.registration_number,
          routeName: route.name,
          route: `${route.origin_city} → ${route.destination_city}`,
          driverName: driver?.full_name ?? null,
        };
      }),
    };
  });

export const createSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "schedules");

    const bus = await B.ownedRow<{ id: string; status: string }>("buses", data.busId, ctx.operatorId, "id, status");
    if (bus.status !== "ACTIVE") throw new Error("BUS_NOT_BOOKABLE");
    const route = await B.ownedRow<{ id: string; status: string; estimated_duration_minutes: number | null }>(
      "bus_routes",
      data.routeId,
      ctx.operatorId,
      "id, status, estimated_duration_minutes",
    );
    if (route.status !== "ACTIVE") throw new Error("ROUTE_NOT_READY");
    if (data.driverId) await B.ownedRow("bus_drivers", data.driverId, ctx.operatorId, "id");

    const departure = new Date(data.departureAt);
    const arrival = new Date(departure.getTime() + (route.estimated_duration_minutes ?? 120) * 60000);
    const cutoff = new Date(
      departure.getTime() - (data.bookingCutoffMinutes ?? DEFAULT_BOOKING_CUTOFF_MINUTES) * 60000,
    );
    await B.assertNoScheduleConflict({
      operatorId: ctx.operatorId,
      busId: data.busId,
      driverId: data.driverId ?? null,
      departureAt: departure.toISOString(),
      arrivalAt: arrival.toISOString(),
    });

    const { data: schedule, error } = await B.db()
      .from("bus_schedules")
      .insert({
        operator_id: ctx.operatorId,
        bus_id: data.busId,
        route_id: data.routeId,
        driver_id: data.driverId ?? null,
        service_date: departure.toISOString().slice(0, 10),
        departure_at: departure.toISOString(),
        arrival_estimate_at: arrival.toISOString(),
        booking_closes_at: cutoff.toISOString(),
        base_fare: data.baseFare,
        cancellation_policy: data.cancellationPolicy ?? null,
        status: "DRAFT",
      })
      .select("id")
      .single();
    if (error) throw new Error("SCHEDULE_CONFLICT");
    await B.audit(ctx, "SCHEDULE_CREATED", "bus_schedule", schedule.id, { departureAt: departure.toISOString() });
    return { scheduleId: schedule.id };
  });

export const updateSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "schedules");
    const schedule = await B.ownedRow<{
      id: string; status: ScheduleStatus; bus_id: string; departure_at: string; arrival_estimate_at: string; driver_id: string | null;
    }>("bus_schedules", data.scheduleId, ctx.operatorId, "id, status, bus_id, departure_at, arrival_estimate_at, driver_id");
    if (["COMPLETED", "CANCELLED", "DEPARTED"].includes(schedule.status)) throw new Error("INVALID_TRANSITION");

    // Fare changes never touch confirmed bookings — those keep their snapshot.
    const patch: Record<string, unknown> = {};
    if (data.driverId !== undefined) {
      if (data.driverId) await B.ownedRow("bus_drivers", data.driverId, ctx.operatorId, "id");
      patch["driver_id"] = data.driverId;
    }
    if (data.cancellationPolicy != null) patch["cancellation_policy"] = data.cancellationPolicy;

    if (data.departureAt || data.bookingCutoffMinutes != null) {
      const { count } = await B.db()
        .from("bus_bookings")
        .select("id", { count: "exact", head: true })
        .eq("schedule_id", data.scheduleId)
        .in("status", ["CONFIRMED", "CANCEL_REQUESTED", "COMPLETED"]);
      if ((count ?? 0) > 0 && data.departureAt) throw new Error("HAS_CONFIRMED_BOOKINGS");
      const departure = data.departureAt ? new Date(data.departureAt) : new Date(schedule.departure_at);
      const span = new Date(schedule.arrival_estimate_at).getTime() - new Date(schedule.departure_at).getTime();
      const arrival = new Date(departure.getTime() + span);
      await B.assertNoScheduleConflict({
        operatorId: ctx.operatorId,
        busId: schedule.bus_id,
        driverId: (patch["driver_id"] as string | null | undefined) ?? schedule.driver_id,
        departureAt: departure.toISOString(),
        arrivalAt: arrival.toISOString(),
        excludeScheduleId: schedule.id,
      });
      patch["departure_at"] = departure.toISOString();
      patch["arrival_estimate_at"] = arrival.toISOString();
      patch["service_date"] = departure.toISOString().slice(0, 10);
      patch["booking_closes_at"] = new Date(
        departure.getTime() - (data.bookingCutoffMinutes ?? DEFAULT_BOOKING_CUTOFF_MINUTES) * 60000,
      ).toISOString();
    }

    if (data.baseFare != null) {
      if (schedule.status !== "DRAFT") throw new Error("HAS_CONFIRMED_BOOKINGS");
      patch["base_fare"] = data.baseFare;
    }

    await B.db().from("bus_schedules").update(patch as never).eq("id", data.scheduleId).eq("operator_id", ctx.operatorId);
    await B.audit(ctx, "SCHEDULE_UPDATED", "bus_schedule", data.scheduleId, patch);
    return { ok: true };
  });

export const publishScheduleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "schedules");
    return B.publishSchedule(ctx, data.scheduleId);
  });

export const changeScheduleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "schedules");
    return B.setScheduleStatus(ctx, data.scheduleId, data.status as ScheduleStatus, data.reason);
  });

export const getScheduleDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "schedules");
    await B.releaseExpiredHolds();
    const schedule = await B.ownedRow<Record<string, unknown>>("bus_schedules", data.scheduleId, ctx.operatorId);

    const [{ data: bus }, { data: route }, { data: stops }, { data: seats }, { data: passengers }] = await Promise.all([
      B.db().from("buses").select("id, name, registration_number, bus_type, is_ac, seating_capacity").eq("id", schedule["bus_id"] as string).single(),
      B.db().from("bus_routes").select("id, name, origin_city, destination_city").eq("id", schedule["route_id"] as string).single(),
      B.db().from("bus_schedule_stops").select("*").eq("schedule_id", data.scheduleId).order("sequence"),
      B.db().from("bus_schedule_seats").select("*").eq("schedule_id", data.scheduleId).order("seat_code"),
      B.db()
        .from("bus_passengers")
        .select("id, seat_code, full_name, age, gender, boarding_status, booking_id, bus_bookings!inner(pnr, status, boarding_stop_id, dropping_stop_id)")
        .eq("schedule_id", data.scheduleId)
        .order("seat_code"),
    ]);

    const revenue = await B.revenueTotals(ctx.operatorId, undefined, undefined, data.scheduleId);
    const seatRows = seats ?? [];

    return {
      role: ctx.role,
      schedule: {
        id: schedule["id"] as string,
        status: schedule["status"] as ScheduleStatus,
        departureAt: schedule["departure_at"] as string,
        arrivalAt: schedule["arrival_estimate_at"] as string,
        bookingClosesAt: schedule["booking_closes_at"] as string,
        baseFare: Number(schedule["base_fare"]),
        totalSeats: schedule["total_seats"] as number,
        cancellationPolicy: schedule["cancellation_policy"] as string | null,
        cancelledReason: schedule["cancelled_reason"] as string | null,
        driverId: schedule["driver_id"] as string | null,
      },
      bus,
      route,
      stops: stops ?? [],
      seats: seatRows.map((seat) => ({
        seatCode: seat.seat_code,
        seatType: seat.seat_type,
        deck: seat.deck,
        row: seat.row_index,
        column: seat.column_index,
        fare: Number(seat.fare),
        state: seat.state,
        blockReason: seat.block_reason,
      })),
      seatSummary: {
        total: seatRows.length,
        available: seatRows.filter((seat) => seat.state === "AVAILABLE").length,
        held: seatRows.filter((seat) => seat.state === "HELD").length,
        booked: seatRows.filter((seat) => seat.state === "BOOKED").length,
        blocked: seatRows.filter((seat) => seat.state === "BLOCKED").length,
      },
      manifest: (passengers ?? []).map((passenger) => {
        const booking = passenger.bus_bookings as unknown as { pnr: string; status: string; boarding_stop_id: string; dropping_stop_id: string };
        return {
          id: passenger.id,
          seatCode: passenger.seat_code,
          fullName: passenger.full_name,
          age: passenger.age,
          gender: passenger.gender,
          boardingStatus: passenger.boarding_status,
          bookingId: passenger.booking_id,
          pnr: booking.pnr,
          bookingStatus: booking.status,
          boardingStopId: booking.boarding_stop_id,
          droppingStopId: booking.dropping_stop_id,
        };
      }),
      revenue,
    };
  });

export const setSeatBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => seatBlockSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "seats");
    await B.ownedRow("bus_schedules", data.scheduleId, ctx.operatorId, "id");

    const { data: seats } = await B.db()
      .from("bus_schedule_seats")
      .select("seat_code, state")
      .eq("schedule_id", data.scheduleId)
      .in("seat_code", data.seatCodes);
    for (const seat of seats ?? []) {
      if (data.block && (seat.state === "BOOKED" || seat.state === "HELD")) throw new Error("SEAT_ALREADY_BOOKED");
      if (!data.block && seat.state !== "BLOCKED") throw new Error("INVALID_TRANSITION");
    }

    const { error } = await B.db()
      .from("bus_schedule_seats")
      .update({ state: data.block ? "BLOCKED" : "AVAILABLE", block_reason: data.block ? (data.reason ?? "Operator block") : null })
      .eq("schedule_id", data.scheduleId)
      .in("seat_code", data.seatCodes)
      .in("state", data.block ? ["AVAILABLE"] : ["BLOCKED"]);
    if (error) throw new Error("SEAT_UNAVAILABLE");
    await B.audit(ctx, data.block ? "SEATS_BLOCKED" : "SEATS_UNBLOCKED", "bus_schedule", data.scheduleId, {
      seats: data.seatCodes,
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------- discounts

export const listDiscounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "discounts");
    const { data } = await B.db().from("bus_discounts").select("*").eq("operator_id", ctx.operatorId).order("created_at", { ascending: false });
    return {
      role: ctx.role,
      discounts: (data ?? []).map((discount) => ({
        id: discount.id,
        name: discount.name,
        code: discount.code,
        discountType: discount.discount_type,
        value: Number(discount.value),
        minBookingAmount: Number(discount.min_booking_amount),
        maxDiscountAmount: discount.max_discount_amount ? Number(discount.max_discount_amount) : null,
        startsAt: discount.starts_at,
        endsAt: discount.ends_at,
        usageLimit: discount.usage_limit,
        perUserLimit: discount.per_user_limit,
        usedCount: discount.used_count,
        status: discount.status,
        routeId: discount.route_id,
      })),
    };
  });

export const createDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => discountInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "discounts");
    if (data.discountType === "PERCENT" && data.value > 100) throw new Error("DISCOUNT_INVALID");
    if (data.routeId) await B.ownedRow("bus_routes", data.routeId, ctx.operatorId, "id");
    const { data: discount, error } = await B.db()
      .from("bus_discounts")
      .insert({
        operator_id: ctx.operatorId,
        name: data.name,
        code: data.code.toUpperCase(),
        discount_type: data.discountType,
        value: data.value,
        min_booking_amount: data.minBookingAmount,
        max_discount_amount: data.maxDiscountAmount ?? null,
        starts_at: data.startsAt ?? new Date().toISOString(),
        ends_at: data.endsAt ?? null,
        route_id: data.routeId ?? null,
        usage_limit: data.usageLimit ?? null,
        per_user_limit: data.perUserLimit,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("DUPLICATE_CODE");
      throw new Error("NOT_FOUND");
    }
    await B.audit(ctx, "DISCOUNT_CREATED", "bus_discount", discount.id, { code: data.code });
    return { discountId: discount.id };
  });

export const updateDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => discountUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "discounts");
    await B.ownedRow("bus_discounts", data.discountId, ctx.operatorId, "id");
    const patch: Record<string, unknown> = {};
    if (data.status != null) patch["status"] = data.status;
    if (data.name != null) patch["name"] = data.name;
    if (data.value != null) patch["value"] = data.value;
    if (data.endsAt !== undefined) patch["ends_at"] = data.endsAt;
    await B.db().from("bus_discounts").update(patch as never).eq("id", data.discountId).eq("operator_id", ctx.operatorId);
    await B.audit(ctx, "DISCOUNT_UPDATED", "bus_discount", data.discountId, patch);
    return { ok: true };
  });

// ---------------------------------------------------------------- bookings & passengers

export const listOperatorBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => operatorBookingFilterSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "bookings");

    let query = B.db()
      .from("bus_bookings")
      .select(
        `id, pnr, status, payment_status, total_amount, seat_count, created_at, lead_passenger_name, schedule_id,
         bus_schedules!inner(departure_at, bus_id, route_id, buses!inner(name), bus_routes!inner(origin_city, destination_city))`,
      )
      .eq("operator_id", ctx.operatorId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "ALL") query = query.eq("status", data.status);
    if (data.scheduleId) query = query.eq("schedule_id", data.scheduleId);
    if (data.from) query = query.gte("created_at", `${data.from}T00:00:00Z`);
    if (data.to) query = query.lte("created_at", `${data.to}T23:59:59Z`);
    if (data.search) query = query.or(`pnr.ilike.%${data.search}%,lead_passenger_name.ilike.%${data.search}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error("NOT_FOUND");

    const bookings = (rows ?? [])
      .map((row) => {
        const schedule = row.bus_schedules as unknown as {
          departure_at: string; bus_id: string; route_id: string;
          buses: { name: string }; bus_routes: { origin_city: string; destination_city: string };
        };
        return {
          id: row.id,
          pnr: row.pnr,
          status: row.status,
          paymentStatus: row.payment_status,
          total: Number(row.total_amount),
          seatCount: row.seat_count,
          createdAt: row.created_at,
          passengerName: row.lead_passenger_name,
          scheduleId: row.schedule_id,
          busId: schedule.bus_id,
          routeId: schedule.route_id,
          busName: schedule.buses.name,
          route: `${schedule.bus_routes.origin_city} → ${schedule.bus_routes.destination_city}`,
          departureAt: schedule.departure_at,
        };
      })
      .filter((booking) => (data.busId ? booking.busId === data.busId : true))
      .filter((booking) => (data.routeId ? booking.routeId === data.routeId : true));

    return { role: ctx.role, bookings };
  });

export const getOperatorBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "bookings");
    const booking = await B.ownedRow<Record<string, unknown>>("bus_bookings", data.bookingId, ctx.operatorId);

    const [{ data: passengers }, { data: stops }, { data: schedule }, { data: ledger }] = await Promise.all([
      B.db().from("bus_passengers").select("*").eq("booking_id", data.bookingId).order("seat_code"),
      B.db()
        .from("bus_schedule_stops")
        .select("id, stop_name, city, scheduled_at")
        .in("id", [booking["boarding_stop_id"] as string, booking["dropping_stop_id"] as string]),
      B.db()
        .from("bus_schedules")
        .select("id, departure_at, arrival_estimate_at, status, buses!inner(name, registration_number), bus_routes!inner(name, origin_city, destination_city)")
        .eq("id", booking["schedule_id"] as string)
        .single(),
      B.db().from("bus_ledger_entries").select("entry_type, amount, description, occurred_at").eq("booking_id", data.bookingId).order("occurred_at"),
    ]);

    return {
      role: ctx.role,
      booking: {
        id: booking["id"] as string,
        pnr: booking["pnr"] as string,
        status: booking["status"] as string,
        paymentStatus: booking["payment_status"] as string,
        total: Number(booking["total_amount"]),
        seatTotal: Number(booking["seat_total"]),
        discountAmount: Number(booking["discount_amount"]),
        discountCode: booking["discount_code"] as string | null,
        taxAmount: Number(booking["tax_amount"]),
        refundAmount: Number(booking["refund_amount"]),
        cancellationFee: Number(booking["cancellation_fee"]),
        cancellationReason: booking["cancellation_reason"] as string | null,
        createdAt: booking["created_at"] as string,
        confirmedAt: booking["confirmed_at"] as string | null,
        cancelledAt: booking["cancelled_at"] as string | null,
        completedAt: booking["completed_at"] as string | null,
        leadPassengerName: booking["lead_passenger_name"] as string,
        leadPassengerPhone: booking["lead_passenger_phone"] as string,
        seatCount: booking["seat_count"] as number,
      },
      schedule,
      boarding: (stops ?? []).find((stop) => stop.id === booking["boarding_stop_id"]) ?? null,
      dropping: (stops ?? []).find((stop) => stop.id === booking["dropping_stop_id"]) ?? null,
      passengers: passengers ?? [],
      ledger: ledger ?? [],
    };
  });

export const operatorCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({
    bookingId: String((input as { bookingId: string }).bookingId),
    reason: String((input as { reason: string }).reason ?? "").slice(0, 200) || "Cancelled by operator",
  }))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "bookings");
    await B.ownedRow("bus_bookings", data.bookingId, ctx.operatorId, "id");
    const result = await B.cancelBooking(data.bookingId, "OPERATOR", data.reason);
    await B.audit(ctx, "BOOKING_CANCELLED", "bus_booking", data.bookingId, { reason: data.reason, refund: result.refund });
    return result;
  });

export const updateBoardingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => boardingUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "passengers");
    const { data: passenger } = await B.db()
      .from("bus_passengers")
      .select("id, operator_id, boarding_status")
      .eq("id", data.passengerId)
      .maybeSingle();
    if (!passenger || passenger.operator_id !== ctx.operatorId) throw new Error("NOT_FOUND");
    if (passenger.boarding_status === "CANCELLED") throw new Error("INVALID_TRANSITION");
    await B.db().from("bus_passengers").update({ boarding_status: data.status }).eq("id", data.passengerId);
    await B.audit(ctx, "BOARDING_STATUS_UPDATED", "bus_passenger", data.passengerId, { status: data.status });
    return { ok: true };
  });

export const validateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ticketValidationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "passengers");
    const { data: booking } = await B.db()
      .from("bus_bookings")
      .select("id, pnr, status, payment_status, operator_id, schedule_id, seat_count, lead_passenger_name, bus_schedules!inner(departure_at, status)")
      .eq("pnr", data.pnr.trim().toUpperCase())
      .maybeSingle();
    if (!booking || booking.operator_id !== ctx.operatorId) return { valid: false as const, reason: "Ticket not found for your account." };
    const schedule = booking.bus_schedules as unknown as { departure_at: string; status: string };
    const valid = booking.status === "CONFIRMED" && booking.payment_status === "PAID";
    return {
      valid,
      reason: valid ? null : `Booking is ${booking.status.toLowerCase().replace(/_/g, " ")}.`,
      booking: {
        id: booking.id,
        pnr: booking.pnr,
        status: booking.status,
        seatCount: booking.seat_count,
        passengerName: booking.lead_passenger_name,
        departureAt: schedule.departure_at,
        tripStatus: schedule.status,
      },
    };
  });

// ---------------------------------------------------------------- revenue, settlement, reports

export const getOperatorRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportFilterSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "revenue");
    const { from, to } = resolveRange(data.preset, data.from, data.to);
    const totals = await B.revenueTotals(ctx.operatorId, from, to, data.scheduleId);

    const { data: schedules } = await B.db()
      .from("bus_schedules")
      .select("id, departure_at, total_seats, buses!inner(name), bus_routes!inner(origin_city, destination_city)")
      .eq("operator_id", ctx.operatorId)
      .gte("departure_at", from)
      .lte("departure_at", to)
      .order("departure_at", { ascending: false })
      .limit(50);

    const scheduleIds = (schedules ?? []).map((row) => row.id);
    const perTrip = new Map<string, { gross: number; discounts: number; refunds: number; commission: number }>();
    const bookedSeats = new Map<string, number>();
    if (scheduleIds.length > 0) {
      const [{ data: ledger }, { data: seats }] = await Promise.all([
        B.db().from("bus_ledger_entries").select("schedule_id, entry_type, amount").eq("operator_id", ctx.operatorId).in("schedule_id", scheduleIds),
        B.db().from("bus_schedule_seats").select("schedule_id, state").in("schedule_id", scheduleIds),
      ]);
      for (const row of ledger ?? []) {
        if (!row.schedule_id) continue;
        const bucket = perTrip.get(row.schedule_id) ?? { gross: 0, discounts: 0, refunds: 0, commission: 0 };
        const amount = Number(row.amount);
        if (row.entry_type === "BOOKING") bucket.gross += amount;
        else if (row.entry_type === "DISCOUNT") bucket.discounts += Math.abs(amount);
        else if (row.entry_type === "REFUND") bucket.refunds += Math.abs(amount);
        else if (row.entry_type === "COMMISSION") bucket.commission += Math.abs(amount);
        perTrip.set(row.schedule_id, bucket);
      }
      for (const seat of seats ?? []) {
        if (seat.state === "BOOKED") bookedSeats.set(seat.schedule_id, (bookedSeats.get(seat.schedule_id) ?? 0) + 1);
      }
    }

    return {
      role: ctx.role,
      range: { from, to },
      totals,
      trips: (schedules ?? []).map((row) => {
        const bucket = perTrip.get(row.id) ?? { gross: 0, discounts: 0, refunds: 0, commission: 0 };
        const route = row.bus_routes as unknown as { origin_city: string; destination_city: string };
        const bus = row.buses as unknown as { name: string };
        return {
          scheduleId: row.id,
          departureAt: row.departure_at,
          busName: bus.name,
          route: `${route.origin_city} → ${route.destination_city}`,
          totalSeats: row.total_seats,
          bookedSeats: bookedSeats.get(row.id) ?? 0,
          ...bucket,
          net: Number((bucket.gross - bucket.discounts - bucket.refunds - bucket.commission).toFixed(2)),
        };
      }),
    };
  });

export const listSettlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "settlement");
    const { data } = await B.db()
      .from("bus_settlements")
      .select("*")
      .eq("operator_id", ctx.operatorId)
      .order("period_end", { ascending: false });
    const unsettled = await B.revenueTotals(ctx.operatorId);
    const settled = (data ?? []).reduce((sum, row) => sum + Number(row.net_amount), 0);
    return {
      role: ctx.role,
      settlements: (data ?? []).map((row) => ({
        id: row.id,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        gross: Number(row.gross_amount),
        commission: Number(row.commission_amount),
        refundAdjustment: Number(row.refund_adjustment),
        otherAdjustment: Number(row.other_adjustment),
        net: Number(row.net_amount),
        status: row.status,
        reference: row.reference,
        paidAt: row.paid_at,
      })),
      lifetimeNet: unsettled.netPayable,
      settledNet: Number(settled.toFixed(2)),
      pendingNet: Number((unsettled.netPayable - settled).toFixed(2)),
    };
  });

function resolveRange(preset: string, from?: string, to?: string) {
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
  switch (preset) {
    case "TODAY":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "YESTERDAY": {
      const yesterday = new Date(now.getTime() - 86_400_000);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "WEEK": {
      const start = new Date(now.getTime() - 6 * 86_400_000);
      return { from: startOfDay(start), to: endOfDay(now) };
    }
    case "CUSTOM":
      return {
        from: from ? `${from}T00:00:00.000Z` : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: to ? `${to}T23:59:59.999Z` : endOfDay(now),
      };
    default:
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
  }
}

export const getOperatorReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportFilterSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "reports");
    const { from, to } = resolveRange(data.preset, data.from, data.to);

    const [{ data: bookings }, { data: schedules }, totals] = await Promise.all([
      B.db()
        .from("bus_bookings")
        .select("id, status, seat_count, total_amount, schedule_id, created_at")
        .eq("operator_id", ctx.operatorId)
        .gte("created_at", from)
        .lte("created_at", to),
      B.db()
        .from("bus_schedules")
        .select("id, bus_id, route_id, total_seats, status, departure_at, buses!inner(name), bus_routes!inner(origin_city, destination_city)")
        .eq("operator_id", ctx.operatorId)
        .gte("departure_at", from)
        .lte("departure_at", to),
      B.revenueTotals(ctx.operatorId, from, to),
    ]);

    const filteredSchedules = (schedules ?? [])
      .filter((row) => (data.busId ? row.bus_id === data.busId : true))
      .filter((row) => (data.routeId ? row.route_id === data.routeId : true));
    const scheduleIds = new Set(filteredSchedules.map((row) => row.id));
    const filteredBookings = (bookings ?? []).filter((row) => (scheduleIds.size > 0 ? scheduleIds.has(row.schedule_id) : true));

    const bookingByStatus: Record<string, number> = {};
    let passengerCount = 0;
    for (const booking of filteredBookings) {
      bookingByStatus[booking.status] = (bookingByStatus[booking.status] ?? 0) + 1;
      if (["CONFIRMED", "COMPLETED"].includes(booking.status)) passengerCount += booking.seat_count;
    }

    const seatTotals = filteredSchedules.reduce((sum, row) => sum + row.total_seats, 0);
    let bookedSeats = 0;
    if (scheduleIds.size > 0) {
      const { data: seats } = await B.db()
        .from("bus_schedule_seats")
        .select("state")
        .in("schedule_id", [...scheduleIds])
        .eq("state", "BOOKED");
      bookedSeats = seats?.length ?? 0;
    }

    const perBus = new Map<string, { name: string; trips: number; seats: number; booked: number }>();
    for (const schedule of filteredSchedules) {
      const bus = schedule.buses as unknown as { name: string };
      const bucket = perBus.get(schedule.bus_id) ?? { name: bus.name, trips: 0, seats: 0, booked: 0 };
      bucket.trips += 1;
      bucket.seats += schedule.total_seats;
      perBus.set(schedule.bus_id, bucket);
    }

    return {
      role: ctx.role,
      range: { from, to },
      bookingReport: { total: filteredBookings.length, byStatus: bookingByStatus },
      tripReport: {
        trips: filteredSchedules.length,
        seats: seatTotals,
        bookedSeats,
        occupancyPercent: seatTotals > 0 ? Number(((bookedSeats / seatTotals) * 100).toFixed(1)) : 0,
      },
      revenueReport: totals,
      busReport: [...perBus.entries()].map(([id, bucket]) => ({ id, ...bucket })),
      passengerReport: { passengers: passengerCount },
    };
  });

// ---------------------------------------------------------------- staff, profile, notifications, audit, support

export const listOperatorStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "staff");
    const { data } = await B.db().from("operator_staff").select("*").eq("operator_id", ctx.operatorId).order("created_at");
    return {
      role: ctx.role,
      staff: (data ?? []).map((member) => ({
        id: member.id,
        role: member.role as OperatorRole,
        fullName: member.full_name,
        email: member.email,
        isActive: member.is_active,
        isSelf: member.user_id === context.userId,
        createdAt: member.created_at,
      })),
    };
  });

export const addOperatorStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => staffInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "staff");
    if (ctx.role !== "OWNER") throw new Error("FORBIDDEN");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error("NOT_FOUND");
    const match = users.users.find((user) => user.email?.toLowerCase() === data.email.toLowerCase());
    if (!match) throw new Error("NOT_FOUND");

    const { error: insertError } = await B.db().from("operator_staff").insert({
      operator_id: ctx.operatorId,
      user_id: match.id,
      role: data.role,
      full_name: data.fullName ?? null,
      email: data.email,
    });
    if (insertError) throw new Error("DUPLICATE_CODE");
    await B.audit(ctx, "STAFF_ADDED", "operator_staff", match.id, { role: data.role });
    return { ok: true };
  });

export const updateOperatorStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => staffUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "staff");
    if (ctx.role !== "OWNER") throw new Error("FORBIDDEN");
    if (data.staffId === ctx.staffId) throw new Error("FORBIDDEN");
    const patch: Record<string, unknown> = {};
    if (data.role != null) patch["role"] = data.role;
    if (data.isActive != null) patch["is_active"] = data.isActive;
    await B.db().from("operator_staff").update(patch as never).eq("id", data.staffId).eq("operator_id", ctx.operatorId);
    await B.audit(ctx, "STAFF_UPDATED", "operator_staff", data.staffId, patch);
    return { ok: true };
  });

export const updateOperatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => operatorProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireWrite(ctx, "profile");
    const patch: Record<string, unknown> = {};
    if (data.contactPerson != null) patch["contact_person"] = data.contactPerson;
    if (data.contactPhone != null) patch["contact_phone"] = data.contactPhone;
    if (data.contactEmail != null) patch["contact_email"] = data.contactEmail || null;
    if (data.address != null) patch["address"] = data.address;
    if (data.city != null) patch["city"] = data.city;
    if (data.state != null) patch["state"] = data.state;
    if (data.bankAccountName != null) patch["bank_account_name"] = data.bankAccountName;
    if (data.bankAccountLast4 != null) patch["bank_account_last4"] = data.bankAccountLast4;
    if (data.bankIfsc != null) patch["bank_ifsc"] = data.bankIfsc.toUpperCase();
    await B.db().from("bus_operators").update(patch as never).eq("id", ctx.operatorId);
    await B.audit(ctx, "OPERATOR_PROFILE_UPDATED", "bus_operator", ctx.operatorId, { fields: Object.keys(patch) });
    return { ok: true };
  });

export const listOperatorNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    const { data } = await B.db()
      .from("operator_notifications")
      .select("*")
      .eq("operator_id", ctx.operatorId)
      .order("created_at", { ascending: false })
      .limit(100);
    return {
      notifications: (data ?? []).map((row) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        body: row.body,
        linkPath: row.link_path,
        readAt: row.read_at,
        createdAt: row.created_at,
      })),
      unread: (data ?? []).filter((row) => !row.read_at).length,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => notificationReadSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    let query = B.db().from("operator_notifications").update({ read_at: new Date().toISOString() }).eq("operator_id", ctx.operatorId).is("read_at", null);
    if (!data.all && data.notificationId) query = query.eq("id", data.notificationId);
    await query;
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "audit");
    const { data } = await B.db()
      .from("operator_audit_logs")
      .select("id, action, object_type, object_id, actor_role, result, metadata, created_at")
      .eq("operator_id", ctx.operatorId)
      .order("created_at", { ascending: false })
      .limit(200);
    return { entries: data ?? [] };
  });

export const listOperatorTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "support");
    const { data } = await B.db()
      .from("support_tickets")
      .select("id, reference, category, subject, description, status, created_at, booking_id")
      .eq("operator_id", ctx.operatorId)
      .order("created_at", { ascending: false })
      .limit(100);
    return { tickets: data ?? [] };
  });

export const createOperatorTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => supportTicketSchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "support");
    const reference = `OPS-${Date.now().toString(36).toUpperCase()}`;
    const { data: ticket, error } = await B.db()
      .from("support_tickets")
      .insert({
        reference,
        operator_id: ctx.operatorId,
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

export const replyToOperatorTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ticketReplySchema.parse(input))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const ctx = await B.operatorContext(context.userId);
    B.requireView(ctx, "support");
    const { data: ticket } = await B.db().from("support_tickets").select("id, operator_id, status").eq("id", data.ticketId).maybeSingle();
    if (!ticket || ticket.operator_id !== ctx.operatorId) throw new Error("NOT_FOUND");
    if (ticket.status === "CLOSED") throw new Error("INVALID_TRANSITION");
    await B.db().from("support_ticket_messages").insert({
      ticket_id: data.ticketId,
      author_user_id: context.userId,
      author_type: "OPERATOR",
      body: data.body,
    });
    return { ok: true };
  });

export const getTicketThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ({ ticketId: String((input as { ticketId: string }).ticketId) }))
  .handler(async ({ data, context }) => {
    const B = await import("./bus.server");
    const { data: ticket } = await B.db().from("support_tickets").select("*").eq("id", data.ticketId).maybeSingle();
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.created_by !== context.userId) {
      const ctx = await B.operatorContext(context.userId);
      if (ticket.operator_id !== ctx.operatorId) throw new Error("FORBIDDEN");
    }
    const { data: messages } = await B.db()
      .from("support_ticket_messages")
      .select("id, author_type, body, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at");
    return { ticket, messages: messages ?? [] };
  });
