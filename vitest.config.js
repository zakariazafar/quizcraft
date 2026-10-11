import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js', 'tests/quizzes/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.js', 'scripts/lib/**/*.js'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
