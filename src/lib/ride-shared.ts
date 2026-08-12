/**
 * Client-safe ride domain helpers: statuses, labels, formatting and the
 * canonical state machine. No server-only imports may appear here.
 */

export type BookingStatus =
  | "REQUESTED"
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "DRIVER_EN_ROUTE"
  | "DRIVER_ARRIVED"
  | "READY_TO_START"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED_BY_CUSTOMER"
  | "CANCELLED_BY_DRIVER"
  | "DRIVER_REJECTED"
  | "NO_DRIVER_FOUND"
  | "EXPIRED"
  | "FAILED";

/** Every allowed transition. Anything absent here is rejected by the server. */
export const RIDE_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ["SEARCHING_DRIVER", "CANCELLED_BY_CUSTOMER", "FAILED"],
  SEARCHING_DRIVER: [
    "DRIVER_ASSIGNED",
    "NO_DRIVER_FOUND",
    "CANCELLED_BY_CUSTOMER",
    "EXPIRED",
    "FAILED",
  ],
  DRIVER_ASSIGNED: [
    "DRIVER_EN_ROUTE",
    "CANCELLED_BY_DRIVER",
    "CANCELLED_BY_CUSTOMER",
    "FAILED",
  ],
  DRIVER_EN_ROUTE: [
    "DRIVER_ARRIVED",
    "CANCELLED_BY_DRIVER",
    "CANCELLED_BY_CUSTOMER",
    "FAILED",
  ],
  DRIVER_ARRIVED: ["READY_TO_START", "CANCELLED_BY_DRIVER", "CANCELLED_BY_CUSTOMER", "FAILED"],
  READY_TO_START: ["IN_PROGRESS", "CANCELLED_BY_DRIVER", "CANCELLED_BY_CUSTOMER", "FAILED"],
  IN_PROGRESS: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_DRIVER: [],
  DRIVER_REJECTED: [],
  NO_DRIVER_FOUND: [],
  EXPIRED: [],
  FAILED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return RIDE_TRANSITIONS[from].includes(to);
}

export const ACTIVE_STATUSES: BookingStatus[] = [
  "REQUESTED",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_EN_ROUTE",
  "DRIVER_ARRIVED",
  "READY_TO_START",
  "IN_PROGRESS",
];

export function isActive(status: BookingStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isTerminal(status: BookingStatus): boolean {
  return RIDE_TRANSITIONS[status].length === 0;
}

/** Short customer-facing wording for each status. Never technical. */
export const STATUS_LABEL: Record<BookingStatus, string> = {
  REQUESTED: "Request received",
  SEARCHING_DRIVER: "Finding nearby riders…",
  DRIVER_ASSIGNED: "Rider assigned",
  DRIVER_EN_ROUTE: "Rider on the way",
  DRIVER_ARRIVED: "Your rider has arrived",
  READY_TO_START: "Starting your ride",
  IN_PROGRESS: "Ride in progress",
  COMPLETED: "Ride completed",
  CANCELLED_BY_CUSTOMER: "Cancelled by you",
  CANCELLED_BY_DRIVER: "Cancelled by rider",
  DRIVER_REJECTED: "Rider declined",
  NO_DRIVER_FOUND: "No bike riders available",
  EXPIRED: "This ride request has expired",
  FAILED: "Ride could not be completed",
};

export const RIDE_ERROR_MESSAGES: Record<string, string> = {
  DRIVER_NOT_AVAILABLE: "No bike rider is currently available nearby.",
  BOOKING_ALREADY_ASSIGNED: "Ride no longer available.",
  BOOKING_EXPIRED: "This ride request has expired.",
  INVALID_RIDE_STATE: "That action isn't possible for this ride right now.",
  INVALID_RIDE_OTP: "Invalid OTP. Please try again.",
  RIDE_OTP_EXPIRED: "This start code has expired. Ask for a new one.",
  RIDE_OTP_LOCKED: "Too many wrong attempts. Ask the customer for a new code.",
  UNAUTHORIZED_RIDE: "You don't have access to this ride.",
  DRIVER_NOT_ELIGIBLE: "Your rider account can't take rides yet.",
  LOCATION_UNAVAILABLE: "We couldn't use that location. Please try again.",
  ROUTE_CALCULATION_FAILED: "We couldn't work out the route. Please try again.",
  NO_DRIVER_FOUND: "No bike rider is currently available nearby.",
  REQUEST_EXPIRED: "This ride request has expired.",
  DUPLICATE_REQUEST: "That request was already processed.",
  SERVICE_UNAVAILABLE: "Bike rides aren't available right now.",
  PICKUP_TOO_CLOSE: "Pickup and destination are too close. Please select another destination.",
  RATE_LIMITED: "Too many requests. Please slow down.",
};

/** Maps a thrown server error message back to friendly copy. */
export function rideErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const code = Object.keys(RIDE_ERROR_MESSAGES).find((key) => raw.includes(key));
  return code
    ? RIDE_ERROR_MESSAGES[code]!
    : "Something went wrong. Please check your connection and try again.";
}

export function formatMoney(amount: number | string | null | undefined, currency = "INR") {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
}

export function formatKm(metres: number | null | undefined) {
  if (metres == null) return "—";
  return `${(metres / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Straight-line distance in kilometres. */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type FareSnapshot = {
  base_fare: number;
  distance_km: number;
  per_km_rate: number;
  distance_charge: number;
  duration_minutes: number;
  per_minute_rate: number;
  time_charge: number;
  minimum_fare: number;
  calculated_fare: number;
  final_estimated_fare: number;
  currency: string;
  fare_configuration_version: number;
  route_source: string;
};
