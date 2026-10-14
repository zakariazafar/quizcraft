# QuizCraft: Product & Technical Plan (v2: static site + Firebase)

> Working name: **QuizCraft** (rename freely).
> Plan date: 2026-10-11 · v2 replaces the earlier FastAPI/database/email plan.

---

## 1. Product summary

A **static website** (HTML, CSS, JavaScript; no server of our own, no database server, no Python).

- **Quizzes are made by code**: each quiz is a JSON file in the GitHub repo (`quizzes/<quiz-id>.json`). New quizzes are written by Claude Code from content you give it, validated by automated tests, and published by pushing to GitHub. Render rebuilds the site automatically.
- **Quiz takers** open a quiz's public link, enter their **name and email**, answer the questions, and **see their result on screen**: total score, plus the correct answer and an explanation for every wrong answer. **Result emails are optional** (§2.2): a taker can email their own result to themselves, and the dashboard can email an attempt's result to its taker — both through EmailJS (a client‑callable email API), since the site has no backend of its own to send mail from.
- **Every attempt is saved as a JSON record** (taker name, email, answers, score, time) in **Firebase Firestore**, a Google‑hosted document store with a free tier. Nothing to run or maintain.
- **Dashboard**: anyone with the dashboard password can open `/dashboard`, pick a quiz and see all its attempts, statistics, details of each attempt, and download the data as JSON or CSV. Each quiz has a **Share** button that copies its public link, and each attempt row has an **Email result** button.
- Questions and options can be in **Arabic** (or mixed Arabic/English) and display correctly right‑to‑left with a proper Arabic font.
- Hosted as a **Render Static Site**; code in **GitHub**; every functional module covered by tests; README documents the product; `CHANGELOG.md` gets a dated entry with every commit.

