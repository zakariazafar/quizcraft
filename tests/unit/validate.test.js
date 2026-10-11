import { readFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { isValidQuiz, validateQuiz } from '../../src/lib/validate.js';

const load = (name) => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8'));
const clone = (o) => structuredClone(o);
const arabic = load('arabic-quiz.json');
const english = load('english-quiz.json');
const schema = JSON.parse(readFileSync('schema/quiz.schema.json', 'utf8'));
const ajv = new Ajv({ allErrors: true });
const schemaValidate = ajv.compile(schema);

/** Make a quiz with n questions whose correct answers cycle a, b, c, d. */
function quizWith(n, correctFor = (i) => 'abcd'[i % 4]) {
  const q = clone(english);
  q.questions = Array.from({ length: n }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Question ${i + 1}`,
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: `Option ${id}` })),
    correct: correctFor(i),
    explanation: 'Because.',
  }));
  return q;
}

describe('validateQuiz — valid quizzes', () => {
  it('accepts the Arabic fixture with diacritics', () => {
    expect(validateQuiz(arabic, { fileId: 'arabic-sample' })).toEqual([]);
    expect(isValidQuiz(arabic)).toBe(true);
  });

  it('keeps Arabic diacritics intact (validation does not modify the quiz)', () => {
    const before = JSON.stringify(arabic);
    validateQuiz(arabic);
    expect(JSON.stringify(arabic)).toBe(before);
    expect(arabic.questions[0].text).toContain('مُسْلِمٌ');
  });

  it('accepts the English fixture', () => {
    expect(validateQuiz(english)).toEqual([]);
  });

  it('accepts optional description and source being absent', () => {
    const q = clone(english);
    delete q.description;
    delete q.source;
    expect(validateQuiz(q)).toEqual([]);
  });

  it('agrees with the JSON Schema on the fixtures', () => {
    expect(schemaValidate(arabic)).toBe(true);
    expect(schemaValidate(english)).toBe(true);
  });
});

describe('validateQuiz — invalid quizzes', () => {
  const cases = [
    ['not an object', () => 'quiz', /JSON object/],
    ['bad id', (q) => (q.id = 'Bad_Id'), /id must be/],
    ['id ≠ file name', (q) => (q.id = 'other-id'), /match the file name/],
    ['version 0', (q) => (q.version = 0), /version/],
    ['active not boolean', (q) => (q.active = 'yes'), /active/],
    ['empty title', (q) => (q.title = ''), /title must be/],
    ['title with spaces around', (q) => (q.title = ' Title '), /leading or trailing/],
    ['title too long', (q) => (q.title = 'x'.repeat(201)), /longer than 200/],
    ['bad language', (q) => (q.language = 'fr'), /language/],
    ['bad date', (q) => (q.createdAt = '12/10/2026'), /createdAt/],
    ['impossible date', (q) => (q.createdAt = '2026-13-40'), /createdAt/],
    ['unknown top field', (q) => (q.extra = 1), /unknown field "extra"/],
    ['no questions', (q) => (q.questions = []), /non-empty array/],
    ['question not object', (q) => (q.questions[0] = 'x'), /must be an object/],
    ['bad question id', (q) => (q.questions[0].id = 'Q 1'), /\.id must be/],
    ['duplicate question id', (q) => (q.questions[1].id = 'q1'), /used more than once/],
    ['3 options', (q) => q.questions[0].options.pop(), /exactly 4 options/],
    ['5 options', (q) => q.questions[0].options.push({ id: 'e', text: 'E' }), /exactly 4/],
    ['option not object', (q) => (q.questions[0].options[0] = 'x'), /options\[0\] must be/],
    ['bad option id', (q) => (q.questions[0].options[0].id = 'A!'), /options\[0\]\.id/],
    ['duplicate option id', (q) => (q.questions[0].options[1].id = 'a'), /more than once in/],
    ['duplicate option text', (q) => (q.questions[0].options[1].text = '4'), /duplicates/],
    ['unknown option field', (q) => (q.questions[0].options[0].x = 1), /unknown field "x"/],
    ['correct not an option', (q) => (q.questions[0].correct = 'z'), /correct must be/],
    ['empty explanation', (q) => (q.questions[0].explanation = ''), /explanation/],
    ['unknown question field', (q) => (q.questions[0].hint = 'h'), /unknown field "hint"/],
  ];

  it.each(cases)('rejects %s', (_name, mutate, pattern) => {
    let q = clone(english);
    const replaced = mutate(q);
    if (typeof replaced === 'string' && _name === 'not an object') q = replaced;
    const errors = validateQuiz(q, { fileId: 'english-sample' });
    expect(errors.join('\n')).toMatch(pattern);
  });

  it('rejects non-NFC Arabic text (decomposed characters)', () => {
    const q = clone(arabic);
    // "آ" written as alef + combining madda (NFD) instead of the single NFC character.
    q.title = 'آخر';
    expect(validateQuiz(q).join()).toMatch(/NFC/);
  });

  it('rejects more than 100 questions', () => {
    expect(validateQuiz(quizWith(101)).join()).toMatch(/at most 100/);
  });

  it('rejects clustered correct answers', () => {
    const q = quizWith(10, (i) => (i < 6 ? 'a' : 'b'));
    expect(validateQuiz(q).join()).toMatch(/clustered: 6 of 10 are in position 1/);
  });

  it('allows exactly half in one position', () => {
    const q = quizWith(10, (i) => (i < 5 ? 'a' : 'bcdbc'[i - 5]));
    expect(validateQuiz(q)).toEqual([]);
  });

  it('does not check the spread for short quizzes', () => {
    expect(validateQuiz(quizWith(5, () => 'a'))).toEqual([]);
  });

  it('returns several errors at once', () => {
    const q = clone(english);
    q.title = '';
    q.language = 'xx';
    expect(validateQuiz(q).length).toBeGreaterThanOrEqual(2);
  });

  it('JSON Schema also rejects structural problems the validator rejects', () => {
    const q = clone(english);
    q.questions[0].options.pop();
    expect(schemaValidate(q)).toBe(false);
  });
});
