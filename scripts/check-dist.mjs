#!/usr/bin/env node
// Runs after `vite build`: fails if a built page contains something the CSP would block,
// or if the PWA files (manifest, icons, service worker precache list) are inconsistent.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findCspProblems, findPwaProblems } from './lib/distCheck.js';

const pages = readdirSync('dist').filter((f) => f.endsWith('.html'));
let failed = false;
for (const page of pages) {
  for (const p of findCspProblems(readFileSync(join('dist', page), 'utf8'))) {
    console.error(`✗ dist/${page}: ${p}`);
    failed = true;
  }
}

for (const p of findPwaProblems({
  manifestText: readFileSync('dist/manifest.webmanifest', 'utf8'),
  swText: readFileSync('dist/sw.js', 'utf8'),
  fileExists: (path) => existsSync(join('dist', path)),
})) {
  console.error(`✗ PWA: ${p}`);
  failed = true;
}

if (failed) process.exit(1);
console.log(`✓ ${pages.length} built pages are compatible with the Content-Security-Policy`);
console.log('✓ manifest, icons and the service worker precache list are consistent');
