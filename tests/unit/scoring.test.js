import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resultTier, scoreQuiz, unansweredQuestions } from '../../src/lib/scoring.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const allRight = Object.fromEntries(arabic.questions.map((q) => [q.id, q.correct]));

describe('scoreQuiz', () => {
  it('scores all right', () => {
    const r = scoreQuiz(arabic, allRight);
    expect(r).toMatchObject({ score: 5, total: 5, percent: 100, unanswered: 0, review: [] });
    expect(r.answers.every((a) => a.correct)).toBe(true);
  });

  it('scores all wrong', () => {
    const wrong = Object.fromEntries(
      arabic.questions.map((q) => [q.id, q.options.find((o) => o.id !== q.correct).id]),
    );
    const r = scoreQuiz(arabic, wrong);
    expect(r.score).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.review).toHaveLength(5);
  });

  it('builds a review item with your answer, the correct answer and the explanation (Arabic kept)', () => {
    const r = scoreQuiz(arabic, { ...allRight, q1: 'b' });
    expect(r.score).toBe(4);
    expect(r.percent).toBe(80);
    expect(r.review).toEqual([
      {
        questionId: 'q1',
        number: 1,
        question: 'ما حالة كلمة «مُسْلِمٌ»؟',
        yourAnswer: 'نَصْبٌ',
        correctAnswer: 'رَفْعٌ',
        explanation: 'الضمة والتنوين علامة الرفع.',
      },
    ]);
    expect(r.answers[0]).toEqual({ questionId: 'q1', selected: 'b', correct: false });
  });

  it('counts unanswered questions as wrong with yourAnswer null', () => {
    const { q2: _skip, ...partial } = allRight;
    const r = scoreQuiz(arabic, partial);
    expect(r.score).toBe(4);
    expect(r.unanswered).toBe(1);
    expect(r.review[0]).toMatchObject({ questionId: 'q2', number: 2, yourAnswer: null });
    expect(r.answers[1]).toEqual({ questionId: 'q2', selected: null, correct: false });
  });

  it('treats an unknown option id as unanswered', () => {
    const r = scoreQuiz(arabic, { ...allRight, q3: 'zz' });
    expect(r.unanswered).toBe(1);
    expect(r.answers[2].selected).toBeNull();
  });

  it('rounds the percentage', () => {
    const three = { ...arabic, questions: arabic.questions.slice(0, 3) };
    expect(scoreQuiz(three, { q1: 'a' }).percent).toBe(33);
  });
});

describe('resultTier', () => {
  it('picks the right tier at and around each boundary', () => {
    expect(resultTier(99, 1)).toBe('Strong result — review the 1 below to close the gap.');
    expect(resultTier(80, 2)).toBe('Strong result — review the 2 below to close the gap.');
    expect(resultTier(79, 3)).toBe('Good effort. 3 questions to review below.');
    expect(resultTier(50, 4)).toBe('Good effort. 4 questions to review below.');
    expect(resultTier(49, 5)).toBe("5 to review below — that's exactly what this is for.");
    expect(resultTier(0, 10)).toBe("10 to review below — that's exactly what this is for.");
  });
});

describe('unansweredQuestions', () => {
  it('lists questions without a valid answer', () => {
    expect(unansweredQuestions(arabic, { q1: 'a', q2: 'nope' })).toEqual(['q2', 'q3', 'q4', 'q5']);
    expect(unansweredQuestions(arabic, allRight)).toEqual([]);
  });
});
