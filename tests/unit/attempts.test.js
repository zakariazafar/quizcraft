import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  CLIENT_ID_KEY,
  QUEUE_KEY,
  SAVE_MESSAGES,
  buildAttemptRecord,
  createAttemptSaver,
  getClientId,
  newId,
} from '../../src/lib/attempts.js';
import { scoreQuiz } from '../../src/lib/scoring.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const taker = { name: 'زكريا', email: 'Zakaria@Example.com' };
const scored = scoreQuiz(arabic, { q1: 'a', q2: 'a' });
const record = buildAttemptRecord({
  quiz: arabic,
  taker,
  scored,
  startedAt: new Date('2026-10-12T09:00:00Z'),
  clientId: 'client-1',
  userAgent: 'x'.repeat(300),
});

/** In-memory Storage stand-in. */
function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}
const noSleep = () => Promise.resolve();

describe('buildAttemptRecord', () => {
  it('has exactly the fields allowed by the Firestore rules', () => {
    expect(Object.keys(record).sort()).toEqual(
      [
        'answers',
        'clientId',
        'percent',
        'quizId',
        'quizTitle',
        'quizVersion',
        'score',
        'startedAt',
        'takerEmail',
        'takerEmailLower',
        'takerName',
        'total',
        'userAgent',
      ].sort(),
    );
  });

  it('copies quiz, taker and score details (Arabic kept)', () => {
    expect(record).toMatchObject({
      quizId: 'arabic-sample',
      quizVersion: 1,
      quizTitle: 'اختبار تجريبي في النحو',
      takerName: 'زكريا',
      takerEmail: 'Zakaria@Example.com',
      takerEmailLower: 'zakaria@example.com',
      score: 1,
      total: 5,
      percent: 20,
      startedAt: '2026-10-12T09:00:00.000Z',
      clientId: 'client-1',
    });
    expect(record.answers).toHaveLength(5);
    expect(record.answers[0]).toEqual({ questionId: 'q1', selected: 'a', correct: true });
    expect(record.answers[4]).toEqual({ questionId: 'q5', selected: null, correct: false });
    expect(record.userAgent).toHaveLength(200);
  });
});

describe('newId / getClientId', () => {
  it('makes unique ids, with a fallback when randomUUID is missing', () => {
    expect(newId()).not.toBe(newId());
    const spy = vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue(undefined);
    expect(newId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    spy.mockRestore();
  });

  it('keeps one client id per browser', () => {
    const storage = memoryStorage();
    const id = getClientId(storage);
    expect(storage.data[CLIENT_ID_KEY]).toBe(id);
    expect(getClientId(storage)).toBe(id);
  });

  it('still returns an id without storage or when storage throws', () => {
    expect(getClientId(null)).toBeTruthy();
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
    };
    expect(getClientId(broken)).toBeTruthy();
  });
});

describe('createAttemptSaver', () => {
  it('saves and leaves nothing in the queue', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const storage = memoryStorage();
    const saver = createAttemptSaver({ write, storage, sleep: noSleep });
    expect(await saver.save(record)).toBe('saved');
    expect(write).toHaveBeenCalledWith(expect.any(String), record);
    expect(saver.pendingCount()).toBe(0);
  });

  it('retries with back-off and succeeds', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const sleep = vi.fn(noSleep);
    const saver = createAttemptSaver({ write, storage: memoryStorage(), sleep, delayMs: 100 });
    expect(await saver.save(record)).toBe('saved');
    expect(write).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it('keeps a failed attempt and sends it on the next flush with the same id', async () => {
    const storage = memoryStorage();
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    const first = createAttemptSaver({ write: failing, storage, sleep: noSleep, maxTries: 2 });
    expect(await first.save(record)).toBe('failed');
    expect(failing).toHaveBeenCalledTimes(2);
    expect(first.pendingCount()).toBe(1);
    const failedId = failing.mock.calls[0][0];

    const working = vi.fn().mockResolvedValue(undefined);
    const later = createAttemptSaver({ write: working, storage, sleep: noSleep });
    expect(await later.flush()).toEqual({ saved: 1, failed: 0, rejected: 0 });
    expect(working).toHaveBeenCalledWith(failedId, record);
    expect(later.pendingCount()).toBe(0);
  });

  it('counts attempts that still fail on flush and keeps them', async () => {
    const storage = memoryStorage({
      [QUEUE_KEY]: JSON.stringify([{ id: 'a1', record }, { bogus: true }]),
    });
    const saver = createAttemptSaver({
      write: vi.fn().mockRejectedValue(new Error('offline')),
      storage,
      sleep: noSleep,
      maxTries: 1,
    });
    expect(await saver.flush()).toEqual({ saved: 0, failed: 1, rejected: 0 });
    expect(saver.pendingCount()).toBe(1);
  });

  it('does not retry an attempt the rules refuse, and drops it', async () => {
    const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
    const write = vi.fn().mockRejectedValue(denied);
    const saver = createAttemptSaver({ write, storage: memoryStorage(), sleep: noSleep });
    expect(await saver.save(record)).toBe('rejected');
    expect(write).toHaveBeenCalledTimes(1);
    expect(saver.pendingCount()).toBe(0);
  });

  it('treats invalid-argument as permanent too', async () => {
    const bad = Object.assign(new Error('bad'), { code: 'invalid-argument' });
    const saver = createAttemptSaver({
      write: vi.fn().mockRejectedValue(bad),
      storage: memoryStorage(),
      sleep: noSleep,
    });
    expect(await saver.save(record)).toBe('rejected');
  });

  it('works without storage and survives broken or corrupt storage', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    expect(await createAttemptSaver({ write, storage: null, sleep: noSleep }).save(record)).toBe(
      'saved',
    );
    const full = {
      getItem: () => 'not json',
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    const saver = createAttemptSaver({ write, storage: full, sleep: noSleep });
    expect(await saver.save(record)).toBe('saved');
    expect(saver.pendingCount()).toBe(0);
    const notArray = memoryStorage({ [QUEUE_KEY]: '{"a":1}' });
    expect(createAttemptSaver({ write, storage: notArray }).pendingCount()).toBe(0);
  });

  it('keeps at most 20 pending attempts', async () => {
    const storage = memoryStorage();
    const saver = createAttemptSaver({
      write: vi.fn().mockRejectedValue(new Error('offline')),
      storage,
      sleep: noSleep,
      maxTries: 1,
    });
    for (let i = 0; i < 25; i++) await saver.save(record);
    expect(saver.pendingCount()).toBe(20);
  });

  it('uses a real timer by default', async () => {
    vi.useFakeTimers();
    const write = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
    const saver = createAttemptSaver({ write, storage: memoryStorage(), delayMs: 10 });
    const done = saver.save(record);
    await vi.advanceTimersByTimeAsync(10);
    expect(await done).toBe('saved');
    vi.useRealTimers();
  });
});

describe('SAVE_MESSAGES', () => {
  it('has a message for every outcome', () => {
    for (const k of ['saving', 'saved', 'failed', 'rejected', 'disabled']) {
      expect(SAVE_MESSAGES[k]).toBeTruthy();
    }
  });
});
