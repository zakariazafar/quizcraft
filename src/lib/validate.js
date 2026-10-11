// @ts-check
/**
 * Quiz file validation — PLAN §4.
 *
 * Dependency-free on purpose: the very same rules run in Node (unit tests and
 * `scripts/build-quiz-index.mjs`) and in the browser (`quizLoader`, phase 2).
 * `schema/quiz.schema.json` mirrors the structural half of these rules for
 * editors and for the build-time Ajv cross-check.
 */

/** Allowed values of `language`. `ar` makes the quiz container RTL. */
export const LANGUAGES = ['ar', 'en', 'mixed'];

/** Every question has exactly this many options. */
export const OPTIONS_PER_QUESTION = 4;

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 100;

/** The correct-answer spread rule only applies from this many questions up. */
export const SPREAD_MIN_QUESTIONS = 6;

/** No single option position may hold more than this share of correct answers. */
export const SPREAD_MAX_SHARE = 0.5;

/** Maximum lengths, in code units, per field. */
export const MAX_LENGTH = {
  id: 60,
  title: 200,
  description: 500,
  source: 300,
  questionId: 20,
  questionText: 1000,
  optionId: 4,
  optionText: 300,
  explanation: 1000,
};

const MIN_ID_LENGTH = 3;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHORT_ID = /^[a-z0-9]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const QUIZ_FIELDS = [
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
const QUESTION_FIELDS = ['id', 'text', 'options', 'correct', 'explanation'];
const OPTION_FIELDS = ['id', 'text'];

/**
 * @typedef {{ path: string, message: string }} QuizError
 * @typedef {{ valid: boolean, errors: QuizError[] }} QuizValidationResult
 */

/**
 * @param {unknown} value
 * @returns {boolean} true for a non-null, non-array object
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collects `{ path, message }` problems. @returns {{ list: QuizError[], add: (path: string, message: string) => false }} */
function createErrors() {
  /** @type {QuizError[]} */
  const list = [];
  return {
    list,
    add(path, message) {
      list.push({ path, message });
      return false;
    },
  };
}

/**
 * Shared text rules: a non-empty, trimmed, NFC-normalised string within a length limit.
 * NFC normalisation changes the encoding only — Arabic diacritics are never removed.
 * @param {ReturnType<typeof createErrors>} errors
 * @param {unknown} value
 * @param {string} path
 * @param {number} maxLength
 * @returns {boolean}
 */
function checkText(errors, value, path, maxLength) {
  if (typeof value !== 'string') return errors.add(path, 'must be a string');
  if (value.length === 0) return errors.add(path, 'must not be empty');
  if (value !== value.trim()) {
    return errors.add(path, 'must not start or end with whitespace');
  }
  if (value !== value.normalize('NFC')) {
    return errors.add(path, 'must be NFC-normalised (normalise the encoding, keep the diacritics)');
  }
  if (value.length > maxLength) {
    return errors.add(path, `must be at most ${maxLength} characters (is ${value.length})`);
  }
  return true;
}

/**
 * @param {ReturnType<typeof createErrors>} errors
 * @param {object} object
 * @param {string[]} allowed
 * @param {string} prefix
 */
function checkNoUnknownFields(errors, object, allowed, prefix) {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) errors.add(`${prefix}${key}`, 'is not a known field');
  }
}

/**
 * @param {string} value
 * @returns {boolean} true when the value is a real calendar date
 */
function isRealDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * The quiz id a file name implies: `quizzes/tajweed-basics-01.json` → `tajweed-basics-01`.
 * @param {string} fileName
 * @returns {string}
 */
export function quizIdFromFileName(fileName) {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  return base.replace(/\.json$/i, '');
}

/**
 * Index of each question's correct option, or -1 when it cannot be determined.
 * @param {{ questions?: unknown }} quiz
 * @returns {number[]}
 */
