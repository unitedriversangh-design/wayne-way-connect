import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { revokeDevice } from "@/lib/account.functions";
import { getDeviceId } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionCard } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/profile/devices")({
  head: () => ({
    meta: [
      { title: "Your devices — WayneWay" },
      { name: "description", content: "Review and remove devices signed in to your WayneWay account." },
      { property: "og:title", content: "Your devices — WayneWay" },
      { property: "og:description", content: "Review devices signed in to your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Devices,
});

function Devices() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const currentDeviceId = typeof window === "undefined" ? "" : getDeviceId();

  const devices = useQuery({
    queryKey: ["user_devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_devices")
        .select("id, device_id, platform, device_name, app_version, last_active_at")
        .order("last_active_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const events = useQuery({
    queryKey: ["security_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_events")
        .select("id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const revoke = useMutation({
    mutationFn: async (deviceRowId: string) => {
      await revokeDevice({ data: { deviceRowId } });
    },
    onSuccess: () => {
      toast.success("Device removed");
      void queryClient.invalidateQueries({ queryKey: ["user_devices"] });
      void queryClient.invalidateQueries({ queryKey: ["security_events"] });
    },
    onError: () => toast.error(t("common.somethingWrong")),
  });

  return (
    <AppShell title={t("profile.devices")} back={{ to: "/profile" }}>
      <SectionCard title="Signed-in devices">
        {devices.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : devices.data && devices.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {devices.data.map((device) => {
              const isCurrent = device.device_id === currentDeviceId;
              return (
                <li key={device.id} className="flex items-center gap-3 py-3">
                  <Smartphone className="size-4 text-primary" aria-hidden />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {device.device_name ?? device.platform ?? "Unknown device"}
                      {isCurrent ? (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                          THIS DEVICE
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last active {new Date(device.last_active_at).toLocaleString()}
                    </p>
                  </div>
                  {!isCurrent ? (
                    <button
                      type="button"
                      onClick={() => revoke.mutate(device.id)}
                      className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:text-destructive"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No devices recorded yet" />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Removing a device deletes its record. It does not end that device's active session yet —
          full session revocation comes with the session service.
        </p>
      </SectionCard>

      <SectionCard className="mt-4" title="Recent security activity">
        {events.data && events.data.length > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {events.data.map((event) => (
              <li key={event.id} className="flex justify-between gap-3 py-2.5">
                <span className="font-medium">{event.event_type.replaceAll("_", " ").toLowerCase()}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No activity recorded yet" />
        )}
      </SectionCard>
    </AppShell>
  );
}
