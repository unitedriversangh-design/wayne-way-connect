import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchPlaces } from "@/lib/ride.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PickedPoint = {
  latitude: number;
  longitude: number;
  address: string;
  source: "GPS" | "SEARCH" | "MAP_PIN" | "SAVED_PLACE" | "MANUAL";
};

/**
 * Pickup/destination selection. Location can come from the device, a saved
 * place, an address search or manual coordinates; the chosen source and time
 * are recorded with the booking.
 */
export function LocationPicker({
  id,
  label,
  value,
  onChange,
  allowCurrentLocation = true,
}: {
  id: string;
  label: string;
  value: PickedPoint | null;
  onChange: (point: PickedPoint | null) => void;
  allowCurrentLocation?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const runSearch = useServerFn(searchPlaces);

  const saved = useQuery({
    queryKey: ["saved_places_picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_places")
        .select("id, name, address, latitude, longitude")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const search = useMutation({
    mutationFn: (text: string) => runSearch({ data: { query: text } }),
  });

  function useCurrentLocation() {
    setGpsError(null);
    if (!("geolocation" in navigator)) {
      setGpsError("This device can't share its location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          address: `Current location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
          source: "GPS",
        });
      },
      () => setGpsError("We couldn't read your location. Search or enter it instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {value ? (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.address}</p>
            <p className="text-xs text-muted-foreground">
              {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)} · {value.source}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="flex gap-2">
            <Input
              id={id}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search an address or landmark"
              className="h-11"
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim().length >= 3) {
                  event.preventDefault();
                  search.mutate(query.trim());
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              disabled={query.trim().length < 3 || search.isPending}
              onClick={() => search.mutate(query.trim())}
            >
              <Search className="size-4" aria-hidden />
              <span className="sr-only">Search</span>
            </Button>
          </div>

          {search.isPending ? (
            <p className="text-xs text-muted-foreground">Searching…</p>
          ) : search.data && search.data.results.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No matches. Try a different name or enter coordinates below.
            </p>
          ) : search.data ? (
            <ul className="divide-y divide-border">
              {search.data.results.map((result) => (
                <li key={`${result.latitude},${result.longitude}`}>
                  <button
                    type="button"
                    className="focus-ring w-full rounded py-2 text-left text-sm"
                    onClick={() =>
                      onChange({
                        latitude: result.latitude,
                        longitude: result.longitude,
                        address: result.label,
                        source: "SEARCH",
                      })
                    }
                  >
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {allowCurrentLocation ? (
            <Button type="button" variant="outline" className="w-full" onClick={useCurrentLocation}>
              <Crosshair className="mr-2 size-4" aria-hidden />
              Use my current location
            </Button>
          ) : null}
          {gpsError ? <p className="text-xs text-destructive">{gpsError}</p> : null}

          {saved.data && saved.data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {saved.data.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className="focus-ring rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    onChange({
                      latitude: place.latitude,
                      longitude: place.longitude,
                      address: `${place.name} — ${place.address}`,
                      source: "SAVED_PLACE",
                    })
                  }
                >
                  {place.name}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className="focus-ring rounded text-xs font-semibold text-primary"
            onClick={() => setManual((current) => !current)}
          >
            {manual ? "Hide manual coordinates" : "Enter coordinates manually"}
          </button>

          {manual ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={manualLat}
                onChange={(event) => setManualLat(event.target.value)}
                placeholder="Latitude"
                inputMode="decimal"
                className="h-11"
              />
              <Input
                value={manualLng}
                onChange={(event) => setManualLng(event.target.value)}
                placeholder="Longitude"
                inputMode="decimal"
                className="h-11"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11"
                onClick={() => {
                  const lat = Number(manualLat);
                  const lng = Number(manualLng);
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                  onChange({
                    latitude: lat,
                    longitude: lng,
                    address: `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                    source: "MAP_PIN",
                  });
                }}
              >
                Use
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
