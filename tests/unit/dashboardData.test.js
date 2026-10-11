import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createHiddenStore,
  filterAttempts,
  formatDateTime,
  groupByTaker,
  normaliseAttempt,
  prepareAttempts,
  questionStats,
  quizRows,
  rescore,
  sortAttempts,
  summarise,
  toDate,
} from '../../src/lib/dashboardData.js';
import { rawAttempts } from '../fixtures/attempts.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const quizzes = new Map([[arabic.id, arabic]]);
const all = prepareAttempts(rawAttempts, quizzes);
const byId = Object.fromEntries(all.map((a) => [a.id, a]));
const current = all.filter((a) => a.quizId === 'arabic-sample');

describe('toDate', () => {
  it('accepts Timestamp, {seconds}, strings, numbers and Dates', () => {
    expect(toDate({ toDate: () => new Date(5) }).getTime()).toBe(5);
    expect(toDate({ seconds: 2 }).getTime()).toBe(2000);
    expect(toDate('2026-10-12T00:00:00Z').toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(toDate(1000).getTime()).toBe(1000);
    const d = new Date(7);
    expect(toDate(d)).toBe(d);
  });
  it('returns null for missing or invalid values', () => {
    expect(toDate(undefined)).toBeNull();
    expect(toDate('nope')).toBeNull();
    expect(toDate(new Date('x'))).toBeNull();
    expect(toDate({})).toBeNull();
  });
});

describe('normaliseAttempt', () => {
  it('copies fields and converts dates (Arabic kept)', () => {
    const a = normaliseAttempt(rawAttempts[0]);
    expect(a.takerName).toBe('زكريا');
    expect(a.submittedAt.toISOString()).toBe('2026-10-12T09:00:00.000Z');
    expect(a.startedAt.toISOString()).toBe('2026-10-12T08:55:00.000Z');
    expect(a.answers).toHaveLength(5);
  });
  it('survives a malformed document', () => {
    const a = normaliseAttempt({
      takerEmail: 'X@Y.com',
      answers: [null, { questionId: 'q1', selected: 3, correct: 'yes' }],
      score: '5',
    });
    expect(a).toMatchObject({ id: '', takerEmailLower: 'x@y.com', score: 0, submittedAt: null });
    expect(a.answers).toEqual([{ questionId: 'q1', selected: null, correct: false }]);
    expect(normaliseAttempt({ answers: 'x' }).answers).toEqual([]);
  });
});

describe('rescore', () => {
  it('confirms an honest score', () => {
    expect(byId.a1.checked).toEqual({
      score: 5,
      total: 5,
      percent: 100,
      mismatch: false,
      versionChanged: false,
      unknownQuiz: false,
    });
    expect(byId.a2.checked).toMatchObject({ score: 2, percent: 40, mismatch: false });
  });
  it('catches a faked score and corrects it', () => {
    expect(byId.a3.checked).toMatchObject({ score: 1, total: 5, percent: 20, mismatch: true });
  });
  it('keeps the stored score for an older quiz version', () => {
    expect(byId.a4.checked).toMatchObject({ score: 1, total: 1, versionChanged: true });
  });
  it('keeps the stored score when the quiz is unknown', () => {
    expect(byId.a5.checked).toMatchObject({ score: 3, total: 4, unknownQuiz: true });
    expect(rescore(normaliseAttempt(rawAttempts[0]), undefined).unknownQuiz).toBe(true);
  });
});

describe('summarise', () => {
  it('uses re-scored percentages', () => {
    expect(summarise(current)).toEqual({
      attempts: 4,
      takers: 3,
      average: 65, // (100 + 40 + 20 + 100) / 4
      highest: 100,
      lowest: 20,
    });
  });
  it('handles no attempts', () => {
    expect(summarise([])).toEqual({
      attempts: 0,
      takers: 0,
      average: null,
      highest: null,
      lowest: null,
    });
  });
});

describe('questionStats', () => {
  const stats = questionStats(arabic, current);
  it('counts only current-version attempts', () => {
    expect(stats[0]).toMatchObject({ questionId: 'q1', number: 1, total: 3, correct: 1 });
  });
  it('finds the most chosen wrong answer (Arabic text)', () => {
    expect(stats[0].mostChosenWrong).toEqual({ optionId: 'b', text: 'نَصْبٌ', count: 2 });
    expect(stats[1]).toMatchObject({ correct: 3, correctPct: 100, mostChosenWrong: null });
  });
  it('counts unanswered separately', () => {
    expect(stats[3]).toMatchObject({ unanswered: 1, correct: 1 });
  });
  it('returns null percentages with no attempts', () => {
    expect(questionStats(arabic, [])[0]).toMatchObject({ total: 0, correctPct: null });
  });
});

describe('filterAttempts', () => {
  it('searches name and email, case-insensitive, Arabic too', () => {
    expect(filterAttempts(current, { search: 'AMINA' }).map((a) => a.id)).toEqual(['a2']);
    expect(filterAttempts(current, { search: 'زكر' }).map((a) => a.id)).toEqual(['a1']);
    expect(filterAttempts(current, { search: 'zakaria@' }).map((a) => a.id)).toEqual(['a1', 'a3']);
  });
  it('filters by inclusive date range', () => {
    const ids = filterAttempts(current, { from: '2026-10-11', to: '2026-10-12' }).map((a) => a.id);
    expect(ids).toEqual(['a1', 'a2']);
    const noDate = [{ ...current[0], submittedAt: null }];
    expect(filterAttempts(noDate, { from: '2026-01-01' })).toEqual([]);
    expect(filterAttempts(noDate, { to: '2026-01-01' })).toEqual([]);
  });
  it('hides attempts marked as spam unless asked', () => {
    const hidden = new Set(['a3']);
    expect(filterAttempts(current, { hidden }).map((a) => a.id)).not.toContain('a3');
    expect(filterAttempts(current, { hidden, showHidden: true }).map((a) => a.id)).toContain('a3');
  });
});

describe('sortAttempts', () => {
  it('sorts by date, name, email and score in both directions', () => {
    expect(sortAttempts(current, 'submittedAt', 'desc').map((a) => a.id)).toEqual([
      'a1',
      'a2',
      'a3',
      'a4',
    ]);
    expect(sortAttempts(current, 'submittedAt', 'asc')[0].id).toBe('a4');
    expect(sortAttempts(current, 'name', 'asc').map((a) => a.takerName)).toEqual([
      'Amina',
      'Cheater',
      'Old',
      'زكريا',
    ]);
    expect(sortAttempts(current, 'email', 'asc')[0].takerEmailLower).toBe('amina@example.com');
    expect(sortAttempts(current, 'score', 'desc').map((a) => a.checked.percent)).toEqual([
      100, 100, 40, 20,
    ]);
    const noDate = [{ ...current[0], submittedAt: null }, current[1]];
    expect(sortAttempts(noDate, 'submittedAt', 'asc')[0].submittedAt).toBeNull();
  });
});

describe('groupByTaker', () => {
  it('groups by email with latest name, best and latest score', () => {
    const z = groupByTaker(current).find((t) => t.email === 'Zakaria@Example.com');
    expect(z).toMatchObject({ name: 'زكريا', attempts: 2, best: 100, latestPercent: 100 });
    expect(groupByTaker(current)).toHaveLength(3);
  });
});

describe('quizRows', () => {
  const index = [
    {
      id: 'arabic-sample',
      title: 't',
      language: 'ar',
      questionCount: 5,
      active: true,
      version: 1,
      createdAt: '2026-10-11',
    },
    {
      id: 'empty-quiz',
      title: 'e',
      language: 'en',
      questionCount: 3,
      active: false,
      version: 1,
      createdAt: '2026-10-10',
    },
  ];
  const rows = quizRows(index, all);
  it('adds attempt counts and averages to published quizzes', () => {
    expect(rows[0]).toMatchObject({
      id: 'arabic-sample',
      published: true,
      attempts: 4,
      takers: 3,
      average: 65,
    });
    expect(rows[1]).toMatchObject({ id: 'empty-quiz', attempts: 0, average: null });
  });
  it('lists quizzes that only exist in attempts as removed', () => {
    expect(rows[2]).toMatchObject({
      id: 'retired-quiz',
      title: 'Retired quiz',
      published: false,
      attempts: 1,
      average: 75,
    });
    const untitled = quizRows([], prepareAttempts([{ ...rawAttempts[4], quizTitle: '' }], quizzes));
    expect(untitled[0].title).toBe('retired-quiz');
  });
});

describe('createHiddenStore', () => {
  const memory = () => {
    const d = {};
    return { getItem: (k) => d[k] ?? null, setItem: (k, v) => (d[k] = v) };
  };
  it('toggles ids and remembers them', () => {
    const store = createHiddenStore(memory());
    expect(store.toggle('a3')).toBe(true);
    expect([...store.all()]).toEqual(['a3']);
    expect(store.toggle('a3')).toBe(false);
    expect(store.all().size).toBe(0);
  });
  it('copes with missing, corrupt or failing storage', () => {
    expect(createHiddenStore(null).toggle('x')).toBe(false);
    const bad = {
      getItem: () => '{oops',
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(createHiddenStore(bad).all().size).toBe(0);
    expect(createHiddenStore(bad).toggle('x')).toBe(false);
    const notArray = { getItem: () => '{"a":1}', setItem: () => {} };
    expect(createHiddenStore(notArray).all().size).toBe(0);
  });
});

describe('formatDateTime', () => {
  it('formats in the given time zone, with a dash for missing dates', () => {
    const s = formatDateTime(new Date('2026-10-12T09:00:00Z'), 'en-AU', 'Australia/Sydney');
    expect(s).toMatch(/12 Oct 2026/);
    expect(s).toMatch(/8:00/);
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(new Date())).toBeTruthy();
  });
});
