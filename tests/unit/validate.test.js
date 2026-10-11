// @ts-check
import { describe, expect, it } from 'vitest';
import {
  LANGUAGES,
  MAX_QUESTIONS,
  SPREAD_MIN_QUESTIONS,
  assertValidQuiz,
  checkCorrectAnswerSpread,
  correctAnswerPositions,
  formatQuizErrors,
  quizIdFromFileName,
  validateQuiz,
} from '../../src/lib/validate.js';
import { loadFixture } from '../helpers/fixtures.js';

/** @param {number} index @returns {{ id: string, text: string }[]} */
const options = () => [
  { id: 'a', text: 'First option' },
  { id: 'b', text: 'Second option' },
  { id: 'c', text: 'Third option' },
  { id: 'd', text: 'Fourth option' },
];

/**
 * @param {string} id
 * @param {string} [correct]
 * @param {Record<string, unknown>} [overrides]
 */
const question = (id, correct = 'b', overrides = {}) => ({
  id,
  text: `Question ${id}?`,
  options: options(),
  correct,
  explanation: `Option ${correct} matches the source text.`,
  ...overrides,
});

/** @param {Record<string, unknown>} [overrides] */
const quiz = (overrides = {}) => ({
  id: 'sample-quiz',
  version: 1,
  active: true,
  title: 'Sample quiz',
  description: 'A quiz used by the validator tests.',
  language: 'en',
  createdAt: '2026-10-11',
  questions: [question('q1'), question('q2', 'c')],
  ...overrides,
});

/** @param {unknown} value @param {{ fileName?: string }} [options] */
const errorsOf = (value, options) =>
  validateQuiz(value, options).errors.map((e) => `${e.path}: ${e.message}`);

