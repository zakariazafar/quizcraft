import { describe, expect, it, vi } from 'vitest';
import { copyText, quizUrl } from '../../src/lib/share.js';

describe('quizUrl', () => {
  it('uses the site URL when set, else the current origin', () => {
    expect(
      quizUrl('https://quiz.example.com/', 'http://localhost:5173', 'ism-four-properties'),
    ).toBe('https://quiz.example.com/q/ism-four-properties');
    expect(quizUrl('', 'http://localhost:5173', 'abc')).toBe('http://localhost:5173/q/abc');
  });
});

describe('copyText', () => {
  it('copies with the Clipboard API', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    expect(await copyText('x', clipboard)).toBe('copied');
    expect(clipboard.writeText).toHaveBeenCalledWith('x');
  });
  it('falls back to manual copy when blocked or unavailable', async () => {
    expect(await copyText('x', { writeText: () => Promise.reject(new Error('denied')) })).toBe(
      'manual',
    );
    expect(await copyText('x', undefined)).toBe('manual');
  });
});
