import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile/emergency-contacts")({
  head: () => ({
    meta: [
      { title: "Emergency contacts — WayneWay" },
      {
        name: "description",
        content: "Keep up to five emergency contacts on your WayneWay account.",
      },
      { property: "og:title", content: "Emergency contacts — WayneWay" },
      { property: "og:description", content: "People WayneWay can reach in a crisis." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmergencyContacts,
});

const MAX_CONTACTS = 5;

function EmergencyContacts() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    relationship: "",
    country_code: "+91",
    phone_number: "",
  });

  const contacts = useQuery({
    queryKey: ["emergency_contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("id, name, relationship, country_code, phone_number")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const contactCount = contacts.data?.length ?? 0;

  const add = useMutation({
    mutationFn: async () => {
      const phone = form.phone_number.replace(/\D/g, "");
      if (!form.name.trim()) throw new Error("Contact name is required.");
      if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Please sign in again.");
      const { error } = await supabase.from("emergency_contacts").insert({
        user_id: userData.user.id,
        name: form.name.trim(),
        relationship: form.relationship.trim() || null,
        country_code: form.country_code,
        phone_number: phone,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", relationship: "", country_code: "+91", phone_number: "" });
      toast.success("Contact added");
      void queryClient.invalidateQueries({ queryKey: ["emergency_contacts"] });
    },
    onError: (error: Error) => {
      toast.error(
        error.message.includes("emergency_contact_limit_reached")
          ? `You can keep up to ${MAX_CONTACTS} emergency contacts. Remove one before adding another.`
          : error.message,
      );
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact removed");
      void queryClient.invalidateQueries({ queryKey: ["emergency_contacts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title={t("profile.emergency")} back={{ to: "/profile" }}>
      <SectionCard
        title="Your contacts"
        description={`Up to ${MAX_CONTACTS} contacts, enforced by the server.`}
      >
        {contacts.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : contacts.data && contacts.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {contacts.data.map((contact) => (
              <li key={contact.id} className="flex items-center gap-3 py-3">
                <UserRound className="size-4 text-primary" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.relationship ? `${contact.relationship} · ` : ""}
                    {contact.country_code} {contact.phone_number}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${contact.name}`}
                  onClick={() => remove.mutate(contact.id)}
                  className="focus-ring rounded-md p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No emergency contacts yet"
            description="Add someone WayneWay can contact if a trip goes wrong."
          />
        )}
      </SectionCard>

      <SectionCard className="mt-4" title="Add a contact">
        {contactCount >= MAX_CONTACTS ? (
          <p className="text-sm text-muted-foreground">
            You've reached the limit of {MAX_CONTACTS} emergency contacts.
            Remove one to add another.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                placeholder="Parent, sibling, friend"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Mobile number</Label>
              <div className="flex gap-2">
                <Input
                  aria-label="Country code"
                  value={form.country_code}
                  onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                  className="h-11 w-20"
                />
                <Input
                  id="contact-phone"
                  inputMode="numeric"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  placeholder="9876543210"
                  className="h-11 flex-1"
                />
              </div>
            </div>
            <Button type="submit" disabled={add.isPending} className="h-11 w-full">
              {add.isPending ? t("common.loading") : t("common.add")}
            </Button>
          </form>
        )}
      </SectionCard>
    </AppShell>
  );
}
