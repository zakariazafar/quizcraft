// @ts-check
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUESTION_COUNT,
  newQuizTemplate,
  titleFromId,
} from '../../scripts/lib/quizTemplate.js';
import { LANGUAGES, validateQuiz } from '../../src/lib/validate.js';

const SCRIPT = fileURLToPath(new URL('../../scripts/new-quiz.mjs', import.meta.url));

describe('titleFromId', () => {
  it('turns a quiz id into a readable title', () => {
    expect(titleFromId('tajweed-basics-01')).toBe('Tajweed Basics 01');
    expect(titleFromId('single')).toBe('Single');
    expect(titleFromId('')).toBe('');
  });
});

describe('newQuizTemplate', () => {
  it('scaffolds a quiz that already passes validation', () => {
    const quiz = newQuizTemplate({ id: 'brand-new-quiz' });
    expect(validateQuiz(quiz, { fileName: 'brand-new-quiz.json' })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('starts inactive at version 1 with the default question count', () => {
    const quiz = newQuizTemplate({ id: 'brand-new-quiz' });
    expect(quiz).toMatchObject({ active: false, version: 1, language: 'en' });
    expect(quiz.questions).toHaveLength(DEFAULT_QUESTION_COUNT);
    expect(quiz.title).toBe('Brand New Quiz');
    expect(quiz.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('spreads the correct answers over all four positions', () => {
    const quiz = newQuizTemplate({ id: 'brand-new-quiz', questionCount: 8 });
    expect(quiz.questions.map((q) => q.correct)).toEqual([...'abcdabcd']);
    expect(quiz.questions.every((q) => q.options.map((o) => o.id).join('') === 'abcd')).toBe(true);
  });

  it('honours an explicit title, date and question count', () => {
    const quiz = newQuizTemplate({
      id: 'brand-new-quiz',
      title: 'A Proper Title',
      createdAt: '2026-01-02',
      questionCount: 1,
    });
    expect(quiz).toMatchObject({ title: 'A Proper Title', createdAt: '2026-01-02' });
    expect(quiz.questions).toHaveLength(1);
  });

  it('is valid in every language, with Arabic placeholders for ar', () => {
    for (const language of LANGUAGES) {
      const quiz = newQuizTemplate({ id: 'brand-new-quiz', language });
      expect(validateQuiz(quiz, { fileName: 'brand-new-quiz.json' }).valid).toBe(true);
    }
    const arabic = newQuizTemplate({ id: 'brand-new-quiz', language: 'ar' });
    expect(arabic.questions[0].text).toContain('السُّؤَالُ');
    const text = JSON.stringify(arabic);
    expect(text).toBe(text.normalize('NFC'));
    expect(/[ً-ْ]/u.test(text), 'Arabic placeholders keep their diacritics').toBe(true);
  });

  it('refuses options that cannot produce a valid quiz', () => {
    expect(() => newQuizTemplate({ id: 'brand-new-quiz', language: 'fr' })).toThrow(
      /language must be one of ar, en, mixed/,
    );
    expect(() => newQuizTemplate({ id: 'brand-new-quiz', questionCount: 0 })).toThrow(
      /between 1 and 100/,
    );
    expect(() => newQuizTemplate({ id: 'brand-new-quiz', questionCount: 2.5 })).toThrow(
      /whole number/,
    );
    expect(() => newQuizTemplate({ id: 'Not A Slug' })).toThrow(/Invalid quiz in Not A Slug.json/);
  });
});

describe('scripts/new-quiz.mjs', () => {
  /** @param {string[]} args */
  const run = (args, dir) =>
    execFileSync('node', [SCRIPT, ...args, '--dir', dir], { encoding: 'utf8', stdio: 'pipe' });

  it('writes a valid scaffold into the quizzes folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'quizcraft-new-'));
    const stdout = run(['my-new-quiz', '--questions', '6', '--language', 'ar'], dir);

    expect(stdout).toContain('6 questions, ar, active: false');
    const quiz = JSON.parse(readFileSync(join(dir, 'my-new-quiz.json'), 'utf8'));
    expect(validateQuiz(quiz, { fileName: 'my-new-quiz.json' })).toEqual({
      valid: true,
      errors: [],
    });
    expect(quiz.questions).toHaveLength(6);
  });

  it('refuses to overwrite an existing quiz', () => {
    const dir = mkdtempSync(join(tmpdir(), 'quizcraft-new-'));
    writeFileSync(join(dir, 'taken.json'), '{}');
    expect(() => run(['taken'], dir)).toThrow(/already exists/);
  });

  it('explains how to call it when the arguments are wrong', () => {
    const dir = mkdtempSync(join(tmpdir(), 'quizcraft-new-'));
    expect(() => run([], dir)).toThrow(/A quiz id is required/);
    expect(() => run(['one', 'two'], dir)).toThrow(/Unexpected argument: two/);
    expect(() => run(['one', '--nope'], dir)).toThrow(/Unexpected argument: --nope/);
    expect(() => run(['one', '--language', 'fr'], dir)).toThrow(/language must be one of/);
  });
});
