"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Cookie } from "lucide-react";
import { getConsent, setConsent, CONSENT_EVENT } from "@/lib/consent";

/** First-visit choice. Rejecting is as easy as accepting; nothing optional runs before a choice is made. */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const check = () => setShow(!getConsent());
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, []);
  // Reserve room under the page while the banner is open so nothing (e.g. a form's submit button) stays hidden behind it.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!show || !el) return;
    const body = document.body;
    const prev = body.style.paddingBottom;
    const fit = () => { body.style.paddingBottom = `${Math.ceil(window.innerHeight - el.getBoundingClientRect().top) + 12}px`; };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); body.style.paddingBottom = prev; };
  }, [show]);
  if (!show) return null;
  return (
    <div ref={ref} role="region" aria-label="Cookie choices" data-testid="cookie-banner"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-4 shadow-xl md:bottom-4">
      <p className="flex items-center gap-2 font-bold"><Cookie size={18} aria-hidden="true" /> Cookies and storage</p>
      <p className="mt-1 text-[15px] text-muted">
        We use essential cookies and storage to keep you signed in, protect your account and save your work. Optional storage remembers display
        preferences on this device. We don't use advertising or tracking cookies, and no analytics are active.{" "}
        <Link href="/privacy#cookies" className="font-semibold text-primary underline">Details</Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost border border-line" onClick={() => setConsent({ preferences: false, analytics: false })}>Essential only</button>
        <button type="button" className="btn btn-primary" onClick={() => setConsent({ preferences: true, analytics: false })}>Allow preferences</button>
        <Link href="/privacy#cookies" className="btn btn-ghost">Choose individually</Link>
      </div>
    </div>
  );
}
