// @ts-check
/**
 * Pure logic behind scripts/build-quiz-index.mjs (PLAN §4).
 *
 * Takes the raw text of every file in `quizzes/`, refuses to produce anything when
 * one of them is invalid, and otherwise returns the quizzes plus the `index.json`
 * summary the dashboard loads (id, title, language, question count, active).
 */
import { formatQuizErrors, validateQuiz } from '../../src/lib/validate.js';
import { validateQuizSchema } from './quizSchema.js';

/**
 * @typedef {{ fileName: string, text: string }} QuizSource
 * @typedef {{ fileName: string, quiz: any }} QuizFile
 * @typedef {{ id: string, title: string, language: string, questionCount: number, active: boolean }} QuizSummary
 */

/**
 * The one row `index.json` carries per quiz. Deliberately no questions: the dashboard
 * only needs to list quizzes, and the quiz file itself is fetched when one is opened.
 * @param {any} quiz
 * @returns {QuizSummary}
 */
export function summariseQuiz(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    language: quiz.language,
    questionCount: quiz.questions.length,
    active: quiz.active,
  };
}

/**
 * Every problem in one quiz file, as printable lines.
 *
 * `src/lib/validate.js` leads, because its messages name the rule from PLAN §4 that
 * was broken. The JSON Schema is only a backstop: it should never find anything the
 * hand-written rules missed, and if it does, that is itself worth reporting.
 * @param {QuizFile} file
 * @param {{ schemaValidator?: typeof validateQuizSchema }} [options]
 * @returns {string[]}
 */
export function quizFileProblems({ fileName, quiz }, options = {}) {
  const own = validateQuiz(quiz, { fileName });
  if (!own.valid) return [`${fileName}:`, formatQuizErrors(own.errors)];

  const schema = (options.schemaValidator ?? validateQuizSchema)(quiz);
  if (!schema.valid) {
    return [
      `${fileName}: passes src/lib/validate.js but not schema/quiz.schema.json`,
      formatQuizErrors(schema.errors),
    ];
  }
  return [];
}

/**
 * @param {QuizSummary} a
 * @param {QuizSummary} b
 */
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * @param {QuizSource[]} sources
 * @param {{ schemaValidator?: typeof validateQuizSchema }} [options]
 * @returns {{ files: QuizFile[], index: { quizzes: QuizSummary[] } }}
 * @throws {Error} naming every invalid file and why
 */
export function buildQuizIndex(sources, options = {}) {
  /** @type {string[]} */
  const problems = [];
  /** @type {QuizFile[]} */
  const files = [];

  for (const { fileName, text } of sources) {
    let quiz;
    try {
      quiz = JSON.parse(text);
    } catch (error) {
      problems.push(`${fileName}: is not valid JSON (${/** @type {Error} */ (error).message})`);
      continue;
    }
    const fileProblems = quizFileProblems({ fileName, quiz }, options);
    if (fileProblems.length > 0) problems.push(...fileProblems);
    else files.push({ fileName, quiz });
  }

  if (problems.length > 0) {
    throw new Error(`Quiz files are invalid, nothing was written:\n${problems.join('\n')}`);
  }
  return { files, index: { quizzes: files.map((file) => summariseQuiz(file.quiz)).sort(byId) } };
}
