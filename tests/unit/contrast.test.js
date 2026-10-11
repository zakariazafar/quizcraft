// Text colours in app.css must meet WCAG AA contrast (4.5:1) on the page and panel colours.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/app.css', 'utf8');
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];

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

describe('colour contrast (WCAG AA)', () => {
  const backgrounds = ['page', 'surface'];
  it.each(['ink', 'muted', 'green', 'right', 'wrong'])('--%s text is readable', (fg) => {
    for (const bg of backgrounds)
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
  it('text on the tinted answer backgrounds is readable', () => {
    expect(contrast(token('ink'), token('gold-soft'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('ink'), token('wrong-soft'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('ink'), token('right-soft'))).toBeGreaterThanOrEqual(4.5);
  });
  it('white text on the green button is readable', () => {
    expect(contrast('#ffffff', token('green'))).toBeGreaterThanOrEqual(4.5);
  });
  it('the gold focus ring stands out from the page (3:1 for UI)', () => {
    expect(contrast(token('gold'), token('page'))).toBeGreaterThanOrEqual(3);
  });
});
