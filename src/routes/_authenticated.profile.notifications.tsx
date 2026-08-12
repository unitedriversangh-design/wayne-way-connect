import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile/notifications")({
  head: () => ({
    meta: [
      { title: "Notification preferences — WayneWay" },
      {
        name: "description",
        content: "Choose which WayneWay booking, account and promotional messages you receive.",
      },
      { property: "og:title", content: "Notification preferences — WayneWay" },
      { property: "og:description", content: "Choose the WayneWay messages you receive." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Notifications,
});

const FIELDS = [
  { key: "booking_push", label: "Booking updates (push)", locked: false },
  { key: "booking_email", label: "Booking updates (email)", locked: false },
  { key: "account_email", label: "Account updates (email)", locked: false },
  { key: "security_email", label: "Security alerts (email)", locked: true },
  { key: "promotional_push", label: "Offers and promotions (push)", locked: false },
  { key: "promotional_email", label: "Offers and promotions (email)", locked: false },
] as const;

type PrefKey = (typeof FIELDS)[number]["key"];

function Notifications() {
  const { t } = useI18n();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const prefs = useQuery({
    queryKey: ["notification_preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async ({ key, value }: { key: PrefKey; value: boolean }) => {
      const { error } = await supabase
        .from("notification_preferences")
        .update({ [key]: value })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification_preferences"] });
    },
    onError: () => toast.error(t("common.somethingWrong")),
  });

  return (
    <AppShell title={t("profile.notifications")} back={{ to: "/profile" }}>
      <SectionCard
        title="What we send you"
        description="Security alerts are always on because they protect your account."
      >
        {prefs.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {FIELDS.map((field) => (
              <li key={field.key} className="flex items-center justify-between gap-4 py-3.5">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                <Switch
                  id={field.key}
                  checked={field.locked ? true : Boolean(prefs.data?.[field.key])}
                  disabled={field.locked || update.isPending}
                  onCheckedChange={(value) => update.mutate({ key: field.key, value })}
                />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Push delivery starts once the mobile app ships; these choices are stored now and honoured
          then.
        </p>
      </SectionCard>
    </AppShell>
  );
}
