# Build progress

Claude Code ticks each phase (with the date) in the last commit of that phase. Phases are defined in `docs/BUILD_PROMPT.md`.

- [x] Phase 0 — Bootstrap (2026-10-11)
- [x] Phase 1 — Quiz format (2026-10-11)
- [x] Phase 2 — Quiz page (taker) (2026-10-11)
- [x] Phase 3 — Saving attempts (Firestore) (2026-10-11)
- [x] Phase 4 — Dashboard (2026-10-12)
- [ ] Phase 5 — Exports
- [ ] Phase 6 — Hardening
- [ ] Phase 7 — E2E and deployment

## Deviations from the plan

- Phase 0: `firebase-tools` and `@firebase/rules-unit-testing` are installed in phase 3 (when the emulators are first used) instead of phase 0, to keep the bootstrap light. Java setup in CI is added at the same time.
- Phase 1: the two sample quizzes (Arabic and English) live in `tests/fixtures/` instead of `quizzes/`, so only real quizzes are published. The first real quiz is `ism-four-properties`.
- Phase 1: `src/lib/validate.js` is hand-written (no Ajv in the browser, which would conflict with a strict CSP); a test checks it agrees with the JSON Schema.
- Phase 2: fonts come from the `@fontsource` npm packages (bundled into the build, licence included in the package) rather than woff2 files committed to `public/fonts/`.
- Phase 2: text direction is set from the text's main script (`textDirection()`), not `dir="auto"`, because `dir="auto"` scrambled English explanations that begin with an Arabic word. For Arabic quizzes only the question and review lists switch to RTL; the English interface stays LTR. `PLAN.md` §7 and `CLAUDE.md` rule 7 updated.
- Phase 3: Firestore rules tests run in GitHub Actions only. The Claude workspace used to build this phase blocks the emulator download (storage.googleapis.com), so the first CI run of this branch is the first real run of `npm run test:rules`. Check it passes before merging.
- Phase 3: attempts use a browser-generated document id (not Firestore auto-id) so retries are idempotent; the site uses Firestore Lite.
- Phase 3: the rules check that the number of answers equals `total` and `score ≤ total`, but cannot check each answer against the quiz (rules have no loops). The dashboard's re-scoring (phase 4) covers this, as planned.
- Merge (2026-10-11): `phase-1-quiz-format-v2` (a second phase 1 built separately) was merged keeping the original phase 1 code; only its two sample quizzes and its invalid-quiz fixtures were taken. Because of that, `quizzes/` now also holds the samples `tajweed-basics-01` and `html-basics-01` (set `"active": false` to hide either).
- Phase 4: the dashboard reads the newest 5,000 attempts in one query and does grouping, filters and statistics in the browser (simple, no extra indexes; revisit if a quiz ever gets more). Per-question statistics count only attempts taken on the current quiz version.
- Phase 4: the dashboard could not be tried against Firebase in the build workspace (no emulator download). Its screens were checked with test data, and its Firebase calls are covered by mocked tests; the end-to-end test with the emulators comes in phase 7.
