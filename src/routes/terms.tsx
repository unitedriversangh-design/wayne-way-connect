import { createFileRoute, Link } from "@tanstack/react-router";
import { LEGAL_DOCS } from "@/lib/legal";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — WayneWay" },
      {
        name: "description",
        content: "The WayneWay Terms of Service covering account use, conduct and current service scope.",
      },
      { property: "og:title", content: "Terms of Service — WayneWay" },
      { property: "og:description", content: "Terms covering WayneWay account use and scope." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-5">
        <Wordmark />
        <Link to="/" className="focus-ring rounded text-sm font-semibold text-primary">
          Home
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pb-16">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version {LEGAL_DOCS.terms.version} · applies to the WayneWay account system
        </p>

        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold">1. What WayneWay is today</h2>
            <p className="mt-2">
              WayneWay is being built as a multimodal mobility and travel marketplace for India. At
              this stage the platform provides an account system only. Bike, auto and bus booking,
              payments, and any driver or operator services are not available and nothing on the
              platform creates a booking or a payment obligation.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">2. Your account</h2>
            <p className="mt-2">
              You sign in with a one-time code sent to your email address. You are responsible for
              keeping access to that email secure. You must provide accurate information, and you may
              correct it at any time from your profile.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">3. Acceptable use</h2>
            <p className="mt-2">
              Do not attempt to access other people's accounts or data, interfere with the service,
              or use it for unlawful purposes. We may suspend an account where we reasonably believe
              these terms have been broken.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">4. Data you give us</h2>
            <p className="mt-2">
              Saved places, emergency contacts and notification choices are stored so the platform
              can use them for your future trips. You can export or delete all of it from Privacy and
              data at any time.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">5. Changes</h2>
            <p className="mt-2">
              These terms will change as services launch. Each version is recorded against your
              account with the date you accepted it, and we will ask you to accept material changes.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">6. Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact WayneWay support through the address shown on
              your account emails.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
