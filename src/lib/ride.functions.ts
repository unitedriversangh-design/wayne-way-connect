import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  availabilitySchema,
  bookingIdSchema,
  cancelBookingSchema,
  completeRideSchema,
  createBookingSchema,
  driverLocationSchema,
  driverRegistrationSchema,
  estimateSchema,
  startRideSchema,
} from "./ride-schemas";
import { haversineKm } from "./ride-shared";
import type { BookingStatus, FareSnapshot } from "./ride-shared";

/** Bike service availability plus the live fare configuration. */
export const getBikeService = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const R = await import("./ride.server");
    const [config, fare] = await Promise.all([R.getServiceConfig("BIKE"), R.getFareConfig("BIKE")]);
    return {
      enabled: config.is_enabled,
      routeSource: process.env["ROUTING_OSRM_URL"] ? "ROUTE_PROVIDER" : "HAVERSINE_FALLBACK",
      fare: {
        baseFare: fare.base_fare,
        perKmRate: fare.per_km_rate,
        perMinuteRate: fare.per_minute_rate,
        minimumFare: fare.minimum_fare,
        currency: fare.currency,
        version: fare.version,
      },
    };
  });

/** Route + fare estimate. The server always recalculates before booking. */
export const estimateBikeRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => estimateSchema.parse(input))
  .handler(async ({ data }) => {
    const R = await import("./ride.server");
    const [service, fare] = await Promise.all([R.getServiceConfig("BIKE"), R.getFareConfig("BIKE")]);
    if (!service.is_enabled) throw R.rideError("SERVICE_UNAVAILABLE");

    const straightMetres = haversineKm(data.pickup, data.destination) * 1000;
    if (straightMetres < service.min_trip_distance_metres) {
      throw R.rideError("PICKUP_TOO_CLOSE");
    }

    const route = await R.calculateRoute(data.pickup, data.destination, fare);
    const { snapshot, amount } = R.calculateFare(fare, route);
    return {
      distanceMetres: route.distanceMetres,
      durationSeconds: route.durationSeconds,
      routeSource: route.source,
      estimatedFare: amount,
      currency: snapshot.currency,
      breakdown: snapshot,
    };
  });

/** Creates a bike booking and immediately starts the driver search. */
export const createBikeBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createBookingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const customerId = context.userId;

    const { data: existing } = await supabaseAdmin
      .from("bookings")
      .select("id, public_id, status")
      .eq("customer_id", customerId)
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing) {
      return { bookingId: existing.id, publicId: existing.public_id, status: existing.status };
    }

    const [service, fare] = await Promise.all([R.getServiceConfig("BIKE"), R.getFareConfig("BIKE")]);
    if (!service.is_enabled) throw R.rideError("SERVICE_UNAVAILABLE");

    const straightMetres = haversineKm(data.pickup, data.destination) * 1000;
    if (straightMetres < service.min_trip_distance_metres) throw R.rideError("PICKUP_TOO_CLOSE");

    const route = await R.calculateRoute(data.pickup, data.destination, fare);
    const { snapshot, amount } = R.calculateFare(fare, route);
    const now = new Date();

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        public_id: R.newPublicBookingId(),
        customer_id: customerId,
        service_type: "BIKE",
        status: "REQUESTED",
        idempotency_key: data.idempotencyKey,
        pickup_latitude: data.pickup.latitude,
        pickup_longitude: data.pickup.longitude,
        pickup_address: data.pickup.address,
        pickup_source: data.pickup.source,
        destination_latitude: data.destination.latitude,
        destination_longitude: data.destination.longitude,
        destination_address: data.destination.address,
        route_source: route.source,
        estimated_distance_metres: route.distanceMetres,
        estimated_duration_seconds: route.durationSeconds,
        fare_snapshot: snapshot as never,
        estimated_fare: amount,
        currency: snapshot.currency,
        fare_config_version: fare.version,
        requested_at: now.toISOString(),
        expires_at: new Date(now.getTime() + service.request_timeout_seconds * 1000).toISOString(),
      })
      .select("id, public_id")
      .single();

    if (error || !booking) {
      // A concurrent duplicate lost the unique-index race: return the winner.
      const { data: duplicate } = await supabaseAdmin
        .from("bookings")
        .select("id, public_id, status")
        .eq("customer_id", customerId)
        .eq("idempotency_key", data.idempotencyKey)
        .maybeSingle();
      if (duplicate) {
        return { bookingId: duplicate.id, publicId: duplicate.public_id, status: duplicate.status };
      }
      throw R.rideError("INVALID_RIDE_STATE", error?.message ?? "booking insert failed");
    }

    await R.recordEvent({
      bookingId: booking.id,
      eventType: "booking_created",
      actorType: "CUSTOMER",
      actorId: customerId,
      toStatus: "REQUESTED",
      metadata: { public_id: booking.public_id, estimated_fare: amount },
    });

    await R.transition({
      bookingId: booking.id,
      from: "REQUESTED",
      to: "SEARCHING_DRIVER",
      patch: { search_started_at: now.toISOString(), search_radius_km: service.initial_radius_km },
      actorType: "SYSTEM",
      eventType: "driver_search_started",
    });

    await R.dispatchDriverRequests({
      id: booking.id,
      pickup: { latitude: data.pickup.latitude, longitude: data.pickup.longitude },
      service_type: "BIKE",
      config: service,
    });

    return { bookingId: booking.id, publicId: booking.public_id, status: "SEARCHING_DRIVER" };
  });

