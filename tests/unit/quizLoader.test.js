import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { loadQuiz, quizIdFromLocation } from '../../src/lib/quizLoader.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const response = (status, body, { badJson = false } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: badJson ? () => Promise.reject(new SyntaxError('bad')) : () => Promise.resolve(body),
});

describe('quizIdFromLocation', () => {
  it('reads /q/<id>', () => {
    expect(quizIdFromLocation({ pathname: '/q/arabic-sample', search: '' })).toBe('arabic-sample');
    expect(quizIdFromLocation({ pathname: '/q/arabic-sample/', search: '' })).toBe('arabic-sample');
  });

  it('reads ?id= for development', () => {
    expect(quizIdFromLocation({ pathname: '/quiz.html', search: '?id=abc-def' })).toBe('abc-def');
  });

  it('rejects invalid or missing ids', () => {
    expect(quizIdFromLocation({ pathname: '/q/..%2Fsecret', search: '' })).toBeNull();
    expect(quizIdFromLocation({ pathname: '/q/Bad_Id', search: '' })).toBeNull();
    expect(quizIdFromLocation({ pathname: '/quiz.html', search: '' })).toBeNull();
  });
});

describe('loadQuiz', () => {
  it('loads an active quiz from /quizzes/<id>.json', async () => {
    const fetchFn = vi.fn().mockResolvedValue(response(200, arabic));
    const r = await loadQuiz('arabic-sample', fetchFn);
    expect(fetchFn).toHaveBeenCalledWith('/quizzes/arabic-sample.json');
    expect(r).toEqual({ status: 'ok', quiz: arabic });
  });

  it('reports a closed quiz', async () => {
    const closed = { ...arabic, active: false };
    const r = await loadQuiz('arabic-sample', () => Promise.resolve(response(200, closed)));
    expect(r.status).toBe('closed');
  });

  it('reports not found for a missing id, a 404, or a non-JSON answer', async () => {
    expect(await loadQuiz(null, vi.fn())).toEqual({ status: 'not-found' });
    expect((await loadQuiz('x-y-z', () => Promise.resolve(response(404)))).status).toBe(
      'not-found',
    );
    const html = () => Promise.resolve(response(200, null, { badJson: true }));
    expect((await loadQuiz('x-y-z', html)).status).toBe('not-found');
  });

  it('reports network and server errors', async () => {
    const offline = await loadQuiz('x-y-z', () => Promise.reject(new TypeError('offline')));
    expect(offline).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/connection/),
    });
    const server = await loadQuiz('x-y-z', () => Promise.resolve(response(500)));
    expect(server).toMatchObject({ status: 'error', message: expect.stringMatching(/error 500/) });
  });

  it('reports an invalid quiz file', async () => {
    const broken = { ...arabic, questions: [] };
    const r = await loadQuiz('arabic-sample', () => Promise.resolve(response(200, broken)));
    expect(r).toMatchObject({ status: 'error', message: expect.stringMatching(/problem/) });
  });

  it('rejects a file whose id differs from the requested id', async () => {
    const r = await loadQuiz('other-quiz', () => Promise.resolve(response(200, arabic)));
    expect(r.status).toBe('error');
  });
});
