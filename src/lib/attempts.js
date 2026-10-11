// @ts-check
/**
 * Building attempt records and saving them reliably: each attempt gets a random id (used as
 * the Firestore document id), is kept in a local queue until saved, and is retried with
 * back-off. Saving never blocks the result screen.
 */

export const QUEUE_KEY = 'quizcraft.pendingAttempts';
export const CLIENT_ID_KEY = 'quizcraft.clientId';
const MAX_QUEUE = 20;

/**
 * @typedef {import('./validate.js').Quiz} Quiz
 * @typedef {ReturnType<typeof import('./scoring.js').scoreQuiz>} Scored
 * @typedef {Pick<Storage, 'getItem' | 'setItem'>} KeyValueStore
 * @typedef {{ id: string, record: AttemptRecord }} PendingAttempt
 * @typedef {'saved' | 'failed' | 'rejected'} SaveOutcome
 */

/**
 * @typedef {object} AttemptRecord
 * @property {string} quizId
 * @property {number} quizVersion
 * @property {string} quizTitle
 * @property {string} takerName
 * @property {string} takerEmail
 * @property {string} takerEmailLower
 * @property {{ questionId: string, selected: string | null, correct: boolean }[]} answers
 * @property {number} score
 * @property {number} total
 * @property {number} percent
 * @property {string} startedAt ISO time the taker pressed Start
 * @property {string} clientId random id per browser
 * @property {string} userAgent
 */

/** Random id for documents and browsers. */
export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * The JSON record saved for one submission (submittedAt is added by the server).
 * @param {{ quiz: Quiz, taker: { name: string, email: string }, scored: Scored,
 *   startedAt: Date, clientId: string, userAgent: string }} input
 * @returns {AttemptRecord}
 */
export function buildAttemptRecord({ quiz, taker, scored, startedAt, clientId, userAgent }) {
  return {
    quizId: quiz.id,
    quizVersion: quiz.version,
    quizTitle: quiz.title,
    takerName: taker.name,
    takerEmail: taker.email,
    takerEmailLower: taker.email.toLowerCase(),
    answers: scored.answers.map(({ questionId, selected, correct }) => ({
      questionId,
      selected,
      correct,
    })),
    score: scored.score,
    total: scored.total,
    percent: scored.percent,
    startedAt: startedAt.toISOString(),
    clientId,
    userAgent: userAgent.slice(0, 200),
  };
}

/**
 * Stable random id for this browser (kept in storage when available).
 * @param {KeyValueStore | null} storage
 */
export function getClientId(storage) {
  try {
    const existing = storage?.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id = newId();
    storage?.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return newId();
  }
}

/**
 * @param {unknown} err
 * @returns {boolean} true when retrying cannot help (rules refused the document)
 */
function isPermanent(err) {
  const code = /** @type {{ code?: unknown }} */ (err)?.code;
  return code === 'permission-denied' || code === 'invalid-argument';
}

/**
 * @param {{
 *   write: (id: string, record: AttemptRecord) => Promise<void>,
 *   storage: KeyValueStore | null,
 *   maxTries?: number,
 *   delayMs?: number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} deps
 */
export function createAttemptSaver({
  write,
  storage,
  maxTries = 3,
  delayMs = 1500,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  /** @returns {PendingAttempt[]} */
  const readQueue = () => {
    try {
      const parsed = JSON.parse(storage?.getItem(QUEUE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((p) => p && p.id && p.record) : [];
    } catch {
      return [];
    }
  };
  /** @param {PendingAttempt[]} items */
  const writeQueue = (items) => {
    try {
      storage?.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
    } catch {
      // Storage full or blocked: the attempt is still tried now, just not kept for later.
    }
  };
  /** @param {string} id */
  const remove = (id) => writeQueue(readQueue().filter((p) => p.id !== id));

  /**
   * @param {PendingAttempt} item
   * @returns {Promise<SaveOutcome>}
   */
  async function attempt(item) {
    for (let i = 1; i <= maxTries; i++) {
      try {
        await write(item.id, item.record);
        return 'saved';
      } catch (err) {
        if (isPermanent(err)) return 'rejected';
        if (i < maxTries) await sleep(delayMs * i);
      }
    }
    return 'failed';
  }

  return {
    /**
     * Save a new attempt. It stays in the local queue until saved.
     * @param {AttemptRecord} record
     * @returns {Promise<SaveOutcome>}
     */
    async save(record) {
      const item = { id: newId(), record };
      writeQueue([...readQueue(), item]);
      const outcome = await attempt(item);
      if (outcome !== 'failed') remove(item.id);
      return outcome;
    },

    /**
     * Retry every attempt left in the queue (call on page load).
     * @returns {Promise<{ saved: number, failed: number, rejected: number }>}
     */
    async flush() {
      const counts = { saved: 0, failed: 0, rejected: 0 };
      for (const item of readQueue()) {
        const outcome = await attempt(item);
        counts[outcome] += 1;
        if (outcome !== 'failed') remove(item.id);
      }
      return counts;
    },

    pendingCount: () => readQueue().length,
  };
}

/** Messages shown under the score. */
export const SAVE_MESSAGES = {
  saving: 'Saving your result…',
  saved: 'Your result has been saved.',
  failed:
    'Your result is not saved yet. It will be sent automatically the next time you open this quiz.',
  rejected: 'Your result could not be saved. Please tell the quiz owner.',
  disabled: 'Results are not being saved on this site.',
};
