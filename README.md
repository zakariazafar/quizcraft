# QuizCraft

A static quiz website. Quizzes are JSON files in this repo (Arabic, English or mixed). Anyone with a quiz's public link enters their name and email, takes the quiz, and sees their score, the correct answers and an explanation for each mistake. Every attempt is saved as a JSON record in Firebase Firestore. A password‑protected dashboard shows all attempts, statistics, share links, and JSON/CSV downloads.

> **Status:** planning complete, build not started. This README will be completed during the build (see `docs/BUILD_PROMPT.md` → README specification).

## Planned stack
- Static site: Vite + vanilla JavaScript, hosted as a **Render Static Site**
- Attempt storage: **Firebase Firestore**; dashboard sign‑in: **Firebase Authentication**
- Tests: Vitest, Firebase Emulator rules tests, Playwright end‑to‑end; GitHub Actions CI

## Documents
| File | What it is |
|---|---|
| [`docs/PLAN.md`](docs/PLAN.md) | Full product and technical plan |
| [`docs/BUILD_PROMPT.md`](docs/BUILD_PROMPT.md) | Phase‑by‑phase build instructions for Claude Code |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Which phases are done |
| [`CLAUDE.md`](CLAUDE.md) | Standing rules Claude Code follows in this repo |
| [`CHANGELOG.md`](CHANGELOG.md) | Dated list of changes (updated in every commit) |

## Building with Claude Code
1. Open Claude Code in this repository.
2. Run `/build-phase`. Claude Code builds the next phase, commits, pushes a branch, opens a PR and stops for review.
3. Review and merge the PR, then run `/build-phase` again until all phases in `docs/PROGRESS.md` are ticked.
4. To add a quiz later: `/add-quiz <paste content or give a file path>`.

## One‑time setup you do yourself
See `docs/PLAN.md` §15: create the Firebase project (Firestore, Email/Password auth, dashboard user), add GitHub secrets for rules deployment, and create the Render Blueprint.
