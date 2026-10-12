// Text colours in app.css must meet WCAG AA contrast (4.5:1) on the page and panel colours,
// in both the light palette (:root) and the dark palette (@media prefers-color-scheme: dark).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/app.css', 'utf8');

/** @param {string} pattern @returns {string} the first captured group of a required match */
function block(pattern) {
  const m = css.match(pattern);
  if (!m) throw new Error(`block not found: ${pattern}`);
  return m[1];
}

const LIGHT = block(/:root\s*\{([^}]*)\}/);
const DARK = block(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/);

/** @param {string} text @param {string} name */
function token(text, name) {
  const m = text.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!m) throw new Error(`--${name} not set in this block`);
  return m[1];
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe.each([
  ['light', LIGHT],
  ['dark', DARK],
])('colour contrast (WCAG AA) — %s', (_mode, palette) => {
  const backgrounds = ['page', 'surface'];
  it.each(['ink', 'muted', 'accent', 'right', 'wrong'])('--%s text is readable', (fg) => {
    for (const bg of backgrounds)
      expect(contrast(token(palette, fg), token(palette, bg))).toBeGreaterThanOrEqual(4.5);
  });
  it('text on the tinted answer backgrounds is readable', () => {
    expect(contrast(token(palette, 'ink'), token(palette, 'gold-soft'))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(token(palette, 'ink'), token(palette, 'wrong-soft'))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(token(palette, 'ink'), token(palette, 'right-soft'))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
  it('accent text on the green-soft chip background is readable', () => {
    expect(contrast(token(palette, 'accent'), token(palette, 'green-soft'))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
  it('white text on the green-strong button hover state is readable', () => {
    expect(contrast('#ffffff', token(palette, 'green-strong'))).toBeGreaterThanOrEqual(4.5);
  });
  it('white text on the solid green button is readable', () => {
    expect(contrast('#ffffff', token(palette, 'green'))).toBeGreaterThanOrEqual(4.5);
  });
  it('the gold focus ring stands out from the page (3:1 for UI)', () => {
    expect(contrast(token(palette, 'gold'), token(palette, 'page'))).toBeGreaterThanOrEqual(3);
  });
});
