// @ts-check
import { QUIZ_ID_PATTERN } from '../../src/lib/validate.js';

/**
 * Build a starter quiz object (not yet valid: the placeholder texts must be replaced).
 * @param {string} id
 * @param {string} today YYYY-MM-DD
 */
export function scaffoldQuiz(id, today) {
  if (!QUIZ_ID_PATTERN.test(id)) {
    throw new Error(`Invalid quiz id "${id}": use 3–60 lowercase letters, digits or hyphens.`);
  }
  return {
    $schema: '../schema/quiz.schema.json',
    id,
    version: 1,
    active: true,
    title: 'TODO title',
    description: 'TODO description',
    language: 'en',
    createdAt: today,
    source: 'TODO where the content came from',
    questions: [
      {
        id: 'q1',
        text: 'TODO question',
        options: [
          { id: 'a', text: 'TODO option A' },
          { id: 'b', text: 'TODO option B' },
          { id: 'c', text: 'TODO option C' },
          { id: 'd', text: 'TODO option D' },
        ],
        correct: 'a',
        explanation: 'TODO why the correct option is right',
      },
    ],
  };
}

/**
 * Today's date in YYYY-MM-DD for a given time zone.
 * @param {Date} [now]
 * @param {string} [timeZone]
 */
export function todayIn(now = new Date(), timeZone = 'Australia/Sydney') {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}
