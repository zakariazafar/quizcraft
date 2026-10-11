# Build progress

Claude Code ticks each phase (with the date) in the last commit of that phase. Phases are defined in `docs/BUILD_PROMPT.md`.

- [x] Phase 0 — Bootstrap (2026-10-11)
- [ ] Phase 1 — Quiz format
- [ ] Phase 2 — Quiz page (taker)
- [ ] Phase 3 — Saving attempts (Firestore)
- [ ] Phase 4 — Dashboard
- [ ] Phase 5 — Exports
- [ ] Phase 6 — Hardening
- [ ] Phase 7 — E2E and deployment

## Deviations from the plan

- Phase 0: `firebase-tools` and `@firebase/rules-unit-testing` are installed in phase 3 (when the emulators are first used) instead of phase 0, to keep the bootstrap light. Java setup in CI is added at the same time.
