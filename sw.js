const CACHE_NAME = 'equipos-awp-v2'; // Incrementar versión
const urlsToCache = [
    '/',
    'index.html',
    'dashboard.html',
    'landing.js',
    'app.js',
    'manifest.json',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png'
    // No cacheamos la API ni Tailwind CDN aquí, se manejan con estrategia de red.
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto, añadiendo app shell');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            // Si la red falla, intenta encontrar una respuesta en el caché
            return caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                // Si la petición no está en caché (ej. una petición a la API)
                // y no hay red, no podemos hacer nada. Podríamos devolver
                // una respuesta JSON de error genérica si quisiéramos.
            });
        })
    );
});
