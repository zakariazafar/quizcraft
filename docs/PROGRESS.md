# Build progress

Claude Code ticks each phase (with the date) in the last commit of that phase. Phases are defined in `docs/BUILD_PROMPT.md`.

- [x] Phase 0 — Bootstrap (2026-10-11)
- [x] Phase 1 — Quiz format (2026-10-11)
- [ ] Phase 2 — Quiz page (taker)
- [ ] Phase 3 — Saving attempts (Firestore)
- [ ] Phase 4 — Dashboard
- [ ] Phase 5 — Exports
- [ ] Phase 6 — Hardening
- [ ] Phase 7 — E2E and deployment

## Deviations from the plan

- Phase 1: `src/lib/validate.js` implements the structural rules itself instead of running Ajv, so the same module can run in the browser from phase 2 without pulling Ajv (a dev dependency) into the bundle. `schema/quiz.schema.json` is still the published contract and is checked with Ajv in Node (`scripts/lib/quizSchema.js`); `tests/unit/quizSchema.test.js` asserts the schema's limits and the validator's limits never drift apart, and the build reports it if the schema ever finds something the validator missed.
- Phase 1: `scripts/build-quiz-index.mjs` takes `--check` (validate without writing, exposed as `npm run validate:quizzes`) plus `--quizzes`/`--out` so the script itself can be tested end to end in a temp directory. A `predev` hook publishes quizzes for `npm run dev` too.
- Phase 1: the plan named only an Arabic sample quiz; the English one was chosen as `html-basics-01` (HTML and text direction). Both are marked as samples in their `source` field.
- Phase 0: `firebase-tools` and `@firebase/rules-unit-testing` are installed in phase 3 (when the emulators are first used) instead of phase 0, to keep the bootstrap light. Java setup in CI is added at the same time.