/** Authoritative booking state for the owning customer. */
export const getCustomerBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let booking = await R.loadBooking(data.bookingId, context.userId, "CUSTOMER");
    await R.advanceSearch(booking);
    if (booking.status === "SEARCHING_DRIVER") {
      booking = await R.loadBooking(data.bookingId, context.userId, "CUSTOMER");
    }

    const driver = booking.driver_id ? await R.publicDriverDetails(booking.driver_id) : null;

    let rideOtp: string | null = null;
    const otpLive =
      booking.ride_otp_hash != null &&
      booking.ride_otp_expires_at != null &&
      new Date(booking.ride_otp_expires_at).getTime() > Date.now();
    if (otpLive && booking.arrived_at) {
      rideOtp = await R.deriveRideOtp(booking.id, booking.arrived_at);
    }

    const { data: events } = await supabaseAdmin
      .from("ride_events")
      .select("id, event_type, actor_type, to_status, created_at")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true });

    const { data: lastPoint } = await supabaseAdmin
      .from("ride_locations")
      .select("latitude, longitude, recorded_at")
      .eq("booking_id", booking.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      booking: {
        id: booking.id,
        publicId: booking.public_id,
        status: booking.status as BookingStatus,
        serviceType: booking.service_type,
        pickup: {
          latitude: booking.pickup_latitude,
          longitude: booking.pickup_longitude,
          address: booking.pickup_address,
        },
        destination: {
          latitude: booking.destination_latitude,
          longitude: booking.destination_longitude,
          address: booking.destination_address,
        },
        estimatedDistanceMetres: booking.estimated_distance_metres,
        estimatedDurationSeconds: booking.estimated_duration_seconds,
        finalDistanceMetres: booking.final_distance_metres,
        finalDurationSeconds: booking.final_duration_seconds,
        estimatedFare: Number(booking.estimated_fare),
        finalFare: booking.final_fare == null ? null : Number(booking.final_fare),
        currency: booking.currency,
        fareSnapshot: booking.fare_snapshot as unknown as FareSnapshot,
        routeSource: booking.route_source,
        requestedAt: booking.requested_at,
        acceptedAt: booking.accepted_at,
        arrivedAt: booking.arrived_at,
        startedAt: booking.started_at,
        completedAt: booking.completed_at,
        cancelledAt: booking.cancelled_at,
        expiresAt: booking.expires_at,
      },
      driver,
      rideOtp,
      liveLocation: lastPoint ?? null,
      events: events ?? [],
    };
  });

/** Customer cancels their own ride while it is still cancellable. */
export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelBookingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const booking = await R.loadBooking(data.bookingId, context.userId, "CUSTOMER");

    await R.transition({
      bookingId: booking.id,
      from: booking.status as BookingStatus,
      to: "CANCELLED_BY_CUSTOMER",
      patch: {
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason ?? null,
        ride_otp_hash: null,
        ride_otp_expires_at: null,
      },
      actorType: "CUSTOMER",
      actorId: context.userId,
      eventType: "cancelled_by_customer",
    });

    await supabaseAdmin
      .from("booking_driver_requests")
      .update({ status: "SUPERSEDED", responded_at: new Date().toISOString() })
      .eq("booking_id", booking.id)
      .eq("status", "PENDING");

    if (booking.driver_id) await R.releaseDriver(booking.driver_id);
    return { ok: true };
  });

