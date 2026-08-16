import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Bus, Snowflake, Ticket } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, SectionCard } from "@/components/ui-kit";
import { Field, GhostButton, inputClass, LoadingRows, PrimaryButton } from "@/components/operator-ui";
import { listBusCities, searchBuses } from "@/lib/bus.functions";
import {
  busErrorMessage,
  durationBetween,
  formatINR,
  formatTripTime,
  formatTripDate,
} from "@/lib/bus-shared";

type SortKey = "RECOMMENDED" | "CHEAPEST" | "EARLIEST" | "LATEST" | "SHORTEST";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "RECOMMENDED", label: "Recommended" },
  { key: "CHEAPEST", label: "Cheapest" },
  { key: "EARLIEST", label: "Earliest" },
  { key: "LATEST", label: "Latest" },
  { key: "SHORTEST", label: "Shortest" },
];

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const Route = createFileRoute("/_authenticated/bus/")({
  head: () => ({
    meta: [
      { title: "Book a bus — WayneWay" },
      { name: "description", content: "Search intercity bus trips, pick your seat and pay — all inside WayneWay." },
      { property: "og:title", content: "Book a bus — WayneWay" },
      { property: "og:description", content: "Search intercity buses and reserve seats in seconds." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusSearchPage,
});

type Criteria = {
  originCity: string;
  destinationCity: string;
  date: string;
  acOnly: boolean;
  sleeperOnly: boolean;
  sort: SortKey;
  maxPrice: string;
};

function BusSearchPage() {
  const [form, setForm] = useState<Criteria>({
    originCity: "",
    destinationCity: "",
    date: todayIso(),
    acOnly: false,
    sleeperOnly: false,
    sort: "RECOMMENDED",
    maxPrice: "",
  });
  const [submitted, setSubmitted] = useState<Criteria | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ["bus_cities"], queryFn: () => listBusCities(), staleTime: 60_000 });

  const results = useQuery({
    queryKey: ["bus_search", submitted],
    enabled: submitted != null,
    queryFn: () =>
      searchBuses({
        data: {
          originCity: submitted!.originCity,
          destinationCity: submitted!.destinationCity,
          date: submitted!.date,
          acOnly: submitted!.acOnly,
          sleeperOnly: submitted!.sleeperOnly,
          sort: submitted!.sort,
          ...(submitted!.maxPrice ? { maxPrice: Number(submitted!.maxPrice) } : {}),
        },
      }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!form.originCity.trim() || !form.destinationCity.trim()) {
      setFormError("Enter both the boarding city and the destination city.");
      return;
    }
    if (form.originCity.trim().toLowerCase() === form.destinationCity.trim().toLowerCase()) {
      setFormError("Origin and destination must be different cities.");
      return;
    }
    setSubmitted({ ...form, originCity: form.originCity.trim(), destinationCity: form.destinationCity.trim() });
  }

  return (
    <AppShell
      title="Bus"
      back={{ to: "/home" }}
      action={
        <Link to="/bus/bookings" className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
          My tickets
        </Link>
      }
    >
      <div className="space-y-5">
        <SectionCard title="Search trips" description="Live availability from WayneWay bus operators.">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From" required>
                <input
                  className={inputClass}
                  list="bus-cities"
                  value={form.originCity}
                  onChange={(event) => setForm((prev) => ({ ...prev, originCity: event.target.value }))}
                  placeholder="Boarding city"
                  autoComplete="off"
                />
              </Field>
              <Field label="To" required>
                <input
                  className={inputClass}
                  list="bus-cities"
                  value={form.destinationCity}
                  onChange={(event) => setForm((prev) => ({ ...prev, destinationCity: event.target.value }))}
                  placeholder="Destination city"
                  autoComplete="off"
                />
              </Field>
            </div>
            <datalist id="bus-cities">
              {(cities.data?.cities ?? []).map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Journey date" required>
                <input
                  type="date"
                  className={inputClass}
                  min={todayIso()}
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </Field>
              <Field label="Max fare per seat" hint="Leave blank for no limit">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.maxPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, maxPrice: event.target.value }))}
                  placeholder="e.g. 1200"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={form.acOnly}
                  onChange={(event) => setForm((prev) => ({ ...prev, acOnly: event.target.checked }))}
                />
                AC only
              </label>
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={form.sleeperOnly}
                  onChange={(event) => setForm((prev) => ({ ...prev, sleeperOnly: event.target.checked }))}
                />
                Sleeper only
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {SORTS.map((sort) => (
                <GhostButton
                  key={sort.key}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, sort: sort.key }))}
                  className={form.sort === sort.key ? "border-primary bg-primary/10 text-primary" : ""}
                >
                  {sort.label}
                </GhostButton>
              ))}
            </div>

            {formError ? <p className="text-sm font-semibold text-destructive">{formError}</p> : null}
            <PrimaryButton type="submit" loading={results.isFetching && submitted != null}>
              Search buses
            </PrimaryButton>
          </form>
        </SectionCard>

        {submitted ? (
          <SectionCard
            title={`${submitted.originCity} → ${submitted.destinationCity}`}
            description={formatTripDate(`${submitted.date}T00:00:00`)}
          >
            {results.isLoading ? (
              <LoadingRows label="Checking live availability…" />
            ) : results.isError ? (
              <ErrorState message={busErrorMessage(results.error)} onRetry={() => results.refetch()} />
            ) : (results.data?.results.length ?? 0) === 0 ? (
              <EmptyState
                title="No buses for this search"
                description="Try a different date, remove filters, or check another nearby city."
              />
            ) : (
              <ul className="space-y-3">
                {results.data!.results.map((trip) => (
                  <li key={trip.scheduleId}>
                    <Link
                      to="/bus/$scheduleId"
                      params={{ scheduleId: trip.scheduleId }}
                      className="focus-ring block rounded-2xl border border-border p-4 hover:border-primary/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <Bus className="size-4 text-primary" aria-hidden />
                            <span className="truncate">{trip.bus.name}</span>
                            {trip.bus.isAc ? <Snowflake className="size-3.5 text-primary" aria-hidden /> : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {trip.operator.name} · {trip.bus.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatINR(trip.fare)}</p>
                          <p className="text-xs text-muted-foreground">per seat</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <span className="font-semibold">{formatTripTime(trip.departureAt)}</span>
                        <span className="flex-1 border-t border-dashed border-border" />
                        <span className="text-xs text-muted-foreground">
                          {durationBetween(trip.departureAt, trip.arrivalAt)}
                        </span>
                        <span className="flex-1 border-t border-dashed border-border" />
                        <span className="font-semibold">{formatTripTime(trip.arrivalAt)}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className={trip.seatsAvailable > 0 ? "font-semibold text-success-foreground" : "font-semibold text-destructive"}>
                          {trip.seatsAvailable > 0 ? `${trip.seatsAvailable} seats available` : "Sold out"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary">
                          Select seats <ArrowRight className="size-3.5" aria-hidden />
                        </span>
                      </div>
                      {trip.bus.amenities.length > 0 ? (
                        <p className="mt-2 truncate text-xs text-muted-foreground">{trip.bus.amenities.join(" · ")}</p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : (
          <SectionCard>
            <EmptyState
              title="Where are you travelling?"
              description="Pick your cities and date above to see live bus availability."
              action={<Ticket className="size-6 text-primary" aria-hidden />}
            />
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
