// @ts-check
/**
 * Quiz validation shared by tests, the build script and the browser.
 * Hand-written (no Ajv at runtime) so it works under a strict CSP; a test checks it agrees
 * with schema/quiz.schema.json.
 */

/**
 * @typedef {{ id: string, text: string }} Option
 * @typedef {{ id: string, text: string, options: Option[], correct: string, explanation: string }} Question
 * @typedef {{ id: string, version: number, active: boolean, title: string, description?: string,
 *   language: 'ar'|'en'|'mixed', createdAt: string, source?: string, questions: Question[] }} Quiz
 */

export const QUIZ_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]$/;
const QUESTION_ID_PATTERN = /^[a-z0-9-]{1,20}$/;
const OPTION_ID_PATTERN = /^[a-z0-9]{1,5}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LANGUAGES = ['ar', 'en', 'mixed'];
const TOP_KEYS = [
  '$schema',
  'id',
  'version',
  'active',
  'title',
  'description',
  'language',
  'createdAt',
  'source',
  'questions',
];
const QUESTION_KEYS = ['id', 'text', 'options', 'correct', 'explanation'];
/** Quizzes with at least this many questions must spread correct answers across positions. */
export const SPREAD_MIN_QUESTIONS = 6;

/** @param {unknown} v */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Check a text field: type, length, NFC, no surrounding whitespace.
 * @param {string[]} errors
 * @param {unknown} value
 * @param {string} path
 * @param {number} max
 * @param {boolean} [optional]
 */
function checkText(errors, value, path, max, optional = false) {
  if (value === undefined && optional) return;
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${path} must be a non-empty string.`);
    return;
  }
  if (value.length > max) errors.push(`${path} is longer than ${max} characters.`);
  if (value !== value.trim()) errors.push(`${path} has leading or trailing spaces.`);
  if (value !== value.normalize('NFC')) errors.push(`${path} is not NFC-normalised.`);
}

/**
 * @param {string[]} errors
 * @param {Record<string, unknown>} obj
 * @param {string[]} allowed
 * @param {string} path
 */
function checkKeys(errors, obj, allowed, path) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) errors.push(`${path} has unknown field "${key}".`);
  }
}

/**
 * Validate a parsed quiz.
 * @param {unknown} quiz
 * @param {{ fileId?: string }} [opts] fileId: file name without .json, must equal quiz.id
 * @returns {string[]} human-readable errors (empty when valid)
 */
export function validateQuiz(quiz, opts = {}) {
  /** @type {string[]} */
  const errors = [];
  if (!isObject(quiz)) return ['Quiz must be a JSON object.'];
  const q = /** @type {Record<string, unknown>} */ (quiz);
  checkKeys(errors, q, TOP_KEYS, 'quiz');

  if (typeof q.id !== 'string' || !QUIZ_ID_PATTERN.test(q.id)) {
    errors.push(
      'id must be 3–60 lowercase letters, digits or hyphens (not starting/ending with -).',
    );
  } else if (opts.fileId !== undefined && opts.fileId !== q.id) {
    errors.push(`id "${q.id}" must match the file name "${opts.fileId}.json".`);
  }
  if (!Number.isInteger(q.version) || /** @type {number} */ (q.version) < 1) {
    errors.push('version must be an integer ≥ 1.');
  }
  if (typeof q.active !== 'boolean') errors.push('active must be true or false.');
  checkText(errors, q.title, 'title', 200);
  checkText(errors, q.description, 'description', 1000, true);
  checkText(errors, q.source, 'source', 500, true);
  if (!LANGUAGES.includes(/** @type {string} */ (q.language))) {
    errors.push('language must be "ar", "en" or "mixed".');
  }
  if (
    typeof q.createdAt !== 'string' ||
    !DATE_PATTERN.test(q.createdAt) ||
    Number.isNaN(Date.parse(q.createdAt))
  ) {
    errors.push('createdAt must be a date like 2026-10-12.');
  }

  if (!Array.isArray(q.questions) || q.questions.length === 0) {
    errors.push('questions must be a non-empty array.');
    return errors;
  }
  if (q.questions.length > 100) errors.push('A quiz can have at most 100 questions.');

  const questionIds = new Set();
  /** @type {number[]} */
  const correctPositions = [];

  q.questions.forEach((raw, i) => {
    const path = `questions[${i}]`;
    if (!isObject(raw)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    const question = /** @type {Record<string, unknown>} */ (raw);
    checkKeys(errors, question, QUESTION_KEYS, path);
    const qid = question.id;
    if (typeof qid !== 'string' || !QUESTION_ID_PATTERN.test(qid)) {
      errors.push(`${path}.id must be 1–20 lowercase letters, digits or hyphens.`);
    } else if (questionIds.has(qid)) {
      errors.push(`${path}.id "${qid}" is used more than once.`);
    } else {
      questionIds.add(qid);
    }
    checkText(errors, question.text, `${path}.text`, 1000);
    checkText(errors, question.explanation, `${path}.explanation`, 1500);

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      errors.push(`${path} must have exactly 4 options.`);
      return;
    }
    const optionIds = new Set();
    const optionTexts = new Set();
    question.options.forEach((opt, j) => {
      const op = `${path}.options[${j}]`;
      if (!isObject(opt)) {
        errors.push(`${op} must be an object.`);
        return;
      }
      const o = /** @type {Record<string, unknown>} */ (opt);
      checkKeys(errors, o, ['id', 'text'], op);
      if (typeof o.id !== 'string' || !OPTION_ID_PATTERN.test(o.id)) {
        errors.push(`${op}.id must be 1–5 lowercase letters or digits.`);
      } else if (optionIds.has(o.id)) {
        errors.push(`${op}.id "${o.id}" is used more than once in this question.`);
      } else {
        optionIds.add(o.id);
      }
      checkText(errors, o.text, `${op}.text`, 300);
      if (typeof o.text === 'string') {
        const key = o.text.trim().normalize('NFC');
        if (optionTexts.has(key)) errors.push(`${op}.text duplicates another option.`);
        optionTexts.add(key);
      }
    });

    const pos = question.options.findIndex(
      (o) => isObject(o) && /** @type {Option} */ (o).id === question.correct,
    );
    if (pos === -1) {
      errors.push(`${path}.correct must be the id of one of its options.`);
    } else {
      correctPositions.push(pos);
    }
  });

  if (correctPositions.length >= SPREAD_MIN_QUESTIONS) {
    const counts = [0, 0, 0, 0];
    for (const p of correctPositions) counts[p] += 1;
    const max = Math.max(...counts);
    if (max / correctPositions.length > 0.5) {
      errors.push(
        `Correct answers are clustered: ${max} of ${correctPositions.length} are in position ${counts.indexOf(max) + 1}. Vary their positions.`,
      );
    }
  }
  return errors;
}

/**
 * @param {unknown} quiz
 * @returns {quiz is Quiz}
 */
export function isValidQuiz(quiz) {
  return validateQuiz(quiz).length === 0;
}
