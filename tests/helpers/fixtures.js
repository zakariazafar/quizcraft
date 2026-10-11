// @ts-check
/** Loaders for the quiz fixtures in tests/fixtures (see PLAN §11). */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));

/**
 * @param {string} name file name inside tests/fixtures
 * @returns {any} the parsed quiz
 */
export function loadFixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8'));
}

/** @returns {string[]} every fixture file name, sorted */
export function fixtureNames() {
  return readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
}
