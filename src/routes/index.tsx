import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Bus, CarTaxiFront, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WayneWay — Simple travel booking from one platform" },
      {
        name: "description",
        content:
          "WayneWay brings bike, auto and bus travel across India into one account. Sign in with an email code and set up your travel profile.",
      },
      { property: "og:title", content: "WayneWay — Simple travel booking" },
      {
        property: "og:description",
        content: "Bike, auto and bus travel across India from one account.",
      },
    ],
  }),
  component: Landing,
});

const services = [
  { icon: Bike, name: "Bike", note: "Quick solo rides" },
  { icon: CarTaxiFront, name: "Auto", note: "Everyday city trips" },
  { icon: Bus, name: "Bus", note: "Intercity seats" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
        <Wordmark />
        <Link
          to="/auth"
          className="focus-ring rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 pb-10 pt-6">
        <div className="brand-gradient overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-80">
            Multimodal mobility · India
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Simple travel booking from one platform.
          </h1>
          <p className="mt-5 max-w-xl text-base opacity-90 sm:text-lg">
            One WayneWay account for bike, auto and bus travel. We are building it in the open —
            your account, security and privacy controls come first.
          </p>
          <Link
            to="/auth"
            className="focus-ring mt-8 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground"
          >
            Create your account
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {services.map((service) => (
            <div key={service.name} className="card-soft p-5">
              <service.icon className="size-6 text-primary" aria-hidden />
              <h2 className="mt-3 text-lg font-semibold">{service.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{service.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-surface-foreground sm:flex-row sm:items-center">
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
          <p>
            Bike rides are live — book, match with a nearby rider, track the trip and pay your rider
            directly. Auto and bus travel, plus in-app payments, arrive in later phases. Your
            WayneWay account system (saved places, emergency contacts, devices, data controls) works
            today.
          </p>
        </div>

        <footer className="mt-10 flex flex-wrap gap-4 border-t border-border pt-5 text-sm text-muted-foreground">
          <Link to="/terms" className="focus-ring rounded hover:text-foreground">
            Terms
          </Link>
          <Link to="/privacy" className="focus-ring rounded hover:text-foreground">
            Privacy policy
          </Link>
        </footer>
      </section>
    </div>
  );
}
