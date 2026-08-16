import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Armchair, Clock, MapPin, Snowflake } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ErrorState, SectionCard } from "@/components/ui-kit";
import {
  Callout,
  Field,
  GhostButton,
  inputClass,
  LoadingRows,
  PrimaryButton,
  StatusBadge,
} from "@/components/operator-ui";
import { createBusBooking, getBusSchedule, payBusBooking, quoteBusSeats } from "@/lib/bus.functions";
import {
  busErrorMessage,
  describeCancellationPolicy,
  durationBetween,
  formatINR,
  formatTripDateTime,
  formatTripTime,
  MAX_SEATS_PER_BOOKING,
  SEAT_TYPE_LABEL,
  type BusFareSnapshot,
  type SeatState,
} from "@/lib/bus-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bus/$scheduleId")({
  head: () => ({
    meta: [
      { title: "Select your seats — WayneWay" },
      { name: "description", content: "Pick seats, boarding and dropping points, then confirm your WayneWay bus ticket." },
      { property: "og:title", content: "Select your seats — WayneWay" },
      { property: "og:description", content: "Live seat map and fare breakdown for your bus trip." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusSchedulePage,
});

type PassengerDraft = { seatCode: string; fullName: string; age: string; gender: "" | "MALE" | "FEMALE" | "OTHER" };

const SEAT_STATE_CLASS: Record<SeatState, string> = {
  AVAILABLE: "border-border bg-background hover:border-primary text-foreground",
  HELD: "border-warning/40 bg-warning/20 text-warning-foreground cursor-not-allowed",
  BOOKED: "border-border bg-muted text-muted-foreground cursor-not-allowed",
  BLOCKED: "border-border bg-muted text-muted-foreground cursor-not-allowed",
  UNAVAILABLE: "border-border bg-muted text-muted-foreground cursor-not-allowed",
};

function BusSchedulePage() {
  const { scheduleId } = Route.useParams();
  const navigate = useNavigate();

  const trip = useQuery({
    queryKey: ["bus_schedule", scheduleId],
    queryFn: () => getBusSchedule({ data: { scheduleId } }),
    refetchInterval: 20_000,
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [boardingStopId, setBoardingStopId] = useState("");
  const [droppingStopId, setDroppingStopId] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null);
  const [passengers, setPassengers] = useState<PassengerDraft[]>([]);
  const [lead, setLead] = useState({ name: "", phone: "", email: "" });
  const [quote, setQuote] = useState<BusFareSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<{ bookingId: string; pnr: string; holdExpiresAt: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!held) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [held]);

  const data = trip.data;
  const pickupStops = useMemo(() => (data?.stops ?? []).filter((stop) => stop.pickupEnabled), [data]);
  const dropStops = useMemo(() => (data?.stops ?? []).filter((stop) => stop.dropEnabled), [data]);

  useEffect(() => {
    if (!boardingStopId && pickupStops[0]) setBoardingStopId(pickupStops[0].id);
  }, [pickupStops, boardingStopId]);
  useEffect(() => {
    const last = dropStops[dropStops.length - 1];
    if (!droppingStopId && last) setDroppingStopId(last.id);
  }, [dropStops, droppingStopId]);

  useEffect(() => {
    setPassengers((prev) =>
      selected.map(
        (seatCode) =>
          prev.find((passenger) => passenger.seatCode === seatCode) ?? {
            seatCode,
            fullName: "",
            age: "",
            gender: "" as const,
          },
      ),
    );
    setQuote(null);
  }, [selected]);

  const quoteMutation = useMutation({
    mutationFn: () =>
      quoteBusSeats({
        data: {
          scheduleId,
          seatCodes: selected,
          boardingStopId,
          droppingStopId,
          ...(discountCode.trim() ? { discountCode: discountCode.trim().toUpperCase() } : {}),
        },
      }),
    onSuccess: (snapshot) => {
      setQuote(snapshot);
      setAppliedDiscount(snapshot.discountCode);
      setError(null);
      if (discountCode.trim() && !snapshot.discountCode) {
        setError("That discount code is not valid for this trip, so the fare shown excludes it.");
      }
    },
    onError: (cause) => setError(busErrorMessage(cause)),
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      createBusBooking({
        data: {
          scheduleId,
          seatCodes: selected,
          boardingStopId,
          droppingStopId,
          ...(appliedDiscount ? { discountCode: appliedDiscount } : {}),
          leadPassengerName: lead.name.trim(),
          leadPassengerPhone: lead.phone.trim(),
          ...(lead.email.trim() ? { leadPassengerEmail: lead.email.trim() } : {}),
          passengers: passengers.map((passenger) => ({
            seatCode: passenger.seatCode,
            fullName: passenger.fullName.trim(),
            ...(passenger.age ? { age: Number(passenger.age) } : {}),
            ...(passenger.gender ? { gender: passenger.gender } : {}),
          })),
        },
      }),
    onSuccess: (result) => {
      setHeld({ bookingId: result.bookingId, pnr: result.pnr, holdExpiresAt: result.holdExpiresAt });
      setQuote(result.fare);
      setError(null);
      void trip.refetch();
    },
    onError: (cause) => setError(busErrorMessage(cause)),
  });

  const payMutation = useMutation({
    mutationFn: () =>
      payBusBooking({
        data: { bookingId: held!.bookingId, idempotencyKey: `pay-${held!.bookingId}` },
      }),
    onSuccess: () => {
      toast.success("Booking confirmed");
      navigate({ to: "/bus/booking/$bookingId", params: { bookingId: held!.bookingId } });
    },
    onError: (cause) => setError(busErrorMessage(cause)),
  });

  function toggleSeat(seatCode: string, state: SeatState) {
    if (held) return;
    if (state !== "AVAILABLE") return;
    setError(null);
    setSelected((prev) => {
      if (prev.includes(seatCode)) return prev.filter((code) => code !== seatCode);
      if (prev.length >= MAX_SEATS_PER_BOOKING) {
        setError(`You can book up to ${MAX_SEATS_PER_BOOKING} seats in one ticket.`);
        return prev;
      }
      return [...prev, seatCode];
    });
  }

  function startBooking(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (selected.length === 0) return setError("Select at least one seat.");
    if (!boardingStopId || !droppingStopId) return setError("Choose boarding and dropping points.");
    if (passengers.some((passenger) => passenger.fullName.trim().length < 1)) {
      return setError("Enter a name for every passenger.");
    }
    if (!/^[6-9]\d{9}$/.test(lead.phone.trim())) {
      return setError("Enter a valid 10-digit Indian mobile number for the lead passenger.");
    }
    if (!lead.name.trim()) return setError("Enter the lead passenger's name.");
    bookMutation.mutate();
  }

  if (trip.isLoading) {
    return (
      <AppShell title="Trip" back={{ to: "/bus" }}>
        <LoadingRows label="Loading trip and live seat map…" />
      </AppShell>
    );
  }
  if (trip.isError || !data) {
    return (
      <AppShell title="Trip" back={{ to: "/bus" }}>
        <ErrorState message={busErrorMessage(trip.error)} onRetry={() => trip.refetch()} />
      </AppShell>
    );
  }

  const decks = [...new Set(data.seats.map((seat) => seat.deck))].sort();
  const holdSecondsLeft = held ? Math.max(0, Math.floor((new Date(held.holdExpiresAt).getTime() - now) / 1000)) : 0;
  const holdExpired = held != null && holdSecondsLeft === 0;

  return (
    <AppShell title={`${data.route.origin_city} → ${data.route.destination_city}`} back={{ to: "/bus" }}>
      <div className="space-y-5">
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-base font-bold">
                {data.bus.name}
                {data.bus.isAc ? <Snowflake className="size-4 text-primary" aria-hidden /> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.operator.name} · {data.bus.type}
              </p>
            </div>
            <StatusBadge status={data.status} />
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="font-semibold">{formatTripTime(data.departureAt)}</span>
            <span className="flex-1 border-t border-dashed border-border" />
            <span className="text-xs text-muted-foreground">{durationBetween(data.departureAt, data.arrivalAt)}</span>
            <span className="flex-1 border-t border-dashed border-border" />
            <span className="font-semibold">{formatTripTime(data.arrivalAt)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Departs {formatTripDateTime(data.departureAt)} · Booking closes {formatTripDateTime(data.bookingClosesAt)}
          </p>
          {!data.bookingOpen ? (
            <div className="mt-3">
              <Callout tone="warning" title="Booking closed">
                This trip is no longer accepting bookings. Search again for another departure.
              </Callout>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Boarding & dropping points" description="Times are as scheduled by the operator.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Boarding point" required>
              <select
                className={inputClass}
                value={boardingStopId}
                disabled={held != null}
                onChange={(event) => {
                  setBoardingStopId(event.target.value);
                  setQuote(null);
                }}
              >
                {pickupStops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name}, {stop.city} — {formatTripTime(stop.scheduledAt)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dropping point" required>
              <select
                className={inputClass}
                value={droppingStopId}
                disabled={held != null}
                onChange={(event) => {
                  setDroppingStopId(event.target.value);
                  setQuote(null);
                }}
              >
                {dropStops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name}, {stop.city} — {formatTripTime(stop.scheduledAt)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <ol className="mt-4 space-y-2">
            {data.stops.map((stop) => (
              <li key={stop.id} className="flex gap-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-semibold text-foreground">{formatTripTime(stop.scheduledAt)}</span> {stop.name},{" "}
                  {stop.city}
                  {stop.address ? ` · ${stop.address}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard
          title="Choose seats"
          description={`${data.seatsAvailable} of ${data.seats.length} seats available · up to ${MAX_SEATS_PER_BOOKING} per ticket`}
        >
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <Legend className="border-border bg-background" label="Available" />
            <Legend className="border-primary bg-primary text-primary-foreground" label="Selected" />
            <Legend className="border-warning/40 bg-warning/20" label="On hold" />
            <Legend className="border-border bg-muted" label="Booked / blocked" />
          </div>
          {decks.map((deck) => {
            const deckSeats = data.seats.filter((seat) => seat.deck === deck);
            const rows = [...new Set(deckSeats.map((seat) => seat.row))].sort((a, b) => a - b);
            return (
              <div key={deck} className="mb-4">
                {decks.length > 1 ? (
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {deck === 1 ? "Lower deck" : "Upper deck"}
                  </p>
                ) : null}
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row} className="flex flex-wrap gap-2">
                      {deckSeats
                        .filter((seat) => seat.row === row)
                        .sort((a, b) => a.column - b.column)
                        .map((seat) => {
                          const isSelected = selected.includes(seat.seatCode);
                          return (
                            <button
                              key={seat.seatCode}
                              type="button"
                              onClick={() => toggleSeat(seat.seatCode, seat.state)}
                              disabled={seat.state !== "AVAILABLE" || held != null}
                              aria-pressed={isSelected}
                              title={`${seat.seatCode} · ${SEAT_TYPE_LABEL[seat.seatType]} · ${formatINR(seat.fare)}`}
                              className={cn(
                                "focus-ring flex h-12 w-14 flex-col items-center justify-center rounded-lg border text-[11px] font-bold",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : SEAT_STATE_CLASS[seat.state],
                              )}
                            >
                              <Armchair className="size-3.5" aria-hidden />
                              {seat.seatCode}
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {selected.length > 0 ? (
            <p className="text-sm font-semibold">
              Selected: {selected.join(", ")}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Tap a seat to select it.</p>
          )}
        </SectionCard>

        {selected.length > 0 ? (
          <SectionCard title="Passenger details" description="Names must match a valid ID carried during travel.">
            <form onSubmit={startBooking} className="space-y-4">
              {passengers.map((passenger, index) => (
                <div key={passenger.seatCode} className="rounded-2xl border border-border p-3">
                  <p className="mb-2 text-sm font-bold">Seat {passenger.seatCode}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Full name" required>
                      <input
                        className={inputClass}
                        value={passenger.fullName}
                        disabled={held != null}
                        onChange={(event) =>
                          setPassengers((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, fullName: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Age">
                      <input
                        type="number"
                        min={1}
                        max={119}
                        className={inputClass}
                        value={passenger.age}
                        disabled={held != null}
                        onChange={(event) =>
                          setPassengers((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, age: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Gender">
                      <select
                        className={inputClass}
                        value={passenger.gender}
                        disabled={held != null}
                        onChange={(event) =>
                          setPassengers((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, gender: event.target.value as PassengerDraft["gender"] }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="">Prefer not to say</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </Field>
                  </div>
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Lead passenger name" required>
                  <input
                    className={inputClass}
                    value={lead.name}
                    disabled={held != null}
                    onChange={(event) => setLead((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </Field>
                <Field label="Mobile number" required hint="Ticket updates are sent here">
                  <input
                    inputMode="numeric"
                    className={inputClass}
                    value={lead.phone}
                    disabled={held != null}
                    onChange={(event) => setLead((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={inputClass}
                    value={lead.email}
                    disabled={held != null}
                    onChange={(event) => setLead((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-40 flex-1">
                  <Field label="Discount code">
                    <input
                      className={inputClass}
                      value={discountCode}
                      disabled={held != null}
                      onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
                      placeholder="e.g. FIRST10"
                    />
                  </Field>
                </div>
                <GhostButton
                  type="button"
                  onClick={() => quoteMutation.mutate()}
                  disabled={held != null || quoteMutation.isPending}
                >
                  {quoteMutation.isPending ? "Checking…" : "Check fare"}
                </GhostButton>
              </div>

              {quote ? <FareBreakdown fare={quote} /> : null}
              {error ? <Callout tone="error">{error}</Callout> : null}

              {!held ? (
                <PrimaryButton type="submit" loading={bookMutation.isPending} disabled={!data.bookingOpen}>
                  Hold seats & continue
                </PrimaryButton>
              ) : null}
            </form>
          </SectionCard>
        ) : null}

        {held ? (
          <SectionCard title="Confirm and pay" description={`PNR ${held.pnr} · seats held for you`}>
            {holdExpired ? (
              <Callout tone="error" title="Seat hold expired">
                Your seats were released back to the trip. Select seats again to continue.
              </Callout>
            ) : (
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="size-4 text-primary" aria-hidden />
                Seats held for {Math.floor(holdSecondsLeft / 60)}:{String(holdSecondsLeft % 60).padStart(2, "0")}
              </p>
            )}
            {quote ? <div className="mt-3">{<FareBreakdown fare={quote} /></div>} : null}
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {describeCancellationPolicy().map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
            {error ? (
              <div className="mt-3">
                <Callout tone="error">{error}</Callout>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton
                type="button"
                loading={payMutation.isPending}
                disabled={holdExpired}
                onClick={() => payMutation.mutate()}
              >
                Pay {quote ? formatINR(quote.total) : ""} & confirm
              </PrimaryButton>
              <GhostButton type="button" onClick={() => navigate({ to: "/bus/bookings" })}>
                View my tickets
              </GhostButton>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Payment settlement runs through WayneWay. Confirmation is issued by the server only after the amount is
              recorded against this PNR.
            </p>
          </SectionCard>
        ) : null}
      </div>
    </AppShell>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-4 rounded border", className)} />
      {label}
    </span>
  );
}

function FareBreakdown({ fare }: { fare: BusFareSnapshot }) {
  return (
    <dl className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
      {fare.seats.map((seat) => (
        <div key={seat.seatCode} className="flex justify-between py-0.5">
          <dt className="text-muted-foreground">
            Seat {seat.seatCode} · {SEAT_TYPE_LABEL[seat.seatType]}
          </dt>
          <dd>{formatINR(seat.fare)}</dd>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-border pt-1">
        <dt className="text-muted-foreground">Seat total</dt>
        <dd>{formatINR(fare.seatTotal)}</dd>
      </div>
      {fare.discountAmount > 0 ? (
        <div className="flex justify-between py-0.5 text-success-foreground">
          <dt>Discount {fare.discountCode ? `(${fare.discountCode})` : ""}</dt>
          <dd>−{formatINR(fare.discountAmount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between py-0.5">
        <dt className="text-muted-foreground">Tax ({fare.taxPercent}%)</dt>
        <dd>{formatINR(fare.taxAmount)}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold">
        <dt>Total payable</dt>
        <dd>{formatINR(fare.total)}</dd>
      </div>
    </dl>
  );
}
