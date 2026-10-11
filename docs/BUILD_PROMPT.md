# Build prompt for Claude Code

**How to use:** open Claude Code in this repo and run the slash command **`/build-phase`**. It reads this file, finds the next unfinished phase in `docs/PROGRESS.md`, builds it, ticks it off, commits, pushes, and stops for your review. Run `/build-phase` again for the next phase. (You can also paste everything below the line as a prompt.)

---

You are building **QuizCraft**, a static quiz site described in full in `docs/PLAN.md` (v2: static site + Firebase; there is **no** backend server, database server, Python, sign‑up or email). Follow the standing rules in `CLAUDE.md` at all times: tests with every feature, CHANGELOG.md updated in every commit under today's date, Conventional Commits, all checks green before each commit, never commit the dashboard password, XSS rule, Arabic safety.

## How to work
- Read `docs/PLAN.md` and `CLAUDE.md` completely before writing code.
- Work through the phases **in order**, on a branch per phase (`phase-N-<name>`), in small commits (code + tests + CHANGELOG bullet + README update when relevant).
- At the end of each phase run lint, format check, `npm run test:coverage`, `npm run test:rules` (from phase 3), and `npm run build`; push; open a PR with `gh` if available; then **stop and summarise**: what was built, test and coverage numbers, anything I must do, and any deviation from the plan.
- Track progress in `docs/PROGRESS.md`: mark a phase `[x]` (with the date) in the last commit of that phase, and note any deviations there.
- If something in the plan is impossible or wrong, say so and propose an alternative before implementing.
- Use the Firebase Emulator Suite for all Firebase testing. Never call a real Firebase project from tests.

## Phase 0 — Bootstrap
1. Vite multi‑page project (`index.html`, `quiz.html`, `dashboard.html`, `404.html`) with the layout in PLAN §9. Node 20.
2. Dev dependencies: vite, vitest, @vitest/coverage-v8, jsdom, ajv, ajv-formats, eslint, prettier, @playwright/test, firebase-tools, @firebase/rules-unit-testing. Runtime: firebase.
3. npm scripts from CLAUDE.md "Commands". Vitest coverage threshold 90 % on `src/lib`.
4. `scripts/check-changelog.mjs` + unit tests; optional `.githooks/pre-commit`.
5. `.github/workflows/ci.yml` per PLAN §13 (Node 20 + Java 17, `fetch-depth: 0`). The rules deploy job can be added in phase 7.
6. `CHANGELOG.md` with header and today's entry; `README.md` skeleton with every heading from the README spec below; `.env.example` per PLAN §10.
**Done when** CI is green on GitHub.

## Phase 1 — Quiz format
`schema/quiz.schema.json`, `src/lib/validate.js` (schema + extra rules from PLAN §4: exactly one correct, unique ids, id = file name, NFC, correct‑answer spread), `tests/quizzes/` that validates every file in `quizzes/`, fixtures (valid Arabic, mixed, and several invalid ones), `scripts/build-quiz-index.mjs` (copies quizzes to `public/quizzes/` and writes `index.json`; fails on invalid quiz; runs before `vite build`), `scripts/new-quiz.mjs`. Add two sample quizzes: one Arabic with diacritics (5 questions) and one English (5 questions).

## Phase 2 — Quiz page (taker)
`quizLoader.js`, `takerForm.js`, `scoring.js`, `bidi.js`, `render/*` and `pages/quiz.js`: route `/q/<id>` (read id from path; in dev also `?id=`), intro with privacy notice, name/email form, all questions on one page, unanswered warning, result screen per PLAN §2.2 (score, then for each wrong/unanswered: question, your answer, correct answer, explanation; congratulation when perfect), "closed" and "not found" states. Self‑host Noto Naskh Arabic + Noto Sans woff2 with the OFL licence; RTL styling per PLAN §7; mobile‑friendly layout. Tests per PLAN §11 rows for these modules, including the XSS test.

## Phase 3 — Saving attempts
`config.js`, `firebase.js` (emulator switch), `attempts.js` (record exactly per PLAN §5, `serverTimestamp()`, localStorage retry queue, no duplicates). `firestore.rules` per PLAN §6 with the dashboard UID read from a placeholder I will fill in (`DASHBOARD_UID_PLACEHOLDER`, replaced at deploy from a GitHub secret or edited by me), `firestore.indexes.json` (quizId + submittedAt desc), `firebase.json` with emulators. Rules tests covering every case in PLAN §11 "Firestore rules" row. Show "Result not yet saved, retrying…" when saving fails; the result screen must never depend on saving.

## Phase 4 — Dashboard
`dashboardAuth.js` (fixed `VITE_DASHBOARD_EMAIL` + password field), `dashboardData.js` (query attempts by quiz, re‑score against the quiz file with ⚠ on mismatch, summary stats, per‑question stats, search/sort/date filter, group by email), and `pages/dashboard.js`: sign‑in screen, quiz list with **Share** button (`share.js`: copy `VITE_SITE_URL/q/<id>`, "Link copied" toast, fallback selectable input), quiz page (summary, attempts table, attempt detail, per‑question stats), sign‑out, local "hide as spam". Tests per PLAN §11.

## Phase 5 — Exports
`exportData.js`: JSON download (raw records, `submittedAt` as ISO string) and CSV (UTF‑8 BOM, proper escaping, one row per attempt plus optional one row per answer). Tests including Arabic.

## Phase 6 — Hardening
App Check with reCAPTCHA v3 (enabled only when `VITE_RECAPTCHA_SITE_KEY` is set), CSP and security headers (put them in `render.yaml` and make sure Firebase/reCAPTCHA still work), friendly 404 page, input length limits matching the rules, accessibility pass (labels, focus, keyboard, contrast).

## Phase 7 — E2E and deployment
1. Playwright tests for the flows in PLAN §11 "E2E" row, running the built site with the emulators (seed the dashboard user in the Auth emulator with a test password). Add to CI.
2. `render.yaml` per PLAN §12 (static site, rewrites, headers, env vars).
3. GitHub Actions job deploying Firestore rules and indexes on push to `main` (substituting the dashboard UID from a secret).
4. Complete `README.md` per the spec below.
5. Give me a click‑by‑click checklist for PLAN §15 (Firebase, GitHub secrets, Render), then help me verify the live site: open the sample Arabic quiz from a private window, submit with one wrong answer, check the result screen, sign into the dashboard, see the attempt, download CSV and JSON, and test the Share button.

## README.md specification (must contain all of these)
1. Product overview and screenshot placeholders
2. Features: taker, dashboard, quiz authoring, Arabic support
3. How it works (diagram: Render static site ↔ Firestore/Auth; quiz files from GitHub)
4. Pages and routes
5. Quiz file format with a full example and validation rules
6. **How to add or edit a quiz** (with Claude Code, and by hand)
7. Attempt record format (JSON example) and where it's stored
8. Dashboard guide (sign in, share, stats, exports, changing the password)
9. Security model and its limits (answers visible to technical users, re‑scoring, spam protection, privacy)
10. Arabic / RTL details
11. Local development (Node, emulators, `.env`)
12. Environment variables table
13. Testing: unit, rules, e2e, coverage gate, module → test file map
14. CI pipeline
15. Deployment: Firebase setup, Render Blueprint, rules deploy, free‑tier limits (with a note to check current limits)
16. Project structure tree
17. Contributing: branches, Conventional Commits, CHANGELOG rule
18. Troubleshooting (Arabic shows boxes, attempts not saving, dashboard sign‑in fails, CSP blocking Firebase)
19. Roadmap (PLAN §17) and licence

Begin with Phase 0 now.
