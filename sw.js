/* Service Worker de Mi Balance Mensual
   Estrategia:
   - Shell de la app (HTML, manifest, íconos): precache en la instalación.
   - Recursos externos (Chart.js, Font Awesome, Google Fonts): se cachean la
     primera vez que se piden con conexión y luego se sirven desde caché,
     así la app funciona completa sin internet.
   - Al publicar cambios, subir el número de CACHE_VERSION para invalidar
     el caché antiguo en los dispositivos. */

const CACHE_VERSION = 'mi-balance-v3';

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

    event.respondWith(
        caches.match(req).then((enCache) => {
            if (enCache) return enCache;

            return fetch(req)
                .then((respuesta) => {
                    // Cachear respuestas válidas (incluye opacas de los CDN)
                    if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
                        const copia = respuesta.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia));
                    }
                    return respuesta;
                })
                .catch(() => {
                    // Sin conexión y sin caché: si es navegación, servir el shell
                    if (req.mode === 'navigate') return caches.match('./index.html');
                });
        })
    );
});
