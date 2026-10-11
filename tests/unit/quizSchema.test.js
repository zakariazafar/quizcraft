// @ts-check
import { describe, expect, it } from 'vitest';
import { quizSchema, validateQuizSchema } from '../../scripts/lib/quizSchema.js';
import { MAX_LENGTH, OPTIONS_PER_QUESTION, validateQuiz } from '../../src/lib/validate.js';
import { loadFixture } from '../helpers/fixtures.js';

describe('quiz.schema.json', () => {
  it('is a draft 2020-12 schema that forbids unknown fields', () => {
    expect(quizSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(quizSchema.additionalProperties).toBe(false);
    expect(quizSchema.$defs.question.additionalProperties).toBe(false);
    expect(quizSchema.$defs.option.additionalProperties).toBe(false);
  });

  it('keeps its limits in step with src/lib/validate.js', () => {
    const { properties, $defs } = quizSchema;
    expect(properties.id.maxLength).toBe(MAX_LENGTH.id);
    expect(properties.title.maxLength).toBe(MAX_LENGTH.title);
    expect(properties.description.maxLength).toBe(MAX_LENGTH.description);
    expect(properties.source.maxLength).toBe(MAX_LENGTH.source);
    expect($defs.question.properties.id.maxLength).toBe(MAX_LENGTH.questionId);
    expect($defs.question.properties.text.maxLength).toBe(MAX_LENGTH.questionText);
    expect($defs.question.properties.explanation.maxLength).toBe(MAX_LENGTH.explanation);
    expect($defs.option.properties.id.maxLength).toBe(MAX_LENGTH.optionId);
    expect($defs.option.properties.text.maxLength).toBe(MAX_LENGTH.optionText);
    expect($defs.question.properties.options.minItems).toBe(OPTIONS_PER_QUESTION);
    expect($defs.question.properties.options.maxItems).toBe(OPTIONS_PER_QUESTION);
  });

  it('accepts the valid fixtures', () => {
    for (const name of ['arabic-quiz.json', 'mixed-quiz.json']) {
      expect(validateQuizSchema(loadFixture(name))).toEqual({ valid: true, errors: [] });
    }
  });

  it.each([
    ['bad-missing-fields.json', "must have required property 'active'"],
    ['bad-three-options.json', 'must NOT have fewer than 4 items'],
    ['bad-five-options.json', 'must NOT have more than 4 items'],
    ['bad-empty-explanation.json', 'must NOT have fewer than 1 characters'],
    ['bad-language.json', 'must be equal to one of the allowed values'],
    ['bad-extra-field.json', 'must NOT have additional properties'],
  ])('rejects the structural fault in %s', (name, expected) => {
    const { valid, errors } = validateQuizSchema(loadFixture(name));
    expect(valid).toBe(false);
    expect(errors.map((e) => e.message)).toContain(expected);
  });

  it.each([
    'bad-correct-not-option.json',
    'bad-duplicate-question-ids.json',
    'bad-duplicate-option-ids.json',
    'bad-id-mismatch.json',
    'bad-not-nfc.json',
    'bad-whitespace.json',
    'bad-clustered-answers.json',
  ])('leaves the semantic fault in %s to validate.js', (name) => {
    const fixture = loadFixture(name);
    expect(validateQuizSchema(fixture).valid).toBe(true);
    expect(validateQuiz(fixture, { fileName: name }).valid).toBe(false);
  });
});
