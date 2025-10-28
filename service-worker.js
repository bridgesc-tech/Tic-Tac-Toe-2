// Service Worker for TicTacToe Advanced PWA
const CACHE_NAME = 'tictactoe-advanced-v1';

// Get the base path for GitHub Pages (works at root or subdirectory)
const getBasePath = () => {
  const path = self.location.pathname;
  const parts = path.split('/');
  // Remove empty parts and the last part (service-worker.js)
  parts.pop();
  return parts.filter(p => p).join('/') + '/';
};

const basePath = getBasePath();

const urlsToCache = [
  'index.html',
  'styles.css',
  'script.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
].map(url => basePath + url);

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

