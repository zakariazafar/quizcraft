// @ts-check
// Finds things in built HTML that the Content-Security-Policy would block, and checks
// that the PWA files (manifest, icons, service worker precache list) stay consistent.

/**
 * @param {string} html
 * @returns {string[]} problems
 */
export function findCspProblems(html) {
  const problems = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(m[1]) && m[2].trim()) problems.push('inline <script> block');
  }
  if (/<style\b/i.test(html)) problems.push('inline <style> block');
  if (/<[a-z][^>]*\sstyle\s*=/i.test(html)) problems.push('inline style="" attribute');
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) problems.push('inline event handler (on…="")');
  if (/(src|href)\s*=\s*["']javascript:/i.test(html)) problems.push('javascript: URL');
  return problems;
}

/**
 * The `PRECACHE` array literal from public/sw.js, as plain strings.
 * @param {string} swText
 * @returns {string[]}
 */
export function parsePrecacheList(swText) {
  const m = swText.match(/const PRECACHE = \[([\s\S]*?)\];/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']*)'/g)].map((s) => s[1]);
}

/**
 * Checks that every file the service worker and manifest point at actually got built, so
 * a typo'd path never silently fails to precache or shows a broken home-screen icon.
 * @param {{ manifestText: string, swText: string, fileExists: (path: string) => boolean }} input
 *   `fileExists` takes a path as it would appear under `dist/` (e.g. "/icons/icon-192.png").
 * @returns {string[]} problems
 */
export function findPwaProblems({ manifestText, swText, fileExists }) {
  const problems = [];

  /** @type {{ icons?: { src: string }[] }} */
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    return ['manifest.webmanifest is not valid JSON'];
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    problems.push('manifest.webmanifest has no icons');
  }
  for (const icon of manifest.icons ?? []) {
    if (!fileExists(icon.src)) problems.push(`manifest icon not built: ${icon.src}`);
  }

  const precache = parsePrecacheList(swText);
  if (precache.length === 0) problems.push('sw.js has an empty or unparsable PRECACHE list');
  for (const path of precache) {
    const file = path === '/' ? '/index.html' : path;
    if (!fileExists(file)) problems.push(`sw.js precaches a file that was not built: ${path}`);
  }

  return problems;
}
