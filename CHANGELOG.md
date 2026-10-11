# Changelog

All notable changes to this project are recorded here, grouped by date (newest first). Every commit adds at least one bullet under its date.

## 2026-10-11


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
