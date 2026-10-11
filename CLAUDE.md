# CLAUDE.md — standing rules for this repository

Read this file, `docs/PLAN.md` and `docs/PROGRESS.md` at the start of every session. Build instructions per phase are in `docs/BUILD_PROMPT.md`. Slash commands: `/build-phase` builds the next unfinished phase; `/add-quiz <content or file>` adds a quiz. `docs/PLAN.md` is the source of truth for product behaviour. If code and plan disagree, ask, or update the plan in the same commit.

## Project

QuizCraft is a **static site** (Vite + vanilla JS, no backend, no framework) hosted as a Render Static Site. Quizzes are JSON files in `quizzes/`. Takers enter name + email, take the quiz, and see the result on screen. Each attempt is saved as a JSON document in Firebase Firestore. `/dashboard` is protected by a Firebase Auth sign‑in to one shared dashboard account. Arabic must render correctly everywhere.

## Commands

- Install: `npm ci`
- Dev (with emulators): `npm run emulators` in one terminal, `npm run dev` in another (`VITE_USE_EMULATORS=true`)
- Lint/format: `npm run lint && npm run format:check`
- Unit tests + coverage: `npm run test:coverage` (gate ≥ 90 % on `src/lib`)
- Firestore rules tests: `npm run test:rules`
- E2E: `npm run test:e2e`
- Build: `npm run build` (also validates quizzes and writes `public/quizzes/index.json`)
- Changelog check: `node scripts/check-changelog.mjs origin/main..HEAD`
- New quiz scaffold: `npm run new-quiz -- <quiz-id>`

## Non‑negotiable rules

1. **Tests with every feature.** No functional code is committed without tests in the same commit. Keep coverage ≥ 90 %. Never touch real Firebase in tests: use the emulators or mocks.
2. **CHANGELOG.md in every commit.** Add bullet(s) under today's date heading (`## YYYY-MM-DD`, newest date first; create the heading if missing). One bullet per logical change, Conventional Commit style. Never rewrite past entries.
3. **Conventional Commits**, small focused commits. Use `quiz:` for adding or editing quiz files.
4. **All checks green before committing**: lint, format, unit tests, rules tests (when rules changed), build.
5. **Never commit the dashboard password** (or any real secret) anywhere: code, tests, README, CHANGELOG, commit messages. Tests use the emulator with a test password.
6. **XSS**: insert all quiz and taker text with `textContent` / `createTextNode`, never `innerHTML` with data.
7. **Arabic safety**:
   - NFC‑normalise text; never strip Arabic diacritics.
   - Every element showing quiz or taker text is built with `richText()` (class `bidi`, `dir` from the text's main script via `textDirection()`, Arabic runs wrapped in `<span class="ar" lang="ar">`). Text inputs use `dir="auto"`. Quizzes with `language: "ar"` get `dir="rtl" lang="ar"` on the quiz container.
   - CSS logical properties only (`margin-inline-start`, `text-align: start`).
   - Add an Arabic fixture to tests for any new text‑handling path.
8. **Firestore rules** change only together with rules tests covering the change.
9. **README stays current**: update it in the same commit when behaviour, setup, env vars, routes or the quiz format change. Also update `.env.example` and `render.yaml` for new env vars.
10. No new dependencies without a reason in the CHANGELOG bullet.

## How to add a quiz (when the owner gives you content)

1. Read the content carefully (text, PDF, Word, notes). Ask for: number of questions (default 10), difficulty (default medium), language (default: same as content), quiz id (default: slug of the title).
2. `npm run new-quiz -- <quiz-id>` then fill `quizzes/<quiz-id>.json` per PLAN §4:
   - Questions **only** from the given content; 4 options each; exactly one correct; plausible distractors; no "all/none of the above".
   - Write questions, options and explanations in the quiz language; copy Arabic terms exactly **with their diacritics**.
   - Explanation: 1–3 sentences saying why the correct option is right, based on the content.
   - Vary the position of the correct answer.
3. Run `npm test` and `npm run build`. Fix every validation error.
4. Commit as `quiz: add <quiz-id> (<n> questions, <language>)` with a CHANGELOG bullet, open a PR, and tell the owner the public link `<VITE_SITE_URL>/q/<quiz-id>` that will work after merge.
5. Editing a live quiz: increase `version`, and mention in the CHANGELOG what changed.

## Code style

- ES modules, JSDoc types (`// @ts-check`) in `src/lib`, small pure functions; DOM code only in `src/pages` and `src/lib/render`.
- No inline scripts or styles in HTML (CSP).
