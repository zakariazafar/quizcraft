import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

/**
 * Same rewrites as render.yaml, for `npm run dev` and `npm run preview`:
 * /q/<id> → quiz.html, /dashboard → dashboard.html.
 */
export function rewriteUrl(url) {
  const [path, query = ''] = url.split('?');
  const q = query ? `?${query}` : '';
  if (/^\/q\/[^/]+\/?$/.test(path)) return `/quiz.html${q}`;
  if (/^\/dashboard\/?$/.test(path)) return `/dashboard.html${q}`;
  return url;
}

const rewrites = {
  name: 'quizcraft-rewrites',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      req.url = rewriteUrl(req.url);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      req.url = rewriteUrl(req.url);
      next();
    });
  },
};

export default defineConfig({
  plugins: [rewrites],
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
