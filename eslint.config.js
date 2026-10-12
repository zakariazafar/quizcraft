import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Service worker: a separate global scope from the page (self, caches, …), no DOM.
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent (XSS rule in CLAUDE.md).' },
      ],
    },
  },
];
