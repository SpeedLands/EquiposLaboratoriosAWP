const CACHE_NAME = 'equipos-awp-v4'; // Subí la versión para forzar actualización
const urlsToCache = [
    './',                // Usa punto al inicio para ruta relativa
    './index.html',
    './dashboard.html',  // Asegúrate que este archivo EXISTA, si no, borra esta línea
    './landing.js',      // ¿Seguro que existe? Si no, bórralo
    './app.js',
    './manifest.json',
    './tailwindcss.js', // Agregado para soporte offline de estilos
    './icons/icon.svg',
    './icons/icon-48x48.png',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-256x256.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png'
];

self.addEventListener('install', event => {
    // Forzar al SW a activarse inmediatamente tras instalarse
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Abriendo caché y guardando archivos');
                // IMPORTANTE: Si UNO solo de estos falla (404), todo falla.
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Fallo al registrar caché:', err))
    );
});

self.addEventListener('activate', event => {
    // Tomar control de todos los clientes inmediatamente
    event.waitUntil(self.clients.claim());

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
    const requestUrl = new URL(event.request.url);

    // 1. ESTRATEGIA PARA LA API: NETWORK ONLY
    // No queremos cachear peticiones a api.php, queremos datos frescos o error.
    if (requestUrl.pathname.includes('api.php')) {
        return; // El navegador hace el fetch normal. Si falla, app.js maneja el error.
    }

    // 2. ESTRATEGIA PARA ARCHIVOS ESTÁTICOS: CACHE FIRST (Caché primero, luego red)
    // Esto hace que la app cargue rápido y funcione offline.
    event.respondWith(
        caches.match(event.request).then(response => {
            // Si está en caché, lo devolvemos
            if (response) {
                return response;
            }
            // Si no, vamos a la red
            return fetch(event.request);
        })
    );
});