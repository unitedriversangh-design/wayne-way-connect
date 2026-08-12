import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount, exportMyData } from "@/lib/account.functions";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile/privacy-data")({
  head: () => ({
    meta: [
      { title: "Privacy and data — WayneWay" },
      {
        name: "description",
        content: "Export your WayneWay data, review consents, or delete your account.",
      },
      { property: "og:title", content: "Privacy and data — WayneWay" },
      { property: "og:description", content: "Export or delete your WayneWay data." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyData,
});

function PrivacyData() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState("");

  const consents = useQuery({
    queryKey: ["consent_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consent_records")
        .select("id, document, version, accepted_at")
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const exportData = useMutation({
    mutationFn: async () => {
      const payload = await exportMyData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `wayneway-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("Your data file has been downloaded."),
    onError: () => toast.error(t("common.somethingWrong")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await deleteMyAccount({ data: { confirmation: "DELETE" } });
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      toast.success("Your account has been deleted.");
      navigate({ to: "/", replace: true });
    },
    onError: () => toast.error(t("common.somethingWrong")),
  });

  return (
    <AppShell title={t("profile.privacy")} back={{ to: "/profile" }}>
      <SectionCard title="Legal documents">
        <ul className="divide-y divide-border text-sm">
          <li className="py-3">
            <Link to="/terms" className="focus-ring flex items-center gap-2 rounded font-semibold text-primary">
              <FileText className="size-4" aria-hidden /> Terms of Service
            </Link>
          </li>
          <li className="py-3">
            <Link to="/privacy" className="focus-ring flex items-center gap-2 rounded font-semibold text-primary">
              <FileText className="size-4" aria-hidden /> Privacy Policy
            </Link>
          </li>
        </ul>
      </SectionCard>

      <SectionCard className="mt-4" title="Your recorded consents">
        {consents.data && consents.data.length > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {consents.data.map((consent) => (
              <li key={consent.id} className="flex justify-between gap-3 py-2.5">
                <span className="font-medium">
                  {consent.document.replaceAll("_", " ")} v{consent.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(consent.accepted_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No consents recorded.</p>
        )}
      </SectionCard>

      <SectionCard
        className="mt-4"
        title="Export your data"
        description="Downloads everything WayneWay holds about your account as a JSON file."
      >
        <Button
          onClick={() => exportData.mutate()}
          disabled={exportData.isPending}
          className="h-11 w-full"
        >
          <Download className="mr-2 size-4" aria-hidden />
          {exportData.isPending ? t("common.loading") : "Download my data"}
        </Button>
      </SectionCard>

      <SectionCard
        className="mt-4 border-destructive/30"
        title={t("profile.delete")}
        description="This permanently deletes your profile, saved places, contacts, devices and preferences. It cannot be undone."
      >
        <div className="space-y-3">
          <Label htmlFor="confirm">Type DELETE to confirm</Label>
          <Input
            id="confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            className="h-11"
          />
          <Button
            variant="destructive"
            disabled={confirmation !== "DELETE" || remove.isPending}
            onClick={() => remove.mutate()}
            className="h-11 w-full"
          >
            {remove.isPending ? t("common.loading") : t("profile.delete")}
          </Button>
        </div>
      </SectionCard>
    </AppShell>
  );
}
