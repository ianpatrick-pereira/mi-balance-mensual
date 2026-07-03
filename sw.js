/* Service Worker de Mi Balance Mensual
   Estrategia:
   - Shell de la app (HTML, manifest, íconos): NETWORK FIRST — siempre
     intenta traer la última versión; si no hay red, sirve del caché.
   - Recursos externos (Chart.js, Font Awesome, Google Fonts): cache first,
     se cachean la primera vez y luego se sirven desde caché.
   - Al publicar cambios, subir CACHE_VERSION para limpiar caché viejo. */

const CACHE_VERSION = 'mi-balance-v5';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((claves) => Promise.all(
                claves.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const esAppShell = url.origin === self.location.origin;

    if (esAppShell) {
        // NETWORK FIRST para archivos propios — siempre busca la última versión
        event.respondWith(
            fetch(req)
                .then((respuesta) => {
                    const copia = respuesta.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia));
                    return respuesta;
                })
                .catch(() => caches.match(req).then((enCache) => {
                    if (enCache) return enCache;
                    if (req.mode === 'navigate') return caches.match('./index.html');
                }))
        );
    } else {
        // CACHE FIRST para CDNs externos (Chart.js, Font Awesome, Google Fonts)
        event.respondWith(
            caches.match(req).then((enCache) => {
                if (enCache) return enCache;
                return fetch(req).then((respuesta) => {
                    if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
                        const copia = respuesta.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia));
                    }
                    return respuesta;
                });
            })
        );
    }
});
