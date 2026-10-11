// @ts-check
/**
 * Guards the real quiz files: every file in quizzes/ must satisfy PLAN §4.
 * This is the test that fails a pull request adding a broken quiz.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateQuizSchema } from '../../scripts/lib/quizSchema.js';
import { formatQuizErrors, validateQuiz } from '../../src/lib/validate.js';

const QUIZZES_DIR = fileURLToPath(new URL('../../quizzes/', import.meta.url));

const fileNames = readdirSync(QUIZZES_DIR)
  .filter((name) => name.endsWith('.json'))
  .sort();

/** @param {string} name */
const load = (name) => JSON.parse(readFileSync(join(QUIZZES_DIR, name), 'utf8'));

describe('quizzes/', () => {
  it('contains at least one quiz', () => {
    expect(fileNames.length).toBeGreaterThan(0);
  });

  it.each(fileNames)('%s satisfies every rule in PLAN §4', (name) => {
    const result = validateQuiz(load(name), { fileName: name });
    expect(result.valid, `\n${formatQuizErrors(result.errors)}`).toBe(true);
  });

  it.each(fileNames)('%s matches schema/quiz.schema.json', (name) => {
    const result = validateQuizSchema(load(name));
    expect(result.valid, `\n${formatQuizErrors(result.errors)}`).toBe(true);
  });

  it('has unique quiz ids', () => {
    const ids = fileNames.map((name) => load(name).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ships a sample quiz in Arabic whose diacritics survive a round trip', () => {
    const arabic = fileNames.map(load).filter((quiz) => quiz.language === 'ar');
    expect(arabic.length).toBeGreaterThan(0);
    for (const quiz of arabic) {
      const text = JSON.stringify(quiz);
      expect(text).toBe(text.normalize('NFC'));
      expect(/[ً-ْ]/u.test(text), 'Arabic quiz should keep its diacritics').toBe(true);
    }
  });
});
