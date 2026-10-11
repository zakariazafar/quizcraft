// The size limits in the site code must match firestore.rules, or valid attempts get refused.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newId } from '../../src/lib/attempts.js';
import { EMAIL_MAX, NAME_MAX } from '../../src/lib/takerForm.js';
import { validateQuiz } from '../../src/lib/validate.js';

const rules = readFileSync('firestore.rules', 'utf8');
const limit = (field) => {
  const m = rules.match(new RegExp(`shortString\\(d\\.${field}, (\\d+), (\\d+)\\)`));
  return m && { min: Number(m[1]), max: Number(m[2]) };
};

describe('limits shared by the site and firestore.rules', () => {
  it('taker name and email', () => {
    expect(limit('takerName').max).toBe(NAME_MAX);
    expect(limit('takerEmail').max).toBe(EMAIL_MAX);
    expect(limit('takerEmailLower').max).toBe(EMAIL_MAX);
  });

  it('quiz title and id', () => {
    expect(limit('quizTitle').max).toBe(200);
    expect(limit('quizId')).toEqual({ min: 3, max: 60 });
    const quiz = JSON.parse(readFileSync('tests/fixtures/english-quiz.json', 'utf8'));
    expect(validateQuiz({ ...quiz, title: 'x'.repeat(201) }).join()).toMatch(/longer than 200/);
  });

  it('number of questions and answers', () => {
    expect(rules).toContain('d.total <= 100');
    const quiz = JSON.parse(readFileSync('tests/fixtures/english-quiz.json', 'utf8'));
    const many = { ...quiz, questions: Array.from({ length: 101 }, () => quiz.questions[0]) };
    expect(validateQuiz(many).join()).toMatch(/at most 100/);
  });

  it('attempt ids and client ids fit the rules', () => {
    expect(rules).toContain('attemptId.size() <= 64');
    expect(limit('clientId').max).toBe(64);
    expect(newId().length).toBeLessThanOrEqual(64);
  });

  it('user agent', () => {
    expect(rules).toContain('d.userAgent.size() <= 200');
  });
});
