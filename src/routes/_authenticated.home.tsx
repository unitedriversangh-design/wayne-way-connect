import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, Bus, CarTaxiFront, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Your WayneWay home" },
      {
        name: "description",
        content: "Your WayneWay account home with saved places and travel services.",
      },
      { property: "og:title", content: "Your WayneWay home" },
      { property: "og:description", content: "Saved places and travel services in one account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomePage,
});

const services = [
  { icon: Bike, name: "Bike" },
  { icon: CarTaxiFront, name: "Auto" },
  { icon: Bus, name: "Bus" },
];

function HomePage() {
  const { t } = useI18n();
  const { user } = useSession();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("display_name, first_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const places = useQuery({
    queryKey: ["saved_places", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_places")
        .select("id, label, name, address")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const name = profile.data?.first_name ?? profile.data?.display_name ?? "traveller";

  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">{t("home.greeting")},</p>
      <h1 className="text-2xl font-bold">{name}</h1>

      <SectionCard className="mt-5" title={t("home.whereTo")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="from">{t("home.from")}</Label>
            <Input id="from" placeholder="Pickup point" className="h-11" disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">{t("home.to")}</Label>
            <Input id="to" placeholder="Destination" className="h-11" disabled />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {services.map((service) => (
            <span
              key={service.name}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-muted/50 py-3 text-xs font-semibold text-muted-foreground"
            >
              <service.icon className="size-5" aria-hidden />
              {service.name}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Search and booking are not built yet — they arrive with the booking phase. Nothing here
          reserves a ride or takes a payment.
        </p>
      </SectionCard>

      <SectionCard
        className="mt-4"
        title={t("profile.places")}
        description="Your saved pickup and drop points."
      >
        {places.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : places.data && places.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {places.data.map((place) => (
              <li key={place.id} className="flex items-start gap-3 py-3">
                <MapPin className="mt-0.5 size-4 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{place.name}</p>
                  <p className="text-xs text-muted-foreground">{place.address}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven't saved any places yet.{" "}
            <Link to="/profile/saved-places" className="focus-ring rounded font-semibold text-primary">
              Add one
            </Link>
            .
          </p>
        )}
      </SectionCard>
    </AppShell>
  );
}
