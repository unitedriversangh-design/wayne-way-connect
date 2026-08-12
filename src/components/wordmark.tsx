import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Wordmark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link
      to="/"
      className={cn(
        "font-display text-xl font-extrabold tracking-tight focus-ring rounded-md",
        tone === "light" ? "text-primary-foreground" : "text-primary-deep",
        className,
      )}
    >
      Wayne<span className="text-accent">Way</span>
    </Link>
  );
}
