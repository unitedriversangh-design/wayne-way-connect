import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bus,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gauge,
  LifeBuoy,
  MapPin,
  Menu,
  Percent,
  Route as RouteIcon,
  ScrollText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { getOperatorSession, listOperatorNotifications } from "@/lib/operator.functions";
import { busErrorMessage, canView, OPERATOR_ROLE_LABEL, type OperatorModule, type OperatorRole } from "@/lib/bus-shared";

export const OPERATOR_NAV: { to: string; label: string; module: OperatorModule; icon: typeof Bus }[] = [
  { to: "/operator", label: "Dashboard", module: "dashboard", icon: Gauge },
  { to: "/operator/buses", label: "Buses", module: "buses", icon: Bus },
  { to: "/operator/drivers", label: "Drivers", module: "drivers", icon: Users },
  { to: "/operator/routes", label: "Routes", module: "routes", icon: RouteIcon },
  { to: "/operator/stops", label: "Stops", module: "stops", icon: MapPin },
  { to: "/operator/schedules", label: "Schedules", module: "schedules", icon: CalendarClock },
  { to: "/operator/discounts", label: "Discounts", module: "discounts", icon: Percent },
  { to: "/operator/bookings", label: "Bookings", module: "bookings", icon: Ticket },
  { to: "/operator/passengers", label: "Passengers", module: "passengers", icon: ClipboardList },
  { to: "/operator/revenue", label: "Revenue", module: "revenue", icon: CircleDollarSign },
  { to: "/operator/settlements", label: "Settlement", module: "settlement", icon: Wallet },
  { to: "/operator/reports", label: "Reports", module: "reports", icon: BarChart3 },
  { to: "/operator/staff", label: "Staff & roles", module: "staff", icon: ShieldCheck },
  { to: "/operator/notifications", label: "Notifications", module: "notifications", icon: Bell },
  { to: "/operator/support", label: "Support", module: "support", icon: LifeBuoy },
  { to: "/operator/audit", label: "Audit log", module: "audit", icon: ScrollText },
  { to: "/operator/profile", label: "Profile & settings", module: "profile", icon: Settings },
];

export type OperatorSession = Awaited<ReturnType<typeof getOperatorSession>>;

export function useOperatorSession() {
  return useQuery({
    queryKey: ["operator_session"],
    queryFn: () => getOperatorSession(),
    staleTime: 30_000,
  });
}

