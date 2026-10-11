# QuizCraft

A static quiz website. Quizzes are JSON files in this repo (Arabic, English or mixed). Anyone with a quiz's public link enters their name and email, takes the quiz, and sees their score, the correct answers and an explanation for each mistake. Every attempt is saved as a JSON record in Firebase Firestore. A password‑protected dashboard shows all attempts, statistics, share links, and JSON/CSV downloads.

> **Build status:** see [`docs/PROGRESS.md`](docs/PROGRESS.md). Sections marked _(coming in phase N)_ are filled in as the build progresses.

## 1. Product overview

QuizCraft has two audiences:

- **Quiz takers** open a shared link, enter name and email, answer multiple‑choice questions and see their result on screen.
- **Quiz owners** add quizzes as JSON files (written with Claude Code from source content) and view results in a password‑protected dashboard.

_Screenshots: coming in phase 7._

## 2. Features

**For quiz takers** (`/q/<quiz-id>`)

- Enter name and email, then answer all questions on one page (one choice per question).
- A progress bar shows how many questions are answered. Submitting with gaps shows which questions are unanswered and asks to go back or submit anyway (unanswered counts as wrong).
- The result screen shows the score (e.g. “18 out of 20 (90%)”) and, for every wrong or unanswered question, your answer, the correct answer and why it is correct. A perfect score gets a short congratulation. “Take the quiz again” starts over with the same name and email.
- Clear messages for a mistyped link (“Quiz not found”), a closed quiz, or a loading problem.

_Saving attempts (phase 3), dashboard (phase 4) and exports (phase 5) are coming._

## 3. How it works

- Render serves the static site built by Vite.
- Quiz files live in `quizzes/` and are published with the site.
- Attempts are written to Firebase Firestore; the dashboard reads them after signing in with Firebase Authentication.

Full design: [`docs/PLAN.md`](docs/PLAN.md).

## 4. Pages and routes

| URL            | Purpose                       |
| -------------- | ----------------------------- |
| `/`            | Landing page                  |
| `/q/<quiz-id>` | Take a quiz                   |
| `/dashboard`   | Results dashboard _(phase 4)_ |

## 5. Quiz file format

Each quiz is one file, `quizzes/<quiz-id>.json`. JSON Schema: [`schema/quiz.schema.json`](schema/quiz.schema.json).

```json
{
  "$schema": "../schema/quiz.schema.json",
  "id": "ism-four-properties",
  "version": 1,
  "active": true,
  "title": "The 4 Properties of an اِسْم (Ism)",
  "description": "Optional short description.",
  "language": "mixed",
  "createdAt": "2026-10-11",
  "source": "Optional: where the content came from",
  "questions": [
    {
      "id": "q1",
      "text": "What are the 4 properties of an اِسْم?",
      "options": [
        { "id": "a", "text": "Status, Number, Gender, Type" },
        { "id": "b", "text": "Status, Tense, Gender, Type" },
        { "id": "c", "text": "Number, Gender, Doer, Detail" },
        { "id": "d", "text": "Tense, Number, Gender, Person" }
      ],
      "correct": "a",
      "explanation": "An اِسْم has 4 properties: Status, Number, Gender and Type."
    }
  ]
}
```

Validation rules (checked by `npm test` and before every build, in `src/lib/validate.js`):

- `id`: 3–60 lowercase letters, digits or hyphens, equal to the file name.
- `version` integer ≥ 1 (increase it when you change questions of a quiz people have already taken); `active` true/false (false shows "This quiz is closed").
- `language`: `ar`, `en` or `mixed`; `createdAt`: `YYYY-MM-DD`.
- 1–100 questions; unique question ids; exactly **4 options** with unique ids and texts; `correct` is one option id; `explanation` required.
- All text NFC‑normalised with no leading/trailing spaces (Arabic diacritics are kept).
- For quizzes with 6+ questions, no more than half the correct answers may sit in the same position.

