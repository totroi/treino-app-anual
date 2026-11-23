// IronTracker Service Worker — 100% Offline-First App Shell (zero dependências externas)
// Garante abertura instantânea (0ms) da 2ª visita em diante, inclusive em academias de subsolo sem 4G/Wi-Fi.

const CACHE_PREFIX = 'irontracker-shell-';
const META_CACHE_NAME = 'irontracker-sw-meta';
const META_VERSION_KEY = '/__irontracker_sw_version__';
const FALLBACK_CACHE_NAME = `${CACHE_PREFIX}fallback-v1`;
const CORE_FALLBACK_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-pink.svg',
  '/icon-192.png',
  '/icon-192-pink.png',
  '/icon-512.png',
  '/icon-512-pink.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-pink.png'
];

async function fetchPrecacheManifest() {
  try {
    const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.version === 'string' && Array.isArray(data.urls) && data.urls.length > 0) {
        return { version: data.version, urls: data.urls };
      }
    }
  } catch {
    // Fallback seguro caso o manifest não esteja acessível
  }
  return { version: FALLBACK_CACHE_NAME, urls: CORE_FALLBACK_URLS };
}

async function saveActiveCacheVersion(version) {
  try {
    const metaCache = await caches.open(META_CACHE_NAME);
    await metaCache.put(META_VERSION_KEY, new Response(version, { headers: { 'Content-Type': 'text/plain' } }));
  } catch {
    // ignore
  }
}

async function getActiveCacheName() {
  try {
    const metaCache = await caches.open(META_CACHE_NAME);
    const res = await metaCache.match(META_VERSION_KEY);
    if (res) {
      const saved = (await res.text()).trim();
      if (saved && saved.startsWith(CACHE_PREFIX)) return saved;
    }
  } catch {
    // ignore
  }
  const keys = await caches.keys();
  const shellCaches = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  if (shellCaches.length > 0) {
    return shellCaches[shellCaches.length - 1];
  }
  return FALLBACK_CACHE_NAME;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const { version, urls } = await fetchPrecacheManifest();
      const cache = await caches.open(version);
      // Pré-cache individual para que 1 eventual arquivo ausente nunca aborte o cache offline inteiro
      await Promise.allSettled(
        urls.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // Ignora falha pontual mantendo os demais assets em cache
          }
        })
      );
      await saveActiveCacheVersion(version);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const activeVersion = await getActiveCacheName();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== activeVersion)
          .map((oldKey) => caches.delete(oldKey))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca intercepta endpoints dinâmicos da API nem os arquivos de controle do próprio SW
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/precache-manifest.json'
  ) {
    return;
  }

  // Navegação SPA (abertura do app): entrega instantaneamente do cache (imune a "lie-fi" de subsolo)
  // e revalida silenciosamente em 2º plano quando houver rede
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = (await caches.match('/index.html')) || (await caches.match('/'));
        const networkPromise = fetch(request)
          .then(async (networkRes) => {
            if (networkRes && networkRes.ok) {
              const cacheName = await getActiveCacheName();
              const cache = await caches.open(cacheName);
              cache.put('/index.html', networkRes.clone()).catch(() => {});
              cache.put('/', networkRes.clone()).catch(() => {});
            }
            return networkRes;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }
        const netRes = await networkPromise;
        return netRes || new Response('Offline', { status: 503, statusText: 'Offline' });
      })()
    );
    return;
  }

  // Assets estáticos (bundles /assets/* com hash, ícones, manifest): Cache-First com gravação sob demanda
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const networkRes = await fetch(request);
        if (networkRes && networkRes.ok && networkRes.type === 'basic') {
          const cacheName = await getActiveCacheName();
          const cache = await caches.open(cacheName);
          cache.put(request, networkRes.clone()).catch(() => {});
        }
        return networkRes;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