export function correctAnswerPositions(quiz) {
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  return questions.map((question) => {
    const options = Array.isArray(question?.options) ? question.options : [];
    return options.findIndex((option) => option?.id === question?.correct);
  });
}

/**
 * Correct answers must be spread across the four positions (PLAN §4): for quizzes with
 * at least {@link SPREAD_MIN_QUESTIONS} questions, no position may hold more than
 * {@link SPREAD_MAX_SHARE} of them.
 * @param {{ questions?: unknown }} quiz
 * @returns {{ ok: boolean, position: number, count: number, total: number, share: number }}
 */
export function checkCorrectAnswerSpread(quiz) {
  const positions = correctAnswerPositions(quiz).filter((index) => index >= 0);
  const total = positions.length;
  /** @type {Map<number, number>} */
  const counts = new Map();
  for (const position of positions) counts.set(position, (counts.get(position) ?? 0) + 1);

  let worstPosition = -1;
  let worstCount = 0;
  for (const [position, count] of counts) {
    if (count > worstCount) {
      worstCount = count;
      worstPosition = position;
    }
  }
  const share = total === 0 ? 0 : worstCount / total;
  const ok = total < SPREAD_MIN_QUESTIONS || share <= SPREAD_MAX_SHARE;
  return { ok, position: worstPosition, count: worstCount, total, share };
}

/**
 * @param {ReturnType<typeof createErrors>} errors
 * @param {unknown} question
 * @param {string} path
 */
function validateQuestion(errors, question, path) {
  if (!isPlainObject(question)) {
    errors.add(path, 'must be an object');
    return;
  }
  checkNoUnknownFields(errors, question, QUESTION_FIELDS, `${path}.`);

  const { id, text, options, correct, explanation } = /** @type {Record<string, unknown>} */ (
    question
  );

  if (checkText(errors, id, `${path}.id`, MAX_LENGTH.questionId) && !SLUG.test(String(id))) {
    errors.add(`${path}.id`, 'must use lowercase letters, digits and single hyphens');
  }
  checkText(errors, text, `${path}.text`, MAX_LENGTH.questionText);
  checkText(errors, explanation, `${path}.explanation`, MAX_LENGTH.explanation);

  if (!Array.isArray(options)) {
    errors.add(`${path}.options`, 'must be an array');
  } else {
    if (options.length !== OPTIONS_PER_QUESTION) {
      errors.add(
        `${path}.options`,
        `must have exactly ${OPTIONS_PER_QUESTION} options (has ${options.length})`,
      );
    }
    const seen = new Set();
    options.forEach((option, index) => {
      const optionPath = `${path}.options[${index}]`;
      if (!isPlainObject(option)) {
        errors.add(optionPath, 'must be an object');
        return;
      }
      checkNoUnknownFields(errors, option, OPTION_FIELDS, `${optionPath}.`);
      const optionId = /** @type {Record<string, unknown>} */ (option).id;
      if (
        checkText(errors, optionId, `${optionPath}.id`, MAX_LENGTH.optionId) &&
        !SHORT_ID.test(String(optionId))
      ) {
        errors.add(`${optionPath}.id`, 'must use lowercase letters and digits only');
      }
      if (typeof optionId === 'string') {
        if (seen.has(optionId)) {
          errors.add(`${optionPath}.id`, `duplicates another option id ("${optionId}")`);
        }
        seen.add(optionId);
      }
      checkText(
        errors,
        /** @type {Record<string, unknown>} */ (option).text,
        `${optionPath}.text`,
        MAX_LENGTH.optionText,
      );
    });

    if (checkText(errors, correct, `${path}.correct`, MAX_LENGTH.optionId) && !seen.has(correct)) {
      errors.add(`${path}.correct`, `"${String(correct)}" is not one of the option ids`);
    }
  }
}

/**
 * Validate a parsed quiz file against every rule in PLAN §4.
 * @param {unknown} quiz
 * @param {{ fileName?: string }} [options] pass the file name to check `id` against it
 * @returns {QuizValidationResult}
 */