**Removed from v1:** sign‑up/sign‑in, maker accounts, FastAPI backend, PostgreSQL, AI generation inside the app. (Result emails were also removed from v1, since sending mail needs a backend the static-site design doesn't have — reinstated 2026-10-15 via EmailJS, a client-side email API, once a no-backend way to send them was chosen.)

---

## 2. Flows

### 2.1 Creating a quiz (by code)

1. You give Claude Code the source content (text, PDF, Word file, notes) and say how many questions, the difficulty and the language.
2. Claude Code writes `quizzes/<quiz-id>.json` following the quiz format (§4), with 4 options per question, exactly one correct, and an explanation for each.
3. `npm test` validates every quiz file (schema, exactly one correct answer, unique IDs, Arabic text normalised, correct answers spread across positions).
4. Commit (with a CHANGELOG entry) and push → GitHub Actions runs the tests → Render rebuilds → the quiz is live at `https://<site>/q/<quiz-id>`.
5. To retire a quiz, set `"active": false` (the link shows "This quiz is closed"; past attempts stay in the dashboard).

### 2.2 Taking a quiz (public)

1. Open `/q/<quiz-id>` → see title, description and number of questions.
2. Enter **name** (required) and **email** (required, validated) → **Start**.
3. All questions on one page; one choice per question. A warning before submitting lists any unanswered questions (they count as wrong).
4. **Submit** → the score is calculated in the browser and the **result screen** shows:
   - quiz name, taker name, **total score** (e.g. `7 / 10 – 70%`);
   - for each wrong or unanswered question: the question, _your answer_, _correct answer_, and _why it's correct_ (explanation);
   - a congratulation message if all answers are right.
5. At the same moment, the attempt is saved to Firestore. If saving fails (offline, etc.) the result is still shown, the attempt is kept in the browser and retried automatically (up to 3 times, then again on the next visit), and a small notice says "Result not yet saved, retrying…".
6. **Email me this result** (shown only when EmailJS is configured): sends the same score and review to the taker's own email via EmailJS. Best-effort, not retried; a failed send shows a button to try again.

### 2.3 Dashboard (password protected)

1. Open `/dashboard` → enter the dashboard password → **Sign in**. (The password is checked by Firebase, not by page code; see §6.)
2. **Quiz list**: title, language, number of questions, number of attempts, average score, active/closed, **Share** button (copies the public link and shows "Link copied").
3. **Quiz page**:
   - Summary: attempts, unique takers, average / highest / lowest score, average percentage.
   - **Attempts table**: taker name, email, score, %, date/time. Sort, search by name/email, filter by date range.
   - **Attempt detail**: every question with the taker's choice, the correct choice, and whether it was right.
   - **Per‑question stats**: % answered correctly, most‑chosen wrong option (shows which questions are hard).
   - **Download** JSON (the raw attempt records) and CSV (UTF‑8 with BOM so Excel shows Arabic correctly).
   - **Email result** (shown only when EmailJS is configured): re-scores the attempt from its saved answers and emails that result to the taker. Disabled for attempts on an older quiz version, since they can't be reliably re-scored.
4. **Sign out**. The session lasts until sign‑out or browser close (configurable).

---

## 3. Technology choices

| Concern                                  | Choice                                                                                                                                                                           | Why                                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Site                                     | Plain **HTML + CSS + JavaScript (ES modules)**, built with **Vite** (multi‑page)                                                                                                 | No framework needed; Vite bundles the Firebase SDK and injects config                                              |
| Quiz content                             | JSON files in `quizzes/`, validated with **JSON Schema (Ajv)**                                                                                                                   | "Made by code", reviewable in pull requests                                                                        |
| Attempt storage                          | **Firebase Firestore** (free Spark plan)                                                                                                                                         | No server to run; security rules control who can read/write                                                        |
| Dashboard password                       | **Firebase Authentication** (email/password) with one shared dashboard account                                                                                                   | The password is checked by Google's servers, so it can't be read from the page source                              |
| Abuse protection (optional, recommended) | **Firebase App Check** with reCAPTCHA v3                                                                                                                                         | Makes it harder for scripts to spam fake attempts                                                                  |
| Result emails (optional)                 | **EmailJS** (client-callable email API)                                                                                                                                          | Sends mail without a backend of our own; public key isn't secret, EmailJS restricts abuse by domain and rate limit |
| Arabic font                              | **KFGQPC Uthmanic Script HAFS** (self-hosted original OTF with its licence; Amiri Quran as fallback and for the Arabic comma, semicolon and question mark) + **Figtree** (Latin) | No external CDN; the Uthmanic script requested for this project                                                    |
| Installability / offline                 | Hand-written **service worker** (`public/sw.js`) + **Web App Manifest** (`public/manifest.webmanifest`); no framework/plugin                                                     | Matches the "no framework" rule; small enough to read and test directly                                            |
| Colour theme                             | `prefers-color-scheme` **dark mode**, no in-app toggle; same tokens, checked for WCAG AA in both                                                                                 | Matches the device/browser setting with no extra UI                                                                |
| Unit/integration tests                   | **Vitest** + **jsdom**                                                                                                                                                           | Fast, runs in CI                                                                                                   |
| Security‑rule tests                      | **@firebase/rules-unit-testing** + **Firebase Emulator Suite**                                                                                                                   | Proves who can read and write                                                                                      |
| End‑to‑end tests                         | **Playwright** against the built site + emulators                                                                                                                                | Full taker and dashboard flows                                                                                     |
| Lint/format                              | **ESLint** + **Prettier**                                                                                                                                                        | Consistent code                                                                                                    |
| CI                                       | **GitHub Actions**                                                                                                                                                               | Lint, tests, coverage gate, changelog check, rules deploy                                                          |
| Hosting                                  | **Render Static Site** via `render.yaml`                                                                                                                                         | Auto‑deploy from GitHub, free                                                                                      |

---

## 4. Quiz file format (`quizzes/<quiz-id>.json`)

```json
{
  "id": "tajweed-basics-01",
  "version": 1,
  "active": true,
  "title": "أحكام التجويد: المستوى الأول",
  "description": "Ten questions on the basics of tajweed.",
  "language": "ar",
  "createdAt": "2026-10-12",
  "source": "Notes provided by the owner, chapter 1",
  "questions": [
    {
      "id": "q1",
      "text": "ما حكم النون الساكنة إذا جاء بعدها حرف الباء؟",
      "options": [
        { "id": "a", "text": "الإظهار" },
        { "id": "b", "text": "الإقلاب" },
        { "id": "c", "text": "الإدغام" },
        { "id": "d", "text": "الإخفاء" }
      ],
      "correct": "b",
      "explanation": "إذا جاء بعد النون الساكنة أو التنوين حرف الباء تُقلب ميمًا مخفاة مع الغنة، وهذا هو الإقلاب."
    }
  ]
}
```

Rules (enforced by tests):

- `id`: lowercase letters, digits and hyphens, 3–60 chars, equal to the file name, unique.
- `language`: `ar`, `en` or `mixed`.
- 1–100 questions; question `id`s unique within the quiz; exactly **4 options** with unique `id`s; `correct` matches one option `id`; `explanation` not empty.
- All text NFC‑normalised; Arabic diacritics kept; no leading/trailing spaces.
- Correct answers spread across positions (test fails if > 50 % of a quiz's correct answers share one position, for quizzes with ≥ 6 questions).
- If questions are changed after people have taken the quiz, `version` is increased. Attempts record the version they were taken against.

A build script generates `public/quizzes/index.json` (id, title, language, question count, active) for the dashboard.

> **Note on answer visibility:** because the site has no server, the quiz file (including correct answers) is downloaded by the browser. A technical user could find the answers in their browser's developer tools. This is fine for practice and learning quizzes, but don't use it for high‑stakes exams. The dashboard **re‑scores every attempt** from the saved answers, so a faked score is detected and flagged (§6).

---

## 5. Attempt record (Firestore)

Collection path: `attempts/{attemptId}`, where `attemptId` is a random id created in the browser before the first save (so a retried save can't create a duplicate). One document per submission:

```json
{
  "quizId": "tajweed-basics-01",
  "quizVersion": 1,
  "quizTitle": "أحكام التجويد: المستوى الأول",
  "takerName": "Zakaria",
  "takerEmail": "someone@example.com",
  "takerEmailLower": "someone@example.com",
  "answers": [
    { "questionId": "q1", "selected": "b", "correct": true },
    { "questionId": "q2", "selected": null, "correct": false }
  ],
  "score": 7,
  "total": 10,
  "percent": 70,
  "startedAt": "2026-10-12T09:01:12.000Z",
  "submittedAt": "<server timestamp>",
  "clientId": "random id per browser",
  "userAgent": "short UA string"
}
```

- `takerName` and `takerEmail` are stored exactly as entered (trimmed, NFC). `takerEmailLower` is used for searching and grouping.
- The dashboard can list attempts **by taker name and email**, and the JSON download is exactly these records.
- Firestore has no hard limit issue here: about 1 KB per attempt; the free tier allows 20 000 writes/day and 1 GiB storage (check Firebase's current limits).

---

## 6. Security model (no server of our own)

**Firestore security rules (`firestore.rules`, in the repo, tested):**

- `attempts`: **create** allowed to anyone, only if the document has exactly the allowed fields with the right types and sizes (name ≤ 100 chars, email ≤ 254 chars and email‑shaped, ≤ 100 answers, `0 ≤ score ≤ total ≤ 100`, `percent` consistent, `submittedAt == request.time`). With App Check enforced, only requests from our site are accepted.
- **No update, no delete** from the site, ever.
- **Read** only if signed in as the dashboard account: `request.auth.uid == "<DASHBOARD_UID>"`.
- Everything else denied.

**Dashboard password:**

- One Firebase Auth user, e.g. `dashboard@quizcraft.local`, whose password is the dashboard password. The dashboard page shows only a password box; the email is fixed in config. Firebase checks the password, so it is **not in the page source or the repo**.
- The password must **never be committed** to the repo, README or tests. Tests use the emulator with a test password.
- Turn off public sign‑ups in Firebase Auth settings. Even if someone created another account, the rules only allow the dashboard UID to read.
- Changing the password: Firebase console → Authentication → the dashboard user → reset password.

**Score integrity:** the browser calculates the score, so someone could submit a fake one. The dashboard recalculates every attempt from its `answers` against the quiz file and marks mismatches with a ⚠ badge, so you always see the real score.

**Spam:** anyone with the link can submit attempts. App Check plus the rules' field limits keep this reasonable; the dashboard can hide attempts marked as spam (stored locally, since the site can't delete).

**Privacy:** taker emails are personal data. They are readable only through the dashboard. The quiz start page shows a one‑line notice: "Your name, email and answers are saved so the quiz owner can see results."

**Headers:** Render `headers` in `render.yaml`: Content‑Security‑Policy (self + Firebase/Google domains needed by the SDK and reCAPTCHA, plus `https://api.emailjs.com` for result emails), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.

**Result emails:** sent through EmailJS from the browser, since the site has no backend to send mail from itself. The EmailJS public key is bundled in the built site, same as the Firebase web config — not a secret; EmailJS restricts abuse by allowed domain and rate limits on their side, not by hiding the key. Sending is best-effort and not retried (unlike saving an attempt): a failed send shows a button to try again, never blocks the result screen or the dashboard.

---

## 7. Arabic / RTL support

- `<meta charset="utf-8">`; UI language English; content direction per element.
- Every element showing quiz or taker text gets the class `.bidi`. Quiz text (titles, questions, options, explanations) takes its `dir` from the quiz language: `ar` is `rtl`, `en` and `mixed` are `ltr`, so an English sentence that quotes a lot of Arabic still reads left to right. Free text such as taker names gets `rtl` when most of its letters are Arabic, otherwise `ltr`. Arabic runs inside any text are wrapped in `<span class="ar" lang="ar" dir="rtl">` and set in the Arabic font. Text inputs use `dir="auto"`.
- If a quiz has `language: "ar"`, the quiz area gets `dir="rtl"` and `lang="ar"` so the layout (radio buttons, numbering) also flips.
- CSS logical properties only (`margin-inline-start`, `text-align: start`), never left/right for text layout.
- Fonts: Arabic in `"KFGQPC Uthmanic Script HAFS", "Amiri Quran", serif` (one weight; never synthetic bold), Latin in `"Figtree", system-ui, sans-serif`. The KFGQPC file is served unmodified from `public/fonts/` with `font-display: swap` and a `unicode-range` that leaves out U+060C, U+061B and U+061F (drawn as Quranic signs in that font). Arabic line-height 1.8 to 1.9 and font-size 1.6 times the Latin body text.
- Inputs (name, search) have `dir="auto"` (the user's typing decides).
- CSV export is UTF‑8 with BOM; JSON export is UTF‑8.
- Tests use real Arabic fixtures with diacritics and mixed Arabic/English in every layer: quiz validation → rendering → scoring → attempt record → dashboard → CSV/JSON export.

---

## 8. Pages and routes

| URL                   | File                         | Purpose                                                                                  |
| --------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `/`                   | `index.html`                 | Simple landing page (site name, link to dashboard). Quizzes are **not** listed publicly. |
| `/q/<quiz-id>`        | `quiz.html` (Render rewrite) | Quiz intro → name/email → questions → result                                             |
| `/dashboard`          | `dashboard.html`             | Password sign‑in → quiz list → quiz stats/attempts                                       |
| `/quizzes/<id>.json`  | static                       | Quiz data (fetched by `quiz.html`)                                                       |
| `/quizzes/index.json` | generated                    | Quiz list for the dashboard                                                              |
| `*` (not found)       | `404.html`                   | Friendly not‑found page                                                                  |

---

## 9. Code structure

```
quizcraft/
├── quizzes/                    # quiz JSON files (source of truth)
├── schema/quiz.schema.json     # JSON Schema for quiz files
├── src/
│   ├── pages/  index.js  quiz.js  dashboard.js
│   ├── lib/
│   │   ├── config.js           # reads VITE_* env vars
│   │   ├── firebase.js         # init app, Firestore, Auth, App Check
│   │   ├── quizLoader.js       # fetch + validate quiz JSON, active check
│   │   ├── validate.js         # quiz validation (shared by tests, build, browser)
│   │   ├── scoring.js          # pure scoring + review list
│   │   ├── takerForm.js        # name/email validation, NFC
│   │   ├── attempts.js         # build record, save, retry queue (localStorage)
│   │   ├── email.js            # pure: result email body + EmailJS template params
│   │   ├── emailClient.js      # thin EmailJS SDK wrapper (send one result email)
│   │   ├── dashboardAuth.js    # sign in/out with fixed email + password
│   │   ├── dashboardData.js    # query attempts, re-score, stats, per-question stats
│   │   ├── exportData.js       # JSON + CSV (BOM) export
│   │   ├── share.js            # public URL + clipboard copy with fallback
│   │   ├── bidi.js             # dir/lang helpers, Arabic detection
│   │   ├── registerServiceWorker.js  # registers public/sw.js (production builds only)
│   │   └── render/             # small DOM render functions (escape all text!)
│   └── styles/  app.css  fonts.css
├── public/fonts/               # KFGQPC Uthmanic Script HAFS (OTF) + its licence
├── public/manifest.webmanifest public/sw.js public/icons/  # PWA: install + offline
├── index.html  quiz.html  dashboard.html  404.html
├── scripts/
│   ├── build-quiz-index.mjs    # writes public/quizzes/ (copies + index.json)
│   ├── new-quiz.mjs            # scaffolds a quiz file
│   ├── render-icons.mjs        # regenerates PWA icon PNGs from the brand SVGs (by hand)
│   ├── check-dist.mjs          # CI/build: CSP compatibility + PWA file consistency
│   └── check-changelog.mjs     # CI: every commit touches CHANGELOG.md
├── firestore.rules  firestore.indexes.json  firebase.json  .firebaserc
├── tests/
│   ├── unit/                   # each src/lib module
│   ├── quizzes/                # validates every file in quizzes/
│   ├── rules/                  # Firestore rules with emulator
│   ├── e2e/                    # Playwright
│   └── fixtures/               # arabic-quiz.json, mixed-quiz.json, bad-*.json
├── .github/workflows/ci.yml
├── render.yaml
├── vite.config.js  vitest.config.js  playwright.config.js
├── package.json  .env.example
├── CLAUDE.md  CHANGELOG.md  README.md
└── docs/PLAN.md
```

**XSS rule:** all quiz and taker text is inserted with `textContent` (never `innerHTML`), because taker names come from the public.

---

## 10. Configuration

Build‑time environment variables (set in Render and `.env` locally). Firebase web config values are **not secret**; protection comes from the security rules.

| Variable                    | Example                          | Notes                                                                                |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `VITE_FIREBASE_API_KEY`     | `AIza...`                        | From Firebase project settings                                                       |
| `VITE_FIREBASE_AUTH_DOMAIN` | `quizcraft-xxxx.firebaseapp.com` |                                                                                      |
| `VITE_FIREBASE_PROJECT_ID`  | `quizcraft-xxxx`                 |                                                                                      |
| `VITE_FIREBASE_APP_ID`      | `1:...:web:...`                  |                                                                                      |
| `VITE_DASHBOARD_EMAIL`      | `dashboard@quizcraft.local`      | Fixed account the dashboard password signs into                                      |
| `VITE_RECAPTCHA_SITE_KEY`   |                                  | Only if App Check is enabled                                                         |
| `VITE_EMAILJS_SERVICE_ID`   | `service_abc123`                 | EmailJS service id; all three EmailJS values are needed to show result-email buttons |
| `VITE_EMAILJS_TEMPLATE_ID`  | `template_xyz789`                | EmailJS template id                                                                  |
| `VITE_EMAILJS_PUBLIC_KEY`   |                                  | EmailJS public key (not secret, see §6)                                              |
| `VITE_SITE_URL`             | `https://quizcraft.onrender.com` | Used for share links (falls back to `location.origin`)                               |
| `VITE_USE_EMULATORS`        | `false`                          | `true` in tests/local dev                                                            |

GitHub Actions secret (only for deploying rules): `FIREBASE_TOKEN` or a service‑account JSON (`FIREBASE_SERVICE_ACCOUNT`). The dashboard UID goes into `firestore.rules` (not secret).

---

## 11. Testing strategy (every functional module covered)

| Module                       | Type                    | Key cases                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate` + `tests/quizzes` | unit                    | valid Arabic/mixed quiz; missing fields; 3 or 5 options; `correct` not an option; duplicate ids; id ≠ file name; non‑NFC text; correct answers clustered; **every real file in `quizzes/` passes**                                                                                                                                                  |
| `quizLoader`                 | unit (mocked fetch)     | loads quiz, 404 → "not found", inactive → "closed", invalid JSON → error                                                                                                                                                                                                                                                                            |
| `scoring`                    | unit                    | all right, all wrong, partial, unanswered, unknown option ignored, review list has question/your answer/correct answer/explanation, Arabic preserved                                                                                                                                                                                                |
| `takerForm`                  | unit                    | name required/trimmed/NFC/max length, email validation, Arabic names allowed                                                                                                                                                                                                                                                                        |
| `attempts`                   | unit (mocked Firestore) | record has exact fields/types; save success; failure → queued in localStorage; retry on next load; no duplicates after retry                                                                                                                                                                                                                        |
| `email`                      | unit                    | plain-text body for a perfect result (no review block) and a partial one (review lines per question, Arabic preserved); template params match quiz/taker/result                                                                                                                                                                                     |
| `emailClient`                | unit (mocked EmailJS)   | sends with the configured service/template/public key; a send failure propagates to the caller                                                                                                                                                                                                                                                      |
| `share`                      | unit (jsdom)            | URL built from `VITE_SITE_URL` or origin; clipboard success shows toast; clipboard blocked → fallback input selected                                                                                                                                                                                                                                |
| `bidi`                       | unit                    | Arabic detection; `dir`/`lang` for `ar` quizzes; `quizTextDir` by quiz language; `textDirection` by main script for names                                                                                                                                                                                                                           |
| `render/*`                   | unit (jsdom)            | intro, questions, result screen; text inserted with `textContent` (script tags in names don't execute); every text container has `.bidi` and a `dir`                                                                                                                                                                                                |
| `dashboardAuth`              | unit (mocked Auth)      | correct password → signed in; wrong password → error message; sign‑out                                                                                                                                                                                                                                                                              |
| `dashboardData`              | unit                    | re‑scoring and mismatch flag; summary stats; per‑question stats; search/filter/sort; grouping by email                                                                                                                                                                                                                                              |
| `exportData`                 | unit                    | JSON matches records; CSV has BOM, header, escaped commas/quotes/newlines, Arabic intact                                                                                                                                                                                                                                                            |
| `build-quiz-index`           | unit                    | index generated, invalid quiz fails the build                                                                                                                                                                                                                                                                                                       |
| `check-changelog`            | unit                    | commit without CHANGELOG change fails; with it passes; merge commits skipped                                                                                                                                                                                                                                                                        |
| **Firestore rules**          | emulator                | anonymous create valid → ok; extra field / wrong type / oversized / score > total / wrong timestamp → denied; update/delete → denied; read anonymous → denied; read as other user → denied; read as dashboard UID → allowed                                                                                                                         |
| **E2E**                      | Playwright + emulators  | taker: open `/q/<arabic fixture>`, enter name/email, answer with one wrong, see score + correct answer + explanation, attempt in Firestore emulator; dashboard: wrong password rejected, right password → attempt listed with name/email/score, detail view, CSV and JSON download, Share copies link; closed quiz message; unknown quiz → 404 page |

- Coverage gate: **≥ 90 % lines** for `src/lib` (Vitest `coverage.thresholds`).
- No real Firebase in tests: emulators or mocks only.

---

## 12. Hosting on Render

`render.yaml`:

- `type: web`, `runtime: static`, `buildCommand: npm ci && npm run build`, `staticPublishPath: dist`.
- `routes`: rewrite `/q/*` → `/quiz.html`, `/dashboard` → `/dashboard.html`.
- `headers`: security headers from §6; long cache for `/assets/*` and fonts, short cache for `/quizzes/*`.
- `envVars`: the `VITE_*` variables (values entered in the Render dashboard, `sync: false`).
- Auto‑deploy on push to `main`. Static sites on Render don't sleep.

Firestore rules and indexes are deployed by GitHub Actions (`firebase deploy --only firestore`) on push to `main` when `firestore.rules` or `firestore.indexes.json` change.

---

## 13. GitHub, CI and changelog

- Branch per change → PR → CI green → merge to `main`.
- **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `quiz:` for new/edited quizzes).
- **CHANGELOG.md**: one section per date, newest first; every commit adds a bullet in the same commit:

  ```markdown
  # Changelog

  All notable changes, grouped by date (newest first).

  ## 2026-10-12

  - feat(quiz): render quiz page with RTL support
  - quiz: add tajweed-basics-01 (10 questions, Arabic)
  ```

- `scripts/check-changelog.mjs` fails CI if any commit in the push/PR range changed files but not `CHANGELOG.md` (merge commits skipped). Optional local `pre-commit` hook.
- **CI workflow:** checkout (full history) → Node 22 + Java 21 (for emulators) → `npm ci` → lint + format check → `npm run test:coverage` → `npm run test:rules` (emulator) → `npm run build` → Playwright e2e (emulators) → changelog check. Separate job on `main`: deploy Firestore rules.

---

## 14. Delivery phases

| #   | Phase           | Outcome                                                                                                          |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| 0   | Bootstrap       | Vite multi‑page project, lint/format, Vitest, CI, changelog script, README skeleton, CHANGELOG, CLAUDE.md        |
| 1   | Quiz format     | JSON Schema, `validate.js`, quiz tests, index build script, `new-quiz` scaffold, sample Arabic + English quizzes |
| 2   | Quiz page       | Loader, intro, name/email form, questions, scoring, result screen, Arabic/RTL styling + fonts                    |
| 3   | Saving attempts | Firebase init, attempt record, Firestore rules + emulator tests, retry queue                                     |
| 4   | Dashboard       | Password sign‑in, quiz list, Share button, stats, attempts table, detail, per‑question stats, re‑scoring         |
| 5   | Exports         | JSON and CSV download                                                                                            |
| 6   | Hardening       | App Check, CSP/headers, 404 page, privacy notice, XSS tests                                                      |
| 7   | E2E + deploy    | Playwright flows, `render.yaml`, rules deploy job, complete README                                               |

---

## 15. What the owner must do (one time)

1. Create an empty GitHub repo and give Claude Code access.
2. **Firebase** (console.firebase.google.com): create a project → add a Web app (copy the config values) → **Firestore**: create database in production mode (pick a region, e.g. `australia-southeast1`) → **Authentication**: enable Email/Password, add user `dashboard@quizcraft.local` with the dashboard password, copy its **UID**, turn off sign‑ups (Settings → User actions) → optional **App Check** with reCAPTCHA v3.
3. Create a service account (or `firebase login:ci` token) and add it to GitHub repo secrets for rule deployment.
4. **Render**: New → Blueprint → choose the repo → enter the `VITE_*` values → deploy. Set `VITE_SITE_URL` to the Render URL (or custom domain).
5. To add a quiz later: give Claude Code the content and ask it to "add a quiz" (see CLAUDE.md), review the PR, merge.

---

## 16. Assumptions (change if you disagree)

- Takers can take a quiz more than once; each attempt is a separate record.
- All questions on one page; no time limit; single‑answer, 4 options.
- The home page doesn't list quizzes. They're reached only by shared links (and from the dashboard).
- One shared dashboard password for everyone who needs results. Changing it is done in the Firebase console.
- Quizzes are for practice and learning: correct answers can be found by technical users (§4 note).

## 17. Future options

Per‑quiz dashboard passwords · time limits · random question subset/order per taker · true/false and multi‑select · certificate/printable result · Arabic UI translation · CSV import of quizzes from a spreadsheet.
