import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker, type PickedPoint } from "@/components/location-picker";

export const Route = createFileRoute("/_authenticated/profile/saved-places")({
  head: () => ({
    meta: [
      { title: "Saved places — WayneWay" },
      { name: "description", content: "Save your home, work and other frequent WayneWay places." },
      { property: "og:title", content: "Saved places — WayneWay" },
      { property: "og:description", content: "Save frequent pickup and drop points." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SavedPlaces,
});

const LABELS = ["HOME", "WORK", "OTHER"] as const;

function SavedPlaces() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    label: "HOME" as (typeof LABELS)[number],
    name: "",
  });
  const [point, setPoint] = useState<PickedPoint | null>(null);

  const places = useQuery({
    queryKey: ["saved_places"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_places")
        .select("id, label, name, address, latitude, longitude")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("A name is required.");
      if (!point) throw new Error("Choose where this place is first.");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Please sign in again.");
      const { error } = await supabase.from("saved_places").insert({
        user_id: userData.user.id,
        label: form.label,
        name: form.name.trim(),
        address: point.address,
        latitude: point.latitude,
        longitude: point.longitude,
        place_identifier: point.source,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ label: "HOME", name: "" });
      setPoint(null);
      toast.success("Place saved");
      void queryClient.invalidateQueries({ queryKey: ["saved_places"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Place removed");
      void queryClient.invalidateQueries({ queryKey: ["saved_places"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title={t("profile.places")} back={{ to: "/profile" }}>
      <SectionCard title="Your places">
        {places.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : places.data && places.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {places.data.map((place) => (
              <li key={place.id} className="flex items-start gap-3 py-3">
                <MapPin className="mt-0.5 size-4 text-primary" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {place.name}{" "}
                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      {place.label}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{place.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${place.name}`}
                  onClick={() => remove.mutate(place.id)}
                  className="focus-ring rounded-md p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No saved places yet"
            description="Add the places you travel to often so booking is quicker later."
          />
        )}
      </SectionCard>

      <SectionCard
        className="mt-4"
        title="Add a place"
        description="Search an address or use your current location — the coordinates are recorded automatically."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <div className="flex gap-2">
            {LABELS.map((label) => (
              <button
                key={label}
                type="button"
                aria-pressed={form.label === label}
                onClick={() => setForm({ ...form, label })}
                className={
                  form.label === label
                    ? "focus-ring flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                    : "focus-ring flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="place-name">Name</Label>
            <Input
              id="place-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Home, office, gym…"
              className="h-11"
            />
          </div>
          <LocationPicker
            id="place-location"
            label="Location"
            value={point}
            onChange={setPoint}
            allowCurrentLocation
          />
          <Button type="submit" disabled={add.isPending || !point} className="h-11 w-full">
            {add.isPending ? t("common.loading") : t("common.add")}
          </Button>
        </form>
      </SectionCard>
    </AppShell>
  );
}
