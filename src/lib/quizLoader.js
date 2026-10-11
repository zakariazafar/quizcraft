// @ts-check
import { QUIZ_ID_PATTERN, validateQuiz } from './validate.js';

/**
 * @typedef {import('./validate.js').Quiz} Quiz
 * @typedef {{ status: 'ok', quiz: Quiz } | { status: 'closed', quiz: Quiz }
 *   | { status: 'not-found' } | { status: 'error', message: string }} LoadResult
 */

/**
 * Read the quiz id from /q/<id> (production) or ?id=<id> (development).
 * @param {{ pathname: string, search: string }} location
 * @returns {string | null}
 */
export function quizIdFromLocation(location) {
  const m = location.pathname.match(/^\/q\/([^/]+)\/?$/);
  const raw = m ? decodeURIComponent(m[1]) : new URLSearchParams(location.search).get('id');
  return raw && QUIZ_ID_PATTERN.test(raw) ? raw : null;
}

/**
 * Fetch and check a quiz file.
 * @param {string | null} id
 * @param {(url: string) => Promise<{ ok: boolean, status: number, json: () => Promise<unknown> }>} fetchFn
 * @returns {Promise<LoadResult>}
 */
export async function loadQuiz(id, fetchFn) {
  if (!id) return { status: 'not-found' };
  let res;
  try {
    res = await fetchFn(`/quizzes/${id}.json`);
  } catch {
    return {
      status: 'error',
      message: 'Could not load the quiz. Check your connection and reload the page.',
    };
  }
  if (res.status === 404) return { status: 'not-found' };
  if (!res.ok)
    return {
      status: 'error',
      message: `Could not load the quiz (error ${res.status}). Reload the page to try again.`,
    };
  let data;
  try {
    data = await res.json();
  } catch {
    // Static hosts may answer unknown paths with an HTML page instead of a 404.
    return { status: 'not-found' };
  }
  if (validateQuiz(data, { fileId: id }).length) {
    return {
      status: 'error',
      message: 'This quiz file has a problem. Please tell the quiz owner.',
    };
  }
  const quiz = /** @type {Quiz} */ (data);
  return quiz.active ? { status: 'ok', quiz } : { status: 'closed', quiz };
}