The build (`npm run build`, also `npm run quizzes`) validates every quiz, copies it to `public/quizzes/` and writes `public/quizzes/index.json` for the dashboard. One invalid quiz stops the build.

## 6. How to add or edit a quiz

**With Claude Code (recommended):** run `/add-quiz <paste content or give a file path>` and say how many questions you want. Claude Code writes the quiz file, runs the checks, commits with a changelog entry and pushes a branch. Details in `CLAUDE.md` → "How to add a quiz".

**By hand:**

1. `npm run new-quiz -- <quiz-id>` creates `quizzes/<quiz-id>.json` with TODO placeholders.
2. Fill in the title, language and questions (format above). Write Arabic with its diacritics.
3. Run `npm test` and fix any reported problem (the message names the file and question).
4. Add a bullet to `CHANGELOG.md`, commit as `quiz: add <quiz-id> (<n> questions, <language>)`, push and open a pull request.
5. After merge and deploy the quiz is live at `<site>/q/<quiz-id>`.

To edit a quiz people have already taken, increase `version`. To close a quiz, set `"active": false`.

## 7. Attempt record format

_(coming in phase 3; see `docs/PLAN.md` §5)_

## 8. Dashboard guide

_(coming in phase 4)_

## 9. Security model and limits

_(coming in phase 6; see `docs/PLAN.md` §6)_

## 10. Arabic / RTL support

- **Fonts:** Noto Naskh Arabic (Arabic) and Noto Sans (Latin) are bundled with the site from npm (`@fontsource/*`, SIL Open Font License), so there's no external font CDN.
- **Arabic inside English:** every piece of quiz or taker text is built with `richText()` (`src/lib/render/dom.js`). Arabic runs are wrapped in `<span class="ar" lang="ar">` and shown in Naskh, slightly larger and in green, so the studied words stand out.
- **Direction by main script:** each text element gets `dir="rtl"` when most of its letters are Arabic, otherwise `dir="ltr"` (`textDirection()` in `src/lib/bidi.js`). This keeps an English explanation that starts with an Arabic word reading left to right, which `dir="auto"` would get wrong. Diacritics are ignored when counting.
- **Arabic quizzes** (`"language": "ar"`): the question list and the review list switch to right-to-left (radio buttons on the right). The interface labels and progress bar stay left to right so they read correctly.
- **Text is never altered:** quiz text must be NFC; diacritics are kept exactly. Name inputs use `dir="auto"` so typing Arabic works naturally.
- Layout uses CSS logical properties (`margin-inline-start`, `inset-inline`) so it flips cleanly.

## 11. Local development

Requirements: Node 20+.

```bash
npm ci
cp .env.example .env
npm run dev          # http://localhost:5173
```

Open a quiz at `http://localhost:5173/q/<quiz-id>` (the dev server rewrites `/q/*` to `quiz.html`, like Render will).

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

| Command                    | What it runs                                     |
| -------------------------- | ------------------------------------------------ |
| `npm test`                 | Unit tests (Vitest)                              |
| `npm run test:coverage`    | Unit tests with coverage; fails below 90 % lines |
| `npm run quizzes`          | Validate quizzes and write `public/quizzes/`     |
| `npm run new-quiz -- <id>` | Scaffold a new quiz file                         |

| Module                                | Test file                           |
| ------------------------------------- | ----------------------------------- |
| `scripts/lib/changelog.js`            | `tests/unit/changelog.test.js`      |
| `src/lib/validate.js` (+ JSON Schema) | `tests/unit/validate.test.js`       |
| `scripts/lib/quizIndex.js`            | `tests/unit/quizIndex.test.js`      |
| `scripts/lib/newQuiz.js`              | `tests/unit/newQuiz.test.js`        |
| every real quiz in `quizzes/`         | `tests/quizzes/all-quizzes.test.js` |

Test fixtures (an Arabic quiz with diacritics, an English quiz, and a copy of the mixed Ism quiz) live in `tests/fixtures/`.

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
