// @ts-check
/** Pure data work for the dashboard: normalise, re-score, summarise, filter, sort, group. */

/**
 * @typedef {import('./validate.js').Quiz} Quiz
 * @typedef {{ questionId: string, selected: string | null, correct: boolean }} StoredAnswer
 * @typedef {{
 *   id: string, quizId: string, quizVersion: number, quizTitle: string,
 *   takerName: string, takerEmail: string, takerEmailLower: string,
 *   answers: StoredAnswer[], score: number, total: number, percent: number,
 *   startedAt: Date | null, submittedAt: Date | null,
 * }} Attempt
 * @typedef {{ score: number, total: number, percent: number, mismatch: boolean,
 *   versionChanged: boolean, unknownQuiz: boolean }} Checked
 * @typedef {Attempt & { checked: Checked }} CheckedAttempt
 * @typedef {{ id: string, title: string, language: string, questionCount: number,
 *   active: boolean, version: number, createdAt: string }} IndexEntry
 */

/**
 * Firestore Timestamp, {seconds}, ISO string or Date → Date (or null).
 * @param {unknown} v
 * @returns {Date | null}
 */
export function toDate(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (v && typeof v === 'object') {
    const o = /** @type {{ toDate?: () => Date, seconds?: number }} */ (v);
    if (typeof o.toDate === 'function') return o.toDate();
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000);
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const str = (/** @type {unknown} */ v) => (typeof v === 'string' ? v : '');
const int = (/** @type {unknown} */ v) => (Number.isInteger(v) ? /** @type {number} */ (v) : 0);

/**
 * Defensive copy of a raw Firestore document.
 * @param {Record<string, unknown>} raw
 * @returns {Attempt}
 */
export function normaliseAttempt(raw) {
  const answers = Array.isArray(raw.answers)
    ? raw.answers
        .filter((a) => a && typeof a === 'object')
        .map((a) => ({
          questionId: str(a.questionId),
          selected: typeof a.selected === 'string' ? a.selected : null,
          correct: a.correct === true,
        }))
    : [];
  const email = str(raw.takerEmail);
  return {
    id: str(raw.id),
    quizId: str(raw.quizId),
    quizVersion: int(raw.quizVersion),
    quizTitle: str(raw.quizTitle),
    takerName: str(raw.takerName),
    takerEmail: email,
    takerEmailLower: str(raw.takerEmailLower) || email.toLowerCase(),
    answers,
    score: int(raw.score),
    total: int(raw.total),
    percent: int(raw.percent),
    startedAt: toDate(raw.startedAt),
    submittedAt: toDate(raw.submittedAt),
  };
}

/**
 * Re-score an attempt from its answers against the quiz file, so a score faked in the
 * browser is caught. If the quiz changed since (other version or missing questions), the
 * stored score is kept and flagged.
 * @param {Attempt} attempt
 * @param {Quiz | undefined} quiz
 * @returns {Checked}
 */
export function rescore(attempt, quiz) {
  const stored = { score: attempt.score, total: attempt.total, percent: attempt.percent };
  if (!quiz) return { ...stored, mismatch: false, versionChanged: false, unknownQuiz: true };
  const byId = new Map(attempt.answers.map((a) => [a.questionId, a.selected]));
  const versionChanged =
    attempt.quizVersion !== quiz.version || quiz.questions.some((q) => !byId.has(q.id));
  if (versionChanged) return { ...stored, mismatch: false, versionChanged, unknownQuiz: false };
  const score = quiz.questions.filter((q) => byId.get(q.id) === q.correct).length;
  const total = quiz.questions.length;
  const percent = Math.round((score / total) * 100);
  return {
    score,
    total,
    percent,
    mismatch: score !== attempt.score || total !== attempt.total,
    versionChanged: false,
    unknownQuiz: false,
  };
}

/**
 * @param {Record<string, unknown>[]} raws
 * @param {Map<string, Quiz>} quizzes
 * @returns {CheckedAttempt[]}
 */
export function prepareAttempts(raws, quizzes) {
  return raws.map((raw) => {
    const a = normaliseAttempt(raw);
    return { ...a, checked: rescore(a, quizzes.get(a.quizId)) };
  });
}

/**
 * @param {CheckedAttempt[]} attempts
 * @returns {{ attempts: number, takers: number, average: number | null, highest: number | null, lowest: number | null }}
 */
export function summarise(attempts) {
  if (attempts.length === 0) {
    return { attempts: 0, takers: 0, average: null, highest: null, lowest: null };
  }
  const pcts = attempts.map((a) => a.checked.percent);
  return {
    attempts: attempts.length,
    takers: new Set(attempts.map((a) => a.takerEmailLower)).size,
    average: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
    highest: Math.max(...pcts),
    lowest: Math.min(...pcts),
  };
}

/**
 * How each question went, counting only attempts taken on the current quiz version.
 * @param {Quiz} quiz
 * @param {CheckedAttempt[]} attempts
 */
export function questionStats(quiz, attempts) {
  const current = attempts.filter((a) => !a.checked.versionChanged && !a.checked.unknownQuiz);
  return quiz.questions.map((q, i) => {
    /** @type {Map<string, number>} */
    const wrongCounts = new Map();
    let correct = 0;
    let unanswered = 0;
    for (const a of current) {
      const sel = a.answers.find((x) => x.questionId === q.id)?.selected ?? null;
      if (sel === q.correct) correct += 1;
      else if (sel === null || !q.options.some((o) => o.id === sel)) unanswered += 1;
      else wrongCounts.set(sel, (wrongCounts.get(sel) ?? 0) + 1);
    }
    let top = null;
    for (const [optionId, count] of wrongCounts) {
      if (!top || count > top.count) {
        const text = /** @type {{ text: string }} */ (q.options.find((o) => o.id === optionId))
          .text;
        top = { optionId, text, count };
      }
    }
    const total = current.length;
    return {
      questionId: q.id,
      number: i + 1,
      text: q.text,
      total,
      correct,
      unanswered,
      correctPct: total ? Math.round((correct / total) * 100) : null,
      mostChosenWrong: top,
    };
  });
}

/**
 * @param {CheckedAttempt[]} attempts
 * @param {{ search?: string, from?: string, to?: string, hidden?: Set<string>, showHidden?: boolean }} f
 *   from/to are YYYY-MM-DD (inclusive, local time)
 */
export function filterAttempts(attempts, f) {
  const needle = (f.search ?? '').normalize('NFC').trim().toLowerCase();
  const from = f.from ? new Date(`${f.from}T00:00:00`) : null;
  const to = f.to ? new Date(`${f.to}T23:59:59.999`) : null;
  return attempts.filter((a) => {
    if (!f.showHidden && f.hidden?.has(a.id)) return false;
    if (needle) {
      const hay = `${a.takerName} ${a.takerEmail}`.normalize('NFC').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (from && (!a.submittedAt || a.submittedAt < from)) return false;
    if (to && (!a.submittedAt || a.submittedAt > to)) return false;
    return true;
  });
}

/**
 * @param {CheckedAttempt[]} attempts
 * @param {'submittedAt' | 'name' | 'email' | 'score'} key
 * @param {'asc' | 'desc'} dir
 */
export function sortAttempts(attempts, key, dir) {
  const sign = dir === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  /** @type {(a: CheckedAttempt, b: CheckedAttempt) => number} */
  const cmp = {
    submittedAt: (a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0),
    name: (a, b) => collator.compare(a.takerName, b.takerName),
    email: (a, b) => collator.compare(a.takerEmailLower, b.takerEmailLower),
    score: (a, b) => a.checked.percent - b.checked.percent,
  }[key];
  return [...attempts].sort((a, b) => sign * cmp(a, b));
}

/**
 * One row per taker (by email): latest name, number of attempts, best and latest score.
 * @param {CheckedAttempt[]} attempts
 */
export function groupByTaker(attempts) {
  /** @type {Map<string, CheckedAttempt[]>} */
  const groups = new Map();
  for (const a of attempts) {
    const list = groups.get(a.takerEmailLower) ?? [];
    list.push(a);
    groups.set(a.takerEmailLower, list);
  }
  return [...groups.values()].map((list) => {
    const sorted = sortAttempts(list, 'submittedAt', 'desc');
    const latest = sorted[0];
    return {
      email: latest.takerEmail,
      name: latest.takerName,
      attempts: list.length,
      best: Math.max(...list.map((a) => a.checked.percent)),
      latestPercent: latest.checked.percent,
      latestAt: latest.submittedAt,
    };
  });
}

/**
 * Rows for the quiz list: every published quiz plus any quiz that only appears in attempts.
 * @param {IndexEntry[]} index
 * @param {CheckedAttempt[]} attempts
 */
export function quizRows(index, attempts) {
  /** @type {Map<string, CheckedAttempt[]>} */
  const byQuiz = new Map();
  for (const a of attempts) {
    const list = byQuiz.get(a.quizId) ?? [];
    list.push(a);
    byQuiz.set(a.quizId, list);
  }
  const rows = index.map((e) => {
    const s = summarise(byQuiz.get(e.id) ?? []);
    return { ...e, published: true, attempts: s.attempts, takers: s.takers, average: s.average };
  });
  for (const [quizId, list] of byQuiz) {
    if (index.some((e) => e.id === quizId)) continue;
    const s = summarise(list);
    rows.push({
      id: quizId,
      title: list[0].quizTitle || quizId,
      language: '',
      questionCount: list[0].total,
      active: false,
      version: list[0].quizVersion,
      createdAt: '',
      published: false,
      attempts: s.attempts,
      takers: s.takers,
      average: s.average,
    });
  }
  return rows;
}

/**
 * Hidden-as-spam attempt ids, kept per browser (the site cannot delete attempts).
 * @param {Pick<Storage, 'getItem' | 'setItem'> | null} storage
 */
export function createHiddenStore(storage, key = 'quizcraft.hiddenAttempts') {
  const read = () => {
    try {
      const v = JSON.parse(storage?.getItem(key) ?? '[]');
      return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  };
  return {
    all: read,
    /** @param {string} id */
    toggle(id) {
      const set = read();
      if (set.has(id)) set.delete(id);
      else set.add(id);
      try {
        storage?.setItem(key, JSON.stringify([...set]));
      } catch {
        // ignore: hiding is a convenience
      }
      // Report what was actually stored, so the screen never claims a change that didn't stick.
      return read().has(id);
    },
  };
}

/**
 * @param {Date | null} d
 * @param {string} [locale]
 * @param {string} [timeZone]
 */
export function formatDateTime(d, locale = 'en-AU', timeZone) {
  if (!d) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(d);
}
