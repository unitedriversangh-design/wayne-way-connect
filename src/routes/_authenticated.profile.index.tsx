import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Contact,
  Languages,
  LogOut,
  MapPin,
  Shield,
  Smartphone,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { RowLink, SectionCard } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () => ({
    meta: [
      { title: "Profile and settings — WayneWay" },
      {
        name: "description",
        content: "Manage your WayneWay profile, saved places, devices, notifications and privacy.",
      },
      { property: "og:title", content: "Profile and settings — WayneWay" },
      { property: "og:description", content: "Manage your WayneWay account settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileIndex,
});

function ProfileIndex() {
  const { t, language, setLanguage } = useI18n();
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("display_name, first_name, last_name, email, phone_number, country_code")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const links = [
    { to: "/profile/edit", label: t("profile.edit"), icon: UserCog, description: "Name, phone" },
    {
      to: "/profile/saved-places",
      label: t("profile.places"),
      icon: MapPin,
      description: "Home, work and more",
    },
    {
      to: "/profile/emergency-contacts",
      label: t("profile.emergency"),
      icon: Contact,
      description: "People to reach in a crisis",
    },
    {
      to: "/profile/devices",
      label: t("profile.devices"),
      icon: Smartphone,
      description: "Signed-in devices",
    },
    {
      to: "/profile/notifications",
      label: t("profile.notifications"),
      icon: Bell,
      description: "Booking, account and offers",
    },
    {
      to: "/profile/privacy-data",
      label: t("profile.privacy"),
      icon: Shield,
      description: "Export or delete your data",
    },
  ] as const;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const name = profile.data?.display_name ?? profile.data?.first_name ?? "Your account";

  return (
    <AppShell title={t("profile.title")}>
      <SectionCard>
        <p className="text-lg font-bold">{name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{profile.data?.email ?? user?.email}</p>
        {profile.data?.phone_number ? (
          <p className="text-sm text-muted-foreground">
            {profile.data.country_code} {profile.data.phone_number}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No phone number added yet — add one so drivers can reach you later.
          </p>
        )}
      </SectionCard>

      <SectionCard className="mt-4">
        <ul className="divide-y divide-border">
          {links.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="focus-ring block rounded-lg py-3">
                <RowLink
                  icon={<link.icon className="size-5" aria-hidden />}
                  label={link.label}
                  description={link.description}
                />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard className="mt-4" title={t("profile.language")}>
        <div className="flex gap-2">
          {(["en", "hi"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              aria-pressed={language === code}
              className={
                language === code
                  ? "focus-ring flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
                  : "focus-ring flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground"
              }
            >
              <Languages className="mr-2 inline size-4" aria-hidden />
              {code === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>
      </SectionCard>

      <button
        type="button"
        onClick={() => void signOut()}
        className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground"
      >
        <LogOut className="size-4" aria-hidden />
        {t("profile.logout")}
      </button>
    </AppShell>
  );
}
