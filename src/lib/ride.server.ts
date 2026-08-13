/**
 * Server-only ride engine internals: configuration access, routing, the fare
 * engine, ride-start code handling, the state machine guard, event logging and
 * driver matching. Never import this from client-reachable module scope.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  canTransition,
  haversineKm,
  isValidLatitude,
  isValidLongitude,
  type BookingStatus,
  type FareSnapshot,
} from "./ride-shared";

export type RideErrorCode =
  | "DRIVER_NOT_AVAILABLE"
  | "BOOKING_ALREADY_ASSIGNED"
  | "BOOKING_EXPIRED"
  | "INVALID_RIDE_STATE"
  | "INVALID_RIDE_OTP"
  | "RIDE_OTP_EXPIRED"
  | "RIDE_OTP_LOCKED"
  | "UNAUTHORIZED_RIDE"
  | "DRIVER_NOT_ELIGIBLE"
  | "LOCATION_UNAVAILABLE"
  | "ROUTE_CALCULATION_FAILED"
  | "NO_DRIVER_FOUND"
  | "REQUEST_EXPIRED"
  | "DUPLICATE_REQUEST"
  | "SERVICE_UNAVAILABLE"
  | "PICKUP_TOO_CLOSE"
  | "RATE_LIMITED";

/** Errors cross the RPC boundary as messages, so the code is the message. */
export function rideError(code: RideErrorCode, detail?: string): Error {
  if (detail) console.error(`[ride] ${code}: ${detail}`);
  return new Error(code);
}

/** Structured operational log. Never receives OTP values or secrets. */
export function rideLog(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: "ride", event, ...fields }));
}

export type ServiceConfig = {
  service_type: "BIKE" | "AUTO" | "CAB";
  is_enabled: boolean;
  initial_radius_km: number;
  radius_increment_km: number;
  maximum_radius_km: number;
  request_timeout_seconds: number;
  driver_response_seconds: number;
  location_stale_seconds: number;
  ride_otp_ttl_seconds: number;
  ride_otp_max_attempts: number;
  min_trip_distance_metres: number;
};

export type FareConfig = {
  version: number;
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
  minimum_fare: number;
  currency: string;
  road_distance_factor: number;
};

export async function getServiceConfig(serviceType: "BIKE" = "BIKE"): Promise<ServiceConfig> {
  const { data, error } = await supabaseAdmin
    .from("service_configs")
    .select("*")
    .eq("service_type", serviceType)
    .maybeSingle();
  if (error || !data) throw rideError("SERVICE_UNAVAILABLE", error?.message ?? "no service config");
  return {
    service_type: data.service_type,
    is_enabled: data.is_enabled,
    initial_radius_km: Number(data.initial_radius_km),
    radius_increment_km: Number(data.radius_increment_km),
    maximum_radius_km: Number(data.maximum_radius_km),
    request_timeout_seconds: data.request_timeout_seconds,
    driver_response_seconds: data.driver_response_seconds,
    location_stale_seconds: data.location_stale_seconds,
    ride_otp_ttl_seconds: data.ride_otp_ttl_seconds,
    ride_otp_max_attempts: data.ride_otp_max_attempts,
    min_trip_distance_metres: data.min_trip_distance_metres,
  };
}

export async function getFareConfig(serviceType: "BIKE" = "BIKE"): Promise<FareConfig> {
  const { data, error } = await supabaseAdmin
    .from("fare_configs")
    .select("*")
    .eq("service_type", serviceType)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) throw rideError("SERVICE_UNAVAILABLE", error?.message ?? "no fare config");
  return {
    version: data.version,
    base_fare: Number(data.base_fare),
    per_km_rate: Number(data.per_km_rate),
    per_minute_rate: Number(data.per_minute_rate),
    minimum_fare: Number(data.minimum_fare),
    currency: data.currency,
    road_distance_factor: Number(data.road_distance_factor),
  };
}

// ---------------------------------------------------------------- routing

export type Point = { latitude: number; longitude: number };
export type RouteResult = {
  distanceMetres: number;
  durationSeconds: number;
  source: "ROUTE_PROVIDER" | "HAVERSINE_FALLBACK";
};

const FALLBACK_SPEED_KMPH = 22;

