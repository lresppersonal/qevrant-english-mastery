"use client";
import { useEffect, useState } from "react";
import { Share, PlusSquare, Download, Smartphone, X, WifiOff } from "lucide-react";

/* ---------- install state shared across the app ---------- */
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as PromptEvent; listeners.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((f) => f()); });
}

export function platform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function useInstall() {
  const [, force] = useState(0);
  const [standalone, setStandalone] = useState(false);
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  useEffect(() => {
    setStandalone(isStandalone());
    setOs(platform() as "ios" | "android" | "other");
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  return { standalone, os, canPrompt: !!deferred, prompt: async () => { if (!deferred) return; await deferred.prompt(); await deferred.userChoice; deferred = null; force((n) => n + 1); } };
}

/** Registers the service worker (production only; silently skipped where not allowed, e.g. preview frames). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/** Keeps the browser/status-bar colour in step with the chosen theme. */
export function ThemeColorSync() {
  useEffect(() => {
    const apply = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#08101F" : "#F5F7FB"));
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return null;
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 border-b border-line bg-surface-2 px-4 py-1.5 text-xs font-medium">
      <WifiOff size={14} aria-hidden="true" /> You're offline. Pages you've opened before still work; new answers will save when you reconnect.
    </div>
  );
}

/** Full install panel, used in Settings. */
export function InstallAppPanel() {
  const { standalone, os, canPrompt, prompt } = useInstall();
  if (standalone) return <p className="flex items-center gap-2 text-sm text-success"><Smartphone size={16} aria-hidden="true" /> You're using the installed app.</p>;
  return (
    <div className="space-y-3 text-[15px]">
      <p className="text-muted">Install English Mastery on your phone: it opens full-screen from your home screen, like a normal app, and lessons you've opened work offline.</p>
      {canPrompt && <button onClick={prompt} className="btn btn-primary"><Download size={16} aria-hidden="true" /> Install the app</button>}
      {(os === "ios" || (!canPrompt && os !== "android")) && <IosSteps />}
      {os === "android" && !canPrompt && (
        <p>On Android: open the browser menu <strong>⋮</strong> and tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</p>
      )}
    </div>
  );
}

function IosSteps() {
  return (
    <ol className="space-y-1.5">
      <li className="flex items-center gap-2"><span className="font-semibold">On iPhone or iPad (Safari):</span></li>
      <li className="flex items-center gap-2">1. Tap <Share size={16} aria-label="Share" className="text-primary" /> <strong>Share</strong> at the bottom of the screen.</li>
      <li className="flex items-center gap-2">2. Choose <PlusSquare size={16} aria-hidden="true" className="text-primary" /> <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
    </ol>
  );
}

/** Compact, dismissible banner for phones on the dashboard. */
export function InstallBanner() {
  const { standalone, os, canPrompt, prompt } = useInstall();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem("qevrant.install.dismissed") === "1"); } catch { setHidden(false); }
  }, []);
  if (standalone || hidden || os === "other") return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem("qevrant.install.dismissed", "1"); } catch {} };
  return (
    <div className="card mb-6 flex items-start gap-3 p-4 md:hidden" data-testid="install-banner">
      <Smartphone size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-[15px]">
        <p className="font-semibold">Install the app on your phone</p>
        {os === "ios" ? <p className="mt-1 text-muted">Tap <Share size={14} className="inline" aria-label="Share" /> Share, then <strong>Add to Home Screen</strong>.</p>
          : canPrompt ? <button onClick={prompt} className="btn btn-primary mt-2 !min-h-0 !py-1.5">Install</button>
            : <p className="mt-1 text-muted">Open the browser menu <strong>⋮</strong> and tap <strong>Install app</strong>.</p>}
      </div>
      <button onClick={dismiss} className="btn btn-ghost h-9 w-9 !min-h-0 !p-0" aria-label="Dismiss"><X size={16} /></button>
    </div>
  );
}
