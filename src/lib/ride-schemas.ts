import { z } from "zod";

export const pointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(3).max(300),
  source: z.enum(["GPS", "SEARCH", "MAP_PIN", "SAVED_PLACE", "MANUAL"]).default("MANUAL"),
});

export const estimateSchema = z.object({
  pickup: pointSchema,
  destination: pointSchema,
});

export const createBookingSchema = estimateSchema.extend({
  idempotencyKey: z.string().min(8).max(80),
});

export const bookingIdSchema = z.object({ bookingId: z.string().uuid() });

export const cancelBookingSchema = bookingIdSchema.extend({
  reason: z.string().max(200).optional(),
});

export const availabilitySchema = z.object({
  status: z.enum(["OFFLINE", "ONLINE"]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const driverLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMetres: z.number().min(0).max(10000).optional(),
  bookingId: z.string().uuid().optional(),
});

export const driverRegistrationSchema = z.object({
  fullName: z.string().min(2).max(80),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  makeModel: z.string().min(2).max(60),
  registrationNumber: z.string().min(4).max(20),
  colour: z.string().max(30).optional(),
});

export const startRideSchema = bookingIdSchema.extend({
  otp: z.string().regex(/^\d{6}$/),
});

export const completeRideSchema = bookingIdSchema.extend({
  finalDistanceMetres: z.number().int().min(0).max(500_000).optional(),
  finalDurationSeconds: z.number().int().min(0).max(86_400).optional(),
});
