import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAccount } from "@/lib/bootstrap-account";
import { useI18n } from "@/lib/i18n";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — WayneWay" },
      {
        name: "description",
        content: "Sign in to WayneWay with a one-time code sent to your email address.",
      },
      { property: "og:title", content: "Sign in to WayneWay" },
      { property: "og:description", content: "One-time email code sign-in for your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const RESEND_SECONDS = 45;

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(target: string) {
    const trimmed = target.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error("We couldn't send a code right now. Please try again in a moment.");
      return;
    }
    setEmail(trimmed);
    setStep("code");
    setCooldown(RESEND_SECONDS);
    toast.success("Code sent. Check your inbox.");
  }

  async function verify() {
    if (code.length !== 6) return;
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error || !data.user) {
      setBusy(false);
      setCode("");
      toast.error(t("auth.genericError"));
      return;
    }
    try {
      const status = await bootstrapAccount(data.user.id, data.user.email);
      if (status === "SUSPENDED" || status === "DELETED") {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("This account can't be used right now. Please contact WayneWay support.");
        return;
      }
    } catch {
      // Account exists; profile bootstrap can be retried on the next screen.
    }
    setBusy(false);
    navigate({ to: "/home", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-md items-center px-5">
        <Wordmark />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <div className="card-soft p-6">
          {step === "email" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode(email);
              }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-2xl font-bold">{t("auth.title")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12"
                />
              </div>
              <Button type="submit" disabled={busy} className="h-12 w-full text-base">
                {busy ? t("common.loading") : t("auth.sendCode")}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                By continuing you accept the WayneWay Terms of Service and Privacy Policy (v0.1).
                Your acceptance is recorded with its version.
              </p>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void verify();
              }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-2xl font-bold">{t("auth.codeTitle")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("auth.codeSubtitle")} <span className="font-semibold">{email}</span>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  autoFocus
                  aria-label="6 digit code"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                disabled={busy || code.length !== 6}
                className="h-12 w-full text-base"
              >
                {busy ? t("common.loading") : t("auth.verify")}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="focus-ring rounded font-semibold text-primary disabled:text-muted-foreground"
                  disabled={cooldown > 0 || busy}
                  onClick={() => void sendCode(email)}
                >
                  {cooldown > 0 ? `${t("auth.resend")} (${cooldown}s)` : t("auth.resend")}
                </button>
                <button
                  type="button"
                  className="focus-ring rounded text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                >
                  {t("auth.changeEmail")}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Codes expire quickly and can be used once. The server enforces every limit,
                whichever timer you see here.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
