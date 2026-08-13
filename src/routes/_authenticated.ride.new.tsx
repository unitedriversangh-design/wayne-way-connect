import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { LocationPicker, type PickedPoint } from "@/components/location-picker";
import { ErrorState, SectionCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { createBikeBooking, estimateBikeRide, getBikeService } from "@/lib/ride.functions";
import { formatDuration, formatKm, formatMoney, rideErrorMessage } from "@/lib/ride-shared";

export const Route = createFileRoute("/_authenticated/ride/new")({
  head: () => ({
    meta: [
      { title: "Book a bike ride — WayneWay" },
      {
        name: "description",
        content: "Set your pickup and destination, see the fare up front and book a WayneWay bike ride.",
      },
      { property: "og:title", content: "Book a bike ride — WayneWay" },
      { property: "og:description", content: "Transparent bike fares before you book." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewRidePage,
});

function NewRidePage() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<PickedPoint | null>(null);
  const [destination, setDestination] = useState<PickedPoint | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const service = useQuery({ queryKey: ["bike_service"], queryFn: () => getBikeService() });
  const estimateFn = useServerFn(estimateBikeRide);
  const bookFn = useServerFn(createBikeBooking);

  const estimate = useMutation({
    mutationFn: () => estimateFn({ data: { pickup: pickup!, destination: destination! } }),
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  const book = useMutation({
    mutationFn: () => {
      idempotencyKey.current ??= crypto.randomUUID();
      return bookFn({
        data: { pickup: pickup!, destination: destination!, idempotencyKey: idempotencyKey.current },
      });
    },
    onSuccess: (result) => {
      navigate({ to: "/ride/$bookingId", params: { bookingId: result.bookingId } });
    },
    onError: (error) => {
      idempotencyKey.current = null;
      toast.error(rideErrorMessage(error));
    },
  });

  const ready = pickup != null && destination != null;

  return (
    <AppShell title="Book a bike" back={{ to: "/home" }}>
      {service.isError ? (
        <ErrorState message="We couldn't load bike pricing." onRetry={() => service.refetch()} />
      ) : service.data && !service.data.enabled ? (
        <ErrorState message="Bike rides aren't available right now." />
      ) : null}

      <SectionCard title="Where are you going?">
        <div className="space-y-4">
          <LocationPicker id="pickup" label="Pickup" value={pickup} onChange={setPickup} />
          <LocationPicker
            id="destination"
            label="Destination"
            value={destination}
            onChange={setDestination}
            allowCurrentLocation={false}
          />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <Bike className="size-5 text-primary" aria-hidden />
          <span className="text-sm font-semibold">Bike</span>
          <span className="ml-auto text-xs text-muted-foreground">Auto and Bus coming later</span>
        </div>

        <Button
          type="button"
          className="mt-4 h-12 w-full"
          variant="secondary"
          disabled={!ready || estimate.isPending}
          onClick={() => estimate.mutate()}
        >
          {estimate.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Check fare and time
        </Button>
      </SectionCard>

      {estimate.data ? (
        <SectionCard className="mt-4" title="Fare estimate">
          <dl className="space-y-2 text-sm">
            <Row label="Base fare" value={formatMoney(estimate.data.breakdown.base_fare, estimate.data.currency)} />
            <Row
              label={`Distance (${formatKm(estimate.data.distanceMetres)})`}
              value={formatMoney(estimate.data.breakdown.distance_charge, estimate.data.currency)}
            />
            <Row
              label={`Time (${formatDuration(estimate.data.durationSeconds)})`}
              value={formatMoney(estimate.data.breakdown.time_charge, estimate.data.currency)}
            />
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Estimated fare</dt>
              <dd>{formatMoney(estimate.data.estimatedFare, estimate.data.currency)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Minimum fare {formatMoney(estimate.data.breakdown.minimum_fare, estimate.data.currency)}.
            {estimate.data.routeSource === "HAVERSINE_FALLBACK"
              ? " Distance is estimated without a road-route provider, so the final fare may differ."
              : " Distance uses the road route."}
          </p>

          <Button
            type="button"
            className="mt-4 h-12 w-full"
            disabled={book.isPending || !ready}
            onClick={() => book.mutate()}
          >
            {book.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {book.isPending ? "Requesting…" : "Book bike"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Payment is collected directly by your rider in this phase.
          </p>
        </SectionCard>
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
