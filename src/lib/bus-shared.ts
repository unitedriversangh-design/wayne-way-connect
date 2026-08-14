/**
 * Client-safe bus domain model: state machines, RBAC matrix, labels and
 * formatting shared by the customer bus booking flow (Phase 6) and the bus
 * operator portal (Phase 7).
 */

export type OperatorRole = "OWNER" | "MANAGER" | "BOOKING_STAFF" | "ACCOUNTANT";

export type OperatorModule =
  | "dashboard"
  | "buses"
  | "drivers"
  | "routes"
  | "stops"
  | "schedules"
  | "seats"
  | "pricing"
  | "discounts"
  | "bookings"
  | "passengers"
  | "revenue"
  | "settlement"
  | "reports"
  | "staff"
  | "notifications"
  | "support"
  | "profile"
  | "audit";

export type AccessLevel = "FULL" | "LIMITED" | "VIEW" | "NONE";

/**
 * Server-enforced permission matrix. The UI reads it to hide what a role
 * cannot do, but every server function re-checks it: hidden buttons are not
 * a security boundary.
 */
export const OPERATOR_PERMISSIONS: Record<OperatorRole, Record<OperatorModule, AccessLevel>> = {
  OWNER: {
    dashboard: "FULL", buses: "FULL", drivers: "FULL", routes: "FULL", stops: "FULL",
    schedules: "FULL", seats: "FULL", pricing: "FULL", discounts: "FULL", bookings: "FULL",
    passengers: "FULL", revenue: "FULL", settlement: "VIEW", reports: "FULL", staff: "FULL",
    notifications: "FULL", support: "FULL", profile: "FULL", audit: "VIEW",
  },
  MANAGER: {
    dashboard: "FULL", buses: "FULL", drivers: "FULL", routes: "FULL", stops: "FULL",
    schedules: "FULL", seats: "FULL", pricing: "LIMITED", discounts: "LIMITED", bookings: "FULL",
    passengers: "FULL", revenue: "VIEW", settlement: "VIEW", reports: "FULL", staff: "VIEW",
    notifications: "FULL", support: "FULL", profile: "VIEW", audit: "VIEW",
  },
  BOOKING_STAFF: {
    dashboard: "VIEW", buses: "VIEW", drivers: "VIEW", routes: "VIEW", stops: "VIEW",
    schedules: "VIEW", seats: "LIMITED", pricing: "NONE", discounts: "NONE", bookings: "LIMITED",
    passengers: "FULL", revenue: "NONE", settlement: "NONE", reports: "VIEW", staff: "NONE",
    notifications: "FULL", support: "FULL", profile: "NONE", audit: "NONE",
  },
  ACCOUNTANT: {
    dashboard: "VIEW", buses: "VIEW", drivers: "NONE", routes: "VIEW", stops: "NONE",
    schedules: "VIEW", seats: "NONE", pricing: "VIEW", discounts: "VIEW", bookings: "VIEW",
    passengers: "NONE", revenue: "FULL", settlement: "VIEW", reports: "FULL", staff: "NONE",
    notifications: "FULL", support: "FULL", profile: "VIEW", audit: "VIEW",
  },
};

export function accessLevel(role: OperatorRole, module: OperatorModule): AccessLevel {
  return OPERATOR_PERMISSIONS[role][module];
}

export function canView(role: OperatorRole, module: OperatorModule): boolean {
  return accessLevel(role, module) !== "NONE";
}

/** Write access. LIMITED counts as write; the server narrows what it allows. */
export function canWrite(role: OperatorRole, module: OperatorModule): boolean {
  const level = accessLevel(role, module);
  return level === "FULL" || level === "LIMITED";
}

export const OPERATOR_ROLE_LABEL: Record<OperatorRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  BOOKING_STAFF: "Booking staff",
  ACCOUNTANT: "Accountant",
};

// ---------------------------------------------------------------- statuses

export type OperatorStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type BusStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "SUSPENDED" | "ARCHIVED";
export type BusDriverStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type DocumentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
export type BusRouteStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type SeatType = "SEATER" | "SLEEPER_LOWER" | "SLEEPER_UPPER";
export type SeatState = "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" | "UNAVAILABLE";
export type DiscountStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "DISABLED";
export type SettlementStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "ON_HOLD";
export type BoardingStatus = "NOT_BOARDED" | "BOARDED" | "NO_SHOW" | "CANCELLED";
export type BusPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export type ScheduleStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "BOARDING"
  | "DEPARTED"
  | "COMPLETED"
  | "CANCELLED"
  | "SUSPENDED";

