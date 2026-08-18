import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Phone, Ticket } from "lucide-react";

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
import { cancelMyBusBooking, getMyBusBooking, quoteBusCancellation } from "@/lib/bus.functions";
import {
  BUS_BOOKING_LABEL,
  busErrorMessage,
  describeCancellationPolicy,
  formatINR,
  formatTripDateTime,
  formatTripTime,
  SEAT_TYPE_LABEL,
  type BusBookingStatus,
} from "@/lib/bus-shared";

export const Route = createFileRoute("/_authenticated/bus/booking/$bookingId")({
  head: () => ({
    meta: [
      { title: "Your bus ticket — WayneWay" },
      { name: "description", content: "Ticket details, passengers, boarding point and refund status for your WayneWay bus booking." },
      { property: "og:title", content: "Your bus ticket — WayneWay" },
      { property: "og:description", content: "PNR, seats and boarding details for your trip." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusTicketPage,
});

function BusTicketPage() {
  const { bookingId } = Route.useParams();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const booking = useQuery({
    queryKey: ["my_bus_booking", bookingId],
    queryFn: () => getMyBusBooking({ data: { bookingId } }),
    refetchInterval: (query) =>
      ["SEAT_HELD", "PAYMENT_PENDING", "CANCEL_REQUESTED", "REFUND_PENDING"].includes(
        (query.state.data?.status as string) ?? "",
      )
        ? 10_000
        : false,
  });

  const refundQuote = useQuery({
    queryKey: ["bus_cancel_quote", bookingId],
    queryFn: () => quoteBusCancellation({ data: { bookingId } }),
    enabled: showCancel,
  });

  const cancel = useMutation({
    mutationFn: () => cancelMyBusBooking({ data: { bookingId, reason: reason.trim() } }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      setShowCancel(false);
      void queryClient.invalidateQueries({ queryKey: ["my_bus_booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["my_bus_bookings"] });
    },
    onError: (cause) => setError(busErrorMessage(cause)),
  });

  if (booking.isLoading) {
    return (
      <AppShell title="Ticket" back={{ to: "/bus/bookings" }}>
        <LoadingRows label="Loading your ticket…" />
      </AppShell>
    );
  }
  if (booking.isError || !booking.data) {
    return (
      <AppShell title="Ticket" back={{ to: "/bus/bookings" }}>
        <ErrorState message={busErrorMessage(booking.error)} onRetry={() => booking.refetch()} />
      </AppShell>
    );
  }

  const data = booking.data;

  return (
    <AppShell title={`PNR ${data.pnr}`} back={{ to: "/bus/bookings" }}>
      <div className="space-y-5">
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">
                {data.trip.originCity} → {data.trip.destinationCity}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.trip.busName} · {data.trip.busType}
                {data.trip.isAc ? " · AC" : ""} · {data.operator.name}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge status={BUS_BOOKING_LABEL[data.status as BusBookingStatus] ?? data.status} />
              <p className="mt-1 text-xs text-muted-foreground">Payment: {data.paymentStatus}</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Departure</dt>
              <dd className="font-semibold">{formatTripDateTime(data.trip.departureAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Arrival (estimated)</dt>
              <dd className="font-semibold">{formatTripDateTime(data.trip.arrivalAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Boarding point</dt>
              <dd className="font-semibold">
                {data.boarding ? (
                  <span className="inline-flex items-start gap-1">
                    <MapPin className="mt-0.5 size-3.5 text-primary" aria-hidden />
                    {data.boarding.stop_name}, {data.boarding.city} · {formatTripTime(data.boarding.scheduled_at)}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Dropping point</dt>
              <dd className="font-semibold">
                {data.dropping ? `${data.dropping.stop_name}, ${data.dropping.city}` : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="size-3.5" aria-hidden /> Operator helpline: {data.operator.phone}
          </p>
        </SectionCard>

        <SectionCard title="Passengers" description={`${data.passengers.length} seat(s) on this ticket`}>
          <ul className="divide-y divide-border">
            {data.passengers.map((passenger) => (
              <li key={passenger.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {passenger.fullName}
                    {passenger.isLead ? " · lead" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Seat {passenger.seatCode}
                    {passenger.age ? ` · ${passenger.age} yrs` : ""}
                    {passenger.gender ? ` · ${passenger.gender.toLowerCase()}` : ""} · {passenger.boardingStatus.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{formatINR(passenger.fare)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Fare" description="Exactly what was captured when this ticket was issued.">
          <dl className="text-sm">
            {data.fare?.seats?.map((seat) => (
              <div key={seat.seatCode} className="flex justify-between py-0.5">
                <dt className="text-muted-foreground">
                  Seat {seat.seatCode} · {SEAT_TYPE_LABEL[seat.seatType]}
                </dt>
                <dd>{formatINR(seat.fare)}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-border pt-1">
              <dt className="text-muted-foreground">Seat total</dt>
              <dd>{formatINR(data.fare?.seatTotal ?? 0)}</dd>
            </div>
            {(data.fare?.discountAmount ?? 0) > 0 ? (
              <div className="flex justify-between py-0.5 text-success-foreground">
                <dt>Discount {data.fare?.discountCode ? `(${data.fare.discountCode})` : ""}</dt>
                <dd>−{formatINR(data.fare!.discountAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between py-0.5">
              <dt className="text-muted-foreground">Tax ({data.fare?.taxPercent ?? 0}%)</dt>
              <dd>{formatINR(data.fare?.taxAmount ?? 0)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold">
              <dt>Total paid</dt>
              <dd>{formatINR(data.total)}</dd>
            </div>
            {data.cancellationFee > 0 || data.refundAmount > 0 ? (
              <>
                <div className="flex justify-between py-0.5">
                  <dt className="text-muted-foreground">Cancellation charge</dt>
                  <dd>{formatINR(data.cancellationFee)}</dd>
                </div>
                <div className="flex justify-between py-0.5 font-semibold">
                  <dt>Refund</dt>
                  <dd>{formatINR(data.refundAmount)}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </SectionCard>

        {data.status === "SEAT_HELD" || data.status === "PAYMENT_PENDING" ? (
          <Callout tone="warning" title="Payment not completed">
            This ticket is not confirmed yet. Seats are released automatically when the hold expires.{" "}
            <Link to="/bus/$scheduleId" params={{ scheduleId: data.trip.scheduleId }} className="font-semibold underline">
              Return to the trip
            </Link>{" "}
            to finish paying.
          </Callout>
        ) : null}

        {data.cancellable ? (
          <SectionCard title="Cancel this ticket" description="Refunds follow the cancellation policy below.">
            <ul className="space-y-1 text-xs text-muted-foreground">
              {describeCancellationPolicy().map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
            {!showCancel ? (
              <GhostButton
                type="button"
                className="mt-3 border-destructive/40 text-destructive"
                onClick={() => setShowCancel(true)}
              >
                Start cancellation
              </GhostButton>
            ) : (
              <div className="mt-3 space-y-3">
                {refundQuote.isLoading ? (
                  <p className="text-sm text-muted-foreground">Calculating your refund…</p>
                ) : refundQuote.isError ? (
                  <Callout tone="error">{busErrorMessage(refundQuote.error)}</Callout>
                ) : refundQuote.data ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
                    <p>
                      Cancellation charge <strong>{formatINR(refundQuote.data.fee)}</strong> ({refundQuote.data.feePercent}
                      % of {formatINR(refundQuote.data.total)})
                    </p>
                    <p className="mt-1 font-bold">Refund to you: {formatINR(refundQuote.data.refund)}</p>
                  </div>
                ) : null}
                <Field label="Reason for cancellation" required>
                  <input
                    className={inputClass}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Tell us briefly why you're cancelling"
                  />
                </Field>
                {error ? <Callout tone="error">{error}</Callout> : null}
                <div className="flex flex-wrap gap-2">
                  <PrimaryButton
                    type="button"
                    className="bg-destructive text-destructive-foreground"
                    loading={cancel.isPending}
                    disabled={reason.trim().length < 3}
                    onClick={() => cancel.mutate()}
                  >
                    Confirm cancellation
                  </PrimaryButton>
                  <GhostButton type="button" onClick={() => setShowCancel(false)}>
                    Keep my ticket
                  </GhostButton>
                </div>
              </div>
            )}
          </SectionCard>
        ) : null}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Ticket className="size-3.5" aria-hidden /> Booked {formatTripDateTime(data.createdAt)}
          {data.confirmedAt ? ` · confirmed ${formatTripDateTime(data.confirmedAt)}` : ""}
          {data.cancelledAt ? ` · cancelled ${formatTripDateTime(data.cancelledAt)}` : ""}
        </p>
      </div>
    </AppShell>
  );
}
