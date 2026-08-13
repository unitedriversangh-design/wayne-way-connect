import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, SectionCard } from "@/components/ui-kit";
import { listDriverRides } from "@/lib/ride.functions";
import {
  formatDateTime,
  formatKm,
  formatMoney,
  STATUS_LABEL,
  type BookingStatus,
} from "@/lib/ride-shared";

export const Route = createFileRoute("/_authenticated/drive/rides")({
  head: () => ({
    meta: [
      { title: "Rider trips — WayneWay" },
      { name: "description", content: "Trips you've completed as a WayneWay bike rider, with fares." },
      { property: "og:title", content: "Rider trips — WayneWay" },
      { property: "og:description", content: "Your completed WayneWay rider trips." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DriverRidesPage,
});

function DriverRidesPage() {
  const rides = useQuery({ queryKey: ["driver_rides"], queryFn: () => listDriverRides() });

  const completed = (rides.data ?? []).filter((ride) => ride.status === "COMPLETED");
  const earnings = completed.reduce((total, ride) => total + Number(ride.final_fare ?? 0), 0);

  return (
    <AppShell title="Your trips" back={{ to: "/drive" }}>
      <SectionCard title="Completed fares" description="Fares collected across completed trips.">
        <p className="text-2xl font-bold">{formatMoney(earnings)}</p>
        <p className="text-xs text-muted-foreground">
          {completed.length} completed trip{completed.length === 1 ? "" : "s"}. Payouts and commission
          arrive with the payments phase.
        </p>
      </SectionCard>

      <SectionCard className="mt-4" title="Trip history">
        {rides.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rides.isError ? (
          <ErrorState onRetry={() => rides.refetch()} />
        ) : rides.data && rides.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {rides.data.map((ride) => (
              <li key={ride.id} className="flex items-start gap-3 py-3">
                <Bike className="mt-0.5 size-5 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ride.destination_address}</p>
                  <p className="truncate text-xs text-muted-foreground">from {ride.pickup_address}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {STATUS_LABEL[ride.status as BookingStatus]} ·{" "}
                    {formatDateTime(ride.requested_at)} ·{" "}
                    {formatKm(ride.final_distance_metres ?? ride.estimated_distance_metres)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold">
                  {formatMoney(ride.final_fare ?? ride.estimated_fare, ride.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No trips yet" description="Accepted rides appear here." />
        )}
      </SectionCard>
    </AppShell>
  );
}
