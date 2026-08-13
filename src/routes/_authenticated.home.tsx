import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, Bus, CarTaxiFront, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/ui-kit";
import { listCustomerRides } from "@/lib/ride.functions";
import { formatMoney, isActive, STATUS_LABEL, type BookingStatus } from "@/lib/ride-shared";


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

  const rides = useQuery({
    queryKey: ["customer_rides"],
    enabled: !!user,
    queryFn: () => listCustomerRides(),
    refetchInterval: 10000,
  });

  const activeRide = rides.data?.find((ride) => isActive(ride.status as BookingStatus));
  const name = profile.data?.first_name ?? profile.data?.display_name ?? "traveller";

  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">{t("home.greeting")},</p>
      <h1 className="text-2xl font-bold">{name}</h1>

      {activeRide ? (
        <SectionCard className="mt-5" title="Ride in progress">
          <p className="text-sm font-semibold">
            {STATUS_LABEL[activeRide.status as BookingStatus]}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            To {activeRide.destination_address}
          </p>
          <Link
            to="/ride/$bookingId"
            params={{ bookingId: activeRide.id }}
            className="focus-ring mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            View ride
          </Link>
        </SectionCard>
      ) : null}

      <SectionCard className="mt-4" title={t("home.whereTo")}>
        <Link
          to="/ride/new"
          className="focus-ring flex min-h-12 items-center rounded-xl border border-border bg-muted/50 px-4 text-sm font-semibold text-muted-foreground"
        >
          Enter pickup and destination
        </Link>
        <div className="mt-4 flex gap-2">
          {services.map((service) =>
            service.name === "Bike" ? (
              <Link
                key={service.name}
                to="/ride/new"
                className="focus-ring flex flex-1 flex-col items-center gap-1 rounded-xl border border-primary/40 bg-primary/5 py-3 text-xs font-semibold text-primary"
              >
                <service.icon className="size-5" aria-hidden />
                {service.name}
              </Link>
            ) : (
              <span
                key={service.name}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-muted/50 py-3 text-xs font-semibold text-muted-foreground"
              >
                <service.icon className="size-5" aria-hidden />
                {service.name}
              </span>
            ),
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Bike rides are live. Auto and Bus arrive in later phases.
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
