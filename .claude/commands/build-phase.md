---
description: Build the next unfinished phase of QuizCraft from docs/BUILD_PROMPT.md
argument-hint: "[optional phase number, e.g. 3]"
---

1. Read `CLAUDE.md`, `docs/PLAN.md`, `docs/BUILD_PROMPT.md` and `docs/PROGRESS.md` completely.
2. Pick the phase to build: phase `$ARGUMENTS` if a number was given, otherwise the first phase in `docs/PROGRESS.md` that is not ticked. Earlier phases must be ticked first; if one isn't, stop and tell me.
3. Create the branch `phase-<N>-<short-name>` from an up‑to‑date `main`.
4. Build that phase exactly as described in `docs/BUILD_PROMPT.md`, following every rule in `CLAUDE.md`: small Conventional Commits, each with tests and a bullet under today's date in `CHANGELOG.md`, README updated when relevant.
5. Run all checks listed for the phase. Fix failures before committing.
6. In the last commit, tick the phase in `docs/PROGRESS.md` with today's date and record any deviations from the plan.
7. Push the branch and open a PR to `main` (`gh pr create`) if the GitHub CLI is available; otherwise push and give me the compare link.
8. Stop and summarise: what was built, test count and coverage, anything I need to do, and deviations from the plan.
