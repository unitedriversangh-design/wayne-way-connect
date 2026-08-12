import { createFileRoute, Link } from "@tanstack/react-router";
import { LEGAL_DOCS } from "@/lib/legal";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — WayneWay" },
      {
        name: "description",
        content:
          "How WayneWay collects, uses, stores and deletes your personal data, and the controls you have.",
      },
      { property: "og:title", content: "Privacy Policy — WayneWay" },
      { property: "og:description", content: "How WayneWay handles your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-5">
        <Wordmark />
        <Link to="/" className="focus-ring rounded text-sm font-semibold text-primary">
          Home
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pb-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version {LEGAL_DOCS.privacy.version} · applies to the WayneWay account system
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-lg font-semibold">1. What we collect</h2>
            <p className="mt-2">
              Your email address (used to sign in), any name and mobile number you add, saved places
              with their coordinates, emergency contacts, notification preferences, device records
              (platform, device name, app version, last active time, last IP) and security events
              such as sign-ins and device removals.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">2. Why we collect it</h2>
            <p className="mt-2">
              To authenticate you, to keep your account secure, to remember your travel preferences
              for future bookings, and to contact you about your account. We do not sell your
              personal data.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">3. Where it is stored</h2>
            <p className="mt-2">
              Your data is stored in our managed cloud database. Access is restricted at the database
              level so that each record is readable only by the account it belongs to, or by
              authorised WayneWay staff acting on a support request.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">4. Your controls</h2>
            <p className="mt-2">
              From Privacy and data you can export everything we hold about you as a JSON file, or
              delete your account. Deletion removes your profile, saved places, emergency contacts,
              device records and preferences. Limited security records may be retained where the law
              requires it.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">5. Communications</h2>
            <p className="mt-2">
              Security alerts are always sent because they protect your account. Booking, account and
              promotional messages follow the choices in your notification preferences.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold">6. Changes and contact</h2>
            <p className="mt-2">
              Each version of this policy is recorded against your account with the date you accepted
              it. For privacy requests, contact WayneWay support through the address shown on your
              account emails.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
