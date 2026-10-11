// @ts-check
/**
 * Scaffold for a new quiz file, behind `npm run new-quiz -- <quiz-id>`
 * (CLAUDE.md → "How to add a quiz").
 *
 * The scaffold is deliberately **valid** so `npm run build` keeps working while the
 * quiz is being written, and `active: false` so an unfinished quiz cannot go live.
 */
import { LANGUAGES, MAX_QUESTIONS, assertValidQuiz } from '../../src/lib/validate.js';

/** Default number of questions (CLAUDE.md). */
export const DEFAULT_QUESTION_COUNT = 10;

const OPTION_IDS = ['a', 'b', 'c', 'd'];

const ENGLISH_PLACEHOLDERS = {
  description: 'Replace this with one or two sentences describing the quiz.',
  question: (/** @type {number} */ n) =>
    `Question ${n}: replace this with a question taken from the source content.`,
  option: (/** @type {string} */ letter) =>
    `Option ${letter}: replace this with a plausible answer.`,
  explanation: (/** @type {string} */ letter) =>
    `Say in one to three sentences why option ${letter} is correct, based on the source content.`,
  source: 'Replace this with where the questions came from.',
};

/** Placeholder text per quiz language, so an Arabic quiz starts out in Arabic. */
const PLACEHOLDERS = {
  en: ENGLISH_PLACEHOLDERS,
  mixed: ENGLISH_PLACEHOLDERS,
  ar: {
    description: 'ضَعْ هُنَا وَصْفًا قَصِيرًا لِلاخْتِبَارِ فِي جُمْلَةٍ أَوْ جُمْلَتَيْنِ.',
    question: (/** @type {number} */ n) =>
      `السُّؤَالُ ${n}: ضَعْ هُنَا نَصَّ السُّؤَالِ مِنَ الْمُحْتَوَى.`,
    option: (/** @type {string} */ letter) =>
      `الْخِيَارُ ${letter}: ضَعْ هُنَا إِجَابَةً مُحْتَمَلَةً.`,
    explanation: (/** @type {string} */ letter) =>
      `اذْكُرْ فِي جُمْلَةٍ إِلَى ثَلَاثٍ لِمَاذَا الْخِيَارُ ${letter} هُوَ الصَّحِيحُ اعْتِمَادًا عَلَى الْمُحْتَوَى.`,
    source: 'ضَعْ هُنَا مَصْدَرَ الْأَسْئِلَةِ.',
  },
};

/**
 * `tajweed-basics-01` → `Tajweed Basics 01`.
 * @param {string} id
 * @returns {string}
 */
export function titleFromId(id) {
  return id
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** @returns {string} today as YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {{
 *   id: string,
 *   questionCount?: number,
 *   language?: string,
 *   title?: string,
 *   createdAt?: string,
 * }} options
 * @returns {object} a valid quiz ready to be filled in
 * @throws {Error} when the id, language or question count cannot produce a valid quiz
 */
export function newQuizTemplate({
  id,
  questionCount = DEFAULT_QUESTION_COUNT,
  language = 'en',
  title,
  createdAt = today(),
}) {
  if (!LANGUAGES.includes(language)) {
    throw new Error(`language must be one of ${LANGUAGES.join(', ')} (got "${language}")`);
  }
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > MAX_QUESTIONS) {
    throw new Error(`questionCount must be a whole number between 1 and ${MAX_QUESTIONS}`);
  }

  const text = PLACEHOLDERS[/** @type {'ar' | 'en' | 'mixed'} */ (language)];
  const quiz = {
    id,
    version: 1,
    active: false,
    title: title ?? titleFromId(id),
    description: text.description,
    language,
    createdAt,
    source: text.source,
    // Cycling the correct option keeps the answers spread across all four positions.
    questions: Array.from({ length: questionCount }, (_, index) => {
      const correct = OPTION_IDS[index % OPTION_IDS.length];
      return {
        id: `q${index + 1}`,
        text: text.question(index + 1),
        options: OPTION_IDS.map((optionId) => ({
          id: optionId,
          text: text.option(optionId.toUpperCase()),
        })),
        correct,
        explanation: text.explanation(correct),
      };
    }),
  };

  return assertValidQuiz(quiz, { fileName: `${id}.json` });
}
