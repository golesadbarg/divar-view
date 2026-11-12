// Service worker: after the first visit the app opens from the phone's cache,
// even if github.io is unreachable (e.g. without VPN). Data requests (Turso) are NOT cached or touched.
const CACHE = "divar-view-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;   // leave Turso etc. alone
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, {ignoreSearch: true});
      const refresh = fetch(req).then(resp => {
        if (resp && resp.ok) cache.put(req, resp.clone());
        return resp;
      }).catch(() => null);
      if (cached) { e.waitUntil(refresh); return cached; }          // open instantly from cache, update in background
      const resp = await refresh;
      return resp || (req.mode === "navigate" ? cache.match("./index.html") : Response.error());
    })
  );
});
