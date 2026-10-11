# Changelog

All notable changes to this project are recorded here, grouped by date (newest first). Every commit adds at least one bullet under its date.

## 2026-10-11

- feat(scripts): add `npm run new-quiz -- <quiz-id>`, which scaffolds a valid, inactive quiz file with placeholder text in the quiz language (`--questions`, `--language`, `--title`) and refuses to overwrite an existing file
- docs: add the "add or edit a quiz" guide to the README (Claude Code and by hand, editing and retiring a live quiz)
- feat(build): add `scripts/build-quiz-index.mjs`, which validates `quizzes/`, publishes them to `public/quizzes/` and writes `index.json`; it runs before `vite build` and `vite dev`, and an invalid quiz fails the build without writing anything
- feat(scripts): add `npm run validate:quizzes` (`--check`: validate without writing)
- docs: document the quiz file format, its validation rules, the generated quiz routes and the module → test map in the README
- quiz: add tajweed-basics-01 (5 questions, Arabic with full diacritics)
- quiz: add html-basics-01 (5 questions, English)
- test(quiz): validate every file in `quizzes/` against the validator and the schema, and check the Arabic sample keeps its diacritics
- feat(quiz): add `schema/quiz.schema.json` and `src/lib/validate.js` enforcing every PLAN §4 rule (exactly one correct answer, 4 unique options, unique question ids, id = file name, NFC text with diacritics kept, correct-answer spread)
- test(quiz): add Arabic, mixed and twelve invalid quiz fixtures; 66 tests covering the validator and the schema/validator agreement (100 % lines on `src/lib`)
- chore: bootstrap Vite multi-page static site (index, quiz, dashboard, 404) with base RTL-aware CSS
- chore: add ESLint (with innerHTML ban for XSS), Prettier, Vitest with 90 % coverage gate, `.env.example`
- feat(ci): add `scripts/check-changelog.mjs` that fails when a commit skips CHANGELOG.md or date headings are invalid, plus optional `.githooks/pre-commit`
- test: cover changelog parsing, rule checks and range handling (14 tests)
- ci: add GitHub Actions workflow (lint, format, tests + coverage, build, changelog check)
- docs: README skeleton with all 19 sections; mark phase 0 done in `docs/PROGRESS.md`
- docs: add product and technical plan (`docs/PLAN.md`), phased build instructions (`docs/BUILD_PROMPT.md`) and progress tracker (`docs/PROGRESS.md`)
- chore: add `CLAUDE.md` standing rules and Claude Code slash commands `/build-phase` and `/add-quiz`
- docs: add initial README and this changelog
