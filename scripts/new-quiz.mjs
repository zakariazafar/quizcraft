#!/usr/bin/env node
/**
 * Scaffolds quizzes/<quiz-id>.json, ready to be filled in.
 *
 * Usage: npm run new-quiz -- <quiz-id> [--questions 10] [--language en|ar|mixed]
 *                            [--title "A title"] [--dir quizzes]
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_QUESTION_COUNT, newQuizTemplate } from './lib/quizTemplate.js';

const USAGE =
  'Usage: npm run new-quiz -- <quiz-id> [--questions <n>] [--language en|ar|mixed] ' +
  '[--title "A title"] [--dir <folder>]';

/** @param {string[]} argv */
function parseArgs(argv) {
  /** @type {{ id?: string, questions: number, language: string, title?: string, dir: string }} */
  const options = { questions: DEFAULT_QUESTION_COUNT, language: 'en', dir: 'quizzes' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--questions') options.questions = Number(argv[++i]);
    else if (arg === '--language') options.language = argv[++i];
    else if (arg === '--title') options.title = argv[++i];
    else if (arg === '--dir') options.dir = argv[++i];
    else if (arg.startsWith('-') || options.id !== undefined) fail(`Unexpected argument: ${arg}`);
    else options.id = arg;
  }
  if (!options.id) fail('A quiz id is required.');
  return options;
}

/** @param {string} message */
function fail(message) {
  console.error(`✗ ${message}\n${USAGE}`);
  process.exit(2);
}

const options = parseArgs(process.argv.slice(2));
const path = join(options.dir, `${options.id}.json`);

if (existsSync(path)) {
  console.error(`✗ ${path} already exists. Edit it, or pick another id.`);
  process.exit(1);
}

let quiz;
try {
  quiz = newQuizTemplate({
    id: /** @type {string} */ (options.id),
    questionCount: options.questions,
    language: options.language,
    title: options.title,
  });
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exit(2);
}

writeFileSync(path, `${JSON.stringify(quiz, null, 2)}\n`, 'utf8');
console.log(`✓ Wrote ${path} (${options.questions} questions, ${options.language}, active: false)`);
console.log(
  '  Next: fill in the questions, set "active": true, then run npm test && npm run build',
);
