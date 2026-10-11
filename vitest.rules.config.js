import { defineConfig } from 'vitest/config';

// Firestore security rules tests; need the emulator (npm run test:rules starts it).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
