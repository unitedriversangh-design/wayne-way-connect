import { z } from "zod";
import { MAX_SEATS_PER_BOOKING } from "./bus-shared";

const uuid = z.string().uuid();
const nonEmpty = (max = 120) => z.string().trim().min(1).max(max);

export const busSearchSchema = z
  .object({
    originCity: nonEmpty(80),
    destinationCity: nonEmpty(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    acOnly: z.boolean().optional(),
    sleeperOnly: z.boolean().optional(),
    operatorId: uuid.optional(),
    sort: z.enum(["RECOMMENDED", "CHEAPEST", "EARLIEST", "LATEST", "SHORTEST"]).default("RECOMMENDED"),
    maxPrice: z.number().positive().optional(),
  })
  .refine((v) => v.originCity.toLowerCase() !== v.destinationCity.toLowerCase(), {
    message: "Origin and destination must differ",
    path: ["destinationCity"],
  })
  .refine((v) => new Date(`${v.date}T23:59:59`) >= new Date(new Date().toDateString()), {
    message: "Date must be today or later",
    path: ["date"],
  });

export const scheduleIdSchema = z.object({ scheduleId: uuid });

export const seatHoldSchema = z.object({
  scheduleId: uuid,
  seatCodes: z.array(nonEmpty(12)).min(1).max(MAX_SEATS_PER_BOOKING),
  boardingStopId: uuid,
  droppingStopId: uuid,
  discountCode: z.string().trim().max(32).optional(),
});

export const passengerInputSchema = z.object({
  seatCode: nonEmpty(12),
  fullName: nonEmpty(80),
  age: z.number().int().min(1).max(119).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export const createBusBookingSchema = seatHoldSchema.extend({
  passengers: z.array(passengerInputSchema).min(1).max(MAX_SEATS_PER_BOOKING),
  leadPassengerName: nonEmpty(80),
  leadPassengerPhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  leadPassengerEmail: z.string().email().optional().or(z.literal("")),
});

export const bookingIdSchema = z.object({ bookingId: uuid });
export const payBookingSchema = z.object({ bookingId: uuid, idempotencyKey: nonEmpty(64) });
export const cancelBusBookingSchema = z.object({ bookingId: uuid, reason: nonEmpty(200) });

// ---------------------------------------------------------------- operator

export const operatorRegistrationSchema = z.object({
  businessName: nonEmpty(120),
  contactPerson: nonEmpty(80),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  contactEmail: z.string().email().optional().or(z.literal("")),
  city: nonEmpty(80),
  state: nonEmpty(80),
  address: z.string().trim().max(300).optional(),
  gstNumber: z.string().trim().max(20).optional(),
});

export const busInputSchema = z.object({
  name: nonEmpty(80),
  registrationNumber: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{0,3}[ -]?\d{1,4}$/i, "Use a valid Indian registration, e.g. UP80 AB 1234"),
  busType: nonEmpty(40),
  isAc: z.boolean(),
  vehicleCategory: z.string().trim().max(40).optional(),
  manufacturerModel: z.string().trim().max(80).optional(),
  seatingCapacity: z.number().int().min(4).max(120),
  amenities: z.array(nonEmpty(40)).max(20).default([]),
  notes: z.string().trim().max(300).optional(),
});

export const busUpdateSchema = busInputSchema.partial().extend({
  busId: uuid,
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE", "SUSPENDED", "ARCHIVED"]).optional(),
  assignedDriverId: uuid.nullable().optional(),
});

export const seatLayoutSchema = z.object({
  busId: uuid,
  rows: z.number().int().min(1).max(30),
  columnsPerRow: z.number().int().min(1).max(6),
  decks: z.number().int().min(1).max(2),
  seatType: z.enum(["SEATER", "SLEEPER_LOWER", "SLEEPER_UPPER"]),
  aisleAfterColumn: z.number().int().min(1).max(5).default(2),
  fareMultiplierUpper: z.number().min(0.5).max(2).default(1),
});

export const driverInputSchema = z.object({
  fullName: nonEmpty(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  email: z.string().email().optional().or(z.literal("")),
  licenceNumber: nonEmpty(30),
  licenceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const driverUpdateSchema = driverInputSchema.partial().extend({
  driverId: uuid,
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  documentStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "EXPIRED"]).optional(),
});

export const driverAssignmentSchema = z.object({
  driverId: uuid,
  busId: uuid.nullable(),
});

export const stopInputSchema = z.object({
  name: nonEmpty(80),
  city: nonEmpty(80),
  address: z.string().trim().max(200).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const stopUpdateSchema = stopInputSchema.partial().extend({
  stopId: uuid,
  isActive: z.boolean().optional(),
});

export const routeInputSchema = z.object({
  name: nonEmpty(120),
  originCity: nonEmpty(80),
  destinationCity: nonEmpty(80),
  distanceKm: z.number().positive().max(5000).optional(),
  estimatedDurationMinutes: z.number().int().positive().max(4320),
  baseFare: z.number().min(0).max(100000),
});

export const routeUpdateSchema = routeInputSchema.partial().extend({
  routeId: uuid,
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).optional(),
});

export const routeStopsSchema = z.object({
  routeId: uuid,
  stops: z
    .array(
      z.object({
        stopId: uuid,
        minutesFromStart: z.number().int().min(0).max(4320),
        pickupEnabled: z.boolean().default(true),
        dropEnabled: z.boolean().default(true),
        isActive: z.boolean().default(true),
      }),
    )
    .min(2)
    .max(40),
});

export const scheduleInputSchema = z.object({
  busId: uuid,
  routeId: uuid,
  driverId: uuid.optional().nullable(),
  departureAt: z.string().datetime({ offset: true }),
  baseFare: z.number().min(1).max(100000),
  bookingCutoffMinutes: z.number().int().min(0).max(1440).default(30),
  cancellationPolicy: z.string().trim().max(500).optional(),
});

export const scheduleUpdateSchema = z.object({
  scheduleId: uuid,
  driverId: uuid.nullable().optional(),
  departureAt: z.string().datetime({ offset: true }).optional(),
  baseFare: z.number().min(1).max(100000).optional(),
  bookingCutoffMinutes: z.number().int().min(0).max(1440).optional(),
  cancellationPolicy: z.string().trim().max(500).optional(),
});

export const scheduleStatusSchema = z.object({
  scheduleId: uuid,
  status: z.enum(["SCHEDULED", "BOARDING", "DEPARTED", "COMPLETED", "CANCELLED", "SUSPENDED"]),
  reason: z.string().trim().max(200).optional(),
});

export const seatBlockSchema = z.object({
  scheduleId: uuid,
  seatCodes: z.array(nonEmpty(12)).min(1).max(60),
  block: z.boolean(),
  reason: z.string().trim().max(120).optional(),
});

export const discountInputSchema = z.object({
  name: nonEmpty(80),
  code: z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
  discountType: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive().max(100000),
  minBookingAmount: z.number().min(0).max(100000).default(0),
  maxDiscountAmount: z.number().positive().max(100000).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  routeId: uuid.optional().nullable(),
  usageLimit: z.number().int().positive().max(100000).optional(),
  perUserLimit: z.number().int().min(1).max(50).default(1),
});

export const discountUpdateSchema = z.object({
  discountId: uuid,
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "DISABLED"]).optional(),
  name: nonEmpty(80).optional(),
  value: z.number().positive().max(100000).optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const operatorBookingFilterSchema = z.object({
  status: z
    .enum([
      "ALL", "DRAFT", "SEAT_HELD", "PAYMENT_PENDING", "CONFIRMED", "CANCEL_REQUESTED",
      "CANCELLED", "REFUND_PENDING", "REFUNDED", "PARTIALLY_REFUNDED", "COMPLETED", "NO_SHOW", "EXPIRED",
    ])
    .default("ALL"),
  scheduleId: uuid.optional(),
  busId: uuid.optional(),
  routeId: uuid.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().max(60).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const reportFilterSchema = z.object({
  preset: z.enum(["TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM"]).default("MONTH"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  busId: uuid.optional(),
  routeId: uuid.optional(),
  scheduleId: uuid.optional(),
});

export const staffInputSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "MANAGER", "BOOKING_STAFF", "ACCOUNTANT"]),
  fullName: nonEmpty(80).optional(),
});

export const staffUpdateSchema = z.object({
  staffId: uuid,
  role: z.enum(["OWNER", "MANAGER", "BOOKING_STAFF", "ACCOUNTANT"]).optional(),
  isActive: z.boolean().optional(),
});

export const boardingUpdateSchema = z.object({
  passengerId: uuid,
  status: z.enum(["NOT_BOARDED", "BOARDED", "NO_SHOW"]),
});

export const ticketValidationSchema = z.object({ pnr: nonEmpty(16) });

export const supportTicketSchema = z.object({
  category: nonEmpty(40),
  subject: nonEmpty(120),
  description: z.string().trim().min(10).max(2000),
  bookingId: uuid.optional(),
  scheduleId: uuid.optional(),
});

export const ticketReplySchema = z.object({
  ticketId: uuid,
  body: z.string().trim().min(1).max(2000),
});

export const operatorProfileSchema = z.object({
  contactPerson: nonEmpty(80).optional(),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional(),
  city: nonEmpty(80).optional(),
  state: nonEmpty(80).optional(),
  bankAccountName: nonEmpty(80).optional(),
  bankAccountLast4: z.string().regex(/^\d{4}$/).optional(),
  bankIfsc: z.string().trim().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i).optional(),
});

export const notificationReadSchema = z.object({ notificationId: uuid.optional(), all: z.boolean().default(false) });
