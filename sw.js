// sw.js
const CACHE_NAME = 'lab-inventory-v1';
const ASSETS_TO_CACHE = [
    './',                // Alias para index.html
    './index.html',
    './app.js',
    './manifest.json',
    // Intentamos cachear Tailwind (Nota: Lo ideal en prod es descargar el CSS o usar build process)
    'https://cdn.tailwindcss.com' 
];

// 1. Instalación: Cachear App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Cacheando archivos estáticos');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting(); // Activar inmediatamente
});

// 2. Activación: Limpiar cachés viejos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Borrando caché antigua', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Intercepción (Fetch Strategy: Stale-While-Revalidate o Cache First para estáticos)
// Para archivos estáticos usamos Cache First.
// IMPORTANTE: Las peticiones a api.php NO las interceptamos aquí para cache, 
// dejamos que app.js maneje la lógica de datos con LocalStorage según requerimiento.
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Si la petición es a la API, no hacemos nada en el SW (retornamos fetch directo)
    // Esto asegura que app.js controle la lógica Network-First + LocalStorage
    if (url.pathname.includes('api.php')) {
        return; 
    }

    // Para el resto (archivos estáticos HTML, JS, CSS)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en caché, devolverlo
                if (response) {
                    return response;
                }
                // Si no, ir a la red
                return fetch(event.request);
            })
    );
});