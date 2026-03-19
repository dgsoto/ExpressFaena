// --- SERVICE WORKER FOR EXPRESS FAENA PWA ---

// Versioning for cache control. Incrementing this version will trigger an update
// and clear out old caches, ensuring users get the latest version of the app.
const CACHE_VERSION = 1;
const CACHE_NAME = `express-faena-cache-v${CACHE_VERSION}`;

// These are the core files of the application shell that we want to cache.
// This ensures the main interface is available instantly, even offline.
const APP_SHELL_URLS = [
    'index.html',
    'style.css',
    'app.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// --- EVENT LISTENERS ---

// 1. INSTALL: Fired when the service worker is first installed.
// We open our cache and add the core application shell files to it.
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(APP_SHELL_URLS);
            })
            .then(() => self.skipWaiting()) // Force the waiting service worker to become the active one.
    );
});

// 2. ACTIVATE: Fired when the service worker is activated.
// This is the perfect place to clean up old caches.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    // If a cache is not our current one, we delete it.
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing Old Cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Take control of all open clients (tabs).
});

// 3. FETCH: Fired for every network request made by the page.
// This is where we define our caching strategy.
self.addEventListener('fetch', event => {
    // For Firebase Firestore requests, we always go to the network first. 
    // This is crucial for real-time data.
    if (event.request.url.includes('firestore.googleapis.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For other requests (app shell, images), we use a "Cache First, then Network" strategy.
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // If we have a response in the cache, we return it immediately.
            if (cachedResponse) {
                return cachedResponse;
            }

            // If not, we fetch it from the network.
            return fetch(event.request).then(networkResponse => {
                // And we also cache the new response for future use.
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        }).catch(() => {
            // If both cache and network fail (e.g., offline and image not cached),
            // you could return a fallback offline image here if you had one.
        })
    );
});