export const SCHEDULE_TRANSITIONS: Record<ScheduleStatus, ScheduleStatus[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["BOARDING", "DEPARTED", "SUSPENDED", "CANCELLED"],
  BOARDING: ["DEPARTED", "CANCELLED"],
  DEPARTED: ["COMPLETED"],
  SUSPENDED: ["SCHEDULED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionSchedule(from: ScheduleStatus, to: ScheduleStatus): boolean {
  return SCHEDULE_TRANSITIONS[from].includes(to);
}

export type BusBookingStatus =
  | "DRAFT"
  | "SEAT_HELD"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "COMPLETED"
  | "NO_SHOW"
  | "EXPIRED";

export const BUS_BOOKING_TRANSITIONS: Record<BusBookingStatus, BusBookingStatus[]> = {
  DRAFT: ["SEAT_HELD", "EXPIRED", "CANCELLED"],
  SEAT_HELD: ["PAYMENT_PENDING", "EXPIRED", "CANCELLED"],
  PAYMENT_PENDING: ["CONFIRMED", "EXPIRED", "CANCELLED"],
  CONFIRMED: ["CANCEL_REQUESTED", "CANCELLED", "COMPLETED", "NO_SHOW"],
  CANCEL_REQUESTED: ["CANCELLED", "CONFIRMED"],
  CANCELLED: ["REFUND_PENDING", "REFUNDED"],
  REFUND_PENDING: ["REFUNDED", "PARTIALLY_REFUNDED"],
  PARTIALLY_REFUNDED: [],
  REFUNDED: [],
  COMPLETED: ["REFUND_PENDING"],
  NO_SHOW: [],
  EXPIRED: [],
};

export function canTransitionBusBooking(from: BusBookingStatus, to: BusBookingStatus): boolean {
  return BUS_BOOKING_TRANSITIONS[from].includes(to);
}

export const BUS_BOOKING_LABEL: Record<BusBookingStatus, string> = {
  DRAFT: "Draft",
  SEAT_HELD: "Seats held",
  PAYMENT_PENDING: "Payment pending",
  CONFIRMED: "Confirmed",
  CANCEL_REQUESTED: "Cancellation requested",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
  EXPIRED: "Expired",
};

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  BOARDING: "Boarding",
  DEPARTED: "Departed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  SUSPENDED: "Suspended",
};

export const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  SEATER: "Seater",
  SLEEPER_LOWER: "Sleeper (lower)",
  SLEEPER_UPPER: "Sleeper (upper)",
};

/** Booking states that occupy inventory and must never be silently broken. */
export const COMMITTED_BOOKING_STATUSES: BusBookingStatus[] = [
  "CONFIRMED",
  "CANCEL_REQUESTED",
  "COMPLETED",
  "NO_SHOW",
];

// ---------------------------------------------------------------- config

/** Seat hold window. Server-side value; the UI only renders the countdown. */
export const SEAT_HOLD_SECONDS = 600;
export const MAX_SEATS_PER_BOOKING = 6;
/** Bookings close this many minutes before departure unless overridden. */
export const DEFAULT_BOOKING_CUTOFF_MINUTES = 30;
export const DEFAULT_TAX_PERCENT = 5;

/** Cancellation slabs: fee percentage by hours remaining before departure. */
export const CANCELLATION_SLABS = [
  { minHoursBefore: 24, feePercent: 10 },
  { minHoursBefore: 12, feePercent: 25 },
  { minHoursBefore: 4, feePercent: 50 },
  { minHoursBefore: 0, feePercent: 100 },
];

export function cancellationFeePercent(hoursBeforeDeparture: number): number {
  for (const slab of CANCELLATION_SLABS) {
    if (hoursBeforeDeparture >= slab.minHoursBefore) return slab.feePercent;
  }
  return 100;
}

export function describeCancellationPolicy(): string[] {
  return CANCELLATION_SLABS.map((slab, index) => {
    const next = CANCELLATION_SLABS[index - 1];
    const upper = next ? `${next.minHoursBefore}h` : "any time";
    return slab.minHoursBefore === 0
      ? `Less than ${CANCELLATION_SLABS[CANCELLATION_SLABS.length - 2]?.minHoursBefore ?? 4}h before departure: ${slab.feePercent}% fee`
      : `More than ${slab.minHoursBefore}h before departure (up to ${upper}): ${slab.feePercent}% fee`;
  });
}

// ---------------------------------------------------------------- errors

export const BUS_ERROR_MESSAGES: Record<string, string> = {
  OPERATOR_NOT_FOUND: "No operator account is linked to this login.",
  OPERATOR_NOT_ACTIVE: "This operator account is not active yet.",
  FORBIDDEN: "Access denied for your role.",
  NOT_FOUND: "That record could not be found.",
  DUPLICATE_REGISTRATION: "A bus with this registration number already exists.",
  DUPLICATE_STOP: "That stop is already part of the route.",
  DUPLICATE_CODE: "That code is already in use.",
  SEAT_UNAVAILABLE: "One or more selected seats are no longer available.",
  SEAT_ALREADY_BOOKED: "That seat is booked and cannot be changed.",
  SEAT_LAYOUT_MISMATCH: "Seat layout does not match the configured capacity.",
  SCHEDULE_CONFLICT: "That bus or driver is already assigned to an overlapping trip.",
  INVALID_TRANSITION: "That status change is not allowed.",
  INVALID_STOP_ORDER: "Dropping point must come after the boarding point.",
  BOOKING_CLOSED: "Bookings for this trip are closed.",
  HOLD_EXPIRED: "Your seat hold expired. Please select seats again.",
  ROUTE_NOT_READY: "The route needs at least two active stops.",
  BUS_NOT_BOOKABLE: "The selected bus is not active.",
  DRIVER_CONFLICT: "That driver is already assigned elsewhere at this time.",
  HAS_CONFIRMED_BOOKINGS: "This trip has confirmed bookings and needs the controlled cancellation flow.",
  DISCOUNT_INVALID: "That discount code cannot be applied.",
  RATE_LIMITED: "Too many attempts. Please wait a moment.",
  PAYMENT_ALREADY_SETTLED: "This payment was already processed.",
};

export function busErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return BUS_ERROR_MESSAGES[raw] ?? "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------- formatting

export function formatINR(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatTripTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatTripDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTripDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${formatTripDate(iso)}, ${formatTripTime(iso)}`;
}

export function durationBetween(fromIso: string, toIso: string): string {
  const minutes = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export type BusFareSnapshot = {
  baseFare: number;
  seats: { seatCode: string; seatType: SeatType; fare: number }[];
  seatTotal: number;
  discountCode: string | null;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  currency: string;
  capturedAt: string;
};
