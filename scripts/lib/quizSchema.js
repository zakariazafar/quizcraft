// @ts-check
/**
 * Ajv wrapper around `schema/quiz.schema.json`.
 *
 * Node-only (Ajv is a dev dependency): the build script and the tests use it as a
 * second opinion on the structural rules, so the schema file that quiz authors and
 * editors rely on can never drift away from `src/lib/validate.js`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const SCHEMA_PATH = fileURLToPath(new URL('../../schema/quiz.schema.json', import.meta.url));

/** The parsed JSON Schema. */
export const quizSchema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const compiled = ajv.compile(quizSchema);

/**
 * @param {unknown} quiz
 * @returns {{ valid: boolean, errors: { path: string, message: string }[] }}
 */
export function validateQuizSchema(quiz) {
  const valid = compiled(quiz) === true;
  const errors = (compiled.errors ?? []).map((error) => ({
    path: error.instancePath.replace(/^\//, '').replace(/\//g, '.'),
    message: error.message ?? 'does not match the schema',
  }));
  return { valid, errors };
}
