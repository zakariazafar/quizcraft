// Quiz takers: full flow against the built site and the Firestore emulator.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { listAttempts, resetEmulators, takeQuiz } from './helpers.js';

const ism = JSON.parse(readFileSync('quizzes/ism-four-properties.json', 'utf8'));
const tajweed = JSON.parse(readFileSync('quizzes/tajweed-basics-01.json', 'utf8'));
const allRight = (quiz) => Object.fromEntries(quiz.questions.map((q) => [q.id, q.correct]));
const wrongOption = (q) => q.options.find((o) => o.id !== q.correct);

test.beforeEach(async () => {
  await resetEmulators();
});

test('a taker sees their score and a review, and the attempt is saved', async ({ page }) => {
  const q7 = ism.questions[6];
  const answers = { ...allRight(ism), q7: wrongOption(q7).id };
  delete answers.q20;

  await takeQuiz(page, ism.id, { name: 'زكريا Zakaria', email: 'Zakaria@Example.com', answers });

  await expect(page.locator('.score')).toHaveText('زكريا Zakaria, you scored 18 out of 20 (90%).');
  await expect(page.getByRole('heading', { name: '2 to review' })).toBeVisible();
  const review = page.locator('.review-item').first();
  await expect(review.locator('.right')).toHaveText(
    q7.options.find((o) => o.id === q7.correct).text,
  );
  await expect(review.locator('.why')).toHaveText(q7.explanation);
  await expect(page.locator('.review-item').nth(1).locator('.not-answered')).toHaveText(
    'Not answered',
  );
  await expect(page.locator('#save-status')).toHaveText('Your result has been saved.');

  const saved = await listAttempts();
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    quizId: ism.id,
    quizVersion: 1,
    quizTitle: ism.title,
    takerName: 'زكريا Zakaria',
    takerEmail: 'Zakaria@Example.com',
    takerEmailLower: 'zakaria@example.com',
    score: 18,
    total: 20,
    percent: 90,
  });
  expect(saved[0].answers).toHaveLength(20);
  expect(saved[0].answers[19]).toEqual({ questionId: 'q20', selected: null, correct: false });
  expect(saved[0].submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('an Arabic quiz is shown right to left and keeps its diacritics', async ({ page }) => {
  await page.goto(`/q/${tajweed.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(tajweed.title);
  await page.getByLabel('Your name').fill('مريم');
  await page.getByLabel('Your email').fill('maryam@example.com');
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.locator('.questions')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.q-text').first()).toHaveText(tajweed.questions[0].text);
  const fontReady = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Amiri Quran"', 'اسم');
  });
  expect(fontReady).toBe(true);
});

test('submitting with unanswered questions asks first', async ({ page }) => {
  await page.goto(`/q/${tajweed.id}`);
  await page.getByLabel('Your name').fill('A');
  await page.getByLabel('Your email').fill('a@example.com');
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await page.locator(`input[name="q1"][value="${tajweed.questions[0].correct}"]`).check();
  await expect(page.locator('.progress-text')).toHaveText(
    `1 of ${tajweed.questions.length} answered`,
  );
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.locator('.confirm')).toContainText('4 questions are not answered (2, 3, 4, 5)');
  await page.getByRole('button', { name: 'Go to question 2' }).click();
  await expect(page.locator('input[name="q2"]').first()).toBeFocused();
});

test('the form explains missing or bad details', async ({ page }) => {
  await page.goto(`/q/${ism.id}`);
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.locator('#taker-name-error')).toHaveText('Enter your name.');
  await page.getByLabel('Your name').fill('A');
  await page.getByLabel('Your email').fill('not-an-email');
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.locator('#taker-email-error')).toContainText('name@example.com');
});

test('an attempt made offline is saved the next time a quiz opens', async ({ page }) => {
  await page.route('**/127.0.0.1:8080/**', (route) => route.abort());
  await takeQuiz(page, tajweed.id, {
    name: 'Offline',
    email: 'offline@example.com',
    answers: allRight(tajweed),
  });
  await expect(page.locator('#save-status')).toContainText('not saved yet', { timeout: 20_000 });
  expect(await listAttempts()).toHaveLength(0);

  await page.unroute('**/127.0.0.1:8080/**');
  await page.goto(`/q/${ism.id}`);
  await expect.poll(async () => (await listAttempts()).length, { timeout: 15_000 }).toBe(1);
  expect((await listAttempts())[0]).toMatchObject({ takerName: 'Offline', score: 5, total: 5 });
});

test('a closed quiz, a wrong quiz link and an unknown page all explain themselves', async ({
  page,
}) => {
  await page.route(`**/quizzes/${ism.id}.json`, async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: { ...(await res.json()), active: false } });
  });
  await page.goto(`/q/${ism.id}`);
  await expect(page.locator('main')).toContainText('This quiz is closed');

  await page.goto('/q/no-such-quiz');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quiz not found');

  const res = await page.goto('/no-such-page');
  expect(res.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});

test('pages are served with the security headers and break no CSP rule', async ({ page }) => {
  const violations = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  const res = await page.goto(`/q/${ism.id}`);
  const headers = res.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  await takeQuiz(page, ism.id, { name: 'CSP', email: 'csp@example.com', answers: allRight(ism) });
  await expect(page.locator('.perfect')).toBeVisible();
  expect(violations).toEqual([]);
});
