import { describe, expect, it } from 'vitest';
import { EMAIL_MAX, NAME_MAX, validateTaker } from '../../src/lib/takerForm.js';

describe('validateTaker', () => {
  it('accepts a valid name and email and trims them', () => {
    const r = validateTaker({ name: '  Zakaria   Ahmed ', email: ' a@b.co ' });
    expect(r.ok).toBe(true);
    expect(r.values).toEqual({ name: 'Zakaria Ahmed', email: 'a@b.co' });
    expect(r.errors).toEqual({});
  });

  it('accepts Arabic names and NFC-normalises them', () => {
    const decomposed = 'آدم'; // alef + combining madda
    const r = validateTaker({ name: decomposed, email: 'x@y.org' });
    expect(r.ok).toBe(true);
    expect(r.values.name).toBe('آدم');
  });

  it('requires both fields', () => {
    const r = validateTaker({});
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual({
      name: 'Enter your name.',
      email: 'Enter your email address.',
    });
  });

  it('rejects malformed emails', () => {
    for (const email of ['abc', 'a@b', 'a b@c.com', '@b.com']) {
      expect(validateTaker({ name: 'A', email }).errors.email).toMatch(/like name@example.com/);
    }
  });

  it('rejects over-long values', () => {
    const r = validateTaker({
      name: 'x'.repeat(NAME_MAX + 1),
      email: `${'a'.repeat(EMAIL_MAX)}@b.com`,
    });
    expect(r.errors.name).toMatch(/100 characters/);
    expect(r.errors.email).toBeDefined();
  });
});
