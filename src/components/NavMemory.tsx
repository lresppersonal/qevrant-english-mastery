"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FROM, contextTarget, locationKey, parseNavContext, withNavContext } from "@/lib/nav-context";

/**
 * Navigation memory for this browser tab (sessionStorage, nothing leaves the device):
 * - the page shown before the current one, and whether we arrived with the browser's Back/Forward;
 * - the scroll position of each page, so returning to a page puts the learner where they were.
 */
const K = { prev: "qevrant.nav.prev", cur: "qevrant.nav.cur", pop: "qevrant.nav.pop", restore: "qevrant.nav.restore", scroll: "qevrant.nav.scroll" };
const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del: (k: string) => { try { sessionStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

/** The current location as "path?query" — the demo build keeps its route in the #hash. */
export function liveLocation(): string {
  if (typeof location === "undefined") return "/";
  if (location.hash.startsWith("#/")) return locationKey(location.hash.slice(1).split("#")[0]);
  return locationKey(location.pathname + location.search);
}

function readScrolls(): Record<string, number> {
  try { return JSON.parse(ss.get(K.scroll) ?? "{}"); } catch { return {}; }
}
function saveScroll(key: string, y: number) {
  const all = readScrolls();
  delete all[key];
  all[key] = Math.round(y);
  const keys = Object.keys(all);
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete all[k];
  ss.set(K.scroll, JSON.stringify(all));
}

/** Put the page back at its saved position, waiting for content that renders a moment later. */
function restoreScroll(key: string) {
  const y = readScrolls()[key];
  if (!y) return;
  const start = performance.now();
  const step = () => {
    const room = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.min(y, room));
    if (room >= y || performance.now() - start > 1500) return;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let poppedFlag = false;
let lastChange = 0;
let lastClick = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => { poppedFlag = true; });
  // Save the position at the moment the learner clicks, before any navigation starts
  document.addEventListener("click", () => { lastClick = performance.now(); saveScroll(liveLocation(), window.scrollY); }, true);
  window.addEventListener("scroll", () => {
    // ignore the jump to the top that happens while a new page replaces the old one
    const t = performance.now();
    if (window.scrollY === 0 && (t - lastChange < 600 || t - lastClick < 600)) return;
    saveScroll(liveLocation(), window.scrollY);
  }, { passive: true });
}

function Tracker() {
  const pathname = usePathname();
  const params = useSearchParams();
  const key = locationKey(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  useEffect(() => {
    lastChange = performance.now();
    const cur = ss.get(K.cur);
    if (cur !== key) {
      if (cur) ss.set(K.prev, cur);
      ss.set(K.cur, key);
      ss.set(K.pop, poppedFlag ? "1" : "0");
    }
    const wanted = ss.get(K.restore);
    if (poppedFlag || wanted === key) restoreScroll(key);
    if (wanted === key) ss.del(K.restore);
    poppedFlag = false;
  }, [key]);
  return null;
}

/** Mounted once in the app shell. */
export function NavMemory() {
  return <Suspense fallback={null}><Tracker /></Suspense>;
}

/**
 * Go back to `target`. If it is exactly the page we came from, use the browser's own Back (history stays
 * clean, and the page comes back as it was); otherwise open it and restore its saved scroll position.
 */
export function goBackTo(target: string, push: (href: string) => void) {
  const prev = ss.get(K.prev);
  const arrivedByPop = ss.get(K.pop) === "1";
  if (prev && !arrivedByPop && locationKey(prev) === locationKey(target) && window.history.length > 1) {
    window.history.back();
    return;
  }
  ss.set(K.restore, locationKey(target));
  push(target);
}

const BACK_CLASS = "mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink";

function BackInner({ href, label }: { href: string; label: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const ctx = parseNavContext(params.get(FROM));
  const t = ctx ? contextTarget(ctx) : { href, label };
  return (
    <Link href={t.href} className={BACK_CLASS} data-testid="back-link" data-context={ctx ? ctx.kind : "section"}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        goBackTo(t.href, (h) => router.push(h));
      }}>
      <ArrowLeft size={15} aria-hidden="true" /> {t.label}
    </Link>
  );
}

/**
 * The "← Back" link at the top of a page. With a `from` context (entered via a topic or a grammar
 * lesson) it returns there; otherwise to the page's own section (`href`, `label`).
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Suspense fallback={<Link href={href} className={BACK_CLASS} data-testid="back-link"><ArrowLeft size={15} aria-hidden="true" /> {label}</Link>}>
      <BackInner href={href} label={label} />
    </Suspense>
  );
}

/** Read the current `from` context in client components. */
export function useNavContext() {
  const params = useSearchParams();
  return parseNavContext(params.get(FROM));
}

function ContextBackInner() {
  const ctx = useNavContext();
  if (!ctx) return null;
  const t = contextTarget(ctx);
  return <BackInner href={t.href} label={t.label} />;
}
/** A back link shown only when the page was opened from a topic or a lesson (section pages have none otherwise). */
export function ContextBackLink() {
  return <Suspense fallback={null}><ContextBackInner /></Suspense>;
}

type LinkProps = React.ComponentProps<typeof Link> & { href: string };
function ContextLinkInner(props: LinkProps) {
  const ctx = useNavContext();
  const href = ctx && !props.href.includes(`${FROM}=`) ? withNavContext(props.href, ctx) : props.href;
  return <Link {...props} href={href} />;
}
/** A link to another module that keeps the current topic/lesson context, so Back still returns to it. */
export function ContextLink(props: LinkProps) {
  return <Suspense fallback={<Link {...props} />}><ContextLinkInner {...props} /></Suspense>;
}
