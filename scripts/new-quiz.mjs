#!/usr/bin/env node
// Usage: npm run new-quiz -- <quiz-id>
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scaffoldQuiz, todayIn } from './lib/newQuiz.js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: npm run new-quiz -- <quiz-id>');
  process.exit(1);
}
const path = join('quizzes', `${id}.json`);
if (existsSync(path)) {
  console.error(`✗ ${path} already exists.`);
  process.exit(1);
}
try {
  writeFileSync(path, JSON.stringify(scaffoldQuiz(id, todayIn()), null, 2) + '\n');
} catch (err) {
  console.error(`✗ ${/** @type {Error} */ (err).message}`);
  process.exit(1);
}
console.log(`✓ Created ${path}. Replace every TODO, then run npm test.`);
