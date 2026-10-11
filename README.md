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

| URL                       | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `/`                       | Landing page (quizzes are not listed publicly)         |
| `/q/<quiz-id>`            | Take a quiz _(phase 2)_                                |
| `/dashboard`              | Results dashboard _(phase 4)_                          |
| `/quizzes/<quiz-id>.json` | A published quiz file, fetched by the quiz page        |
| `/quizzes/index.json`     | Generated list of quizzes (id, title, language, count) |
| anything else             | `404.html`                                             |

## 5. Quiz file format

One quiz per file: `quizzes/<quiz-id>.json`. The file name **is** the quiz id and the
public link: `quizzes/tajweed-basics-01.json` → `/q/tajweed-basics-01`.

```json
{
  "id": "tajweed-basics-01",
  "version": 1,
  "active": true,
  "title": "أَحْكَامُ التَّجْوِيدِ — الْمُسْتَوَى الْأَوَّلُ",
  "description": "خَمْسَةُ أَسْئِلَةٍ فِي أَحْكَامِ النُّونِ وَالْمِيمِ السَّاكِنَتَيْنِ.",
  "language": "ar",
  "createdAt": "2026-10-11",
  "source": "Notes provided by the owner, chapter 1",
  "questions": [
    {
      "id": "q1",
      "text": "مَا حُكْمُ النُّونِ السَّاكِنَةِ إِذَا جَاءَ بَعْدَهَا حَرْفُ الْيَاءِ؟",
      "options": [
        { "id": "a", "text": "إِظْهَارٌ حَلْقِيٌّ" },
        { "id": "b", "text": "إِدْغَامٌ بِغُنَّةٍ" },
        { "id": "c", "text": "إِقْلَابٌ" },
        { "id": "d", "text": "إِخْفَاءٌ حَقِيقِيٌّ" }
      ],
      "correct": "b",
      "explanation": "الْيَاءُ مِنْ حُرُوفِ «يَرْمَلُونَ»، فَيَكُونُ مَعَهَا الإِدْغَامُ بِغُنَّةٍ."
    }
  ]
}
```

### Fields

| Field         | Required | Rules                                                                                                |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `id`          | yes      | 3–60 chars, lowercase letters, digits and single hyphens; **equal to the file name** without `.json` |
| `version`     | yes      | Integer ≥ 1. Increase it whenever you change a quiz people have already taken                        |
| `active`      | yes      | `false` shows "This quiz is closed" instead of the questions; past attempts stay in the dashboard    |
| `title`       | yes      | 1–200 chars                                                                                          |
| `description` | yes      | 1–500 chars                                                                                          |
| `language`    | yes      | `ar`, `en` or `mixed`. `ar` makes the quiz container `dir="rtl" lang="ar"`                           |
| `createdAt`   | yes      | A real date as `YYYY-MM-DD`                                                                          |
| `source`      | no       | Where the questions came from, 1–300 chars                                                           |
| `questions`   | yes      | 1–100 questions                                                                                      |

Each question has `id` (unique in the quiz, ≤ 20 chars), `text` (≤ 1000), exactly **four**
`options` with unique ids (`id` ≤ 4 chars, `text` ≤ 300), `correct` (the id of the one
correct option) and `explanation` (1–1000 chars, in the quiz language).

### Validation rules

`schema/quiz.schema.json` describes the structure; `src/lib/validate.js` enforces every
rule, including the ones a JSON Schema cannot express. A quiz is rejected — and the build
fails — when any of these is broken:

- `id` malformed, too short/long, or different from the file name.
- A question or option id appears twice, or a question does not have exactly four options.
- `correct` is not one of that question's option ids, or `explanation` is empty.
- Any text is empty, starts or ends with whitespace, or is not NFC-normalised.
  **Arabic diacritics are never stripped** — normalisation only changes how characters are encoded.
- Unknown fields anywhere in the file (a typo like `"explination"` is an error, not a silent loss).
- Correct answers are clustered: in a quiz with 6 or more questions, no single option
  position may hold more than 50 % of the correct answers.

Run the checks with `npm test` (every file in `quizzes/`) or `npm run validate:quizzes`.

