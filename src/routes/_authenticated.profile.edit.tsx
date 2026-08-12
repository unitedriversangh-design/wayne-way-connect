import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile — WayneWay" },
      { name: "description", content: "Update your WayneWay name and contact number." },
      { property: "og:title", content: "Edit profile — WayneWay" },
      { property: "og:description", content: "Update your WayneWay contact details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditProfile,
});

function EditProfile() {
  const { t } = useI18n();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    country_code: "+91",
    phone_number: "",
  });

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("first_name, last_name, display_name, country_code, phone_number, email")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      first_name: profile.data.first_name ?? "",
      last_name: profile.data.last_name ?? "",
      display_name: profile.data.display_name ?? "",
      country_code: profile.data.country_code ?? "+91",
      phone_number: profile.data.phone_number ?? "",
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const phone = form.phone_number.replace(/\D/g, "");
      if (phone && !/^[6-9]\d{9}$/.test(phone)) {
        throw new Error("Enter a valid 10-digit Indian mobile number.");
      }
      const { error } = await supabase
        .from("customer_profiles")
        .update({
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          display_name: form.display_name.trim() || null,
          country_code: form.country_code,
          phone_number: phone || null,
          normalized_phone: phone ? `${form.country_code}${phone}` : null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title={t("profile.edit")} back={{ to: "/profile" }}>
      <SectionCard>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first">First name</Label>
              <Input
                id="first"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last">Last name</Label>
              <Input
                id="last"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="display">Display name</Label>
            <Input
              id="display"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <div className="flex gap-2">
              <Input
                aria-label="Country code"
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                className="h-11 w-20"
              />
              <Input
                id="phone"
                inputMode="numeric"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="9876543210"
                className="h-11 flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Adding a number here does not verify it. Phone verification arrives with mobile OTP
              sign-in.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" value={profile.data?.email ?? user?.email ?? ""} disabled className="h-11" />
            <p className="text-xs text-muted-foreground">
              Your email is your sign-in identity and can't be changed here yet.
            </p>
          </div>

          <Button type="submit" disabled={save.isPending} className="h-11 w-full">
            {save.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </SectionCard>
    </AppShell>
  );
}
