import { describe, expect, it } from 'vitest';
import {
  findCspProblems,
  findPwaProblems,
  parsePrecacheList,
} from '../../scripts/lib/distCheck.js';

describe('findCspProblems', () => {
  it('accepts external module scripts and stylesheets', () => {
    const ok =
      '<html><head><script type="module" crossorigin src="/assets/a.js"></script>' +
      '<link rel="stylesheet" href="/assets/a.css"></head><body><main id="app"></main></body></html>';
    expect(findCspProblems(ok)).toEqual([]);
  });

  it('flags everything a strict CSP blocks', () => {
    expect(findCspProblems('<script>alert(1)</script>')).toEqual(['inline <script> block']);
    expect(findCspProblems('<style>p{}</style>')).toEqual(['inline <style> block']);
    expect(findCspProblems('<p style="color:red">x</p>')).toEqual(['inline style="" attribute']);
    expect(findCspProblems('<button onclick="x()">x</button>')).toEqual([
      'inline event handler (on…="")',
    ]);
    expect(findCspProblems('<a href="javascript:alert(1)">x</a>')).toEqual(['javascript: URL']);
  });

  it('ignores an empty inline script tag', () => {
    expect(findCspProblems('<script> </script>')).toEqual([]);
  });
});

describe('parsePrecacheList', () => {
  it('reads the PRECACHE array literal out of sw.js', () => {
    const sw = "const PRECACHE = [\n  '/',\n  '/quiz.html',\n  '/favicon.svg',\n];\n";
    expect(parsePrecacheList(sw)).toEqual(['/', '/quiz.html', '/favicon.svg']);
  });

  it('returns an empty list when PRECACHE is missing', () => {
    expect(parsePrecacheList('self.addEventListener("install", () => {});')).toEqual([]);
  });
});

describe('findPwaProblems', () => {
  const manifestText = JSON.stringify({
    icons: [{ src: '/icons/icon-192.png' }, { src: '/icons/icon-512.png' }],
  });
  const swText = "const PRECACHE = [\n  '/',\n  '/favicon.svg',\n];\n";

  it('passes when every referenced file was built', () => {
    expect(findPwaProblems({ manifestText, swText, fileExists: () => true })).toEqual([]);
  });

  it('flags manifest icons and precached files that were not built', () => {
    const built = new Set(['/icons/icon-192.png', '/index.html']);
    const problems = findPwaProblems({
      manifestText,
      swText,
      fileExists: (path) => built.has(path),
    });
    expect(problems).toContain('manifest icon not built: /icons/icon-512.png');
    expect(problems).toContain('sw.js precaches a file that was not built: /favicon.svg');
  });

  it('flags invalid JSON and an empty icons or precache list', () => {
    expect(findPwaProblems({ manifestText: '{not json', swText, fileExists: () => true })).toEqual([
      'manifest.webmanifest is not valid JSON',
    ]);
    expect(
      findPwaProblems({ manifestText: '{}', swText: 'no precache here', fileExists: () => true }),
    ).toEqual([
      'manifest.webmanifest has no icons',
      'sw.js has an empty or unparsable PRECACHE list',
    ]);
  });

  it('maps the root path to index.html when checking existence', () => {
    const seen = [];
    findPwaProblems({
      manifestText: '{"icons":[]}',
      swText: "const PRECACHE = ['/'];",
      fileExists: (path) => (seen.push(path), true),
    });
    expect(seen).toContain('/index.html');
    expect(seen).not.toContain('/');
  });
});
