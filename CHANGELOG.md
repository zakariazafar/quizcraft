# Changelog

All notable changes to this project are recorded here, grouped by date (newest first). Every commit adds at least one bullet under its date.

## 2026-10-12

- feat(brand): QuizCraft logo (Rub el Hizb star with a gold check mark) as `public/logo.svg` and favicon; site header with the logo on every page; faint star pattern behind the quiz intro
- feat(fonts): Arabic now uses KFGQPC Uthmanic Script HAFS (original file from the King Fahd Glorious Quran Printing Complex, unmodified, licence in `public/fonts/LICENSE-KFGQPC.txt`), with Amiri Quran as fallback and for the Arabic comma, semicolon and question mark; Latin text moves from Noto Sans to Figtree
- feat(ui): quiz intro with chips (questions, format, time) and a form card; each question in its own card with lettered answer tiles (A to D, or أ ب ج د in Arabic quizzes) that are fully clickable; floating progress bar that becomes a top strip on phones
- feat(ui): result screen with a score ring, right/wrong/not answered chips and numbered review cards
- feat(ui): new home and 404 pages; dashboard toolbar, summary cards, tables and question statistics in panels, status pills; sign-in as a card
- style: refreshed colour tokens (still WCAG AA, checked by tests), Figtree type scale, consistent radii and soft shadows
- chore: remove em dashes from site text and quiz titles (`tajweed-basics-01`, `html-basics-01`; titles only, questions unchanged so their version stays 1); missing values show "n/a"; page titles use "|"
- docs: README logo, new screenshots, fonts and licences; plan updated for the fonts
- feat(fonts): swap the Arabic typeface from Noto Naskh Arabic to **Amiri Quran** (`@fontsource/amiri-quran`, SIL Open Font License) — a clean Uthmanic-Hafs-style Qur'an typeface, in the spirit of the KFGQPC Uthmanic Script HAFS font but freely redistributable under the project's font licence rule; update `docs/PLAN.md` §3/§7, the README and the e2e font-loaded check to match
- style(arabic): raise Arabic text to 1.6em (was 1.22em inline / 1em in a full right-to-left quiz) and pin it to its one bundled weight so a bold heading never synthetic-bolds it
- style(arabic): bump Arabic text inside a full right-to-left quiz from 1em back up to 1.1em (it had been reset to the Latin body size so the inline-highlight rule wouldn't double up); matches PLAN.md §7's "slightly larger size"
- docs: the rules-deploy service account also needs **Service Usage Consumer**; add troubleshooting rows for that 403 error and for rules that were never deployed
- test(e2e): check the "Link copied" note next to the pressed Share button, not the first one in the list
- test(e2e): make the Share test record what the page copies (headless browsers may refuse the real clipboard) and add a test for the "copy by hand" fallback
- ci: move to Node 22 (Node 20 is end-of-life) in CI, `render.yaml` and `engines`; update checkout/setup-node/setup-java actions to v5
- docs: README screenshots (`docs/screenshots/`), full step-by-step deployment (Firebase project, dashboard user, rules deploy secrets, App Check, Render Blueprint, checks), troubleshooting table, end-to-end tests, CI jobs, roadmap and licence note; mark phase 7 done
- test(e2e): Playwright tests of the built site (production headers) against the Firebase Auth and Firestore emulators: taking a quiz and saving the attempt, Arabic RTL and font, unanswered warning, form errors, offline save and retry, closed/unknown quiz and 404, security headers with no CSP violations; dashboard sign-in, wrong password, quiz list, re-checked scores, answers view, search, Share (clipboard), CSV/JSON downloads, sign-out
- ci: run the end-to-end tests in GitHub Actions; add a `deploy-rules` job that deploys `firestore.rules` (with the dashboard UID filled in) and indexes on push to `main` once Firebase secrets are set, and skips with a notice until then
- feat(security): Firebase App Check with reCAPTCHA v3 when `VITE_RECAPTCHA_SITE_KEY` is set (not with emulators)
- feat(security): `render.yaml` with a strict Content-Security-Policy (no inline scripts/styles), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS, cache rules, rewrites and env vars; `npm run preview` applies the same headers and rewrites and serves `404.html` for unknown paths (multi-page mode)
- feat(build): `scripts/check-dist.mjs` runs after every build and fails if a page has anything the CSP would block
- feat(pages): friendlier home and 404 pages; `noindex` on quiz and dashboard pages
- chore(deps): add `yaml` (read render.yaml in Vite and tests) and `axe-core` (accessibility tests) as dev dependencies
- test: render.yaml headers/rewrites/env vars, CSP build check, limits shared with firestore.rules, axe-core accessibility checks of every screen, WCAG AA contrast of colour tokens, App Check setup; 270 tests, 100 % line coverage
- docs: README security model and limits, env vars, test map, CI; mark phase 6 done
- feat(exports): dashboard downloads of the attempts shown (after filters, in table order): CSV one row per attempt (stored and re-checked score, flags, UTC times), CSV one row per answer (question, chosen and correct answer texts, right/wrong) and JSON (records as saved, with ids and ISO dates)
- feat(exports): CSV is UTF-8 with BOM (Arabic shows in Excel), RFC 4180 quoting, and a guard against spreadsheet formula injection from taker-typed text
- style: export bar under the attempts table; submission times stay on one line
- test: export module (escaping, formula guard, BOM, Arabic, re-checked answers, file names, download) and export buttons; 235 tests, 100 % line coverage
- docs: README downloads and dashboard guide; mark phase 5 done
- feat(dashboard): password sign-in at `/dashboard` (fixed `VITE_DASHBOARD_EMAIL` + password field, Firebase Auth, session ends when the browser closes) with plain error messages
- feat(dashboard): quiz list with questions, attempts, average, Open/Closed/Removed status and a Share button (copies the public link, falls back to a selected link field)
- feat(dashboard): quiz page with summary (attempts, takers, average, highest, lowest), attempts table with search, date range, sorting, per-attempt answers view, one-row-per-taker grouping and hide-as-spam (per browser)
- feat(dashboard): re-score every attempt from its saved answers; mismatches are corrected and flagged, older-version attempts keep their stored score and are marked
- feat(dashboard): per-question share of right answers and most chosen wrong answer
- feat(firebase): `fetchAllAttempts` (newest 5,000) and a separate `firebaseAuth.js` so the quiz page bundle doesn't include Firebase Auth
- style: dashboard layout (wide container, tables that scroll on phones, summary numbers, thin per-question bars with values written out)
- test: dashboard data (re-scoring incl. faked score, stats, filters, sorting, grouping, hidden store), auth, share, Firebase auth/reads (mocked) and dashboard views (jsdom); 216 tests, 100 % line coverage
- docs: README dashboard features, route and guide; mark phase 4 done

## 2026-10-11

- chore(merge): combine all pending work into one branch: phase 2 (quiz page), phase 3 (saving attempts) and the `phase-1-quiz-format-v2` branch, on top of `main` (phase 1 + ism-four-properties)
- quiz: add tajweed-basics-01 (5 questions, Arabic with full diacritics) and html-basics-01 (5 questions, English) from `phase-1-quiz-format-v2`; both pass the current validator
- test: add the 13 invalid quiz fixtures from `phase-1-quiz-format-v2` and a test that each is rejected for the expected reason
- chore(merge): keep `main`'s phase 1 implementation (validator, index builder, `new-quiz`, fixtures) over the v2 rewrite, because phases 2–3 depend on its API and fixtures and the rewrite removed `ism-four-properties`; v2's duplicate modules (`quizSchema.js`, `quizTemplate.js`, `validate:quizzes` script) and their tests are not taken
- feat(attempts): save every submission to Firestore as one JSON record at `attempts/<random-id>` (quiz, taker name/email, answers, score, server `submittedAt`); result screen shows save status and never waits for it
- feat(attempts): local retry queue with back-off; unsaved attempts are kept in the browser and sent on the next quiz page load; refused attempts are not retried
- feat(firebase): `config.js` (VITE_* settings, emulator mode with demo project) and `firebase.js` using Firestore Lite (smaller bundle); add `VITE_EMULATOR_HOST`
- feat(rules): `firestore.rules`: anyone may create a strictly validated attempt; only the dashboard UID may read; no updates or deletes; everything else closed. Add `firebase.json`, `.firebaserc` (demo-quizcraft), `firestore.indexes.json` (quizId + submittedAt)
- chore(deps): add `firebase-tools` (emulators) and `@firebase/rules-unit-testing@6` (rules tests) as dev dependencies
- test: config, Firebase writer (mocked SDK), attempt record/queue tests; Firestore rules tests for valid/invalid creates, no update/delete, read only by dashboard (run in CI on the emulator)
- ci: install Java 21, cache the emulator download, run `npm run test:rules`
- docs: README attempt record, permissions table, local emulator setup, env vars and test map; mark phase 3 done
- feat(quiz-page): taker flow at `/q/<id>`: intro with name/email form and privacy notice, all questions on one page with progress bar, unanswered-questions check, result screen with score and review (your answer, correct answer, why)
- feat(quiz-page): `quizLoader` (not found / closed / error states), `takerForm` validation (NFC, length, email), pure `scoring`
- feat(arabic): `bidi` helpers; text direction chosen by main script instead of `dir="auto"` so English sentences starting with an Arabic word read correctly; Arabic runs set in Noto Naskh Arabic; only the question/review lists flip to RTL for Arabic quizzes (plan and CLAUDE.md updated)
- feat(fonts): self-host Noto Naskh Arabic and Noto Sans via `@fontsource/*` npm packages (bundled by Vite, OFL licence) instead of committing woff2 files
- feat(dev): Vite dev/preview rewrites for `/q/*` and `/dashboard`; favicon
- style: quiz page design (Mushaf green, gold selection, single column, sticky progress bar), mobile and reduced-motion support
- test: bidi, taker form, scoring, loader, views (jsdom, XSS, flows) and rewrites; 114 tests, 100 % line coverage
- docs: README features, routes, Arabic/RTL and test map; mark phase 2 done
- quiz: add ism-four-properties (20 questions, mixed English/Arabic) covering the Status, Number, Gender and Type of an اِسْم; correct answers spread 5/5/5/5 across positions
- feat(quiz-format): add `schema/quiz.schema.json` and `src/lib/validate.js` (4 options, exactly one correct, unique ids, id = file name, NFC text, correct-answer spread); Ajv is a dev dependency used only to test that the schema and validator agree
- feat(build): add `scripts/build-quiz-index.mjs` (runs before dev/build) that validates quizzes and writes `public/quizzes/` plus `index.json`
- feat(tooling): add `npm run new-quiz -- <id>` scaffold
- test: Arabic and English quiz fixtures; validator, index builder, scaffold and all-quizzes tests (62 tests, 100 % line coverage)
- docs: README quiz format, validation rules and how to add or edit a quiz; mark phase 1 done
- chore: bootstrap Vite multi-page static site (index, quiz, dashboard, 404) with base RTL-aware CSS
- chore: add ESLint (with innerHTML ban for XSS), Prettier, Vitest with 90 % coverage gate, `.env.example`
- feat(ci): add `scripts/check-changelog.mjs` that fails when a commit skips CHANGELOG.md or date headings are invalid, plus optional `.githooks/pre-commit`
- test: cover changelog parsing, rule checks and range handling (14 tests)
- ci: add GitHub Actions workflow (lint, format, tests + coverage, build, changelog check)
- docs: README skeleton with all 19 sections; mark phase 0 done in `docs/PROGRESS.md`
- docs: add product and technical plan (`docs/PLAN.md`), phased build instructions (`docs/BUILD_PROMPT.md`) and progress tracker (`docs/PROGRESS.md`)
- chore: add `CLAUDE.md` standing rules and Claude Code slash commands `/build-phase` and `/add-quiz`
- docs: add initial README and this changelog
