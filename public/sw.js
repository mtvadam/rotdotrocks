const CACHE_NAME = 'brainrot-images-v1'

// Patterns to cache (cache-first strategy)
function shouldCache(url) {
  return (
    url.hostname.endsWith('.public.blob.vercel-storage.com') ||
    url.pathname.startsWith('/brainrot-images/') ||
    url.pathname.startsWith('/trade-only/')
  )
}

// Install: activate immediately
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate: claim clients and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('brainrot-images-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: cache-first for images, passthrough for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (!shouldCache(url)) return

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached

        return fetch(event.request).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone())
          }
          return response
        })
      })
    )
  )
})
