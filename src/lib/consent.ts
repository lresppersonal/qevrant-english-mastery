/**
 * Cookie / storage consent (GDPR + ePrivacy). Stored in a first-party cookie on this device.
 * Essential storage needs no consent; optional categories are OFF until the learner turns them on.
 */
export type ConsentCategory = "preferences" | "analytics";
export interface Consent { v: 1; preferences: boolean; analytics: boolean; at: string }
const NAME = "em_consent";
export const CONSENT_EVENT = "em-consent-change";

export function getConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${NAME}=([^;]*)`));
  if (!m) return null;
  try { const c = JSON.parse(decodeURIComponent(m[1])); return c?.v === 1 ? c : null; } catch { return null; }
}
export function setConsent(c: Omit<Consent, "v" | "at">) {
  const value: Consent = { v: 1, ...c, at: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${NAME}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
  if (!c.preferences) { try { localStorage.removeItem("em-speaking-recent"); localStorage.removeItem("em-lesson-view"); } catch { /* ignore */ } }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
export const allowed = (cat: ConsentCategory) => !!getConsent()?.[cat];

/** What we store, for the privacy page, banner and settings (kept in one place so they never disagree). */
export const STORAGE_INVENTORY = {
  essential: [
    { name: "sb-…-auth-token (cookie)", purpose: "Keeps you signed in and protects your account (Supabase Auth).", duration: "Until you sign out or the session expires" },
    { name: "em_consent (cookie)", purpose: "Remembers your cookie choices.", duration: "6 months" },
    { name: "Theme choice (local storage)", purpose: "Remembers light or dark mode, which you choose yourself.", duration: "Until you clear it" },
    { name: "Essay drafts (local storage)", purpose: "Keeps your unfinished essay safe if the page reloads or the connection drops.", duration: "Until you start a new attempt" },
    { name: "Demo-mode data (local storage)", purpose: "Only without an account: stores your progress in this browser.", duration: "Until you reset it in Settings" },
    { name: "Offline files (service worker cache)", purpose: "Lets the installed app open when you're offline.", duration: "Replaced with each update" },
  ],
  preferences: [
    { name: "em-lesson-view, em-speaking-recent (local storage)", purpose: "Remembers how you like lessons displayed and which speaking topics you saw recently on this device.", duration: "Until you turn this off" },
  ],
  analytics: [
    { name: "None in use", purpose: "English Mastery does not currently use analytics or tracking. If analytics are added later, they will only load if you switch this on.", duration: "—" },
  ],
};