/** Shell with desktop sidebar + mobile drawer, role-filtered navigation. */
export function OperatorShell({
  title,
  description,
  children,
  actions,
  role,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  role: OperatorRole;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const notifications = useQuery({
    queryKey: ["operator_notifications"],
    queryFn: () => listOperatorNotifications(),
    staleTime: 20_000,
  });

  useEffect(() => setOpen(false), [pathname]);
  const items = OPERATOR_NAV.filter((item) => canView(role, item.module));

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Wordmark />
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            Operator
          </span>
        </div>
        <nav aria-label="Operator" className="flex-1 overflow-y-auto p-3">
          <SidebarLinks items={items} pathname={pathname} unread={notifications.data?.unread ?? 0} />
        </nav>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Signed in as {OPERATOR_ROLE_LABEL[role]}
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open operator menu"
            className="focus-ring rounded-lg p-2 text-muted-foreground lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</h1>
            {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-card p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between px-2">
                <Wordmark />
                <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="focus-ring rounded-lg p-2">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <SidebarLinks items={items} pathname={pathname} unread={notifications.data?.unread ?? 0} />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 pb-16 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarLinks({
  items,
  pathname,
  unread,
}: {
  items: typeof OPERATOR_NAV;
  pathname: string;
  unread: number;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.to === "/operator" ? pathname === "/operator" : pathname.startsWith(item.to);
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {item.module === "notifications" && unread > 0 ? (
                <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Guards a whole page: session, registration, operator status and role. */
export function OperatorGate({
  module,
  children,
}: {
  module: OperatorModule;
  children: (session: Extract<OperatorSession, { registered: true }>) => ReactNode;
}) {
  const session = useOperatorSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.data && !session.data.registered) {
      navigate({ to: "/operator/register", replace: true });
    }
  }, [session.data, navigate]);

  if (session.isLoading) return <FullPageState label="Loading your operator workspace…" />;
  if (session.isError) {
    return <FullPageState label={busErrorMessage(session.error)} onRetry={() => session.refetch()} tone="error" />;
  }
  if (!session.data?.registered) return <FullPageState label="Redirecting to operator registration…" />;

  const data = session.data;
  if (!canView(data.role, module)) {
    return (
      <OperatorShell title="Access denied" role={data.role}>
        <Callout tone="error" title="Access denied">
          Your role ({OPERATOR_ROLE_LABEL[data.role]}) does not have access to this section.
        </Callout>
      </OperatorShell>
    );
  }
  if (data.status !== "ACTIVE") {
    return (
      <OperatorShell title={data.businessName} role={data.role} description={`Account status: ${data.status}`}>
        <Callout tone="warning" title={`Operator account ${data.status.toLowerCase()}`}>
          Your operator account is not active, so operational changes and live bookings are disabled. Contact WayneWay
          support to continue.
        </Callout>
      </OperatorShell>
    );
  }
  return <>{children(data)}</>;
}

export function FullPageState({
  label,
  onRetry,
  tone = "muted",
}: {
  label: string;
  onRetry?: () => void;
  tone?: "muted" | "error";
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <p className={cn("text-sm font-medium", tone === "error" ? "text-destructive" : "text-muted-foreground")}>
          {label}
        </p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="focus-ring mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  to,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  to?: string;
  icon?: typeof Bus;
}) {
  const body = (
    <div className="card-soft h-full p-4 transition hover:border-primary/40">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-4 text-primary" aria-hidden /> : null}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return to ? (
    <Link to={to} className="focus-ring block rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  );
}

const TONE_CLASS: Record<string, string> = {
  success: "bg-success/15 text-success-foreground border-success/30",
  warning: "bg-warning/20 text-warning-foreground border-warning/40",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-primary/10 text-primary border-primary/25",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, tone }: { status: string; tone?: keyof typeof TONE_CLASS }) {
  const resolved = tone ?? statusTone(status);
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", TONE_CLASS[resolved])}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function statusTone(status: string): keyof typeof TONE_CLASS {
  if (["ACTIVE", "CONFIRMED", "COMPLETED", "PAID", "VERIFIED", "SCHEDULED", "BOARDED", "AVAILABLE"].includes(status)) return "success";
  if (["PENDING", "DRAFT", "MAINTENANCE", "BOARDING", "HELD", "PAYMENT_PENDING", "SEAT_HELD", "PROCESSING", "REFUND_PENDING", "ON_HOLD", "WAITING", "IN_PROGRESS"].includes(status)) return "warning";
  if (["SUSPENDED", "CANCELLED", "REJECTED", "FAILED", "EXPIRED", "NO_SHOW", "BLOCKED", "UNAVAILABLE"].includes(status)) return "error";
  return "muted";
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof TONE_CLASS;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex gap-3 rounded-2xl border p-4 text-sm", TONE_CLASS[tone])}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card-soft p-4 sm:p-5">
      {title || actions ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function LoadingRows({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">{label}</p>
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-1 text-sm font-semibold text-foreground">
        {label}
        <span className="text-xs font-normal text-muted-foreground">{required ? "required" : "optional"}</span>
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-semibold text-destructive">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60";

export function PrimaryButton({
  children,
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60",
        className,
      )}
    >
      {loading ? "Working…" : children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Two-step destructive confirm that always states the consequence. */
export function ConfirmAction({
  label,
  question,
  consequence,
  onConfirm,
  loading,
}: {
  label: string;
  question: string;
  consequence: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <GhostButton type="button" onClick={() => setAsking(true)} className="border-destructive/40 text-destructive">
        {label}
      </GhostButton>
    );
  }
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="font-semibold text-foreground">{question}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{consequence}</p>
      <div className="mt-3 flex gap-2">
        <PrimaryButton
          type="button"
          loading={loading}
          onClick={() => {
            onConfirm();
            setAsking(false);
          }}
          className="bg-destructive text-destructive-foreground"
        >
          Yes, continue
        </PrimaryButton>
        <GhostButton type="button" onClick={() => setAsking(false)}>
          Keep as is
        </GhostButton>
      </div>
    </div>
  );
}

export function DataTable<T>({
  rows,
  columns,
  empty,
  rowKey,
}: {
  rows: T[];
  columns: { header: string; cell: (row: T) => ReactNode; hideOnMobile?: boolean }[];
  empty: ReactNode;
  rowKey: (row: T) => string;
}) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              {columns.map((column) => (
                <th key={column.header} className="px-2 py-2 font-semibold">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.header} className="px-2 py-3 align-top">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-2xl border border-border p-3">
            <dl className="space-y-1.5">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div key={column.header} className="flex items-start justify-between gap-3 text-sm">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{column.header}</dt>
                    <dd className="min-w-0 text-right">{column.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
