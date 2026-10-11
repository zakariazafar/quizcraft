// @ts-check
import { validateQuiz } from '../../src/lib/validate.js';

/**
 * @typedef {{ fileId: string, quiz: unknown }} QuizFile
 * @typedef {{ id: string, title: string, language: string, questionCount: number,
 *   active: boolean, version: number, createdAt: string }} IndexEntry
 */

/**
 * Validate every quiz file and build the dashboard index.
 * @param {QuizFile[]} files
 * @returns {{ errors: string[], index: IndexEntry[] }}
 */
export function buildQuizIndex(files) {
  /** @type {string[]} */
  const errors = [];
  /** @type {IndexEntry[]} */
  const index = [];
  const seen = new Set();
  for (const { fileId, quiz } of files) {
    const problems = validateQuiz(quiz, { fileId });
    if (problems.length) {
      errors.push(...problems.map((p) => `quizzes/${fileId}.json: ${p}`));
      continue;
    }
    const q = /** @type {import('../../src/lib/validate.js').Quiz} */ (quiz);
    if (seen.has(q.id)) {
      errors.push(`quizzes/${fileId}.json: duplicate quiz id "${q.id}".`);
      continue;
    }
    seen.add(q.id);
    index.push({
      id: q.id,
      title: q.title,
      language: q.language,
      questionCount: q.questions.length,
      active: q.active,
      version: q.version,
      createdAt: q.createdAt,
    });
  }
  index.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return { errors, index };
}
