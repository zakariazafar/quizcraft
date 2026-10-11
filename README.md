# QuizCraft

A static quiz website. Quizzes are JSON files in this repo (Arabic, English or mixed). Anyone with a quiz's public link enters their name and email, takes the quiz, and sees their score, the correct answers and an explanation for each mistake. Every attempt is saved as a JSON record in Firebase Firestore. A password‑protected dashboard shows all attempts, statistics, share links, and JSON/CSV downloads.

> **Build status:** see [`docs/PROGRESS.md`](docs/PROGRESS.md). Sections marked _(coming in phase N)_ are filled in as the build progresses.

## 1. Product overview

QuizCraft has two audiences:

- **Quiz takers** open a shared link, enter name and email, answer multiple‑choice questions and see their result on screen.
- **Quiz owners** add quizzes as JSON files (written with Claude Code from source content) and view results in a password‑protected dashboard.

_Screenshots: coming in phase 7._

## 2. Features

_(coming in phases 2–6)_

## 3. How it works

- Render serves the static site built by Vite.
- Quiz files live in `quizzes/` and are published with the site.
- Attempts are written to Firebase Firestore; the dashboard reads them after signing in with Firebase Authentication.

Full design: [`docs/PLAN.md`](docs/PLAN.md).

## 4. Pages and routes

| URL            | Purpose                       |
| -------------- | ----------------------------- |
| `/`            | Landing page                  |
| `/q/<quiz-id>` | Take a quiz _(phase 2)_       |
| `/dashboard`   | Results dashboard _(phase 4)_ |

## 5. Quiz file format

_(coming in phase 1; see `docs/PLAN.md` §4)_

## 6. How to add or edit a quiz

In Claude Code run `/add-quiz <paste content or give a file path>`. Details in `CLAUDE.md` → "How to add a quiz". _(Hand-editing guide coming in phase 1.)_

## 7. Attempt record format

_(coming in phase 3; see `docs/PLAN.md` §5)_

## 8. Dashboard guide

_(coming in phase 4)_

## 9. Security model and limits

_(coming in phase 6; see `docs/PLAN.md` §6)_

## 10. Arabic / RTL support

_(coming in phase 2; see `docs/PLAN.md` §7)_

## 11. Local development

Requirements: Node 20+.

```bash
npm ci
cp .env.example .env
npm run dev          # http://localhost:5173
```

The Firebase emulators are added in phase 3.

## 12. Environment variables

See [`.env.example`](.env.example). All are build‑time (`VITE_*`) values. Firebase web config is not secret; the dashboard password is **never** stored in the repo.

| Variable                    | Required | Purpose                                               |
| --------------------------- | -------- | ----------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`     | yes      | Firebase web config                                   |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes      | Firebase web config                                   |
| `VITE_FIREBASE_PROJECT_ID`  | yes      | Firebase web config                                   |
| `VITE_FIREBASE_APP_ID`      | yes      | Firebase web config                                   |
| `VITE_DASHBOARD_EMAIL`      | yes      | Fixed account the dashboard password signs into       |
| `VITE_RECAPTCHA_SITE_KEY`   | no       | Enables Firebase App Check                            |
| `VITE_SITE_URL`             | no       | Base URL for share links (defaults to current origin) |
| `VITE_USE_EMULATORS`        | no       | `true` to use local Firebase emulators                |

## 13. Testing

| Command                 | What it runs                                     |
| ----------------------- | ------------------------------------------------ |
| `npm test`              | Unit tests (Vitest)                              |
| `npm run test:coverage` | Unit tests with coverage; fails below 90 % lines |

| Module                     | Test file                      |
| -------------------------- | ------------------------------ |
| `scripts/lib/changelog.js` | `tests/unit/changelog.test.js` |

Firestore rules tests and Playwright end‑to‑end tests are added in phases 3 and 7.

## 14. CI pipeline

GitHub Actions (`.github/workflows/ci.yml`) on every push to `main` and every pull request: install → lint → format check → unit tests with coverage gate → build → changelog check.

## 15. Deployment

_(coming in phase 7: Firebase setup, Render Blueprint, rules deployment)_

## 16. Project structure

```
quizcraft/
├── index.html quiz.html dashboard.html 404.html
├── src/pages/        page scripts
├── src/lib/          tested logic modules
├── src/styles/       CSS
├── quizzes/          quiz JSON files
├── schema/           quiz JSON Schema
├── scripts/          build and CI scripts (lib/ holds tested logic)
├── tests/unit/       Vitest tests
├── docs/             PLAN, BUILD_PROMPT, PROGRESS
└── .github/workflows/ci.yml
```

## 17. Contributing

- Branch per change, pull request to `main`, CI must be green.
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `quiz:`).
- **Every commit adds a bullet to `CHANGELOG.md` under today's date** (`## YYYY-MM-DD`, newest first). CI enforces this; enable the local hook with `git config core.hooksPath .githooks`.

## 18. Troubleshooting

_(coming in phase 7)_

## 19. Roadmap and licence

Roadmap: see `docs/PLAN.md` §17. Licence: to be decided by the owner.