/** Completed and in-flight rides for the signed-in customer. */
export const listCustomerRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select(
        "id, public_id, status, service_type, pickup_address, destination_address, estimated_fare, final_fare, currency, estimated_distance_metres, final_distance_metres, requested_at, completed_at",
      )
      .eq("customer_id", context.userId)
      .order("requested_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("INVALID_RIDE_STATE");
    return data ?? [];
  });

// ============================== DRIVER ==============================

/** Driver account, vehicle, availability and current ride in one read. */
export const getDriverContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const driverId = context.userId;

    const [{ data: profile }, { data: vehicle }, { data: availability }] = await Promise.all([
      supabaseAdmin
        .from("driver_profiles")
        .select("id, full_name, status, phone_number, country_code")
        .eq("id", driverId)
        .maybeSingle(),
      supabaseAdmin
        .from("driver_vehicles")
        .select("id, make_model, registration_number, colour, service_type, is_active")
        .eq("driver_id", driverId)
        .eq("is_active", true)
        .maybeSingle(),
      supabaseAdmin
        .from("driver_availability")
        .select("status, latitude, longitude, location_updated_at, current_booking_id")
        .eq("driver_id", driverId)
        .maybeSingle(),
    ]);

    const { data: active } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, public_id, status, pickup_address, pickup_latitude, pickup_longitude, destination_address, destination_latitude, destination_longitude, estimated_distance_metres, estimated_duration_seconds, estimated_fare, currency, accepted_at, arrived_at, started_at",
      )
      .eq("driver_id", driverId)
      .in("status", ["DRIVER_ASSIGNED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "READY_TO_START", "IN_PROGRESS"])
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      profile: profile ?? null,
      vehicle: vehicle ?? null,
      availability: availability ?? null,
      currentRide: active ?? null,
    };
  });

/**
 * Registers the signed-in user as a bike rider with one vehicle and grants the
 * driver role. Phase 4 has no admin approval portal yet, so a new rider profile
 * is approved on creation; the approval field stays authoritative for matching.
 */
export const registerAsDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => driverRegistrationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const driverId = context.userId;
    const now = new Date().toISOString();

    const { error: profileError } = await supabaseAdmin.from("driver_profiles").upsert(
      {
        id: driverId,
        full_name: data.fullName,
        phone_number: data.phoneNumber,
        country_code: "+91",
        status: "APPROVED",
        approved_at: now,
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error("INVALID_RIDE_STATE");

    await supabaseAdmin
      .from("driver_vehicles")
      .update({ is_active: false })
      .eq("driver_id", driverId);

    const { error: vehicleError } = await supabaseAdmin.from("driver_vehicles").insert({
      driver_id: driverId,
      service_type: "BIKE",
      make_model: data.makeModel,
      registration_number: data.registrationNumber.toUpperCase(),
      colour: data.colour ?? null,
      is_active: true,
      verified_at: now,
    });
    if (vehicleError) throw new Error("INVALID_RIDE_STATE");

    await supabaseAdmin
      .from("driver_availability")
      .upsert({ driver_id: driverId, service_type: "BIKE", status: "OFFLINE" }, { onConflict: "driver_id" });

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: driverId, role: "driver" }, { onConflict: "user_id,role" });

    return { ok: true };
  });

/** Driver goes online or offline. A busy driver cannot go offline mid-ride. */
export const setDriverAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => availabilitySchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const driverId = context.userId;
    await R.requireEligibleDriver(driverId);

    const { data: current } = await supabaseAdmin
      .from("driver_availability")
      .select("status, current_booking_id")
      .eq("driver_id", driverId)
      .maybeSingle();
    if (current?.status === "BUSY" && current.current_booking_id) {
      throw R.rideError("INVALID_RIDE_STATE", "driver is on an active ride");
    }

    const now = new Date().toISOString();
    const hasLocation = data.latitude != null && data.longitude != null;
    if (data.status === "ONLINE" && !hasLocation) throw R.rideError("LOCATION_UNAVAILABLE");

    const { error } = await supabaseAdmin.from("driver_availability").upsert(
      {
        driver_id: driverId,
        service_type: "BIKE",
        status: data.status,
        ...(hasLocation
          ? { latitude: data.latitude!, longitude: data.longitude!, location_updated_at: now }
          : {}),
        last_seen_at: now,
      },
      { onConflict: "driver_id" },
    );
    if (error) throw R.rideError("INVALID_RIDE_STATE", error.message);
    return { status: data.status };
  });

