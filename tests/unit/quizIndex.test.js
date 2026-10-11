// @ts-check
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildQuizIndex, quizFileProblems, summariseQuiz } from '../../scripts/lib/quizIndex.js';
import { loadFixture } from '../helpers/fixtures.js';

const SCRIPT = fileURLToPath(new URL('../../scripts/build-quiz-index.mjs', import.meta.url));

/** @param {string} name @returns {{ fileName: string, text: string }} */
const source = (name) => ({
  fileName: `quizzes/${name}`,
  text: JSON.stringify(loadFixture(name), null, 2),
});

/** Writes the given fixtures into a fresh temp directory as quizzes/. */
function tempQuizzes(names, { rename = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'quizcraft-'));
  for (const name of names) {
    writeFileSync(join(dir, rename[name] ?? name), JSON.stringify(loadFixture(name), null, 2));
  }
  return dir;
}

describe('summariseQuiz', () => {
  it('keeps only the fields index.json needs, Arabic title intact', () => {
    const arabic = loadFixture('arabic-quiz.json');
    expect(summariseQuiz(arabic)).toEqual({
      id: 'arabic-quiz',
      title: arabic.title,
      language: 'ar',
      questionCount: 6,
      active: true,
    });
    expect(summariseQuiz(arabic).title).toContain('التَّجْوِيدِ');
  });
});

describe('quizFileProblems', () => {
  it('returns nothing for a valid file', () => {
    expect(
      quizFileProblems({
        fileName: 'quizzes/mixed-quiz.json',
        quiz: loadFixture('mixed-quiz.json'),
      }),
    ).toEqual([]);
  });

  it('names the file and lists the problems', () => {
    const problems = quizFileProblems({
      fileName: 'quizzes/bad-language.json',
      quiz: loadFixture('bad-language.json'),
    });
    expect(problems[0]).toBe('quizzes/bad-language.json:');
    expect(problems[1]).toContain('language: must be one of ar, en, mixed');
  });

  it('reports a disagreement between the schema and the hand-written rules', () => {
    const problems = quizFileProblems(
      { fileName: 'quizzes/mixed-quiz.json', quiz: loadFixture('mixed-quiz.json') },
      {
        schemaValidator: () => ({ valid: false, errors: [{ path: 'version', message: 'is odd' }] }),
      },
    );
    expect(problems).toEqual([
      'quizzes/mixed-quiz.json: passes src/lib/validate.js but not schema/quiz.schema.json',
      '  - version: is odd',
    ]);
  });
});

describe('buildQuizIndex', () => {
  it('builds a sorted index from valid sources', () => {
    const { files, index } = buildQuizIndex([
      source('mixed-quiz.json'),
      source('arabic-quiz.json'),
    ]);
    expect(index.quizzes.map((q) => q.id)).toEqual(['arabic-quiz', 'mixed-quiz']);
    expect(files.map((f) => f.fileName)).toEqual([
      'quizzes/mixed-quiz.json',
      'quizzes/arabic-quiz.json',
    ]);
    expect(index.quizzes[0]).toEqual({
      id: 'arabic-quiz',
      title: loadFixture('arabic-quiz.json').title,
      language: 'ar',
      questionCount: 6,
      active: true,
    });
  });

  it('accepts an empty quizzes directory', () => {
    expect(buildQuizIndex([])).toEqual({ files: [], index: { quizzes: [] } });
  });

  it('throws on an invalid quiz, naming the file, and writes nothing', () => {
    expect(() =>
      buildQuizIndex([source('arabic-quiz.json'), source('bad-three-options.json')]),
    ).toThrow(
      /nothing was written:\nquizzes\/bad-three-options\.json:\n {2}- questions\[0\]\.options: must have exactly 4 options/,
    );
  });

  it('throws on malformed JSON', () => {
    expect(() => buildQuizIndex([{ fileName: 'quizzes/broken.json', text: '{ "id": ' }])).toThrow(
      /quizzes\/broken\.json: is not valid JSON/,
    );
  });

  it('collects problems from every bad file at once', () => {
    const message = (() => {
      try {
        buildQuizIndex([source('bad-language.json'), source('bad-empty-explanation.json')]);
        return '';
      } catch (error) {
        return /** @type {Error} */ (error).message;
      }
    })();
    expect(message).toContain('quizzes/bad-language.json:');
    expect(message).toContain('quizzes/bad-empty-explanation.json:');
  });
});

describe('scripts/build-quiz-index.mjs', () => {
  it('publishes each quiz plus index.json', () => {
    const quizzes = tempQuizzes(['arabic-quiz.json', 'mixed-quiz.json']);
    const out = join(quizzes, 'out');
    const stdout = execFileSync('node', [SCRIPT, '--quizzes', quizzes, '--out', out], {
      encoding: 'utf8',
    });

    expect(stdout).toContain('2 quiz file(s)');
    expect(readdirSync(out).sort()).toEqual(['arabic-quiz.json', 'index.json', 'mixed-quiz.json']);
    const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'));
    expect(index.quizzes.map((q) => q.id)).toEqual(['arabic-quiz', 'mixed-quiz']);
    const published = JSON.parse(readFileSync(join(out, 'arabic-quiz.json'), 'utf8'));
    expect(published).toEqual(loadFixture('arabic-quiz.json'));
    expect(published.questions[0].text).toContain('النُّونِ السَّاكِنَةِ');
  });

  it('fails the build on an invalid quiz and leaves no output', () => {
    const quizzes = tempQuizzes(['bad-three-options.json']);
    const out = join(quizzes, 'out');
    expect(() =>
      execFileSync('node', [SCRIPT, '--quizzes', quizzes, '--out', out], { stdio: 'pipe' }),
    ).toThrow(/must have exactly 4 options/);
    expect(() => readdirSync(out)).toThrow();
  });

  it('--check validates without writing', () => {
    const quizzes = tempQuizzes(['mixed-quiz.json']);
    const out = join(quizzes, 'out');
    const stdout = execFileSync('node', [SCRIPT, '--check', '--quizzes', quizzes, '--out', out], {
      encoding: 'utf8',
    });
    expect(stdout).toContain('are valid');
    expect(() => readdirSync(out)).toThrow();
  });

  it('reports a missing quizzes directory and an unknown argument', () => {
    expect(() =>
      execFileSync('node', [SCRIPT, '--quizzes', join(tmpdir(), 'no-such-dir-quizcraft')], {
        stdio: 'pipe',
      }),
    ).toThrow(/Cannot read/);
    expect(() => execFileSync('node', [SCRIPT, '--nope'], { stdio: 'pipe' })).toThrow(
      /Unknown argument/,
    );
  });
});
