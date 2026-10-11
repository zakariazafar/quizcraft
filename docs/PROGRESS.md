# Build progress

Claude Code ticks each phase (with the date) in the last commit of that phase. Phases are defined in `docs/BUILD_PROMPT.md`.

- [x] Phase 0 — Bootstrap (2026-10-11)
- [x] Phase 1 — Quiz format (2026-10-11)
- [x] Phase 2 — Quiz page (taker) (2026-10-11)
- [ ] Phase 3 — Saving attempts (Firestore)
- [ ] Phase 4 — Dashboard
- [ ] Phase 5 — Exports
- [ ] Phase 6 — Hardening
- [ ] Phase 7 — E2E and deployment

## Deviations from the plan

- Phase 0: `firebase-tools` and `@firebase/rules-unit-testing` are installed in phase 3 (when the emulators are first used) instead of phase 0, to keep the bootstrap light. Java setup in CI is added at the same time.
- Phase 1: the two sample quizzes (Arabic and English) live in `tests/fixtures/` instead of `quizzes/`, so only real quizzes are published. The first real quiz is `ism-four-properties`.
- Phase 1: `src/lib/validate.js` is hand-written (no Ajv in the browser, which would conflict with a strict CSP); a test checks it agrees with the JSON Schema.
- Phase 2: fonts come from the `@fontsource` npm packages (bundled into the build, licence included in the package) rather than woff2 files committed to `public/fonts/`.
- Phase 2: text direction is set from the text's main script (`textDirection()`), not `dir="auto"`, because `dir="auto"` scrambled English explanations that begin with an Arabic word. For Arabic quizzes only the question and review lists switch to RTL; the English interface stays LTR. `PLAN.md` §7 and `CLAUDE.md` rule 7 updated.
