import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildQuizIndex } from '../../scripts/lib/quizIndex.js';

const load = (name) => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8'));

describe('buildQuizIndex', () => {
  it('builds index entries sorted newest first', () => {
    const { errors, index } = buildQuizIndex([
      { fileId: 'english-sample', quiz: load('english-quiz.json') },
      { fileId: 'arabic-sample', quiz: load('arabic-quiz.json') },
    ]);
    expect(errors).toEqual([]);
    expect(index.map((e) => e.id)).toEqual(['arabic-sample', 'english-sample']);
    expect(index[0]).toEqual({
      id: 'arabic-sample',
      title: 'اختبار تجريبي في النحو',
      language: 'ar',
      questionCount: 5,
      active: true,
      version: 1,
      createdAt: '2026-10-11',
    });
  });

  it('sorts by id when dates are equal', () => {
    const a = load('english-quiz.json');
    const b = { ...load('english-quiz.json'), id: 'another-sample' };
    const { index } = buildQuizIndex([
      { fileId: 'english-sample', quiz: a },
      { fileId: 'another-sample', quiz: b },
    ]);
    expect(index.map((e) => e.id)).toEqual(['another-sample', 'english-sample']);
  });

  it('reports invalid quizzes with their file name and leaves them out', () => {
    const bad = load('english-quiz.json');
    bad.questions[0].correct = 'z';
    const { errors, index } = buildQuizIndex([{ fileId: 'english-sample', quiz: bad }]);
    expect(index).toEqual([]);
    expect(errors[0]).toMatch(/^quizzes\/english-sample\.json: questions\[0\]\.correct/);
  });

  it('reports a file whose id does not match its name', () => {
    const { errors } = buildQuizIndex([{ fileId: 'wrong-name', quiz: load('english-quiz.json') }]);
    expect(errors[0]).toMatch(/match the file name/);
  });

  it('reports duplicate ids', () => {
    const q = load('english-quiz.json');
    const { errors, index } = buildQuizIndex([
      { fileId: 'english-sample', quiz: q },
      { fileId: 'english-sample', quiz: q },
    ]);
    expect(index).toHaveLength(1);
    expect(errors[0]).toMatch(/duplicate quiz id/);
  });
});
