// @ts-check
// Reads routes and headers from render.yaml so local preview and tests match production.
import { parse } from 'yaml';

/**
 * @typedef {{ type: string, source: string, destination: string }} Route
 * @typedef {{ path: string, name: string, value: string }} Header
 */

/** @param {string} yamlText */
export function readRenderConfig(yamlText) {
  const doc = parse(yamlText);
  const site = doc?.services?.find((s) => s.runtime === 'static');
  if (!site) throw new Error('render.yaml has no static site service.');
  return {
    site,
    /** @type {Route[]} */ routes: site.routes ?? [],
    /** @type {Header[]} */ headers: (site.headers ?? []).map((h) => ({
      ...h,
      value: String(h.value).replace(/\s+/g, ' ').trim(),
    })),
  };
}

/**
 * Render-style path glob: a trailing * matches anything.
 * @param {string} pattern
 * @param {string} path
 */
export function pathMatches(pattern, path) {
  if (pattern.endsWith('*')) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

/**
 * Apply the first matching rewrite rule (query string kept).
 * @param {string} url
 * @param {Route[]} routes
 */
export function applyRewrites(url, routes) {
  const [path, query = ''] = url.split('?');
  const rule = routes.find((r) => r.type === 'rewrite' && pathMatches(r.source, path));
  return rule ? `${rule.destination}${query ? `?${query}` : ''}` : url;
}

/**
 * Headers for a path (later rules override earlier ones with the same name).
 * @param {string} path
 * @param {Header[]} headers
 */
export function headersFor(path, headers) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const h of headers) if (pathMatches(h.path, path)) out[h.name] = h.value;
  return out;
}

/**
 * Add origins to a CSP directive (used to allow the local emulators in preview only).
 * @param {string} csp
 * @param {string} directive
 * @param {string[]} origins
 */
export function extendCsp(csp, directive, origins) {
  return csp
    .split(';')
    .map((part) => {
      const p = part.trim();
      return p.startsWith(`${directive} `) ? `${p} ${origins.join(' ')}` : p;
    })
    .join('; ');
}
