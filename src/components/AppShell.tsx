"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Logo } from "./Logo";
import { SearchDialog } from "./SearchDialog";
import { NAV, NAV_FOOTER, MOBILE_NAV, mobileSection } from "@/lib/nav";
import { isDemoMode } from "@/lib/supabase/config";
import { useLearner } from "./StoreProvider";
import { OfflineBanner } from "./PwaSupport";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { setTheme((document.documentElement.dataset.theme as "light" | "dark") ?? "light"); }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("qevrant.theme", next); } catch {}
    setTheme(next);
  };
  return (
    <button onClick={flip} className="btn btn-ghost h-10 w-10 !p-0" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const { profile } = useLearner();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allHrefs = [...NAV.flatMap((g) => g.items.map((i) => i.href)), ...NAV_FOOTER.map((i) => i.href)];
  const current = path.startsWith("/grammar/") && path.endsWith("/practice") ? "/grammar/practice"
    : allHrefs.filter((h) => path === h || path.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];
  const active = (href: string) => href === current;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[264px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 pb-4 pt-5"><Link href="/dashboard" aria-label="Dashboard"><Logo /></Link></div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((g) => (
            <div key={g.label} className="mt-4 first:mt-0">
              <p className="eyebrow px-3 pb-1.5">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} aria-current={active(it.href) ? "page" : undefined}
                      className={clsx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active(it.href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink")}>
                      <it.icon size={18} aria-hidden="true" />
                      <span className="flex-1">{it.label}</span>
                      {it.soon && <span className="chip !py-0 !text-[10px]">Soon</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-3 py-3">
          {NAV_FOOTER.map((it) => (
            <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}
              className={clsx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active(it.href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink")}>
              <it.icon size={18} aria-hidden="true" />{it.label}
            </Link>
          ))}
          <p className="truncate px-3 pt-2 text-xs text-muted">{profile?.displayName ?? profile?.email ?? ""}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/85 px-4 pb-3 backdrop-blur md:px-8">
          <Link href="/dashboard" className="md:hidden" aria-label="Dashboard"><Logo compact /></Link>
          <button onClick={() => setSearchOpen(true)}
            className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-sm text-muted hover:border-primary md:max-w-md">
            <Search size={16} aria-hidden="true" />
            <span className="flex-1 truncate"><span className="sm:hidden">Search…</span><span className="hidden sm:inline">Search words, grammar, texts…</span></span>
            <kbd className="hidden rounded border border-line px-1.5 text-[11px] sm:inline">Ctrl K</kbd>
          </button>
          <ThemeToggle />
        </header>

        <OfflineBanner />
        {isDemoMode && (
          <div role="note" className="border-b border-line bg-primary-soft px-4 py-1.5 text-center text-xs font-medium text-primary">
            Demo mode: no database is connected, so your progress is saved in this browser only.
          </div>
        )}
        <main id="main" className="main-mobile mx-auto w-full max-w-5xl flex-1 px-4 pt-6 md:px-8 md:pb-16 md:pt-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map((it) => {
            const on = mobileSection(path) === it.href;
            return (
              <li key={it.href}>
                <Link href={it.href} aria-current={on ? "page" : undefined}
                  className={clsx("flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-primary" : "text-muted")}>
                  <it.icon size={20} aria-hidden="true" />{it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
