import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import {
  applyRewrites,
  extendCsp,
  headersFor,
  readRenderConfig,
} from './scripts/lib/renderConfig.js';

const root = import.meta.dirname;
const render = readRenderConfig(readFileSync(resolve(root, 'render.yaml'), 'utf8'));

/** Same rewrites as render.yaml (used by `npm run dev` and `npm run preview`). */
export function rewriteUrl(url) {
  return applyRewrites(url, render.routes);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, 'VITE_');
  const emulatorHost = env.VITE_EMULATOR_HOST || '127.0.0.1';
  const emulatorOrigins =
    env.VITE_USE_EMULATORS === 'true'
      ? [`http://${emulatorHost}:8080`, `http://${emulatorHost}:9099`]
      : [];

  const plugin = {
    name: 'quizcraft-render',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewriteUrl(req.url);
        next();
      });
    },
    // Preview serves the production build with production headers (CSP etc.).
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url.split('?')[0];
        for (const [name, value] of Object.entries(headersFor(path, render.headers))) {
          const v =
            name === 'Content-Security-Policy' && emulatorOrigins.length
              ? extendCsp(value, 'connect-src', emulatorOrigins)
              : value;
          if (name !== 'Strict-Transport-Security') res.setHeader(name, v);
        }
        req.url = rewriteUrl(req.url);
        // Unknown paths get the custom 404 page with status 404, like Render.
        const target = req.url.split('?')[0];
        const file = resolve(root, 'dist', `.${target}`);
        const exists =
          existsSync(file) || existsSync(`${file}.html`) || existsSync(resolve(file, 'index.html'));
        if (!exists && existsSync(resolve(root, 'dist/404.html'))) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(readFileSync(resolve(root, 'dist/404.html')));
          return;
        }
        next();
      });
    },
  };

  return {
    // Multi-page app: unknown paths get 404.html (as on Render), not the home page.
    appType: 'mpa',
    plugins: [plugin],
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
  };
});