### Publishing

`npm run build` (and `npm run dev`) first runs `scripts/build-quiz-index.mjs`, which
validates every quiz, copies the valid ones to `public/quizzes/` and writes
`public/quizzes/index.json` — the list the dashboard reads. **An invalid quiz fails the
build and nothing is written**, so a broken quiz can never reach the live site.

> **Answers are visible.** There is no server, so the browser downloads the whole quiz
> file, correct answers included. Fine for practice and learning; not for high-stakes
> exams. See `docs/PLAN.md` §4.

## 6. How to add or edit a quiz

### With Claude Code

Run `/add-quiz <paste the content, or give a file path>`. Claude Code asks for the number
of questions (default 10), the difficulty (default medium), the language (default: the
language of the content) and the quiz id (default: a slug of the title), writes the file,
runs the tests and opens a pull request. Details in `CLAUDE.md` → "How to add a quiz".

### By hand

```bash
npm run new-quiz -- tajweed-basics-02 --questions 10 --language ar
```

That writes `quizzes/tajweed-basics-02.json` with placeholder questions in the quiz
language, correct answers already spread over the four positions, and `"active": false`
so an unfinished quiz cannot go live. Options: `--questions <n>` (1–100, default 10),
`--language ar|en|mixed` (default `en`), `--title "A title"` (default: derived from the id).
It never overwrites an existing file.

Then:

1. Replace every placeholder. Four options per question, exactly one correct, plausible
   distractors, no "all of the above". Write the explanation in the quiz language and say
   **why** the correct option is right, in one to three sentences.
2. Copy Arabic terms exactly, **with their diacritics**.
3. Set `"active": true` and fill in `source`.
4. Run `npm test && npm run build` and fix every validation error (§5).
5. Commit as `quiz: add <quiz-id> (<n> questions, <language>)` with a `CHANGELOG.md`
   bullet, and open a pull request. After the merge the quiz is live at
   `<VITE_SITE_URL>/q/<quiz-id>`.

**Editing a live quiz:** increase `version` (attempts record the version they were taken
against) and say in the CHANGELOG what changed. To retire a quiz, set `"active": false` —
the link then shows "This quiz is closed" and past attempts stay in the dashboard.

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

`npm run dev` and `npm run build` both validate `quizzes/` first and publish the valid
quizzes to `public/quizzes/` (generated, not committed).

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

| Command                    | What it runs                                                |
| -------------------------- | ----------------------------------------------------------- |
| `npm test`                 | Unit tests and quiz-file validation (Vitest)                |
| `npm run test:coverage`    | The same with coverage; fails below 90 % lines on `src/lib` |
| `npm run validate:quizzes` | Validates `quizzes/` without writing anything               |

| Module                         | Test file                       |
| ------------------------------ | ------------------------------- |
| `src/lib/validate.js`          | `tests/unit/validate.test.js`   |
| `scripts/lib/quizSchema.js`    | `tests/unit/quizSchema.test.js` |
| `scripts/lib/quizIndex.js`     | `tests/unit/quizIndex.test.js`  |
| `scripts/build-quiz-index.mjs` | `tests/unit/quizIndex.test.js`  |
| `scripts/lib/changelog.js`     | `tests/unit/changelog.test.js`  |
| every file in `quizzes/`       | `tests/quizzes/quizzes.test.js` |

Quiz fixtures live in `tests/fixtures/`: `arabic-quiz.json` (full diacritics),
`mixed-quiz.json` (Arabic + English on one line) and one `bad-*.json` per rule, so each
validation rule is proved by a file you can read.

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
├── src/lib/          tested logic modules (validate.js …)
├── src/styles/       CSS
├── quizzes/          quiz JSON files — the source of truth
├── schema/           quiz JSON Schema
├── scripts/          build-quiz-index.mjs, new-quiz.mjs, check-changelog.mjs (lib/ holds the tested logic)
├── public/quizzes/   generated: published quizzes + index.json
├── tests/unit/       Vitest unit tests
├── tests/quizzes/    validates every file in quizzes/
├── tests/fixtures/   valid and deliberately invalid quiz files
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
