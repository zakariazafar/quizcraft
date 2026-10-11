// Invalid quiz files (from the phase-1-quiz-format-v2 branch): each must be rejected for the
// expected reason, using the file name as the quiz id, exactly as the build does.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateQuiz } from '../../src/lib/validate.js';

const cases = [
  ['bad-clustered-answers', /clustered/],
  ['bad-correct-not-option', /correct must be the id of one of its options/],
  ['bad-duplicate-option-ids', /used more than once in this question/],
  ['bad-duplicate-question-ids', /"q1" is used more than once/],
  ['bad-empty-explanation', /explanation must be a non-empty string/],
  ['bad-extra-field', /unknown field "secretAnswerKey"/],
  ['bad-five-options', /exactly 4 options/],
  ['bad-id-mismatch', /must match the file name "bad-id-mismatch.json"/],
  ['bad-language', /language must be/],
  ['bad-missing-fields', /active must be true or false/],
  ['bad-not-nfc', /not NFC-normalised/],
  ['bad-three-options', /exactly 4 options/],
  ['bad-whitespace', /leading or trailing spaces/],
];

describe('invalid quiz fixtures', () => {
  it.each(cases)('%s.json is rejected', (name, pattern) => {
    const quiz = JSON.parse(readFileSync(`tests/fixtures/${name}.json`, 'utf8'));
    expect(validateQuiz(quiz, { fileId: name }).join('\n')).toMatch(pattern);
  });
});