/**
 * Road route when a provider is configured (ROUTING_OSRM_URL), otherwise a
 * straight-line distance scaled by the configured road factor. The fallback is
 * explicit and recorded on the booking, never silently presented as a route.
 */
export async function calculateRoute(
  pickup: Point,
  destination: Point,
  fare: FareConfig,
): Promise<RouteResult> {
  for (const point of [pickup, destination]) {
    if (!isValidLatitude(point.latitude) || !isValidLongitude(point.longitude)) {
      throw rideError("LOCATION_UNAVAILABLE", "invalid coordinates");
    }
  }

  const providerBase = process.env["ROUTING_OSRM_URL"];
  if (providerBase) {
    try {
      const url = `${providerBase.replace(/\/$/, "")}/${pickup.longitude},${pickup.latitude};${destination.longitude},${destination.latitude}?overview=false`;
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const body = (await response.json()) as {
          routes?: { distance: number; duration: number }[];
        };
        const route = body.routes?.[0];
        if (route && Number.isFinite(route.distance) && Number.isFinite(route.duration)) {
          return {
            distanceMetres: Math.round(route.distance),
            durationSeconds: Math.round(route.duration),
            source: "ROUTE_PROVIDER",
          };
        }
      }
    } catch (error) {
      console.error("[ride] route provider failed, using fallback", error);
    }
  }

  const straightKm = haversineKm(pickup, destination);
  const roadKm = straightKm * fare.road_distance_factor;
  return {
    distanceMetres: Math.round(roadKm * 1000),
    durationSeconds: Math.round((roadKm / FALLBACK_SPEED_KMPH) * 3600),
    source: "HAVERSINE_FALLBACK",
  };
}

// ---------------------------------------------------------------- fare engine

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Deterministic fare calculation. The server is the only authority on fare. */
export function calculateFare(
  fare: FareConfig,
  route: RouteResult,
): { snapshot: FareSnapshot; amount: number } {
  const distanceKm = round2(route.distanceMetres / 1000);
  const durationMinutes = round2(route.durationSeconds / 60);
  const distanceCharge = round2(distanceKm * fare.per_km_rate);
  const timeCharge = round2(durationMinutes * fare.per_minute_rate);
  const calculated = round2(fare.base_fare + distanceCharge + timeCharge);
  const finalFare = round2(Math.max(calculated, fare.minimum_fare));

  return {
    amount: finalFare,
    snapshot: {
      base_fare: fare.base_fare,
      distance_km: distanceKm,
      per_km_rate: fare.per_km_rate,
      distance_charge: distanceCharge,
      duration_minutes: durationMinutes,
      per_minute_rate: fare.per_minute_rate,
      time_charge: timeCharge,
      minimum_fare: fare.minimum_fare,
      calculated_fare: calculated,
      final_estimated_fare: finalFare,
      currency: fare.currency,
      fare_configuration_version: fare.version,
      route_source: route.source,
    },
  };
}

// ---------------------------------------------------------------- booking ids

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Unpredictable public reference, e.g. WW-BK-7Q2F9KD4. */
export function newPublicBookingId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let out = "";
  for (const byte of bytes) out += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `WW-BK-${out}`;
}

// ---------------------------------------------------------------- ride OTP

function otpPepper(): string {
  const pepper = process.env["RIDE_OTP_PEPPER"];
  if (!pepper) throw rideError("INVALID_RIDE_STATE", "RIDE_OTP_PEPPER is not configured");
  return pepper;
}

/**
 * The ride-start code is derived from the booking id, the arrival timestamp and
 * the server pepper, so the customer's app can be shown the code on demand
 * while no clear-text code is ever stored. Only the hash is persisted, which is
 * what the driver's attempt is checked against.
 */
