// Progressive Web App basics: manifest, icons, service worker, and that a page you've
// already visited still renders when the network goes away. No Firebase calls here, so
// these do not need the emulators.
import { expect, test } from '@playwright/test';

test('every page links a valid manifest and an apple touch icon', async ({ page, request }) => {
  for (const path of ['/', '/q/no-such-quiz', '/dashboard', '/no-such-page']) {
    await page.goto(path);
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('/manifest.webmanifest');
    const appleIconHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(appleIconHref).toBe('/apple-touch-icon.png');
  }

  const manifestRes = await request.get('/manifest.webmanifest');
  expect(manifestRes.ok()).toBe(true);
  const manifest = await manifestRes.json();
  expect(manifest).toMatchObject({ name: 'QuizCraft', display: 'standalone' });
  expect(manifest.icons.length).toBeGreaterThan(0);
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.ok(), `icon not served: ${icon.src}`).toBe(true);
  }

  const appleIconRes = await request.get('/apple-touch-icon.png');
  expect(appleIconRes.ok()).toBe(true);
});

test('the service worker registers and activates', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error('service worker never became active');
  });
  const swCount = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistrations()).length,
  );
  expect(swCount).toBeGreaterThan(0);
});

test('a previously visited page still renders when the network goes away', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'QuizCraft' })).toBeVisible();
  await context.setOffline(false);
});