/**
 * Authenticated, timestamped and rate-limited driver location update. Points are
 * appended to the ride trace only while the driver's own ride is in progress.
 */
export const updateDriverLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => driverLocationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const driverId = context.userId;
    const now = new Date();

    const { data: availability } = await supabaseAdmin
      .from("driver_availability")
      .select("location_updated_at, current_booking_id")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (
      availability?.location_updated_at &&
      now.getTime() - new Date(availability.location_updated_at).getTime() < 2000
    ) {
      throw R.rideError("RATE_LIMITED", "location updates throttled");
    }

    await supabaseAdmin.from("driver_availability").upsert(
      {
        driver_id: driverId,
        service_type: "BIKE",
        latitude: data.latitude,
        longitude: data.longitude,
        location_updated_at: now.toISOString(),
        last_seen_at: now.toISOString(),
      },
      { onConflict: "driver_id" },
    );

    if (data.bookingId) {
      const booking = await R.loadBooking(data.bookingId, driverId, "DRIVER");
      if (["DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "READY_TO_START", "IN_PROGRESS"].includes(booking.status)) {
        await supabaseAdmin.from("ride_locations").insert({
          booking_id: booking.id,
          driver_id: driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy_metres: data.accuracyMetres ?? null,
          recorded_at: now.toISOString(),
        });
      }
    }

    return { ok: true, recordedAt: now.toISOString() };
  });

/** Pending ride offers for the signed-in driver. */
export const listDriverRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    await supabaseAdmin
      .from("booking_driver_requests")
      .update({ status: "EXPIRED", responded_at: nowIso })
      .eq("driver_id", context.userId)
      .eq("status", "PENDING")
      .lt("expires_at", nowIso);

    const { data: requests } = await supabaseAdmin
      .from("booking_driver_requests")
      .select("id, booking_id, expires_at, distance_to_pickup_km")
      .eq("driver_id", context.userId)
      .eq("status", "PENDING")
      .order("sent_at", { ascending: true });

    if (!requests || requests.length === 0) return [];

    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, public_id, status, pickup_address, destination_address, estimated_distance_metres, estimated_duration_seconds, estimated_fare, currency",
      )
      .in(
        "id",
        requests.map((request) => request.booking_id),
      )
      .eq("status", "SEARCHING_DRIVER");

    const byId = new Map((bookings ?? []).map((booking) => [booking.id, booking]));
    return requests
      .filter((request) => byId.has(request.booking_id))
      .map((request) => ({
        requestId: request.id,
        expiresAt: request.expires_at,
        distanceToPickupKm: request.distance_to_pickup_km,
        booking: byId.get(request.booking_id)!,
      }));
  });

/**
 * Atomically claims a ride. The driver's availability row and the booking row
 * are both claimed conditionally, so two drivers can never both succeed.
 */
