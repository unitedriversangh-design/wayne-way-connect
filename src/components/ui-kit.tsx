import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-soft p-4 sm:p-5", className)}>
      {title ? (
        <header className="mb-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-10 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
      <p className="font-semibold text-foreground">
        {message ?? "Something went wrong on our end."}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function RowLink({
  icon,
  label,
  description,
  trailing,
}: {
  icon?: ReactNode;
  label: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <span className="flex w-full items-center gap-3">
      {icon ? <span className="text-primary">{icon}</span> : null}
      <span className="flex-1 text-left">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {trailing ?? <span className="text-muted-foreground">›</span>}
    </span>
  );
}

export function DemoBadge({ children = "DEMO DATA" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-warning bg-warning/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warning-foreground">
      {children}
    </span>
  );
}
