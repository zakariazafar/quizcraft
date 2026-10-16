import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resultEmailBody, resultEmailParams } from '../../src/lib/email.js';
import { scoreQuiz } from '../../src/lib/scoring.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const allRight = Object.fromEntries(arabic.questions.map((q) => [q.id, q.correct]));
const taker = { name: 'زكريا', email: 'someone@example.com' };

describe('resultEmailBody', () => {
  it('greets the taker, states the score, and lists the answer and correct answer for a perfect result', () => {
    const result = scoreQuiz(arabic, allRight);
    const body = resultEmailBody(arabic, taker, result);
    expect(body).toContain('Hi زكريا,');
    expect(body).toContain(`Your result for "${arabic.title}": 5 out of 5 (100%).`);
    expect(body).toContain('5 right, 0 wrong, 0 not answered.');
    expect(body).toContain('Every answer is right. Well done!');
    expect(body).not.toContain('to review below.');
    expect(body).toContain('Your answers:');
    expect(body).toContain('1. ما حالة كلمة «مُسْلِمٌ»؟');
    expect(body).toContain('Your answer: رَفْعٌ (correct)');
    expect(body).toContain('Correct answer: رَفْعٌ');
    expect(body).not.toContain('Why:');
  });

  it('lists every question with the answer given and the correct answer, adding why for mistakes', () => {
    const { q2: _skip, ...partial } = allRight;
    const result = scoreQuiz(arabic, { ...partial, q1: 'b' });
    const body = resultEmailBody(arabic, taker, result);
    expect(body).toContain('2 to review below.');
    expect(body).toContain('Your answers:');
    expect(body).toContain('1. ما حالة كلمة «مُسْلِمٌ»؟');
    expect(body).toContain('Your answer: نَصْبٌ (incorrect)');
    expect(body).toContain('Correct answer: رَفْعٌ');
    expect(body).toContain('Why: الضمة والتنوين علامة الرفع.');
    expect(body).toContain('2. ما حالة كلمة «مُسْلِمًا»؟');
    expect(body).toContain('Your answer: Not answered (incorrect)');
    expect(body).toContain('Correct answer: نَصْبٌ');
    // A correct answer still gets its own "Correct answer" line, but no "Why".
    expect(body).toContain('3. ما حالة كلمة «مُسْلِمٍ»؟');
    expect(body).toContain('Your answer: جَرٌّ (correct)');
    const q3Index = body.indexOf('3. ما حالة كلمة «مُسْلِمٍ»؟');
    const q4Index = body.indexOf('4. ما عدد «مُسْلِمَانِ»؟');
    expect(body.slice(q3Index, q4Index)).not.toContain('Why:');
  });
});

describe('resultEmailParams', () => {
  it('builds the EmailJS template variables from quiz, taker and result', () => {
    const result = scoreQuiz(arabic, allRight);
    const params = resultEmailParams(arabic, taker, result);
    expect(params).toEqual({
      to_email: 'someone@example.com',
      to_name: 'زكريا',
      quiz_title: arabic.title,
      score: 5,
      total: 5,
      percent: 100,
      message: resultEmailBody(arabic, taker, result),
    });
  });
});
