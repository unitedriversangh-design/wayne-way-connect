import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, SectionCard } from "@/components/ui-kit";
import { LoadingRows, StatusBadge } from "@/components/operator-ui";
import { listMyBusBookings } from "@/lib/bus.functions";
import {
  BUS_BOOKING_LABEL,
  busErrorMessage,
  formatINR,
  formatTripDateTime,
  type BusBookingStatus,
} from "@/lib/bus-shared";

export const Route = createFileRoute("/_authenticated/bus/bookings")({
  head: () => ({
    meta: [
      { title: "Your bus tickets — WayneWay" },
      { name: "description", content: "All your WayneWay bus bookings, PNRs and refund status in one place." },
      { property: "og:title", content: "Your bus tickets — WayneWay" },
      { property: "og:description", content: "Track WayneWay bus bookings and refunds." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusBookingsPage,
});

function BusBookingsPage() {
  const bookings = useQuery({ queryKey: ["my_bus_bookings"], queryFn: () => listMyBusBookings() });

  return (
    <AppShell title="Bus tickets" back={{ to: "/bus" }}>
      <SectionCard title="Your bookings" description="Confirmed, pending and cancelled bus trips.">
        {bookings.isLoading ? (
          <LoadingRows />
        ) : bookings.isError ? (
          <ErrorState message={busErrorMessage(bookings.error)} onRetry={() => bookings.refetch()} />
        ) : (bookings.data?.bookings.length ?? 0) === 0 ? (
          <EmptyState
            title="No bus tickets yet"
            description="Search a route and your booking will appear here."
            action={
              <Link to="/bus" className="focus-ring rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Search buses
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {bookings.data!.bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  to="/bus/booking/$bookingId"
                  params={{ bookingId: booking.id }}
                  className="focus-ring flex items-start gap-3 rounded-lg py-3"
                >
                  <Bus className="mt-0.5 size-5 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {booking.originCity} → {booking.destinationCity}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {booking.busName} · {booking.seatCount} seat{booking.seatCount > 1 ? "s" : ""} · PNR {booking.pnr}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatTripDateTime(booking.departureAt)}</p>
                    <div className="mt-1.5">
                      <StatusBadge status={BUS_BOOKING_LABEL[booking.status as BusBookingStatus] ?? booking.status} />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold">{formatINR(booking.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </AppShell>
  );
}