export function validateQuiz(quiz, options = {}) {
  const errors = createErrors();

  if (!isPlainObject(quiz)) {
    errors.add('', 'quiz must be a JSON object');
    return { valid: false, errors: errors.list };
  }
  checkNoUnknownFields(errors, quiz, QUIZ_FIELDS, '');

  const quizRecord = /** @type {Record<string, unknown>} */ (quiz);
  const { id, version, active, title, description, language, createdAt, source, questions } =
    quizRecord;

  if (checkText(errors, id, 'id', MAX_LENGTH.id)) {
    const text = String(id);
    if (!SLUG.test(text)) {
      errors.add('id', 'must use lowercase letters, digits and single hyphens');
    } else if (text.length < MIN_ID_LENGTH) {
      errors.add('id', `must be at least ${MIN_ID_LENGTH} characters`);
    }
    if (options.fileName !== undefined) {
      const expected = quizIdFromFileName(options.fileName);
      if (text !== expected) {
        errors.add('id', `must equal the file name without .json ("${expected}")`);
      }
    }
  }

  if (!Number.isInteger(version) || Number(version) < 1) {
    errors.add('version', 'must be an integer of 1 or more');
  }
  if (typeof active !== 'boolean') errors.add('active', 'must be true or false');

  checkText(errors, title, 'title', MAX_LENGTH.title);
  checkText(errors, description, 'description', MAX_LENGTH.description);
  if (source !== undefined) checkText(errors, source, 'source', MAX_LENGTH.source);

  if (typeof language !== 'string' || !LANGUAGES.includes(language)) {
    errors.add('language', `must be one of ${LANGUAGES.join(', ')}`);
  }

  if (checkText(errors, createdAt, 'createdAt', 10)) {
    const text = String(createdAt);
    if (!ISO_DATE.test(text) || !isRealDate(text)) {
      errors.add('createdAt', 'must be a real date in YYYY-MM-DD form');
    }
  }

  if (!Array.isArray(questions)) {
    errors.add('questions', 'must be an array');
  } else {
    if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
      errors.add(
        'questions',
        `must have between ${MIN_QUESTIONS} and ${MAX_QUESTIONS} questions (has ${questions.length})`,
      );
    }
    const seen = new Set();
    questions.forEach((question, index) => {
      validateQuestion(errors, question, `questions[${index}]`);
      const questionId = /** @type {Record<string, unknown>} */ (question ?? {})?.id;
      if (typeof questionId === 'string') {
        if (seen.has(questionId)) {
          errors.add(`questions[${index}].id`, `duplicates another question id ("${questionId}")`);
        }
        seen.add(questionId);
      }
    });

    const spread = checkCorrectAnswerSpread(quizRecord);
    if (!spread.ok) {
      errors.add(
        'questions',
        `correct answers are clustered: ${spread.count} of ${spread.total} are option ` +
          `${spread.position + 1}; no position may hold more than ${SPREAD_MAX_SHARE * 100} %`,
      );
    }
  }

  return { valid: errors.list.length === 0, errors: errors.list };
}

/**
 * @param {QuizError[]} errors
 * @returns {string} one problem per line, prefixed with its path
 */
export function formatQuizErrors(errors) {
  return errors.map(({ path, message }) => `  - ${path ? `${path}: ` : ''}${message}`).join('\n');
}

/**
 * @param {unknown} quiz
 * @param {{ fileName?: string }} [options]
 * @returns {object} the quiz, when valid
 * @throws {Error} listing every problem, when not
 */
export function assertValidQuiz(quiz, options = {}) {
  const { valid, errors } = validateQuiz(quiz, options);
  if (!valid) {
    const where = options.fileName ? ` in ${options.fileName}` : '';
    throw new Error(`Invalid quiz${where}:\n${formatQuizErrors(errors)}`);
  }
  return /** @type {object} */ (quiz);
}
