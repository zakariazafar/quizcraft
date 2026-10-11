import { defineConfig, devices } from '@playwright/test';

// End-to-end tests: the built site (production headers via `vite preview`) against the
// Firebase emulators. Run with `npm run test:e2e`, which starts the emulators first.
const env = {
  VITE_USE_EMULATORS: 'true',
  VITE_EMULATOR_HOST: '127.0.0.1',
  VITE_DASHBOARD_EMAIL: 'dashboard@quizcraft.test',
  VITE_SITE_URL: 'http://127.0.0.1:4173',
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env,
  },
});
