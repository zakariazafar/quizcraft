#!/usr/bin/env node
// Usage: node scripts/check-changelog.mjs [range]   (default origin/main..HEAD)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  CHANGELOG_FILE,
  findCommitsMissingChangelog,
  normaliseRange,
  parseGitLog,
  validateChangelog,
} from './lib/changelog.js';

const range = normaliseRange(process.argv[2]);
const log = execFileSync('git', ['log', '--format=%x00%H %P', '--name-only', range], {
  encoding: 'utf8',
});
const missing = findCommitsMissingChangelog(parseGitLog(log));
const problems = validateChangelog(readFileSync(CHANGELOG_FILE, 'utf8'));

for (const c of missing) console.error(`✗ ${c.sha.slice(0, 8)} does not update ${CHANGELOG_FILE}`);
for (const p of problems) console.error(`✗ ${CHANGELOG_FILE}: ${p}`);

if (missing.length || problems.length) process.exit(1);
console.log(`✓ Changelog check passed for ${range}`);
