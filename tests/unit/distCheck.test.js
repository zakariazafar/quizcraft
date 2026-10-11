import { describe, expect, it } from 'vitest';
import { findCspProblems } from '../../scripts/lib/distCheck.js';

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
