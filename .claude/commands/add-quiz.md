---
description: Create a new quiz JSON file from content I provide
argument-hint: "<pasted content, or a path to a .txt/.pdf/.docx file> [questions=10] [difficulty=medium] [language=auto] [id=slug]"
---

Create a new quiz from this input: $ARGUMENTS

Follow the section "How to add a quiz" in `CLAUDE.md` and the quiz format in `docs/PLAN.md` §4 exactly:
- If any of question count, difficulty, language or quiz id is missing, use the defaults in `CLAUDE.md` and say which you used.
- Questions only from the given content; 4 options, exactly one correct, varied correct position, explanation for each; Arabic copied exactly with diacritics.
- Work on a branch `quiz/<quiz-id>`, run `npm test` and `npm run build`, commit as `quiz: add <quiz-id> (<n> questions, <language>)` with a CHANGELOG bullet, push and open a PR.
- Finish by giving me the public link `<VITE_SITE_URL>/q/<quiz-id>` that will work once the PR is merged and deployed.
