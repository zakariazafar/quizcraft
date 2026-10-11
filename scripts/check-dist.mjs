#!/usr/bin/env node
// Runs after `vite build`: fails if a built page contains something the CSP would block.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findCspProblems } from './lib/distCheck.js';

const pages = readdirSync('dist').filter((f) => f.endsWith('.html'));
let failed = false;
for (const page of pages) {
  for (const p of findCspProblems(readFileSync(join('dist', page), 'utf8'))) {
    console.error(`✗ dist/${page}: ${p}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`✓ ${pages.length} built pages are compatible with the Content-Security-Policy`);
