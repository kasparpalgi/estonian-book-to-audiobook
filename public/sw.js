// App shell + tesseract (worker, core, "est" model) cache. ElevenLabs is never cached here.
const CACHE = 'book-to-audio-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const html = await (await fetch('./', { cache: 'reload' })).text()
      const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
      await cache.addAll(['./', ...assets.filter((u) => !u.startsWith('http'))])
      self.skipWaiting()
    })(),
  )
})
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  const tesseract = url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('tesseract')
  if (req.method !== 'GET' || (url.origin !== location.origin && !tesseract)) return

  if (req.mode === 'navigate') {
    // Network first so updates arrive; cached shell when offline.
    event.respondWith(fetch(req).catch(() => caches.match('./')))
    return
  }
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone()
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        }),
    ),
  )
})
