// Validates every real quiz file in quizzes/. A failing quiz blocks CI and deployment.
import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateQuiz } from '../../src/lib/validate.js';

const files = readdirSync('quizzes').filter((f) => f.endsWith('.json'));

describe('quiz files in quizzes/', () => {
  it('quizzes/ folder is readable', () => {
    expect(Array.isArray(files)).toBe(true);
  });

  it.each(files)('%s is valid', (file) => {
    const quiz = JSON.parse(readFileSync(`quizzes/${file}`, 'utf8'));
    expect(validateQuiz(quiz, { fileId: basename(file, '.json') })).toEqual([]);
  });
});
