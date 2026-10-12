// @ts-check
/** Registers public/sw.js, which makes the app shell and visited quizzes work offline. */

/**
 * @param {{ serviceWorker?: { register: (url: string) => Promise<unknown> } } | undefined} nav
 *   navigator-like object, injected so this can be tested without a real browser
 * @returns {boolean} true when registration was attempted (false when unsupported)
 */
export function registerServiceWorker(nav) {
  if (!nav?.serviceWorker) return false;
  // A failed registration (unsupported scope, blocked storage, …) must never break the app.
  nav.serviceWorker.register('/sw.js').catch(() => {});
  return true;
}