export async function deriveRideOtp(bookingId: string, arrivedAtIso: string): Promise<string> {
  const data = new TextEncoder().encode(`otp:${bookingId}:${arrivedAtIso}:${otpPepper()}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const value =
    ((digest[0]! << 24) | (digest[1]! << 16) | (digest[2]! << 8) | digest[3]!) >>> 0;
  return (value % 1_000_000).toString().padStart(6, "0");
}

/** Peppered, booking-scoped hash. OTPs are never stored or logged in clear. */
export async function hashRideOtp(bookingId: string, otp: string): Promise<string> {
  const data = new TextEncoder().encode(`${bookingId}:${otp}:${otpPepper()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------- events

export async function recordEvent(input: {
  bookingId: string;
  eventType: string;
  actorType: "CUSTOMER" | "DRIVER" | "SYSTEM";
  actorId?: string | null;
  fromStatus?: BookingStatus | null;
  toStatus?: BookingStatus | null;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("ride_events").insert({
    booking_id: input.bookingId,
    event_type: input.eventType,
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
  rideLog(input.eventType, { booking_id: input.bookingId, actor: input.actorType });
}

/**
 * Guarded state change. The update is conditional on the expected current
 * status, so concurrent callers cannot both apply the same transition.
 */
export async function transition(input: {
  bookingId: string;
  from: BookingStatus;
  to: BookingStatus;
  patch?: Record<string, unknown>;
  actorType: "CUSTOMER" | "DRIVER" | "SYSTEM";
  actorId?: string | null;
  eventType?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!canTransition(input.from, input.to)) {
    throw rideError("INVALID_RIDE_STATE", `${input.from} -> ${input.to}`);
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: input.to, ...(input.patch ?? {}) } as never)
    .eq("id", input.bookingId)
    .eq("status", input.from)
    .select("id, status")
    .maybeSingle();

  if (error) throw rideError("INVALID_RIDE_STATE", error.message);
  if (!data) throw rideError("INVALID_RIDE_STATE", "status changed concurrently");

  await recordEvent({
    bookingId: input.bookingId,
    eventType: input.eventType ?? input.to,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    fromStatus: input.from,
    toStatus: input.to,
    metadata: input.metadata ?? {},
  });

  return data;
}

// ---------------------------------------------------------------- driver state

/** Returns the driver to an available state after a ride ends or is released. */
export async function releaseDriver(driverId: string) {
  await supabaseAdmin
    .from("driver_availability")
    .update({ status: "ONLINE", current_booking_id: null, last_seen_at: new Date().toISOString() })
    .eq("driver_id", driverId);
}

// ---------------------------------------------------------------- matching

type EligibleDriver = { driver_id: string; distanceKm: number; latitude: number; longitude: number };

/**
 * Finds eligible drivers for a pickup point, widening the radius up to the
 * configured maximum. Eligibility: approved driver account, active vehicle for
 * the service, ONLINE, not busy, and a fresh location.
 */
export async function findEligibleDrivers(input: {
  pickup: Point;
  serviceType: "BIKE";
  config: ServiceConfig;
  excludeDriverIds: string[];
}): Promise<EligibleDriver[]> {
  const freshSince = new Date(Date.now() - input.config.location_stale_seconds * 1000).toISOString();

  const { data: available, error } = await supabaseAdmin
    .from("driver_availability")
    .select("driver_id, latitude, longitude, location_updated_at")
    .eq("service_type", input.serviceType)
    .eq("status", "ONLINE")
    .is("current_booking_id", null)
    .gte("location_updated_at", freshSince);

  if (error) throw rideError("DRIVER_NOT_AVAILABLE", error.message);
  const candidates = (available ?? []).filter(
    (row) =>
      row.latitude != null &&
      row.longitude != null &&
      !input.excludeDriverIds.includes(row.driver_id),
  );
  if (candidates.length === 0) return [];

  const ids = candidates.map((row) => row.driver_id);
  const [{ data: profiles }, { data: vehicles }] = await Promise.all([
    supabaseAdmin.from("driver_profiles").select("id, status").in("id", ids),
    supabaseAdmin
      .from("driver_vehicles")
      .select("driver_id")
      .in("driver_id", ids)
      .eq("service_type", input.serviceType)
      .eq("is_active", true),
  ]);

  const approved = new Set((profiles ?? []).filter((p) => p.status === "APPROVED").map((p) => p.id));
  const withVehicle = new Set((vehicles ?? []).map((v) => v.driver_id));

  const eligible = candidates
    .filter((row) => approved.has(row.driver_id) && withVehicle.has(row.driver_id))
    .map((row) => ({
      driver_id: row.driver_id,
      latitude: row.latitude!,
      longitude: row.longitude!,
      distanceKm: haversineKm(input.pickup, {
        latitude: row.latitude!,
        longitude: row.longitude!,
      }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  for (
    let radius = input.config.initial_radius_km;
    radius <= input.config.maximum_radius_km;
    radius += input.config.radius_increment_km
  ) {
    const within = eligible.filter((driver) => driver.distanceKm <= radius);
    if (within.length > 0) return within;
  }
  return [];
}

const MAX_CONCURRENT_OFFERS = 5;

/**
 * Expires stale offers, then offers the ride to the nearest eligible drivers
 * who have not already been asked. Returns how many drivers were newly offered
 * the ride. Safe to call repeatedly (each poll advances the search).
 */
export async function dispatchDriverRequests(booking: {
  id: string;
  pickup: Point;
  service_type: "BIKE";
  config: ServiceConfig;
}): Promise<number> {
  const nowIso = new Date().toISOString();

  await supabaseAdmin
    .from("booking_driver_requests")
    .update({ status: "EXPIRED", responded_at: nowIso })
    .eq("booking_id", booking.id)
    .eq("status", "PENDING")
    .lt("expires_at", nowIso);

  const { data: existing } = await supabaseAdmin
    .from("booking_driver_requests")
    .select("driver_id, status")
    .eq("booking_id", booking.id);

  const pending = (existing ?? []).filter((row) => row.status === "PENDING");
  if (pending.length >= MAX_CONCURRENT_OFFERS) return 0;

  const eligible = await findEligibleDrivers({
    pickup: booking.pickup,
    serviceType: booking.service_type,
    config: booking.config,
    excludeDriverIds: (existing ?? []).map((row) => row.driver_id),
  });
  if (eligible.length === 0) return 0;

  const slots = MAX_CONCURRENT_OFFERS - pending.length;
  const offers = eligible.slice(0, slots);
  const expiresAt = new Date(
    Date.now() + booking.config.driver_response_seconds * 1000,
  ).toISOString();

  const { error } = await supabaseAdmin.from("booking_driver_requests").insert(
    offers.map((driver) => ({
      booking_id: booking.id,
      driver_id: driver.driver_id,
      status: "PENDING" as const,
      distance_to_pickup_km: Number(driver.distanceKm.toFixed(2)),
      sent_at: nowIso,
      expires_at: expiresAt,
    })),
  );
  if (error) {
    console.error("[ride] offer insert failed", error.message);
    return 0;
  }

  await recordEvent({
    bookingId: booking.id,
    eventType: "driver_request_sent",
    actorType: "SYSTEM",
    metadata: { offered: offers.length },
  });
  return offers.length;
}

/** Safe driver details a customer may see for their assigned ride. */
export async function publicDriverDetails(driverId: string, serviceType: "BIKE" = "BIKE") {
  const [{ data: profile }, { data: vehicle }, { data: availability }] = await Promise.all([
    supabaseAdmin.from("driver_profiles").select("full_name, photo_path").eq("id", driverId).maybeSingle(),
    supabaseAdmin
      .from("driver_vehicles")
      .select("make_model, registration_number, colour")
      .eq("driver_id", driverId)
      .eq("service_type", serviceType)
      .eq("is_active", true)
      .maybeSingle(),
    supabaseAdmin
      .from("driver_availability")
      .select("latitude, longitude, location_updated_at")
      .eq("driver_id", driverId)
      .maybeSingle(),
  ]);

  const staleAfterMs = 120_000;
  const updatedAt = availability?.location_updated_at ?? null;
  const fresh = updatedAt ? Date.now() - new Date(updatedAt).getTime() < staleAfterMs : false;

  return {
    name: profile?.full_name ?? "WayneWay rider",
    photoPath: profile?.photo_path ?? null,
    vehicle: vehicle
      ? {
          makeModel: vehicle.make_model,
          registrationNumber: vehicle.registration_number,
          colour: vehicle.colour,
        }
      : null,
    location:
      fresh && availability?.latitude != null && availability.longitude != null
        ? { latitude: availability.latitude, longitude: availability.longitude }
        : null,
    locationStatus: fresh ? ("LIVE" as const) : ("STALE" as const),
    locationUpdatedAt: updatedAt,
  };
}

// ---------------------------------------------------------------- loaders

export type BookingRow = Awaited<ReturnType<typeof loadBooking>>;

/** Loads a booking and enforces ownership for the calling role. */
export async function loadBooking(bookingId: string, userId: string, as: "CUSTOMER" | "DRIVER") {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw rideError("INVALID_RIDE_STATE", error.message);
  if (!data) throw rideError("UNAUTHORIZED_RIDE", "booking not found");
  const owner = as === "CUSTOMER" ? data.customer_id : data.driver_id;
  if (owner !== userId) throw rideError("UNAUTHORIZED_RIDE", "ownership check failed");
  return data;
}

/** Verifies the caller is an approved, vehicle-carrying driver for the service. */
export async function requireEligibleDriver(driverId: string, serviceType: "BIKE" = "BIKE") {
  const [{ data: profile }, { data: vehicle }] = await Promise.all([
    supabaseAdmin.from("driver_profiles").select("id, status").eq("id", driverId).maybeSingle(),
    supabaseAdmin
      .from("driver_vehicles")
      .select("id")
      .eq("driver_id", driverId)
      .eq("service_type", serviceType)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (!profile || profile.status !== "APPROVED" || !vehicle) {
    throw rideError("DRIVER_NOT_ELIGIBLE", `driver ${driverId} not eligible`);
  }
  return { vehicleId: vehicle.id };
}

/**
 * Moves an in-flight driver search forward: expires old offers, offers the ride
 * to more drivers, and gives up with NO_DRIVER_FOUND once the search window
 * closes. Called whenever the authoritative booking state is read.
 */
export async function advanceSearch(booking: {
  id: string;
  status: BookingStatus;
  expires_at: string | null;
  pickup_latitude: number;
  pickup_longitude: number;
  service_type: "BIKE" | "AUTO" | "CAB";
}) {
  if (booking.status !== "SEARCHING_DRIVER" || booking.service_type !== "BIKE") return;

  const config = await getServiceConfig("BIKE");
  const timedOut = booking.expires_at ? new Date(booking.expires_at).getTime() < Date.now() : false;

  if (timedOut) {
    await supabaseAdmin
      .from("booking_driver_requests")
      .update({ status: "EXPIRED", responded_at: new Date().toISOString() })
      .eq("booking_id", booking.id)
      .eq("status", "PENDING");
    await transition({
      bookingId: booking.id,
      from: "SEARCHING_DRIVER",
      to: "NO_DRIVER_FOUND",
      actorType: "SYSTEM",
      eventType: "no_driver_found",
    }).catch(() => undefined);
    return;
  }

  await dispatchDriverRequests({
    id: booking.id,
    pickup: { latitude: booking.pickup_latitude, longitude: booking.pickup_longitude },
    service_type: "BIKE",
    config,
  });
}


// ---------------------------------------------------------------- completion

/** Distance covered from the recorded location trace, in metres. */
export async function traceDistanceMetres(bookingId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("ride_locations")
    .select("latitude, longitude, recorded_at")
    .eq("booking_id", bookingId)
    .order("recorded_at", { ascending: true });
  if (!data || data.length < 2) return null;
  let km = 0;
  for (let i = 1; i < data.length; i += 1) {
    km += haversineKm(
      { latitude: data[i - 1]!.latitude, longitude: data[i - 1]!.longitude },
      { latitude: data[i]!.latitude, longitude: data[i]!.longitude },
    );
  }
  return Math.round(km * 1000);
}

/**
 * Final fare uses the rates captured in the booking's fare snapshot, so later
 * configuration changes cannot rewrite historical rides.
 */
export function computeFinalFare(
  snapshot: FareSnapshot,
  finalDistanceMetres: number,
  finalDurationSeconds: number,
) {
  const distanceKm = Math.round((finalDistanceMetres / 1000) * 100) / 100;
  const minutes = Math.round((finalDurationSeconds / 60) * 100) / 100;
  const distanceCharge = Math.round(distanceKm * snapshot.per_km_rate * 100) / 100;
  const timeCharge = Math.round(minutes * snapshot.per_minute_rate * 100) / 100;
  const calculated = Math.round((snapshot.base_fare + distanceCharge + timeCharge) * 100) / 100;
  const finalFare = Math.round(Math.max(calculated, snapshot.minimum_fare) * 100) / 100;
  return {
    finalFare,
    breakdown: {
      ...snapshot,
      final_distance_km: distanceKm,
      final_duration_minutes: minutes,
      final_distance_charge: distanceCharge,
      final_time_charge: timeCharge,
      final_calculated_fare: calculated,
      final_fare: finalFare,
    },
  };
}
