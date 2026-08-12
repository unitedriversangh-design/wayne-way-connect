import { Link, useRouterState } from "@tanstack/react-router";
import { Home, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Wordmark } from "@/components/wordmark";

export function AppShell({
  children,
  title,
  back,
  action,
}: {
  children: ReactNode;
  title?: string;
  back?: { to: string; label?: string };
  action?: ReactNode;
}) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/home", label: t("nav.home"), icon: Home },
    { to: "/profile", label: t("nav.profile"), icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          {back ? (
            <Link
              to={back.to}
              className="focus-ring -ml-1 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              ← {back.label ?? t("common.back")}
            </Link>
          ) : (
            <Wordmark />
          )}
          {title ? (
            <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
          ) : null}
          <div className="ml-auto flex items-center gap-2">{action}</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-3xl">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
