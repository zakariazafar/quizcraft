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
- Every submission is saved to Firestore as one JSON record. A line under the score says “Your result has been saved.” If the taker is offline, the attempt is kept in the browser and sent automatically next time a quiz page opens; the result screen never waits for saving.

**For quiz owners** (`/dashboard`)

- Sign in with the dashboard password (checked by Firebase; the session ends when the browser closes).
- **Quiz list:** every published quiz with its number of questions and attempts, average score and status (Open / Closed / Removed), plus a **Share** button that copies the public link (“Link copied”; if the browser blocks copying, the link is shown selected).
- **Quiz page:** attempts, takers, average, highest and lowest score; a table of every attempt (name, email, score, %, time) with search by name or email, date range, sorting, and an **Answers** view showing each question as right ✓ or wrong ✗ with the correct answer.
- **One row per taker** groups attempts by email (attempts, best and latest score).
- **Re-scoring:** every attempt is scored again from its saved answers against the quiz file. A score that doesn't match (e.g. faked in the browser) is corrected and marked “⚠ score corrected”; attempts on an older quiz version are marked “older version”.
- **How each question went:** share of right answers per question (bar with the value written beside it) and the most chosen wrong answer, to spot hard questions.
- **Hide** marks an attempt as spam in this browser (attempts can't be deleted from the site); “Show hidden” brings them back.
- **Downloads** of the attempts currently shown (after search, dates and hide filters, in table order):
  - **CSV**: one row per attempt: attempt id, quiz, name, email, stored score, re-checked score, “Score corrected” and “Older quiz version” flags, start and submit times (UTC).
  - **CSV, one row per answer**: each question with the taker's answer, the correct answer and right/wrong, using the texts from the quiz file.
  - **JSON**: the attempt records exactly as saved, with their ids and ISO dates.
  - CSVs are UTF‑8 with a BOM so Excel shows Arabic correctly, and anything a taker typed that starts with `=`, `+`, `-` or `@` is prefixed with `'` so spreadsheets don't run it as a formula.

## 3. How it works

- Render serves the static site built by Vite.
- Quiz files live in `quizzes/` and are published with the site.
- Attempts are written to Firebase Firestore; the dashboard reads them after signing in with Firebase Authentication.

Full design: [`docs/PLAN.md`](docs/PLAN.md).

## 4. Pages and routes

| URL            | Purpose                      |
| -------------- | ---------------------------- |
| `/`            | Landing page                 |
| `/q/<quiz-id>` | Take a quiz                  |
| `/dashboard`   | Results dashboard (password) |

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

Each submission is one Firestore document at `attempts/<random-id>`:

```json
{
  "quizId": "ism-four-properties",
  "quizVersion": 1,
  "quizTitle": "The 4 Properties of an اِسْم (Ism)",
  "takerName": "Zakaria",
  "takerEmail": "someone@example.com",
  "takerEmailLower": "someone@example.com",
  "answers": [
    { "questionId": "q1", "selected": "a", "correct": true },
    { "questionId": "q2", "selected": null, "correct": false }
  ],
  "score": 18,
  "total": 20,
  "percent": 90,
  "startedAt": "2026-10-12T09:01:12.000Z",
  "submittedAt": "<server timestamp>",
  "clientId": "random id per browser",
  "userAgent": "browser string (max 200 chars)"
}
```

- The document id is a random id made in the browser before saving, so retrying a save can never create a duplicate.
- `submittedAt` is set by Firestore's clock, not the browser's.
- `selected: null` means the question was left unanswered.
- Saving: `src/lib/attempts.js` (record builder, local retry queue with back-off) and `src/lib/firebase.js` (Firestore Lite writer).

**Who can do what** (`firestore.rules`):

| Action                      | Allowed for                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create an attempt           | Anyone, only if every field has the right type and size, there are no extra fields, `score ≤ total`, the number of answers equals `total`, and `submittedAt` is the server time |
| Read attempts               | Only the dashboard account (its UID replaces `DASHBOARD_UID_PLACEHOLDER` at deploy)                                                                                             |
| Change or delete an attempt | Nobody (from the site)                                                                                                                                                          |
| Anything else               | Nobody                                                                                                                                                                          |

Rules cannot check each answer against the quiz, so the dashboard re‑scores every attempt from its answers (phase 4).

## 8. Dashboard guide

1. Open `<site>/dashboard` and enter the dashboard password. (It's the password of the Firebase user named in `VITE_DASHBOARD_EMAIL`; it is never stored in this repo.)
2. **Share a quiz:** press **Share** next to it and paste the link anywhere. The link is `VITE_SITE_URL/q/<quiz-id>` (or the current site address if that isn't set).
3. **See results:** click a quiz title. Use **Search**, **From/To** and the column headers to narrow and sort; press **Answers** on a row to see that taker's answers.
4. **Download:** below the table, choose **Download CSV**, **CSV, one row per answer** or **Download JSON**. Files are named `<quiz-id>-attempts-<date>.csv` / `.json` and `<quiz-id>-answers-<date>.csv`; they contain only the attempts shown, so filter first to export a subset.
5. **Refresh** reloads quizzes and attempts; **Sign out** ends the session.
6. **Change the password:** Firebase console → Authentication → Users → the dashboard user → _Reset password_ (or _Edit_). Nothing in the site needs to change.

Notes:

- The dashboard loads up to 5,000 most recent attempts and does the grouping and statistics in the browser.
- “Hide” is remembered only in the browser where you pressed it.
- If the page says “This account is not allowed to read results”, the UID in the deployed `firestore.rules` doesn't match the dashboard user (see Deployment).

## 9. Security model and limits

**What protects the data**

- **Firestore rules** (`firestore.rules`, tested in `tests/rules/`): anyone can _add_ an attempt, but only with exactly the expected fields, types and sizes and a server timestamp; nobody can change or delete attempts from the site; only the dashboard account can read them.
- **Dashboard password** is checked by Firebase Authentication. It is not in the site code, the repo, the README or the tests (tests use the emulator with a test password).
- **App Check** (optional, recommended): with `VITE_RECAPTCHA_SITE_KEY` set and enforcement turned on for Firestore in the Firebase console, Firestore only accepts requests from this site (reCAPTCHA v3, invisible to takers). This makes scripted spam much harder.
- **Security headers** (in `render.yaml`, also applied by `npm run preview`): a strict Content‑Security‑Policy (no inline scripts or styles, only this site plus the Firebase and reCAPTCHA endpoints), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS. After every build, `scripts/check-dist.mjs` fails if a page contains anything the policy would block.
- **No HTML injection:** all quiz and taker text is inserted as text (`textContent`), never as HTML; ESLint forbids `innerHTML`, and tests feed `<script>` and `<img onerror>` names through every screen.
- **CSV exports** neutralise spreadsheet formulas typed by takers (see §8).
- **Limits** in the site (name ≤ 100 characters, email ≤ 254, title ≤ 200, ≤ 100 questions) match the Firestore rules; `tests/unit/limits.test.js` fails if they drift apart.
- Quiz and dashboard pages ask search engines not to index them (`noindex`).

**Known limits** (by design, because the site has no server of its own)

- **Answers are in the quiz file.** The browser downloads each quiz including its correct answers, so a technical user could find them. Use QuizCraft for practice and learning, not high‑stakes exams.
- **Scores can be faked in the browser**, but the dashboard re‑scores every attempt from its answers and shows the real score (“⚠ score corrected”).
- **Spam:** anyone with a link can submit attempts. App Check and the rules' size limits keep this reasonable; the dashboard can hide spam attempts.
- **Privacy:** taker names and emails are personal data. Only the dashboard account can read them; the quiz start page tells takers they are saved.

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

**Saving attempts locally** uses the Firebase Emulator Suite (needs Java 21+). No Firebase account is needed: the project id `demo-quizcraft` is emulator‑only.

```bash
npm run emulators    # terminal 1: Firestore on :8080, Auth on :9099
npm run dev          # terminal 2, with VITE_USE_EMULATORS=true in .env
```

Without emulators or Firebase settings the quiz still works; results show but aren't saved (“Results are not being saved on this site”).

## 12. Environment variables

See [`.env.example`](.env.example). All are build‑time (`VITE_*`) values. Firebase web config is not secret; the dashboard password is **never** stored in the repo.

| Variable                    | Required         | Purpose                                                              |
| --------------------------- | ---------------- | -------------------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`     | yes              | Firebase web config                                                  |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes              | Firebase web config                                                  |
| `VITE_FIREBASE_PROJECT_ID`  | yes              | Firebase web config                                                  |
| `VITE_FIREBASE_APP_ID`      | yes              | Firebase web config                                                  |
| `VITE_DASHBOARD_EMAIL`      | yes              | Fixed account the dashboard password signs into                      |
| `VITE_RECAPTCHA_SITE_KEY`   | no (recommended) | reCAPTCHA v3 site key; turns on Firebase App Check (spam protection) |
| `VITE_SITE_URL`             | no               | Base URL for share links (defaults to current origin)                |
| `VITE_USE_EMULATORS`        | no               | `true` to use local Firebase emulators                               |
| `VITE_EMULATOR_HOST`        | no               | Emulator host (default `127.0.0.1`)                                  |

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

Test fixtures (an Arabic quiz with diacritics, an English quiz, a copy of the mixed Ism quiz, 13 deliberately invalid quizzes, and sample attempt documents including a faked score and an older-version attempt) live in `tests/fixtures/`.

Published quizzes: `ism-four-properties` (20 questions, mixed), `tajweed-basics-01` (5, Arabic) and `html-basics-01` (5, English).

Playwright end‑to‑end tests are added in phase 7.

## 14. CI pipeline

GitHub Actions (`.github/workflows/ci.yml`) on every push to `main` and every pull request: install (Node 20 + Java 21, emulator download cached) → lint → format check → unit tests with coverage gate (includes accessibility and contrast checks) → Firestore rules tests on the emulator → build (then the CSP check of the built pages) → changelog check.

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
├── render.yaml       Render Blueprint: build, rewrites, security headers, env vars
├── firestore.rules   who can read/write attempts (tests in tests/rules/)
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
