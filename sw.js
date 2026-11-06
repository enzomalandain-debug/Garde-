// v2 : la page vient toujours du réseau quand il y en a (dernière version), sinon de la copie du téléphone.
const CACHE = "garde-v2";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function fromNetwork(url, ms){
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(new Request(url, { cache: "no-cache", credentials: "same-origin" })).then(r => { clearTimeout(t); r && r.ok ? resolve(r) : reject(new Error("http")); }, err => { clearTimeout(t); reject(err); });
  });
}
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== "GET" || url.origin !== location.origin) return;
  const page = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if(page){
    e.respondWith(caches.open(CACHE).then(async cache => {
      try {
        const res = await fromNetwork(req.url, 4000);
        cache.put("./", res.clone()); cache.put("./index.html", res.clone());
        return res;
      } catch(err){
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
      }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if(res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
