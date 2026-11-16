import { useSyncExternalStore } from "react";

/** Hash router for the single-file demo: URLs look like #/grammar/relative-clauses#form */
export function currentRoute() {
  const h = location.hash;
  if (!h.startsWith("#/")) return "/";
  return h.slice(1).split("#")[0].split("?")[0] || "/";
}
let last = currentRoute();
const subs = new Set<() => void>();
window.addEventListener("hashchange", () => {
  // a plain #section link: keep the current route and attach the section to it
  if (!location.hash.startsWith("#/") && location.hash.length > 1) {
    history.replaceState(null, "", `#${last}${location.hash}`);
  }
  const r = currentRoute();
  if (r !== last) { last = r; window.scrollTo(0, 0); }
  subs.forEach((f) => f());
});
export const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export function useRoute() { return useSyncExternalStore(subscribe, currentRoute); }
export function navigate(href: string, replace = false) {
  const target = href.startsWith("/") ? `#${href}` : href;
  if (replace) { history.replaceState(null, "", target); window.dispatchEvent(new HashChangeEvent("hashchange")); }
  else location.hash = target.slice(1);
}
