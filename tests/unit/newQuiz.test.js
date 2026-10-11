import { describe, expect, it } from 'vitest';
import { scaffoldQuiz, todayIn } from '../../scripts/lib/newQuiz.js';
import { validateQuiz } from '../../src/lib/validate.js';

describe('scaffoldQuiz', () => {
  it('creates a structurally valid starter quiz with TODO placeholders', () => {
    const quiz = scaffoldQuiz('my-new-quiz', '2026-10-11');
    expect(quiz.id).toBe('my-new-quiz');
    expect(quiz.createdAt).toBe('2026-10-11');
    expect(JSON.stringify(quiz)).toContain('TODO');
    expect(validateQuiz(quiz, { fileId: 'my-new-quiz' })).toEqual([]);
  });

  it('rejects an invalid id', () => {
    expect(() => scaffoldQuiz('Bad Id', '2026-10-11')).toThrow(/Invalid quiz id/);
  });
});

describe('todayIn', () => {
  it('formats the date in the given time zone', () => {
    const utcLateEvening = new Date('2026-10-11T20:00:00Z');
    expect(todayIn(utcLateEvening, 'Australia/Sydney')).toBe('2026-10-12');
    expect(todayIn(utcLateEvening, 'UTC')).toBe('2026-10-11');
  });

  it('defaults to now in Sydney', () => {
    expect(todayIn()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
