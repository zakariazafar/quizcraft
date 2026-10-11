import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn((cfg, name) => ({ name })) }));
vi.mock('firebase/firestore/lite', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ kind: 'auth' })),
  connectAuthEmulator: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserSessionPersistence: 'SESSION',
  signInWithEmailAndPassword: vi.fn(() => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn(() => 'unsubscribe'),
}));

const fa = await import('firebase/auth');
const { authApi, getAuthClient, resetAuthCache } = await import('../../src/lib/firebaseAuth.js');
const { resetFirebaseCache } = await import('../../src/lib/firebase.js');
const { readConfig } = await import('../../src/lib/config.js');

beforeEach(() => {
  resetAuthCache();
  resetFirebaseCache();
  vi.clearAllMocks();
});

describe('getAuthClient', () => {
  it('creates the auth client once and connects to the emulator when configured', () => {
    const config = readConfig({ VITE_USE_EMULATORS: 'true' });
    const a = getAuthClient(config);
    expect(getAuthClient(config)).toBe(a);
    expect(fa.getAuth).toHaveBeenCalledTimes(1);
    expect(fa.connectAuthEmulator).toHaveBeenCalledWith(a, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
  });

  it('does not use the emulator for a real project', () => {
    getAuthClient(
      readConfig({
        VITE_FIREBASE_API_KEY: 'k',
        VITE_FIREBASE_PROJECT_ID: 'p',
        VITE_FIREBASE_APP_ID: 'a',
      }),
    );
    expect(fa.connectAuthEmulator).not.toHaveBeenCalled();
  });
});

describe('authApi', () => {
  it('signs in with session persistence, signs out, and listens', async () => {
    await authApi.signIn('AUTH', 'e@x.io', 'pw');
    expect(fa.setPersistence).toHaveBeenCalledWith('AUTH', 'SESSION');
    expect(fa.signInWithEmailAndPassword).toHaveBeenCalledWith('AUTH', 'e@x.io', 'pw');
    await authApi.signOut('AUTH');
    expect(fa.signOut).toHaveBeenCalledWith('AUTH');
    const cb = () => {};
    expect(authApi.onChange('AUTH', cb)).toBe('unsubscribe');
    expect(fa.onAuthStateChanged).toHaveBeenCalledWith('AUTH', cb);
  });
});
