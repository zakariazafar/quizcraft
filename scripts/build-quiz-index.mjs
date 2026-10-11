#!/usr/bin/env node
// Validates quizzes/*.json, copies them to public/quizzes/ and writes public/quizzes/index.json.
// Runs automatically before `npm run dev` and `npm run build`.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { buildQuizIndex } from './lib/quizIndex.js';

const SRC = 'quizzes';
const OUT = join('public', 'quizzes');

const files = readdirSync(SRC)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const fileId = basename(f, '.json');
    try {
      return { fileId, quiz: JSON.parse(readFileSync(join(SRC, f), 'utf8')) };
    } catch (err) {
      return { fileId, quiz: null, parseError: /** @type {Error} */ (err).message };
    }
  });

const parseErrors = files
  .filter((f) => 'parseError' in f)
  .map((f) => `quizzes/${f.fileId}.json: invalid JSON (${f.parseError})`);
const { errors, index } = buildQuizIndex(files.filter((f) => !('parseError' in f)));
const all = [...parseErrors, ...errors];

if (all.length) {
  for (const e of all) console.error(`✗ ${e}`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const { fileId, quiz } of files) {
  writeFileSync(join(OUT, `${fileId}.json`), JSON.stringify(quiz));
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
console.log(`✓ ${index.length} quiz(zes) validated and published to ${OUT}/`);