describe('validateQuiz — valid quizzes', () => {
  it('accepts the generated sample quiz', () => {
    expect(validateQuiz(quiz(), { fileName: 'sample-quiz.json' })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('accepts the Arabic fixture and keeps its diacritics untouched', () => {
    const arabic = loadFixture('arabic-quiz.json');
    expect(validateQuiz(arabic, { fileName: 'arabic-quiz.json' }).valid).toBe(true);
    expect(arabic.questions[0].text).toContain('النُّونِ السَّاكِنَةِ');
    expect(arabic.title).toBe(arabic.title.normalize('NFC'));
  });

  it('accepts the mixed Arabic/English fixture', () => {
    expect(validateQuiz(loadFixture('mixed-quiz.json'), { fileName: 'mixed-quiz.json' })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('treats source as optional', () => {
    expect(validateQuiz(quiz({ source: undefined })).valid).toBe(true);
    expect(validateQuiz(quiz({ source: 'Chapter 1 of the owner notes' })).valid).toBe(true);
    expect(errorsOf(quiz({ source: '' }))).toContain('source: must not be empty');
  });

  it('skips the file-name check when no file name is given', () => {
    expect(validateQuiz(quiz({ id: 'anything-goes' })).valid).toBe(true);
  });

  it('accepts every language in LANGUAGES', () => {
    for (const language of LANGUAGES) {
      expect(validateQuiz(quiz({ language })).valid).toBe(true);
    }
  });
});

describe('validateQuiz — invalid fixtures', () => {
  /** @type {[string, string][]} */
  const cases = [
    ['bad-missing-fields.json', 'questions: must be an array'],
    ['bad-three-options.json', 'questions[0].options: must have exactly 4 options (has 3)'],
    ['bad-five-options.json', 'questions[0].options: must have exactly 4 options (has 5)'],
    ['bad-correct-not-option.json', 'questions[0].correct: "z" is not one of the option ids'],
    ['bad-duplicate-question-ids.json', 'questions[1].id: duplicates another question id ("q1")'],
    [
      'bad-duplicate-option-ids.json',
      'questions[0].options[2].id: duplicates another option id ("b")',
    ],
    ['bad-id-mismatch.json', 'id: must equal the file name without .json ("bad-id-mismatch")'],
    [
      'bad-not-nfc.json',
      'title: must be NFC-normalised (normalise the encoding, keep the diacritics)',
    ],
    ['bad-whitespace.json', 'questions[0].text: must not start or end with whitespace'],
    ['bad-language.json', 'language: must be one of ar, en, mixed'],
    ['bad-empty-explanation.json', 'questions[0].explanation: must not be empty'],
    ['bad-extra-field.json', 'secretAnswerKey: is not a known field'],
  ];

  it.each(cases)('rejects %s', (name, expected) => {
    const errors = errorsOf(loadFixture(name), { fileName: name });
    expect(errors).toContain(expected);
  });

  it('rejects bad-clustered-answers.json with a spread message', () => {
    const errors = errorsOf(loadFixture('bad-clustered-answers.json'), {
      fileName: 'bad-clustered-answers.json',
    });
    expect(errors).toContain(
      'questions: correct answers are clustered: 4 of 6 are option 1; ' +
        'no position may hold more than 50 %',
    );
  });

  it('lists every missing field of bad-missing-fields.json', () => {
    const errors = errorsOf(loadFixture('bad-missing-fields.json'), {
      fileName: 'bad-missing-fields.json',
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'active: must be true or false',
        'title: must be a string',
        'description: must be a string',
        'createdAt: must be a string',
      ]),
    );
  });
});

describe('validateQuiz — field rules', () => {
  it('rejects a non-object quiz', () => {
    for (const value of [null, 'quiz', 42, [], undefined]) {
      expect(errorsOf(value)).toEqual([': quiz must be a JSON object']);
    }
  });

  it('rejects malformed ids', () => {
    expect(errorsOf(quiz({ id: 'ab' }))).toContain('id: must be at least 3 characters');
    expect(errorsOf(quiz({ id: 'Sample-Quiz' }))).toContain(
      'id: must use lowercase letters, digits and single hyphens',
    );
    expect(errorsOf(quiz({ id: 'sample_quiz' }))).toContain(
      'id: must use lowercase letters, digits and single hyphens',
    );
    expect(errorsOf(quiz({ id: 'sample--quiz' }))).toContain(
      'id: must use lowercase letters, digits and single hyphens',
    );
    expect(errorsOf(quiz({ id: 'a'.repeat(61) }))).toContain(
      'id: must be at most 60 characters (is 61)',
    );
    expect(errorsOf(quiz({ id: 7 }))).toContain('id: must be a string');
  });

  it('rejects a bad version or active flag', () => {
    expect(errorsOf(quiz({ version: 0 }))).toContain('version: must be an integer of 1 or more');
    expect(errorsOf(quiz({ version: 1.5 }))).toContain('version: must be an integer of 1 or more');
    expect(errorsOf(quiz({ version: '2' }))).toContain('version: must be an integer of 1 or more');
    expect(errorsOf(quiz({ active: 'true' }))).toContain('active: must be true or false');
  });

  it('rejects over-long or untrimmed titles and descriptions', () => {
    expect(errorsOf(quiz({ title: ' Sample quiz' }))).toContain(
      'title: must not start or end with whitespace',
    );
    expect(errorsOf(quiz({ title: 'x'.repeat(201) }))).toContain(
      'title: must be at most 200 characters (is 201)',
    );
    expect(errorsOf(quiz({ description: 'x'.repeat(501) }))).toContain(
      'description: must be at most 500 characters (is 501)',
    );
  });

  it('rejects impossible or misformatted dates', () => {
    expect(errorsOf(quiz({ createdAt: '11/10/2026' }))).toContain(
      'createdAt: must be a real date in YYYY-MM-DD form',
    );
    expect(errorsOf(quiz({ createdAt: '2026-02-30' }))).toContain(
      'createdAt: must be a real date in YYYY-MM-DD form',
    );
    expect(errorsOf(quiz({ createdAt: '2026-10-11' }))).toEqual([]);
  });

  it('rejects an empty or oversized question list', () => {
    expect(errorsOf(quiz({ questions: [] }))).toContain(
      `questions: must have between 1 and ${MAX_QUESTIONS} questions (has 0)`,
    );
    const many = Array.from({ length: 101 }, (_, i) => question(`q${i + 1}`, 'abcd'[i % 4]));
    expect(errorsOf(quiz({ questions: many }))).toContain(
      `questions: must have between 1 and ${MAX_QUESTIONS} questions (has 101)`,
    );
    expect(errorsOf(quiz({ questions: 'none' }))).toContain('questions: must be an array');
  });

  it('rejects malformed questions and options', () => {
    expect(errorsOf(quiz({ questions: ['q1'] }))).toContain('questions[0]: must be an object');
    expect(errorsOf(quiz({ questions: [question('Q1')] }))).toContain(
      'questions[0].id: must use lowercase letters, digits and single hyphens',
    );
    expect(errorsOf(quiz({ questions: [question('q1', 'b', { options: 'four' })] }))).toContain(
      'questions[0].options: must be an array',
    );
    expect(
      errorsOf(
        quiz({ questions: [question('q1', 'b', { options: [null, ...options().slice(1)] })] }),
      ),
    ).toContain('questions[0].options[0]: must be an object');
    expect(
      errorsOf(
        quiz({
          questions: [
            question('q1', 'b', {
              options: [{ id: 'A', text: 'First option' }, ...options().slice(1)],
            }),
          ],
        }),
      ),
    ).toContain('questions[0].options[0].id: must use lowercase letters and digits only');
    expect(
      errorsOf(
        quiz({
          questions: [
            question('q1', 'b', {
              options: [{ id: 'a', text: 'First', weight: 2 }, ...options().slice(1)],
            }),
          ],
        }),
      ),
    ).toContain('questions[0].options[0].weight: is not a known field');
    expect(errorsOf(quiz({ questions: [question('q1', 'b', { hint: 'no hints' })] }))).toContain(
      'questions[0].hint: is not a known field',
    );
    expect(errorsOf(quiz({ questions: [question('q1', 'b', { correct: 123 })] }))).toContain(
      'questions[0].correct: must be a string',
    );
  });

  it('reports a question id that is not a string without crashing', () => {
    expect(errorsOf(quiz({ questions: [question('q1', 'b', { id: 3 })] }))).toContain(
      'questions[0].id: must be a string',
    );
  });
});

describe('correct-answer spread', () => {
  /** @param {string[]} correct */
  const withAnswers = (correct) =>
    quiz({ questions: correct.map((c, i) => question(`q${i + 1}`, c)) });

  it('ignores quizzes below the question threshold', () => {
    const short = withAnswers(Array(SPREAD_MIN_QUESTIONS - 1).fill('a'));
    expect(validateQuiz(short).valid).toBe(true);
    expect(checkCorrectAnswerSpread(short).ok).toBe(true);
  });

  it('allows exactly half in one position', () => {
    expect(validateQuiz(withAnswers(['a', 'a', 'a', 'b', 'c', 'd'])).valid).toBe(true);
  });

  it('rejects more than half in one position', () => {
    const spread = checkCorrectAnswerSpread(withAnswers(['d', 'd', 'd', 'd', 'a', 'b']));
    expect(spread).toMatchObject({ ok: false, position: 3, count: 4, total: 6 });
    expect(validateQuiz(withAnswers(['d', 'd', 'd', 'd', 'a', 'b'])).valid).toBe(false);
  });

  it('reports positions, using -1 when correct matches no option', () => {
    expect(correctAnswerPositions(withAnswers(['a', 'c']))).toEqual([0, 2]);
    expect(correctAnswerPositions(withAnswers(['z']))).toEqual([-1]);
    expect(correctAnswerPositions({})).toEqual([]);
    expect(correctAnswerPositions({ questions: 'nope' })).toEqual([]);
  });

  it('handles a quiz with no resolvable correct answers', () => {
    expect(checkCorrectAnswerSpread({ questions: [] })).toMatchObject({
      ok: true,
      total: 0,
      share: 0,
      position: -1,
    });
  });
});

describe('helpers', () => {
  it('derives the quiz id from a file name or path', () => {
    expect(quizIdFromFileName('quizzes/tajweed-basics-01.json')).toBe('tajweed-basics-01');
    expect(quizIdFromFileName('C:\\repo\\quizzes\\my-quiz.JSON')).toBe('my-quiz');
    expect(quizIdFromFileName('plain-name')).toBe('plain-name');
  });

  it('formats errors one per line with their path', () => {
    expect(
      formatQuizErrors([
        { path: 'id', message: 'must be a string' },
        { path: '', message: 'quiz must be a JSON object' },
      ]),
    ).toBe('  - id: must be a string\n  - quiz must be a JSON object');
  });

  it('assertValidQuiz returns a valid quiz and throws for an invalid one', () => {
    const good = quiz();
    expect(assertValidQuiz(good, { fileName: 'sample-quiz.json' })).toBe(good);
    expect(() =>
      assertValidQuiz(quiz({ language: 'fr' }), { fileName: 'sample-quiz.json' }),
    ).toThrow(/Invalid quiz in sample-quiz\.json:\n {2}- language: must be one of ar, en, mixed/);
    expect(() => assertValidQuiz(null)).toThrow(/^Invalid quiz:\n/);
  });
});