export const acceptRideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const driverId = context.userId;
    const { vehicleId } = await R.requireEligibleDriver(driverId);
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: offer } = await supabaseAdmin
      .from("booking_driver_requests")
      .select("id, status, expires_at")
      .eq("booking_id", data.bookingId)
      .eq("driver_id", driverId)
      .maybeSingle();
    if (!offer) throw R.rideError("UNAUTHORIZED_RIDE", "no offer for this driver");
    if (offer.status === "ACCEPTED") return { ok: true, alreadyAccepted: true };
    if (offer.status !== "PENDING" || new Date(offer.expires_at).getTime() < now.getTime()) {
      throw R.rideError("REQUEST_EXPIRED");
    }

    // 1) Claim the driver: only an ONLINE, unassigned driver can be claimed.
    const { data: claimedDriver } = await supabaseAdmin
      .from("driver_availability")
      .update({ status: "BUSY", current_booking_id: data.bookingId, last_seen_at: nowIso })
      .eq("driver_id", driverId)
      .eq("status", "ONLINE")
      .is("current_booking_id", null)
      .select("driver_id")
      .maybeSingle();
    if (!claimedDriver) throw R.rideError("DRIVER_NOT_ELIGIBLE", "driver not online/free");

    // 2) Claim the booking: only an unassigned, still-searching booking wins.
    const { data: claimedBooking } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "DRIVER_ASSIGNED",
        driver_id: driverId,
        vehicle_id: vehicleId,
        accepted_at: nowIso,
      })
      .eq("id", data.bookingId)
      .eq("status", "SEARCHING_DRIVER")
      .is("driver_id", null)
      .select("id, public_id")
      .maybeSingle();

    if (!claimedBooking) {
      await R.releaseDriver(driverId);
      await supabaseAdmin
        .from("booking_driver_requests")
        .update({ status: "SUPERSEDED", responded_at: nowIso })
        .eq("id", offer.id);
      throw R.rideError("BOOKING_ALREADY_ASSIGNED");
    }

    await supabaseAdmin
      .from("booking_driver_requests")
      .update({ status: "ACCEPTED", responded_at: nowIso })
      .eq("id", offer.id);
    await supabaseAdmin
      .from("booking_driver_requests")
      .update({ status: "SUPERSEDED", responded_at: nowIso })
      .eq("booking_id", data.bookingId)
      .eq("status", "PENDING");

    await R.recordEvent({
      bookingId: data.bookingId,
      eventType: "driver_assigned",
      actorType: "DRIVER",
      actorId: driverId,
      fromStatus: "SEARCHING_DRIVER",
      toStatus: "DRIVER_ASSIGNED",
    });

    await R.transition({
      bookingId: data.bookingId,
      from: "DRIVER_ASSIGNED",
      to: "DRIVER_EN_ROUTE",
      actorType: "DRIVER",
      actorId: driverId,
      eventType: "driver_en_route",
    });

    return { ok: true, publicId: claimedBooking.public_id };
  });

/** Driver declines an offer; the search continues with other riders. */
export const rejectRideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    const { data: updated } = await supabaseAdmin
      .from("booking_driver_requests")
      .update({ status: "REJECTED", responded_at: nowIso })
      .eq("booking_id", data.bookingId)
      .eq("driver_id", context.userId)
      .eq("status", "PENDING")
      .select("id")
      .maybeSingle();
    if (!updated) return { ok: true, alreadyHandled: true };

    await R.recordEvent({
      bookingId: data.bookingId,
      eventType: "driver_rejected",
      actorType: "DRIVER",
      actorId: context.userId,
      metadata: {},
    });

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, status, expires_at, pickup_latitude, pickup_longitude, service_type")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (booking) await R.advanceSearch(booking as never);

    return { ok: true };
  });

/** Driver marks arrival at pickup; this issues the ride-start code. */
export const markDriverArrived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const booking = await R.loadBooking(data.bookingId, context.userId, "DRIVER");
    if (booking.status === "DRIVER_ARRIVED") return { ok: true, alreadyArrived: true };

    const service = await R.getServiceConfig("BIKE");
    const arrivedAt = new Date();
    const otp = await R.deriveRideOtp(booking.id, arrivedAt.toISOString());
    const otpHash = await R.hashRideOtp(booking.id, otp);

    await R.transition({
      bookingId: booking.id,
      from: booking.status as BookingStatus,
      to: "DRIVER_ARRIVED",
      patch: {
        arrived_at: arrivedAt.toISOString(),
        ride_otp_hash: otpHash,
        ride_otp_expires_at: new Date(
          arrivedAt.getTime() + service.ride_otp_ttl_seconds * 1000,
        ).toISOString(),
        ride_otp_attempts: 0,
      },
      actorType: "DRIVER",
      actorId: context.userId,
      eventType: "driver_arrived",
    });

    void supabaseAdmin; // admin client already used through helpers
    return { ok: true };
  });

