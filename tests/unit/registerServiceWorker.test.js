import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../src/lib/registerServiceWorker.js';

describe('registerServiceWorker', () => {
  it('registers /sw.js when the browser supports it', () => {
    const register = vi.fn().mockResolvedValue({});
    expect(registerServiceWorker({ serviceWorker: { register } })).toBe(true);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does nothing when the browser has no serviceWorker support', () => {
    const register = vi.fn();
    expect(registerServiceWorker({})).toBe(false);
    expect(registerServiceWorker(undefined)).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('never throws or rejects when registration fails', async () => {
    const register = vi.fn().mockRejectedValue(new Error('blocked'));
    expect(() => registerServiceWorker({ serviceWorker: { register } })).not.toThrow();
    // Let the rejected promise's .catch() run before the test ends.
    await Promise.resolve();
    await Promise.resolve();
  });
});
