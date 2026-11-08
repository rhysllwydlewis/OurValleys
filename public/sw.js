// Offline fallback only: caches /offline at install and serves it when a page
// navigation fails. The only other thing kept is the hash-addressed message
// script (/i18n/<language>.<hash>.js) that the offline page needs to speak the
// visitor's language; its address changes with its content, so it is never
// stale. Page content is never cached.
const CACHE = "ov-offline-v1";
const OFFLINE_URL = "/offline";
const MESSAGES = /\/i18n\/([a-z]{2})\.[0-9a-f]{12}\.js/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        const request = new Request(OFFLINE_URL, { cache: "reload" });
        await cache.add(request);
        // Keep the message script the offline page refers to, best effort.
        try {
          const html = await (await cache.match(request)).text();
          const found = MESSAGES.exec(html);
          if (found) await cache.add(found[0]);
        } catch {
          // The offline page still works with its server-rendered text.
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    MESSAGES.test(url.pathname)
  ) {
    event.respondWith(messageScript(event.request, url));
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached ?? Response.error();
    }),
  );
});

// Cache first (the address names the content), kept only when the server
// marked it immutable, and only the newest script per language is kept.
async function messageScript(request, url) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  const cacheControl = response.headers.get("cache-control") || "";
  if (response.ok && cacheControl.includes("immutable")) {
    const language = MESSAGES.exec(url.pathname)[1];
    // Never evict the script the cached offline page refers to: that page is
    // only refreshed when the worker is installed.
    const offline = await cache.match(OFFLINE_URL);
    const pinned = offline ? MESSAGES.exec(await offline.text()) : null;
    for (const key of await cache.keys()) {
      const other = new URL(key.url);
      const match = MESSAGES.exec(other.pathname);
      if (
        match &&
        match[1] === language &&
        !(pinned && pinned[0] === other.pathname)
      ) {
        await cache.delete(key);
      }
    }
    await cache.put(request, response.clone());
  }
  return response;
}
