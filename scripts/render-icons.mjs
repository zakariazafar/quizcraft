#!/usr/bin/env node
// Regenerates the PWA icon PNGs from the brand SVGs. Not part of the build: run by hand
// (`node scripts/render-icons.mjs`) whenever public/logo.svg or design/icon-maskable-source.svg
// changes. Uses Playwright (already a dev dependency for e2e tests) instead of adding an
// image library just for this.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const logo = readFileSync('public/logo.svg', 'utf8');
const maskable = readFileSync('design/icon-maskable-source.svg', 'utf8');

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, svg: logo, transparent: true },
  { file: 'public/icons/icon-512.png', size: 512, svg: logo, transparent: true },
  { file: 'public/icons/icon-512-maskable.png', size: 512, svg: maskable, transparent: false },
  { file: 'public/apple-touch-icon.png', size: 180, svg: maskable, transparent: false },
];

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size } });
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;padding:0;background:transparent;}
      svg{display:block;width:${t.size}px;height:${t.size}px;}
    </style></head><body>${t.svg}</body></html>`,
  );
  const buf = await page.screenshot({ omitBackground: t.transparent });
  writeFileSync(t.file, buf);
  console.log(`wrote ${t.file} (${buf.length} bytes)`);
  await page.close();
}
await browser.close();
