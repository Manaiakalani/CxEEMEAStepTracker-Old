// Enhanced Service Worker for CxE EMEA Step Tracker
const CACHE_VERSION = '2026-emea-002'; // Update this timestamp when deploying
const CACHE_NAME = `step-tracker-v${CACHE_VERSION}`;
const STATIC_CACHE = `step-tracker-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `step-tracker-dynamic-v${CACHE_VERSION}`;

// Critical resources to cache immediately (relative to SW scope so this works
// at the domain root or under a project sub-path like /CxEEMEAStepTracker/).
const CRITICAL_RESOURCES = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './gamification.js',
    './gamification.css',
    './web-share.js',
    './data-viz.js',
    './data-viz.css',
    './a11y.js',
    './a11y.css',
    './perf-security.js',
    './favicon.svg',
    './manifest.json'
];

// External resources to cache with strategies
const EXTERNAL_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Cache strategies with TTL (Time To Live)
const CACHE_STRATEGIES = {
    'cache-first': ['fonts.googleapis.com', 'cdnjs.cloudflare.com'],
    'network-first': ['api.open-meteo.com'],
    'stale-while-revalidate': ['./', './index.html', './script.js', './styles.css', './manifest.json']
};

// Cache TTL in milliseconds (1 hour for critical resources)
const CACHE_TTL = {
    'critical': 60 * 60 * 1000, // 1 hour
    'static': 24 * 60 * 60 * 1000, // 24 hours  
    'dynamic': 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Install event - enhanced caching strategy
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache critical resources immediately
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Caching critical resources...');
                return cache.addAll(CRITICAL_RESOURCES);
            }),
            
            // Cache external resources with error handling
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('Caching external resources...');
                return Promise.allSettled(
                    EXTERNAL_RESOURCES.map(url => 
                        cache.add(url).catch(error => {
                            console.warn(`Failed to cache ${url}:`, error);
                        })
                    )
                );
            })
        ]).then(() => {
            console.log('Service Worker installation complete');
            // Skip waiting to activate immediately
            self.skipWaiting();
        }).catch(error => {
            console.error('Service Worker installation failed:', error);
        })
    );
});

// Fetch event - enhanced caching strategies
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    event.respondWith(
        handleRequest(request, url)
    );
});

async function handleRequest(request, url) {
    try {
        // Determine cache strategy based on URL
        const strategy = getCacheStrategy(url.hostname);
        
        switch (strategy) {
            case 'cache-first':
                return await cacheFirst(request);
            case 'network-first':
                return await networkFirst(request);
            case 'stale-while-revalidate':
                return await staleWhileRevalidate(request);
            default:
                return await cacheFirst(request);
        }
    } catch (error) {
        console.error('Fetch handler error:', error);
        return await handleFallback(request);
    }
}

function getCacheStrategy(hostname) {
    for (const [strategy, hosts] of Object.entries(CACHE_STRATEGIES)) {
        if (hosts.some(host => hostname.includes(host))) {
            return strategy;
        }
    }
    return 'cache-first';
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return await handleFallback(request);
    }
}

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return await handleFallback(request);
    }
}

async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    const cacheKey = `${request.url}_timestamp`;
    
    // Check if cached response is still fresh
    if (cachedResponse) {
        const cachedTimestamp = await getCacheTimestamp(cacheKey);
        const now = Date.now();
        const maxAge = isCriticalResource(request.url) ? CACHE_TTL.critical : CACHE_TTL.dynamic;
        
        // If cache is stale, prefer network response
        if (cachedTimestamp && (now - cachedTimestamp > maxAge)) {
            console.log('Cache is stale, fetching fresh content for:', request.url);
            try {
                const networkResponse = await fetch(request);
                if (networkResponse.ok) {
                    const cache = await caches.open(DYNAMIC_CACHE);
                    await cache.put(request, networkResponse.clone());
                    await setCacheTimestamp(cacheKey, now);
                    return networkResponse;
                }
            } catch (error) {
                console.warn('Network fetch failed, returning stale cache:', error);
                return cachedResponse;
            }
        }
    }
    
    // Fetch in background to update cache
    const fetchPromise = fetch(request).then(async response => {
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, response.clone());
            await setCacheTimestamp(cacheKey, Date.now());
        }
        return response;
    }).catch(error => {
        console.warn('Background fetch failed:', error);
    });
    
    // Return cached version immediately if available
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Otherwise wait for network
    return await fetchPromise || handleFallback(request);
}

// Helper functions for cache timestamp management
async function getCacheTimestamp(key) {
    try {
        const cache = await caches.open('step-tracker-meta');
        const response = await cache.match(key);
        if (response) {
            const timestamp = await response.text();
            return parseInt(timestamp);
        }
    } catch (error) {
        console.warn('Failed to get cache timestamp:', error);
    }
    return null;
}

async function setCacheTimestamp(key, timestamp) {
    try {
        const cache = await caches.open('step-tracker-meta');
        await cache.put(key, new Response(timestamp.toString()));
    } catch (error) {
        console.warn('Failed to set cache timestamp:', error);
    }
}

function isCriticalResource(url) {
    return CRITICAL_RESOURCES.some(resource => url.includes(resource));
}

async function handleFallback(request) {
    // Return offline page for navigation requests
    if (request.destination === 'document') {
        const offlineResponse = await caches.match('/index.html');
        return offlineResponse || new Response('Offline - Please check your connection', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    
    // Return empty response for other requests
    return new Response('', { status: 204 });
}

// Activate event - enhanced cache management
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            // Detect whether this is an update (old caches exist) vs first install
            const isUpdate = cacheNames.some(name =>
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE &&
                name !== 'step-tracker-meta' &&
                name.startsWith('step-tracker-')
            );

            return Promise.all([
                // Clean up old caches
                Promise.all(
                    cacheNames.map(cacheName => {
                        // Keep only current version caches and meta cache
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== 'step-tracker-meta') {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                ),
                
                // Take control of all clients immediately
                self.clients.claim(),
                
                // Only notify clients when this is an actual update, not first install
                isUpdate ? notifyClientsOfUpdate() : Promise.resolve()
            ]);
        }).then(() => {
            console.log('Service Worker activated and ready');
        })
    );
});

// Notify all clients that a new version is available
async function notifyClientsOfUpdate() {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SW_UPDATED',
            message: 'New version available! Refresh to get the latest features.'
        });
    });
}

// Background sync for data persistence (if supported)
self.addEventListener('sync', (event) => {
    if (event.tag === 'step-data-sync') {
        event.waitUntil(syncStepData());
    }
});

async function syncStepData() {
    // This would sync with a backend if available
    // For now, just log that sync was triggered
    console.log('Background sync triggered for step data');
}

// Push notifications (for future enhancement)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const options = {
        body: event.data.text(),
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        tag: 'step-tracker',
        actions: [
            {
                action: 'view',
                title: 'View App',
                icon: '/favicon.svg'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Step Tracker', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                // Focus existing window if available
                const existingClient = clients.find(client => 
                    client.url.includes(self.location.origin) && 'focus' in client
                );
                
                if (existingClient) {
                    return existingClient.focus();
                } else {
                    // Open new window
                    return self.clients.openWindow('/');
                }
            })
        );
    }
});
