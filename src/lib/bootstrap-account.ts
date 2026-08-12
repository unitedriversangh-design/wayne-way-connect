import { supabase } from "@/integrations/supabase/client";
import { LEGAL_DOCS } from "@/lib/legal";
import { registerDevice } from "@/lib/account.functions";
import { describeDevice, getDeviceId } from "@/lib/session";

/**
 * Runs once after a successful sign-in: makes sure the customer profile,
 * notification preferences and consent records exist, and records the device.
 * Every write is scoped to the signed-in user by row level security.
 */
export async function bootstrapAccount(userId: string, email: string | undefined) {
  const { data: existing } = await supabase
    .from("customer_profiles")
    .select("id, status")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("customer_profiles").insert({
      id: userId,
      email: email ?? null,
      email_verified_at: new Date().toISOString(),
      display_name: email ? (email.split("@")[0] ?? null) : null,
    });
    await supabase.from("notification_preferences").insert({ user_id: userId });
    await supabase.from("consent_records").insert([
      { user_id: userId, ...LEGAL_DOCS.terms },
      { user_id: userId, ...LEGAL_DOCS.privacy },
    ]);
  }

  const device = describeDevice();
  await registerDevice({
    data: {
      deviceId: getDeviceId(),
      platform: device.platform,
      deviceName: device.deviceName,
      appVersion: "0.1",
    },
  });

  return existing?.status ?? "ACTIVE";
}
