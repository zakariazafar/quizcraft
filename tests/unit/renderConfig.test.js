import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyRewrites,
  extendCsp,
  headersFor,
  pathMatches,
  readRenderConfig,
} from '../../scripts/lib/renderConfig.js';

const config = readRenderConfig(readFileSync('render.yaml', 'utf8'));

describe('render.yaml', () => {
  it('is a static site built with npm and published from dist', () => {
    expect(config.site).toMatchObject({
      runtime: 'static',
      buildCommand: 'npm ci && npm run build',
      staticPublishPath: 'dist',
    });
  });

  it('declares every VITE_* variable from .env.example (values set in the Render dashboard)', () => {
    const example = readFileSync('.env.example', 'utf8');
    const wanted = [...example.matchAll(/^(VITE_[A-Z_]+)=/gm)]
      .map((m) => m[1])
      .filter((k) => !['VITE_USE_EMULATORS', 'VITE_EMULATOR_HOST'].includes(k));
    const keys = config.site.envVars.map((e) => e.key);
    for (const k of wanted) expect(keys).toContain(k);
    for (const e of config.site.envVars.filter((v) => v.key.startsWith('VITE_'))) {
      expect(e.sync).toBe(false);
    }
  });

  it('sends a strict Content-Security-Policy and other security headers on every page', () => {
    const h = headersFor('/q/ism-four-properties', config.headers);
    const csp = h['Content-Security-Policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("style-src 'self';");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(csp).toContain('https://firestore.googleapis.com');
    expect(csp).toContain('https://identitytoolkit.googleapis.com');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d+/);
  });

  it('caches built assets for a year and quiz files not at all', () => {
    expect(headersFor('/assets/app-123.js', config.headers)['Cache-Control']).toMatch(/immutable/);
    expect(headersFor('/quizzes/index.json', config.headers)['Cache-Control']).toBe('no-cache');
    expect(headersFor('/', config.headers)['Cache-Control']).toBeUndefined();
  });
});

describe('applyRewrites', () => {
  it('maps quiz links and the dashboard like Render does', () => {
    expect(applyRewrites('/q/ism-four-properties', config.routes)).toBe('/quiz.html');
    expect(applyRewrites('/q/abc?x=1', config.routes)).toBe('/quiz.html?x=1');
    expect(applyRewrites('/dashboard', config.routes)).toBe('/dashboard.html');
    expect(applyRewrites('/dashboard/extra', config.routes)).toBe('/dashboard/extra');
    expect(applyRewrites('/other', config.routes)).toBe('/other');
    expect(applyRewrites('/x', [{ type: 'redirect', source: '/x', destination: '/y' }])).toBe('/x');
  });
});

describe('pathMatches', () => {
  it('supports exact paths and trailing *', () => {
    expect(pathMatches('/a', '/a')).toBe(true);
    expect(pathMatches('/a', '/a/b')).toBe(false);
    expect(pathMatches('/a/*', '/a/b/c')).toBe(true);
    expect(pathMatches('/*', '/')).toBe(true);
  });
});

describe('extendCsp', () => {
  it('adds origins to one directive only', () => {
    expect(extendCsp("default-src 'self'; connect-src 'self'", 'connect-src', ['http://h:1'])).toBe(
      "default-src 'self'; connect-src 'self' http://h:1",
    );
  });
});

describe('readRenderConfig', () => {
  it('rejects a file without a static site', () => {
    expect(() => readRenderConfig('services: []')).toThrow(/no static site/);
    expect(() => readRenderConfig('')).toThrow(/no static site/);
  });
  it('defaults to no routes or headers', () => {
    const c = readRenderConfig('services:\n  - runtime: static\n');
    expect(c.routes).toEqual([]);
    expect(c.headers).toEqual([]);
  });
});
