import { describe, expect, it } from 'vitest';
import viteConfig, { rewriteUrl } from '../../vite.config.js';

describe('dev/preview rewrites (read from render.yaml)', () => {
  it('maps /q/<id> to quiz.html and keeps the query', () => {
    expect(rewriteUrl('/q/ism-four-properties')).toBe('/quiz.html');
    expect(rewriteUrl('/q/ism-four-properties/?x=1')).toBe('/quiz.html?x=1');
  });
  it('maps /dashboard to dashboard.html', () => {
    expect(rewriteUrl('/dashboard')).toBe('/dashboard.html');
  });
  it('leaves other URLs alone', () => {
    expect(rewriteUrl('/quizzes/a.json')).toBe('/quizzes/a.json');
  });
});

describe('vite config', () => {
  it('builds every page as a multi-page app', () => {
    const c = viteConfig({ mode: 'test', command: 'build' });
    expect(c.appType).toBe('mpa');
    expect(Object.keys(c.build.rollupOptions.input).sort()).toEqual([
      'dashboard',
      'main',
      'notFound',
      'quiz',
    ]);
  });
});
