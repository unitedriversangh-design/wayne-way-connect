import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const deviceInput = z.object({
  deviceId: z.string().min(8).max(128),
  platform: z.string().max(40).optional(),
  deviceName: z.string().max(120).optional(),
  appVersion: z.string().max(40).optional(),
});

function requestMeta() {
  const request = getRequest();
  const headers = request?.headers;
  const ip =
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return { ip, userAgent: headers?.get("user-agent") ?? null };
}

/**
 * Records the current device against the signed-in account and writes the
 * matching security events. Device rows are server-written only.
 */
export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = requestMeta();
    const userId = context.userId;

    const { data: existing } = await supabaseAdmin
      .from("user_devices")
      .select("id")
      .eq("user_id", userId)
      .eq("device_id", data.deviceId)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("user_devices").upsert(
      {
        user_id: userId,
        device_id: data.deviceId,
        platform: data.platform ?? null,
        device_name: data.deviceName ?? null,
        app_version: data.appVersion ?? null,
        last_ip: ip,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );
    if (error) throw new Error("Could not record this device");

    const events = [
      {
        user_id: userId,
        event_type: "LOGIN_SUCCESS",
        ip_address: ip,
        user_agent: userAgent,
        metadata: {},
      },
    ];
    if (!existing) {
      events.push({
        user_id: userId,
        event_type: "NEW_DEVICE",
        ip_address: ip,
        user_agent: userAgent,
        metadata: { platform: data.platform ?? null },
      });
    }
    await supabaseAdmin.from("security_events").insert(events);

    return { newDevice: !existing };
  });

/** Logs a security event for the signed-in account. Server decides the payload shape. */
export const logSecurityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventType: z.enum([
          "LOGIN_FAILED",
          "OTP_REQUESTED",
          "OTP_FAILED",
          "SESSION_REVOKED",
          "PROFILE_CHANGED",
          "EMAIL_CHANGED",
          "PHONE_CHANGED",
          "DATA_EXPORTED",
          "DELETION_REQUESTED",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = requestMeta();
    await supabaseAdmin.from("security_events").insert({
      user_id: context.userId,
      event_type: data.eventType,
      ip_address: ip,
      user_agent: userAgent,
      metadata: {},
    });
    return { ok: true };
  });

/** Removes one of the signed-in customer's own devices. */
export const revokeDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ deviceRowId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = requestMeta();
    const { error } = await supabaseAdmin
      .from("user_devices")
      .delete()
      .eq("id", data.deviceRowId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not remove that device");
    await supabaseAdmin.from("security_events").insert({
      user_id: context.userId,
      event_type: "SESSION_REVOKED",
      ip_address: ip,
      user_agent: userAgent,
      metadata: { device_row_id: data.deviceRowId },
    });
    return { ok: true };
  });

/** Returns every piece of data WayneWay holds for the signed-in customer. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, places, contacts, devices, prefs, consents, events] = await Promise.all([
      supabase.from("customer_profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("saved_places").select("*").eq("user_id", userId),
      supabase.from("emergency_contacts").select("*").eq("user_id", userId),
      supabase.from("user_devices").select("*").eq("user_id", userId),
      supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("consent_records").select("*").eq("user_id", userId),
      supabase
        .from("security_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("security_events").insert({
      user_id: userId,
      event_type: "DATA_EXPORTED",
      metadata: {},
    });

    return {
      exportedAt: new Date().toISOString(),
      profile: profile.data ?? null,
      savedPlaces: places.data ?? [],
      emergencyContacts: contacts.data ?? [],
      devices: devices.data ?? [],
      notificationPreferences: prefs.data ?? null,
      consents: consents.data ?? [],
      securityEvents: events.data ?? [],
    };
  });

/**
 * Deletes the signed-in customer's account: personal data is removed and the
 * auth user is deleted, which invalidates every session. Audit rows are kept
 * without a user reference for retention purposes.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ confirmation: z.literal("DELETE") }).parse(input),
  )
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const { ip, userAgent } = requestMeta();

    await supabaseAdmin.from("security_events").insert({
      user_id: userId,
      event_type: "ACCOUNT_DELETED",
      ip_address: ip,
      user_agent: userAgent,
      metadata: {},
    });

    await supabaseAdmin
      .from("customer_profiles")
      .update({ status: "DELETED", deleted_at: new Date().toISOString() })
      .eq("id", userId);

    // Detach retained audit rows from the deleted identity before the cascade.
    await supabaseAdmin.from("security_events").update({ user_id: null }).eq("user_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete the account. Please contact support.");

    return { ok: true };
  });
