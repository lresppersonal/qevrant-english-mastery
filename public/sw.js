/* English Mastery service worker: offline support for the installed app.
 * - Pages: network first, fall back to the cached copy, then to /offline.
 * - Build assets (/_next/static, hashed): cache first.
 * - Other same-origin GETs (page data, fonts, icons): stale-while-revalidate.
 * - Never cached: /api (AI feedback), /auth, and any other origin (e.g. Supabase).
 */
const VERSION = "em-v4";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const PRECACHE = ["/offline.html", "/dashboard", "/vocabulary", "/grammar", "/reading", "/writing", "/review", "/library", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function limit(cacheName, max) {
  caches.open(cacheName).then((c) => c.keys().then((keys) => { if (keys.length > max) c.delete(keys[0]).then(() => limit(cacheName, max)); }));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); limit(PAGES, 300); }
          return res;
        })
        // ignoreVary: Next.js responses vary on headers a plain lookup doesn't send. Match the exact URL first, then the
        // same path without query (e.g. the app's start URL), then the offline page.
        .catch(async () => (await caches.match(req, { ignoreVary: true }))
          || (await caches.match(url.pathname, { ignoreVary: true }))
          || caches.match("/offline.html", { ignoreVary: true })),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(ASSETS).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  event.respondWith(
    caches.open(PAGES).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })),
  );
});
