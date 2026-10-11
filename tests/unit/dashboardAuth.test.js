import { describe, expect, it, vi } from 'vitest';
import { authErrorMessage, createDashboardAuth } from '../../src/lib/dashboardAuth.js';

const make = (overrides = {}, email = 'dashboard@quizcraft.local') => {
  const api = {
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    onChange: vi.fn((_auth, cb) => {
      cb({ uid: 'u1', email });
      cb(null);
      return () => {};
    }),
    ...overrides,
  };
  return { api, auth: createDashboardAuth({ auth: 'AUTH', email, api }) };
};

describe('createDashboardAuth', () => {
  it('signs in with the fixed email and the typed password', async () => {
    const { api, auth } = make();
    expect(await auth.signIn('test-password')).toEqual({ ok: true });
    expect(api.signIn).toHaveBeenCalledWith('AUTH', 'dashboard@quizcraft.local', 'test-password');
  });

  it('asks for a password before calling Firebase', async () => {
    const { api, auth } = make();
    expect(await auth.signIn('')).toEqual({ ok: false, message: 'Enter the dashboard password.' });
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it('explains a missing dashboard email setting', async () => {
    const { auth } = make({}, '');
    expect((await auth.signIn('x')).message).toMatch(/VITE_DASHBOARD_EMAIL/);
  });

  it('turns Firebase errors into plain messages', async () => {
    const err = Object.assign(new Error('x'), { code: 'auth/invalid-credential' });
    const { auth } = make({ signIn: vi.fn().mockRejectedValue(err) });
    expect(await auth.signIn('wrong')).toEqual({
      ok: false,
      message: 'That password is not right. Check it and try again.',
    });
  });

  it('signs out and reports sign-in state as true/false', async () => {
    const { api, auth } = make();
    await auth.signOut();
    expect(api.signOut).toHaveBeenCalledWith('AUTH');
    const seen = [];
    auth.onChange((v) => seen.push(v));
    expect(seen).toEqual([true, false]);
  });
});

describe('authErrorMessage', () => {
  it.each([
    ['auth/wrong-password', /not right/],
    ['auth/invalid-login-credentials', /not right/],
    ['auth/user-not-found', /not right/],
    ['auth/too-many-requests', /Too many attempts/],
    ['auth/network-request-failed', /connection/],
    ['auth/user-disabled', /disabled/],
    ['something-else', /Sign-in failed/],
  ])('%s', (code, pattern) => {
    expect(authErrorMessage({ code })).toMatch(pattern);
  });
  it('handles errors without a code', () => {
    expect(authErrorMessage(undefined)).toMatch(/Sign-in failed/);
  });
});
