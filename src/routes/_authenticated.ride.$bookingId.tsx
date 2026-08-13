import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Bike, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, SectionCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { cancelBooking, getCustomerBooking } from "@/lib/ride.functions";
import {
  formatDateTime,
  formatDuration,
  formatKm,
  formatMoney,
  isActive,
  rideErrorMessage,
  STATUS_LABEL,
  type BookingStatus,
} from "@/lib/ride-shared";

export const Route = createFileRoute("/_authenticated/ride/$bookingId")({
  head: () => ({
    meta: [
      { title: "Your bike ride — WayneWay" },
      { name: "description", content: "Live status, rider details and receipt for your WayneWay bike ride." },
      { property: "og:title", content: "Your bike ride — WayneWay" },
      { property: "og:description", content: "Track your rider and see your trip summary." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RidePage,
});

const CANCELLABLE: BookingStatus[] = [
  "REQUESTED",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_EN_ROUTE",
  "DRIVER_ARRIVED",
];

function RidePage() {
  const { bookingId } = Route.useParams();
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(false);
  const fetchBooking = useServerFn(getCustomerBooking);
  const cancelFn = useServerFn(cancelBooking);

  const ride = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const result = await fetchBooking({ data: { bookingId } });
      setOffline(false);
      return result;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.booking.status;
      return status && isActive(status) ? 4000 : false;
    },
    retry: 2,
  });

  const cancel = useMutation({
    mutationFn: () => cancelFn({ data: { bookingId } }),
    onSuccess: () => {
      toast.success("Ride cancelled.");
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    },
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  if (ride.isLoading) {
    return (
      <AppShell title="Your ride" back={{ to: "/home" }}>
        <p className="text-sm text-muted-foreground">Loading your ride…</p>
      </AppShell>
    );
  }

  if (ride.isError) {
    return (
      <AppShell title="Your ride" back={{ to: "/home" }}>
        <ErrorState message={rideErrorMessage(ride.error)} onRetry={() => ride.refetch()} />
      </AppShell>
    );
  }

  const data = ride.data!;
  const booking = data.booking;
  const status = booking.status;

  return (
    <AppShell title="Your ride" back={{ to: "/rides" }}>
      {offline ? (
        <p className="mb-3 rounded-xl border border-warning bg-warning/10 px-3 py-2 text-xs font-semibold">
          You're offline. Your ride continues — this page will refresh when you reconnect.
        </p>
      ) : null}

      <SectionCard>
        <div className="flex items-start gap-3">
          <Bike className="mt-0.5 size-6 text-primary" aria-hidden />
          <div className="flex-1">
            <p className="text-lg font-bold">{STATUS_LABEL[status]}</p>
            <p className="text-xs text-muted-foreground">
              Booking {booking.publicId} · requested {formatDateTime(booking.requestedAt)}
            </p>
          </div>
          {isActive(status) ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {status === "NO_DRIVER_FOUND" || status === "EXPIRED" ? (
          <div className="mt-4">
            <EmptyState
              title="No bike riders available"
              description="No rider accepted this request nearby. You can try again now."
              action={
                <Link to="/ride/new" className="focus-ring rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Try again
                </Link>
              }
            />
          </div>
        ) : null}

        {data.rideOtp ? (
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4 text-center">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="size-4" aria-hidden /> Share this code with your rider
            </p>
            <p className="mt-1 text-3xl font-bold tracking-[0.3em]">{data.rideOtp}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The ride starts only after your rider enters this code.
            </p>
          </div>
        ) : null}
      </SectionCard>

      {data.driver ? (
        <SectionCard className="mt-4" title="Your rider">
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 size-5 text-primary" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold">{data.driver.name}</p>
              {data.driver.vehicle ? (
                <p className="text-sm text-muted-foreground">
                  {data.driver.vehicle.makeModel}
                  {data.driver.vehicle.colour ? ` · ${data.driver.vehicle.colour}` : ""} ·{" "}
                  <span className="font-semibold text-foreground">
                    {data.driver.vehicle.registrationNumber}
                  </span>
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Location {data.driver.locationStatus === "LIVE" ? "live" : "last seen"}{" "}
                {formatDateTime(data.driver.locationUpdatedAt)}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard className="mt-4" title="Trip">
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 text-primary" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Pickup</p>
              <p className="text-sm">{booking.pickup.address}</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 text-accent-foreground" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Destination</p>
              <p className="text-sm">{booking.destination.address}</p>
            </div>
          </li>
        </ul>

        <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
          <Row
            label="Distance"
            value={formatKm(booking.finalDistanceMetres ?? booking.estimatedDistanceMetres)}
          />
          <Row
            label="Duration"
            value={formatDuration(booking.finalDurationSeconds ?? booking.estimatedDurationSeconds)}
          />
          <Row label="Base fare" value={formatMoney(booking.fareSnapshot.base_fare, booking.currency)} />
          <Row
            label="Distance charge"
            value={formatMoney(booking.fareSnapshot.distance_charge, booking.currency)}
          />
          <Row label="Time charge" value={formatMoney(booking.fareSnapshot.time_charge, booking.currency)} />
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
            <dt>{booking.finalFare == null ? "Estimated fare" : "Final fare"}</dt>
            <dd>{formatMoney(booking.finalFare ?? booking.estimatedFare, booking.currency)}</dd>
          </div>
        </dl>
      </SectionCard>

      {status === "COMPLETED" ? (
        <SectionCard className="mt-4" title="Trip summary">
          <dl className="space-y-2 text-sm">
            <Row label="Started" value={formatDateTime(booking.startedAt)} />
            <Row label="Completed" value={formatDateTime(booking.completedAt)} />
            <Row label="Booking reference" value={booking.publicId} />
          </dl>
        </SectionCard>
      ) : null}

      <SectionCard className="mt-4" title="Ride history">
        <ol className="space-y-2 text-sm">
          {data.events.map((event) => (
            <li key={event.id} className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{event.event_type.replaceAll("_", " ")}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDateTime(event.created_at)}
              </span>
            </li>
          ))}
        </ol>
      </SectionCard>

      {CANCELLABLE.includes(status) ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-12 w-full"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {cancel.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Cancel ride
        </Button>
      ) : null}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
