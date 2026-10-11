import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn((cfg, name) => ({ name, cfg })),
}));
vi.mock('firebase/firestore/lite', () => ({
  getFirestore: vi.fn((app) => ({ app })),
  connectFirestoreEmulator: vi.fn(),
  doc: vi.fn((db, col, id) => ({ path: `${col}/${id}` })),
  serverTimestamp: vi.fn(() => 'SERVER_TIME'),
  setDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn((db, name) => ({ name })),
  orderBy: vi.fn((f, d) => ({ orderBy: [f, d] })),
  limit: vi.fn((n) => ({ limit: n })),
  query: vi.fn((col, ...parts) => ({ col, parts })),
  getDocs: vi.fn(() =>
    Promise.resolve({
      docs: [
        { id: 'a1', data: () => ({ takerName: 'زكريا', score: 3 }) },
        { id: 'a2', data: () => ({ takerName: 'Amina', score: 1 }) },
      ],
    }),
  ),
}));

const app = await import('firebase/app');
const fs = await import('firebase/firestore/lite');
const { fetchAllAttempts, firestoreAttemptWriter, getFirebase, resetFirebaseCache } =
  await import('../../src/lib/firebase.js');
const { readConfig } = await import('../../src/lib/config.js');

beforeEach(() => {
  resetFirebaseCache();
  vi.clearAllMocks();
});

describe('getFirebase', () => {
  it('initialises once per project', () => {
    const config = readConfig({
      VITE_FIREBASE_API_KEY: 'k',
      VITE_FIREBASE_PROJECT_ID: 'p',
      VITE_FIREBASE_APP_ID: 'a',
    });
    const first = getFirebase(config);
    const second = getFirebase(config);
    expect(first).toBe(second);
    expect(app.initializeApp).toHaveBeenCalledTimes(1);
    expect(fs.connectFirestoreEmulator).not.toHaveBeenCalled();
  });

  it('connects to the Firestore emulator when configured', () => {
    getFirebase(readConfig({ VITE_USE_EMULATORS: 'true' }));
    expect(fs.connectFirestoreEmulator).toHaveBeenCalledWith(expect.anything(), '127.0.0.1', 8080);
  });
});

describe('firestoreAttemptWriter', () => {
  it('writes attempts/<id> with a server timestamp', async () => {
    const write = firestoreAttemptWriter(readConfig({ VITE_USE_EMULATORS: 'true' }));
    await write('abc', { quizId: 'x-y-z', takerName: 'زكريا' });
    expect(fs.doc).toHaveBeenCalledWith(expect.anything(), 'attempts', 'abc');
    expect(fs.setDoc).toHaveBeenCalledWith(
      { path: 'attempts/abc' },
      { quizId: 'x-y-z', takerName: 'زكريا', submittedAt: 'SERVER_TIME' },
    );
  });
});

describe('fetchAllAttempts', () => {
  it('reads attempts newest first, with a limit, keeping the document id', async () => {
    const rows = await fetchAllAttempts(readConfig({ VITE_USE_EMULATORS: 'true' }), 50);
    expect(fs.orderBy).toHaveBeenCalledWith('submittedAt', 'desc');
    expect(fs.limit).toHaveBeenCalledWith(50);
    expect(rows).toEqual([
      { id: 'a1', takerName: 'زكريا', score: 3 },
      { id: 'a2', takerName: 'Amina', score: 1 },
    ]);
  });

  it('defaults to 5000 attempts', async () => {
    await fetchAllAttempts(readConfig({ VITE_USE_EMULATORS: 'true' }));
    expect(fs.limit).toHaveBeenCalledWith(5000);
  });
});
