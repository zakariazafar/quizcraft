import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        quiz: resolve(root, 'quiz.html'),
        dashboard: resolve(root, 'dashboard.html'),
        notFound: resolve(root, '404.html'),
      },
    },
  },
});
