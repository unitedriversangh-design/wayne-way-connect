import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, SectionCard } from "@/components/ui-kit";
import { listCustomerRides } from "@/lib/ride.functions";
import {
  formatDateTime,
  formatKm,
  formatMoney,
  STATUS_LABEL,
  type BookingStatus,
} from "@/lib/ride-shared";

export const Route = createFileRoute("/_authenticated/rides")({
  head: () => ({
    meta: [
      { title: "Your rides — WayneWay" },
      { name: "description", content: "Every WayneWay bike ride you've booked, with fares and trip details." },
      { property: "og:title", content: "Your rides — WayneWay" },
      { property: "og:description", content: "Your WayneWay booking history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RidesPage,
});

function RidesPage() {
  const rides = useQuery({ queryKey: ["customer_rides"], queryFn: () => listCustomerRides() });

  return (
    <AppShell title="Your rides" back={{ to: "/home" }}>
      <SectionCard title="Booking history" description="Bike rides you've requested.">
        {rides.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rides.isError ? (
          <ErrorState onRetry={() => rides.refetch()} />
        ) : rides.data && rides.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {rides.data.map((ride) => (
              <li key={ride.id}>
                <Link
                  to="/ride/$bookingId"
                  params={{ bookingId: ride.id }}
                  className="focus-ring flex items-start gap-3 rounded-lg py-3"
                >
                  <Bike className="mt-0.5 size-5 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{ride.destination_address}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      from {ride.pickup_address}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {STATUS_LABEL[ride.status as BookingStatus]} ·{" "}
                      {formatDateTime(ride.requested_at)} ·{" "}
                      {formatKm(ride.final_distance_metres ?? ride.estimated_distance_metres)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold">
                    {formatMoney(ride.final_fare ?? ride.estimated_fare, ride.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No rides yet"
            description="Book your first bike ride and it will appear here."
            action={
              <Link
                to="/ride/new"
                className="focus-ring rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Book a bike
              </Link>
            }
          />
        )}
      </SectionCard>
    </AppShell>
  );
}
