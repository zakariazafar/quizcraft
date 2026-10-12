// QuizCraft service worker.
//
// Goal: the app shell (pages, styles, fonts, icons) and any quiz you've already opened
// keep working offline or on a flaky connection. It never touches Firebase, Firestore,
// Auth or reCAPTCHA requests (all cross-origin, excluded below) — sign-in and saving an
// attempt always go straight to the network, and the existing offline retry queue in
// src/lib/attempts.js already covers a save made while offline.
//
// Bump CACHE_VERSION whenever PRECACHE or the strategy below changes, so old caches are
// dropped on activate instead of serving stale logic forever.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `quizcraft-${CACHE_VERSION}`;

// Exact paths with no build hash: safe to name directly and worth having offline.
const PRECACHE = [
  '/',
  '/quiz.html',
  '/dashboard.html',
  '/404.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo.svg',
  '/pattern.svg',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Which precached page stands in for a navigation when the network is unreachable.
 * Render's rewrites (/q/* -> quiz.html, /dashboard -> dashboard.html) happen at the
 * edge, so the browser's navigation request still carries the original path.
 * @param {string} pathname
 * @returns {string}
 */
function shellFor(pathname) {
  if (pathname.startsWith('/q/')) return '/quiz.html';
  if (pathname === '/dashboard') return '/dashboard.html';
  if (pathname === '/' || pathname === '/index.html') return '/';
  return '/404.html';
}

/**
 * How to handle a same-origin, non-navigation GET request.
 * @param {string} pathname
 * @returns {'cache-first' | 'stale-while-revalidate' | 'bypass'}
 */
function strategyFor(pathname) {
  if (pathname.startsWith('/quizzes/')) return 'stale-while-revalidate';
  if (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icons/') ||
    PRECACHE.includes(pathname)
  )
    return 'cache-first';
  return 'bypass';
}

/** Cache a successful response, then return it unchanged. @param {Request} request @param {Response} response */
function store(request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => store(request, response))
        .catch(() =>
          caches.match(shellFor(url.pathname)).then((hit) => hit || caches.match('/404.html')),
        ),
    );
    return;
  }

  const strategy = strategyFor(url.pathname);
  if (strategy === 'bypass') return;

  if (strategy === 'cache-first') {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => store(request, res))),
    );
    return;
  }

  // stale-while-revalidate: answer from cache immediately (if any), refresh in the
  // background so the next visit sees a quiz edit or a newly closed quiz.
  event.respondWith(
    caches.match(request).then((hit) => {
      const fresh = fetch(request)
        .then((res) => store(request, res))
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
