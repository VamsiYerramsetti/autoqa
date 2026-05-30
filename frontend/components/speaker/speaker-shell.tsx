"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { BarChart3, FilePlus2, LayoutDashboard, LogOut, Sparkles, UserCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/speaker" as Route, label: "Overview", icon: LayoutDashboard },
  { href: "/speaker/new" as Route, label: "New presentation", icon: FilePlus2 },
  { href: "/speaker/questions" as Route, label: "Question inbox", icon: BarChart3 },
  { href: "/speaker/profile" as Route, label: "Profile", icon: UserCircle2 },
];

export function SpeakerShell({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode; }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container-shell grid min-h-screen gap-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-8">
        <aside className="glass-panel flex flex-col gap-6 p-6 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
          <Link href="/speaker" className="group flex items-center gap-3">
            <div className="interactive-ring flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-gradient-to-br from-royal-500 to-royal-700 shadow-royal">
              <Sparkles className="h-5 w-5 text-white transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-white">AutoQ&A</div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/42">Speaker workspace</div>
            </div>
          </Link>

          <div className="rounded-[26px] border border-white/8 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-white/42">Signed in</div>
            <div className="mt-3 text-lg font-semibold text-white">{user?.displayName}</div>
            <div className="mt-1 text-sm text-white/62">{user?.email}</div>
            {user?.roleTitle || user?.organization ? <div className="mt-4 text-sm text-white/58">{[user.roleTitle, user.organization].filter(Boolean).join(" · ")}</div> : null}
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/speaker" && pathname.startsWith(`${item.href}/`));

              return (
                <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-medium transition", isActive ? "border-orange-400/24 bg-orange-500/12 text-white" : "border-white/8 bg-white/4 text-white/68 hover:bg-white/8 hover:text-white")}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <Link href="/"><Button variant="secondary" className="w-full">Marketing site</Button></Link>
            <Button variant="ghost" className="w-full gap-2" onClick={() => void logout()}><LogOut className="h-4 w-4" /> Log out</Button>
          </div>
        </aside>

        <main className="space-y-6">
          <section className="glass-panel p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-orange-300">Speaker workspace</div>
                <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">{title}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/66">{subtitle}</p>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}