// Quiz owners: dashboard against the Auth and Firestore emulators.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { DASHBOARD_PASSWORD, createDashboardUser, resetEmulators, takeQuiz } from './helpers.js';

const ism = JSON.parse(readFileSync('quizzes/ism-four-properties.json', 'utf8'));
const allRight = Object.fromEntries(ism.questions.map((q) => [q.id, q.correct]));

test.beforeEach(async ({ page }) => {
  await resetEmulators();
  await createDashboardUser();
  await takeQuiz(page, ism.id, { name: 'زكريا', email: 'zakaria@example.com', answers: allRight });
  await expect(page.locator('#save-status')).toHaveText('Your result has been saved.');
  const half = Object.fromEntries(ism.questions.slice(0, 10).map((q) => [q.id, q.correct]));
  await takeQuiz(page, ism.id, {
    name: '=HYPERLINK("http://evil.example","x")',
    email: 'amina@example.com',
    answers: half,
  });
  await expect(page.locator('#save-status')).toHaveText('Your result has been saved.');
});

async function signIn(page, password = DASHBOARD_PASSWORD) {
  await page.goto('/dashboard');
  await page.getByLabel('Dashboard password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('a wrong password is refused', async ({ page }) => {
  await signIn(page, 'wrong-password');
  await expect(page.locator('#dashboard-password-error')).toContainText('not right');
});

test('the dashboard lists quizzes, shows attempts and re-checked scores', async ({ page }) => {
  await signIn(page);
  const row = page.locator('tbody tr', { hasText: ism.id });
  await expect(row).toContainText('2'); // attempts
  await expect(row).toContainText('75%'); // (100 + 50) / 2
  await expect(row.locator('.status')).toHaveText('Open');

  await row.getByRole('button', { name: /Properties/ }).click();
  await expect(page).toHaveURL(/#\/quiz\/ism-four-properties$/);
  await expect(page.locator('.tile')).toHaveText([
    'Attempts2',
    'Takers2',
    'Average75%',
    'Highest100%',
    'Lowest50%',
  ]);
  const zak = page.locator('.table-wrap tbody tr', { hasText: 'zakaria@example.com' });
  await expect(zak).toContainText('20 / 20');
  await zak.getByRole('button', { name: 'Answers' }).click();
  await expect(page.locator('tr.detail .answer.ok')).toHaveCount(20);

  await page.getByLabel('Search').fill('amina');
  await expect(page.locator('.count')).toHaveText('1 attempt');
  await expect(page.locator('.qstat')).toHaveCount(20);
});

test('Share copies the public quiz link', async ({ page }) => {
  // Headless browsers may refuse the real clipboard, so record what the page copies.
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t) => void window.__copied.push(t) },
    });
  });
  await signIn(page);
  await page.locator(`[data-share="${ism.id}"]`).click();
  await expect(page.locator('.share-note').first()).toHaveText('Link copied');
  expect(await page.evaluate(() => window.__copied)).toEqual([`http://127.0.0.1:4173/q/${ism.id}`]);
});

test('Share shows the link to copy by hand when the browser blocks copying', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => Promise.reject(new Error('blocked')) },
    });
  });
  await signIn(page);
  await page.locator(`[data-share="${ism.id}"]`).click();
  const field = page.getByLabel('Quiz link');
  await expect(field).toHaveValue(`http://127.0.0.1:4173/q/${ism.id}`);
  await expect(field).toBeFocused();
});

test('CSV and JSON downloads contain the attempts (Arabic intact, formulas neutralised)', async ({
  page,
}) => {
  await signIn(page);
  await page.locator(`[data-open="${ism.id}"]`).click();
  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download CSV' }).click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(/^ism-four-properties-attempts-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = readFileSync(await csv.path(), 'utf8');
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain('زكريا');
  expect(text).toContain(`"'=HYPERLINK(""http://evil.example"",""x"")"`);

  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download JSON' }).click(),
  ]);
  const records = JSON.parse(readFileSync(await json.path(), 'utf8'));
  expect(records).toHaveLength(2);
  expect(records.map((r) => r.takerEmail).sort()).toEqual([
    'amina@example.com',
    'zakaria@example.com',
  ]);
});

test('signing out returns to the password screen', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Quizzes' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Dashboard password')).toBeVisible();
});
