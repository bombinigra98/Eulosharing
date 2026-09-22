import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LogOut, Settings2, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  isAdmin = false,
  title,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  title: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const tabs = [
    { to: "/dashboard", label: "Viaggi", icon: CalendarDays },
    { to: "/profilo", label: "Profilo", icon: UserRound },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Settings2 }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-primary/20 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="" width={32} height={32} className="rounded-xl" />
            <div>
              <p className="font-display text-sm font-semibold leading-none text-foreground">
                Eulosharing
              </p>
              <p className="mt-1 text-xs leading-none text-muted-foreground">{title}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Esci
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-primary/20 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground transition-colors"
              activeProps={{ className: "text-accent" }}
            >
              {({ isActive }) => (
                <>
                  <tab.icon className={cn("size-5", isActive && "text-accent")} />
                  {tab.label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
