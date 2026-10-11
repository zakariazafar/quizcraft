#!/usr/bin/env node
/**
 * Validates every file in quizzes/ and publishes them to public/quizzes/
 * (one <id>.json per quiz plus index.json). Runs before `vite build` and `vite dev`.
 *
 * Usage: node scripts/build-quiz-index.mjs [--check] [--quizzes <dir>] [--out <dir>]
 *   --check   validate only, write nothing
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildQuizIndex } from './lib/quizIndex.js';

/** @param {string[]} argv */
function parseArgs(argv) {
  const options = { check: false, quizzes: 'quizzes', out: join('public', 'quizzes') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') options.check = true;
    else if (argv[i] === '--quizzes') options.quizzes = argv[++i];
    else if (argv[i] === '--out') options.out = argv[++i];
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(2);
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));

let sources = [];
try {
  sources = readdirSync(options.quizzes)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({
      fileName: join(options.quizzes, name),
      text: readFileSync(join(options.quizzes, name), 'utf8'),
    }));
} catch (error) {
  console.error(`✗ Cannot read ${options.quizzes}/: ${error.message}`);
  process.exit(1);
}

let built;
try {
  built = buildQuizIndex(sources);
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exit(1);
}

const count = built.index.quizzes.length;
if (options.check) {
  console.log(`✓ ${count} quiz file(s) in ${options.quizzes}/ are valid`);
  process.exit(0);
}

rmSync(options.out, { recursive: true, force: true });
mkdirSync(options.out, { recursive: true });
for (const { quiz } of built.files) {
  writeFileSync(join(options.out, `${quiz.id}.json`), `${JSON.stringify(quiz)}\n`, 'utf8');
}
writeFileSync(join(options.out, 'index.json'), `${JSON.stringify(built.index)}\n`, 'utf8');
console.log(`✓ ${count} quiz file(s) → ${options.out}/ (with index.json)`);
