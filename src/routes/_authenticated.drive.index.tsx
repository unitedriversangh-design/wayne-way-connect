import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, Loader2, MapPin, Power } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, SectionCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  acceptRideRequest,
  completeRide,
  getDriverContext,
  listDriverRequests,
  markDriverArrived,
  registerAsDriver,
  rejectRideRequest,
  setDriverAvailability,
  startRide,
  updateDriverLocation,
} from "@/lib/ride.functions";
import {
  formatDuration,
  formatKm,
  formatMoney,
  rideErrorMessage,
  STATUS_LABEL,
  type BookingStatus,
} from "@/lib/ride-shared";

export const Route = createFileRoute("/_authenticated/drive/")({
  head: () => ({
    meta: [
      { title: "Rider dashboard — WayneWay" },
      {
        name: "description",
        content: "Go online, accept bike ride requests and complete trips as a WayneWay rider.",
      },
      { property: "og:title", content: "Rider dashboard — WayneWay" },
      { property: "og:description", content: "Accept and complete WayneWay bike rides." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DrivePage,
});

function useGeolocation() {
  return async () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
}

function DrivePage() {
  const queryClient = useQueryClient();
  const getLocation = useGeolocation();

  const context = useQuery({
    queryKey: ["driver_context"],
    queryFn: () => getDriverContext(),
    refetchInterval: 6000,
  });

  const online = context.data?.availability?.status === "ONLINE";
  const currentRide = context.data?.currentRide ?? null;

  const requests = useQuery({
    queryKey: ["driver_requests"],
    queryFn: () => listDriverRequests(),
    enabled: online && !currentRide,
    refetchInterval: 4000,
  });

  const pushLocation = useServerFn(updateDriverLocation);
  const setAvailabilityFn = useServerFn(setDriverAvailability);
  const rideId = (currentRide?.id as string | undefined) ?? undefined;
  const rideIdRef = useRef<string | undefined>(undefined);
  rideIdRef.current = rideId;

  // Keeps the rider's location fresh while online so matching can see them.
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const send = async () => {
      const point = await getLocation();
      if (!point || cancelled) return;
      try {
        await pushLocation({
          data: rideIdRef.current ? { ...point, bookingId: rideIdRef.current } : point,
        });
      } catch {
        // Throttled or offline: the next tick retries.
      }
    };
    void send();
    const timer = setInterval(send, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [online, getLocation, pushLocation]);

  const toggleAvailability = useMutation({
    mutationFn: async (next: boolean) => {
      if (!next) return setAvailabilityFn({ data: { status: "OFFLINE" } });
      const point = await getLocation();
      if (!point) throw new Error("LOCATION_UNAVAILABLE");
      return setAvailabilityFn({ data: { status: "ONLINE", ...point } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver_context"] }),
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  if (context.isLoading) {
    return (
      <AppShell title="Ride with WayneWay" back={{ to: "/profile" }}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (context.isError) {
    return (
      <AppShell title="Ride with WayneWay" back={{ to: "/profile" }}>
        <ErrorState onRetry={() => context.refetch()} />
      </AppShell>
    );
  }

  if (!context.data?.profile || !context.data.vehicle) {
    return (
      <AppShell title="Ride with WayneWay" back={{ to: "/profile" }}>
        <DriverRegistration onDone={() => queryClient.invalidateQueries({ queryKey: ["driver_context"] })} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Rider dashboard"
      back={{ to: "/profile" }}
      action={
        <Link to="/drive/rides" className="focus-ring rounded text-sm font-semibold text-primary">
          Trips
        </Link>
      }
    >
      <SectionCard>
        <div className="flex items-center gap-3">
          <Power className={online ? "size-5 text-primary" : "size-5 text-muted-foreground"} aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">{online ? "You're online" : "You're offline"}</p>
            <p className="text-xs text-muted-foreground">
              {context.data.vehicle.make_model} · {context.data.vehicle.registration_number}
            </p>
          </div>
          <Switch
            checked={online}
            disabled={toggleAvailability.isPending || !!currentRide}
            onCheckedChange={(next) => toggleAvailability.mutate(next)}
            aria-label="Availability"
          />
        </div>
        {context.data.availability?.location_updated_at ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Location shared {new Date(context.data.availability.location_updated_at).toLocaleTimeString("en-IN")}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Allow location access so nearby ride requests can reach you.
          </p>
        )}
      </SectionCard>

      {currentRide ? (
        <CurrentRideCard ride={currentRide} />
      ) : (
        <SectionCard className="mt-4" title="Ride requests">
          {!online ? (
            <EmptyState title="Go online to receive requests" />
          ) : requests.isLoading ? (
            <p className="text-sm text-muted-foreground">Waiting for requests…</p>
          ) : requests.data && requests.data.length > 0 ? (
            <ul className="space-y-3">
              {requests.data.map((request) => (
                <RequestCard key={request.requestId} request={request} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No requests right now"
              description="Stay online — new bike requests near you appear here automatically."
            />
          )}
        </SectionCard>
      )}
    </AppShell>
  );
}

function RequestCard({
  request,
}: {
  request: {
    requestId: string;
    expiresAt: string;
    distanceToPickupKm: number | null;
    booking: {
      id: string;
      public_id: string;
      pickup_address: string;
      destination_address: string;
      estimated_distance_metres: number;
      estimated_duration_seconds: number;
      estimated_fare: number;
      currency: string;
    };
  };
}) {
  const queryClient = useQueryClient();
  const acceptFn = useServerFn(acceptRideRequest);
  const rejectFn = useServerFn(rejectRideRequest);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((new Date(request.expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const timer = setInterval(
      () =>
        setSecondsLeft(
          Math.max(0, Math.round((new Date(request.expiresAt).getTime() - Date.now()) / 1000)),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [request.expiresAt]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["driver_requests"] });
    queryClient.invalidateQueries({ queryKey: ["driver_context"] });
  };

  const accept = useMutation({
    mutationFn: () => acceptFn({ data: { bookingId: request.booking.id } }),
    onSuccess: () => {
      toast.success("Ride accepted. Head to the pickup point.");
      refresh();
    },
    onError: (error) => {
      toast.error(rideErrorMessage(error));
      refresh();
    },
  });

  const reject = useMutation({
    mutationFn: () => rejectFn({ data: { bookingId: request.booking.id } }),
    onSuccess: refresh,
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  const busy = accept.isPending || reject.isPending;

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-2">
        <Bike className="mt-0.5 size-5 text-primary" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {formatMoney(request.booking.estimated_fare, request.booking.currency)} ·{" "}
            {formatKm(request.booking.estimated_distance_metres)} ·{" "}
            {formatDuration(request.booking.estimated_duration_seconds)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pickup {request.distanceToPickupKm != null ? `${request.distanceToPickupKm} km away` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
          {secondsLeft}s
        </span>
      </div>

      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">From </span>
        {request.booking.pickup_address}
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">To </span>
        {request.booking.destination_address}
      </p>

      {secondsLeft === 0 ? (
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          This ride request has expired.
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            className="h-11 flex-1"
            disabled={busy}
            onClick={() => accept.mutate()}
          >
            {accept.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            disabled={busy}
            onClick={() => reject.mutate()}
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

function CurrentRideCard({ ride }: { ride: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const [otp, setOtp] = useState("");
  const arrivedFn = useServerFn(markDriverArrived);
  const startFn = useServerFn(startRide);
  const completeFn = useServerFn(completeRide);

  const bookingId = ride["id"] as string;
  const status = ride["status"] as BookingStatus;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["driver_context"] });

  const arrived = useMutation({
    mutationFn: () => arrivedFn({ data: { bookingId } }),
    onSuccess: refresh,
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  const start = useMutation({
    mutationFn: () => startFn({ data: { bookingId, otp } }),
    onSuccess: () => {
      setOtp("");
      toast.success("Ride started.");
      refresh();
    },
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  const complete = useMutation({
    mutationFn: () => completeFn({ data: { bookingId } }),
    onSuccess: (result) => {
      toast.success(`Ride completed. Fare ${formatMoney(result.finalFare)}`);
      refresh();
    },
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  return (
    <SectionCard className="mt-4" title="Current ride">
      <p className="text-sm font-semibold">{STATUS_LABEL[status]}</p>
      <p className="text-xs text-muted-foreground">Booking {ride["public_id"] as string}</p>

      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-primary" aria-hidden />
          <span>{ride["pickup_address"] as string}</span>
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-accent-foreground" aria-hidden />
          <span>{ride["destination_address"] as string}</span>
        </li>
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        {formatKm(ride["estimated_distance_metres"] as number)} ·{" "}
        {formatDuration(ride["estimated_duration_seconds"] as number)} · fare{" "}
        {formatMoney(ride["estimated_fare"] as number, ride["currency"] as string)}
      </p>

      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${ride["pickup_latitude"]},${ride["pickup_longitude"]}`}
        target="_blank"
        rel="noreferrer"
        className="focus-ring mt-3 inline-block rounded text-sm font-semibold text-primary"
      >
        Open navigation to pickup
      </a>

      {status === "DRIVER_ASSIGNED" || status === "DRIVER_EN_ROUTE" ? (
        <Button
          type="button"
          className="mt-4 h-12 w-full"
          disabled={arrived.isPending}
          onClick={() => arrived.mutate()}
        >
          {arrived.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          I've arrived at pickup
        </Button>
      ) : null}

      {status === "DRIVER_ARRIVED" || status === "READY_TO_START" ? (
        <div className="mt-4 space-y-2">
          <Label htmlFor="ride-otp">Enter the customer's 6-digit start code</Label>
          <Input
            id="ride-otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-12 text-center text-xl tracking-[0.3em]"
            placeholder="------"
          />
          <Button
            type="button"
            className="h-12 w-full"
            disabled={otp.length !== 6 || start.isPending}
            onClick={() => start.mutate()}
          >
            {start.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Start ride
          </Button>
        </div>
      ) : null}

      {status === "IN_PROGRESS" ? (
        <Button
          type="button"
          className="mt-4 h-12 w-full"
          disabled={complete.isPending}
          onClick={() => complete.mutate()}
        >
          {complete.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Complete ride
        </Button>
      ) : null}
    </SectionCard>
  );
}

function DriverRegistration({ onDone }: { onDone: () => void }) {
  const register = useServerFn(registerAsDriver);
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    makeModel: "",
    registrationNumber: "",
    colour: "",
  });

  const submit = useMutation({
    mutationFn: () =>
      register({
        data: {
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          makeModel: form.makeModel.trim(),
          registrationNumber: form.registrationNumber.trim(),
          ...(form.colour.trim() ? { colour: form.colour.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Rider profile created.");
      onDone();
    },
    onError: (error) => toast.error(rideErrorMessage(error)),
  });

  const valid =
    form.fullName.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(form.phoneNumber.trim()) &&
    form.makeModel.trim().length >= 2 &&
    form.registrationNumber.trim().length >= 4;

  return (
    <SectionCard
      title="Become a WayneWay rider"
      description="Add your details and bike to start receiving ride requests."
    >
      <div className="space-y-3">
        <Field
          id="fullName"
          label="Full name"
          value={form.fullName}
          onChange={(value) => setForm((f) => ({ ...f, fullName: value }))}
        />
        <Field
          id="phoneNumber"
          label="Mobile number"
          value={form.phoneNumber}
          onChange={(value) =>
            setForm((f) => ({ ...f, phoneNumber: value.replace(/\D/g, "").slice(0, 10) }))
          }
          hint="10-digit Indian mobile number"
        />
        <Field
          id="makeModel"
          label="Bike make and model"
          value={form.makeModel}
          onChange={(value) => setForm((f) => ({ ...f, makeModel: value }))}
        />
        <Field
          id="registrationNumber"
          label="Registration number"
          value={form.registrationNumber}
          onChange={(value) => setForm((f) => ({ ...f, registrationNumber: value.toUpperCase() }))}
        />
        <Field
          id="colour"
          label="Colour (optional)"
          value={form.colour}
          onChange={(value) => setForm((f) => ({ ...f, colour: value }))}
        />
      </div>

      <Button
        type="button"
        className="mt-4 h-12 w-full"
        disabled={!valid || submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Create rider profile
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Document verification and manual approval arrive with the rider onboarding phase. Until then
        a new rider profile is activated straight away.
      </p>
    </SectionCard>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11" />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