/** Validates the ride-start code server-side and starts the ride. */
export const startRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startRideSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const booking = await R.loadBooking(data.bookingId, context.userId, "DRIVER");
    if (booking.status === "IN_PROGRESS") return { ok: true, alreadyStarted: true };
    if (booking.status !== "DRIVER_ARRIVED") throw R.rideError("INVALID_RIDE_STATE", booking.status);
    if (!booking.ride_otp_hash) throw R.rideError("RIDE_OTP_EXPIRED", "no code issued");
    if (booking.ride_otp_expires_at && new Date(booking.ride_otp_expires_at).getTime() < Date.now()) {
      throw R.rideError("RIDE_OTP_EXPIRED");
    }

    const service = await R.getServiceConfig("BIKE");
    if (booking.ride_otp_attempts >= service.ride_otp_max_attempts) {
      throw R.rideError("RIDE_OTP_LOCKED");
    }

    const attemptHash = await R.hashRideOtp(booking.id, data.otp);
    if (!R.timingSafeEqualHex(attemptHash, booking.ride_otp_hash)) {
      await supabaseAdmin
        .from("bookings")
        .update({ ride_otp_attempts: booking.ride_otp_attempts + 1 })
        .eq("id", booking.id);
      await R.recordEvent({
        bookingId: booking.id,
        eventType: "ride_start_code_failed",
        actorType: "DRIVER",
        actorId: context.userId,
        metadata: { attempt: booking.ride_otp_attempts + 1 },
      });
      throw R.rideError("INVALID_RIDE_OTP");
    }

    // Correct code: invalidate it so it can never be replayed.
    await R.transition({
      bookingId: booking.id,
      from: "DRIVER_ARRIVED",
      to: "READY_TO_START",
      patch: { ride_otp_hash: null, ride_otp_expires_at: null },
      actorType: "DRIVER",
      actorId: context.userId,
      eventType: "ride_start_verified",
    });

    await R.transition({
      bookingId: booking.id,
      from: "READY_TO_START",
      to: "IN_PROGRESS",
      patch: { started_at: new Date().toISOString() },
      actorType: "DRIVER",
      actorId: context.userId,
      eventType: "ride_started",
    });

    return { ok: true };
  });

/** Driver completes the ride; the server fixes the final distance and fare. */
export const completeRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => completeRideSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const booking = await R.loadBooking(data.bookingId, context.userId, "DRIVER");
    if (booking.status === "COMPLETED") {
      return { ok: true, alreadyCompleted: true, finalFare: Number(booking.final_fare ?? 0) };
    }
    if (booking.status !== "IN_PROGRESS") throw R.rideError("INVALID_RIDE_STATE", booking.status);

    const completedAt = new Date();
    const tracedMetres = await R.traceDistanceMetres(booking.id);
    const finalDistance = tracedMetres ?? booking.estimated_distance_metres;
    const finalDuration = booking.started_at
      ? Math.max(60, Math.round((completedAt.getTime() - new Date(booking.started_at).getTime()) / 1000))
      : booking.estimated_duration_seconds;

    const snapshot = booking.fare_snapshot as unknown as FareSnapshot;
    const { finalFare, breakdown } = R.computeFinalFare(snapshot, finalDistance, finalDuration);

    await R.transition({
      bookingId: booking.id,
      from: "IN_PROGRESS",
      to: "COMPLETED",
      patch: {
        completed_at: completedAt.toISOString(),
        final_distance_metres: finalDistance,
        final_duration_seconds: finalDuration,
        final_fare: finalFare,
        fare_snapshot: breakdown,
      },
      actorType: "DRIVER",
      actorId: context.userId,
      eventType: "ride_completed",
      metadata: { final_distance_metres: finalDistance, final_fare: finalFare },
    });

    await R.releaseDriver(context.userId);
    return { ok: true, finalFare, finalDistanceMetres: finalDistance, finalDurationSeconds: finalDuration };
  });

/** Driver's own ride, including the pickup detail they are allowed to see. */
export const getDriverRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const R = await import("./ride.server");
    const booking = await R.loadBooking(data.bookingId, context.userId, "DRIVER");
    return {
      id: booking.id,
      publicId: booking.public_id,
      status: booking.status as BookingStatus,
      pickup: {
        latitude: booking.pickup_latitude,
        longitude: booking.pickup_longitude,
        address: booking.pickup_address,
      },
      destination: {
        latitude: booking.destination_latitude,
        longitude: booking.destination_longitude,
        address: booking.destination_address,
      },
      estimatedDistanceMetres: booking.estimated_distance_metres,
      estimatedDurationSeconds: booking.estimated_duration_seconds,
      estimatedFare: Number(booking.estimated_fare),
      finalFare: booking.final_fare == null ? null : Number(booking.final_fare),
      currency: booking.currency,
      acceptedAt: booking.accepted_at,
      arrivedAt: booking.arrived_at,
      startedAt: booking.started_at,
      completedAt: booking.completed_at,
    };
  });

/** Rides assigned to the signed-in driver. */
export const listDriverRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select(
        "id, public_id, status, pickup_address, destination_address, estimated_fare, final_fare, currency, final_distance_metres, estimated_distance_metres, requested_at, completed_at",
      )
      .eq("driver_id", context.userId)
      .order("requested_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("INVALID_RIDE_STATE");
    return data ?? [];
  });
