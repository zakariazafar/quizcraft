# UI revamp plan — modern, highly professional, super simple

> Working plan for `/plan-design-review`. Not yet implemented. Grounded in the current
> shipped design (`src/styles/app.css`, `src/lib/render/*.js`, `docs/screenshots/*.png`)
> and `docs/PLAN.md`.

## Starting point: what's already shipped

QuizCraft already has a real design system, not a generic template:

- **Brand**: Rub el Hizb star logo (eight-pointed star + gold check mark), green/gold/ink
  palette, two typefaces (Figtree for Latin, KFGQPC Uthmanic Script HAFS for Arabic, both
  self-hosted).
- **Components**: cards (`.card`), pill chips (`.chip`), lettered answer tiles (A–D /
  أ ب ج د), a floating progress bar, a score ring (SVG), status pills (Open/Closed/
  Removed), a sign-in card, dashboard summary cards and a per-question stats bar.
- **Light + dark mode**, both checked for WCAG AA contrast (`tests/unit/contrast.test.js`).
- **Responsive**: floating progress bar collapses to a top strip on phones; dashboard
  tables scroll horizontally.
- Screenshots on file: `docs/screenshots/{home,quiz-intro,quiz-questions,quiz-result,
dashboard-quizzes,dashboard-quiz}.png` (taken before the dark-mode/PWA work, but the
  light palette and layout they show are current).

This is the baseline the revamp works from — not a blank page.

## Owner's brief

> "revamp the ui to a modern, highly professional, super simple user experience"

## Scope

All 4 pages: home (`/`), quiz (`/q/<id>` — intro, questions, result), dashboard
(`/dashboard` — sign-in, quiz list, quiz detail/attempts), 404. Both light and dark mode.
Desktop and phone widths.

---

## Step 0: Design scope assessment

### 0A. Initial design rating

**This plan is a 2/10 on design completeness.** The brief — "modern, highly professional,
super simple" — is three adjectives, not design decisions. It names no specific gap in the
shipped UI, no token, no measurement, no interaction. As written it can't be implemented:
an engineer reading it has no way to know what to actually change.

What a 10/10 version of this plan looks like: for each of the 7 review dimensions below,
a concrete, specific decision — named spacing/type scale values, which existing components
are kept vs. replaced and why, exact empty/loading/error states for every screen, and
mockups the owner has actually approved. Not "modernise the dashboard table" but "the
attempts table gets sticky headers, 48px row height, a hover state, and the search/filter
row becomes a single toolbar — see mockup."

### 0B. DESIGN.md status

No `DESIGN.md` exists in this repo. There is a de facto design system in
`src/styles/app.css` (custom properties for colour/radius/shadow, both light and dark),
but no written rationale, scale, or component inventory. **Recommend running
`/design-consultation` separately if the owner wants a durable, documented system beyond
this one revamp.** For this review, the existing CSS custom properties and component
classes are treated as the de facto system and calibrated against.

### 0C. Existing design leverage

Reuse, don't reinvent:

- Colour tokens (`--page`, `--surface`, `--ink`, `--muted`, `--green`, `--accent`, `--gold`,
  `--right`, `--wrong`, light + dark) — already WCAG AA, already dark-mode-aware. A revamp
  should adjust values, not the token architecture.
- `.card`, `.chip`, `.button` (+ `.primary`/`.danger`/`.quiet`/`.small`), the lettered
  answer-tile pattern, the score ring, status pills — all accessible, tested
  (`tests/unit/a11y.test.js`), and already used consistently across 4 pages.
- The brand mark (Rub el Hizb star) and the two-typeface system (Figtree / KFGQPC
  Uthmanic) — both are intentional, licensed, and recently chosen by the owner. Not in
  scope to replace; a revamp works within this identity, not against it.
- `render/dom.js`'s `richText()` (bidi-aware text insertion) — every new or changed
  component must keep using it, never raw `textContent` assembly or `innerHTML`.

What's genuinely available to improve: layout rhythm, information hierarchy (especially on
the dashboard), empty/loading/error states (several are plain one-line messages today),
motion (there is close to none — a few `transition` properties on buttons/inputs, nothing
on page transitions or state changes), and the "simple" promise in the brief (some screens,
especially the dashboard quiz detail, ask the user to take in a lot at once).

---

## Pass 1: Information Architecture

**Initial rating: 3/10.** The current UI has reasonable hierarchy on 3 of 4 pages, but
this plan doesn't document it anywhere, and the 4th (dashboard quiz detail) genuinely
lacks a clear "what do you see first" decision.

### Hierarchy — restated from the existing, unchanged UI (reference, not a new decision)

```
HOME (/)
  1. Brand mark (star logo) + "QuizCraft" — the one visceral brand moment
  2. One-sentence description
  3. Three numbered steps (how a taker uses a shared link)
  4. Low-key dashboard link (owners only — must not compete with 1–3)

QUIZ — intro (/q/<id>)
  1. Quiz title (+ Arabic term inline if mixed-language) and chip row (question count,
     format, time estimate)
  2. Name/email form — the one action on this screen
  3. Privacy notice (small print)

QUIZ — questions
  1. Progress ("N of M answered") — persistent, floating/sticky
  2. Current question text
  3. Four lettered options
  4. Submit button (disabled meaning vs. enabled — see Pass 2)

QUIZ — result
  1. Score ring + headline score
  2. Right/wrong/not-answered chip summary
  3. Per-question review (wrong/unanswered only) — the actual learning content
```

### Finding 1 — dashboard quiz-detail screen has no stated hierarchy

Today it shows, top to bottom, with similar visual weight: title+chips, **5** summary
cards (Attempts/Takers/Average/Highest/Lowest), an "Attempts" heading, a 4-control
filter toolbar (search/from/to/checkboxes), the attempts table, then per-question stats
further down. Nothing in the plan (or the UI) says which of these the owner actually
needs _first_. Constraint worship: if we can only show 3 things above the fold, which 3?

**Decision 1 (approved): dashboard quiz-detail hierarchy.** Collapse the 5 summary cards
into a single slim inline stat row (`Attempts 7 · Takers 6 · Average 65% · Highest 100% ·
Lowest 40%` as labeled numbers in one bar, not 5 boxed cards), then the attempts table
immediately below (the primary task: find/review a specific taker's result).
Per-question stats move to a collapsed/secondary section (e.g. a disclosure under a
"Per-question" heading, not inline before the table). Filter toolbar stays directly above
the table it filters.

**Pass 1 rating: 3/10 → 8/10.** Hierarchy for all 4 pages is now explicit. (Not 10:
Pass 7 will cover the remaining mobile-order question for this same screen.)

---

## Pass 2: Interaction State Coverage

**Initial rating: 4/10.** The taker flow's functional states (not-found, closed quiz,
form errors, save success/failure/offline-retry) are already specified with real copy —
better than most plans. Two gaps are real:

```
FEATURE                    | LOADING              | EMPTY                          | ERROR                | SUCCESS            | PARTIAL
----------------------------|----------------------|---------------------------------|-----------------------|---------------------|------------------
Quiz page first load        | [MISSING — blank]    | n/a                             | "Something went wrong"| quiz renders        | n/a
Dashboard quiz list         | "Loading results…"   | plain text, no action          | permission-denied copy| table renders       | n/a
Dashboard attempts table    | n/a (loaded w/ list) | "No attempts match." — no       | n/a                   | table renders       | filtered-to-zero
                            |                       | distinction from "never had any"|                       |                     | looks identical
Attempt save                | "Saving…" (text only)| n/a                             | "failed"/"not saved yet"| "saved" text      | n/a
```

### Finding 2 — quiz/dashboard show a blank page while first-loading

`quiz.html`/`dashboard.html` render with an empty `<main id="app">` until the first
`fetch` resolves — on a slow connection the taker sees only the header and a blank page,
with no indication anything is happening. This is the taker's very first impression of
the product; a blank screen reads as broken, not "premium."

### Finding 3 — dashboard empty/no-match states are plain text, not designed

Three places ("No quizzes are published yet…", "No attempts match.", and the identical
message whether a quiz has zero attempts ever or zero matching the current search/date
filter) are a single unstyled sentence with no icon, no card treatment, and — in the
filtered case — no way to tell "there's nothing here" from "your filter is too narrow,"
and no "Clear filters" action to recover.

**Decision 2 (approved): first-load skeleton.** `quiz.html` and `dashboard.html` show a
skeleton placeholder (grey rounded blocks matching the real layout — a title bar, a chip
row, a form/table card outline) from first paint until data arrives. No spinner. Uses the
existing `--line`/`--surface` tokens at reduced opacity so it works in both light and
dark mode with no new colour decisions.

**Decision 3 (approved): designed empty states.** Every empty/no-match state becomes a
centered card: one simple line icon (no emoji, no illustration), one specific sentence,
and a primary action:

- Dashboard quiz list, zero quizzes: icon + "No quizzes published yet." + the existing
  `/add-quiz` guidance, phrased as the action.
- Attempts table, filtered to zero: icon + "No attempts match your filters." + a **Clear
  filters** button that resets search/date/checkboxes.
- Attempts table, genuinely zero attempts (no filters active): icon + "No one has taken
  this quiz yet." + a **Share** button (reuses the existing Share action already on this
  screen) — turns the empty state into the next useful thing to do.

**Pass 2 rating: 4/10 → 9/10.** (Not 10: the save-status "Saving…" text-only state is
functional and left as-is — flagged in Pass 7 as a deferred polish item, not a gap.)

---

## Pass 3: User Journey & Emotional Arc

**Initial rating: 5/10.**

```
STEP                        | USER DOES              | USER FEELS                        | PLAN SPECIFIES?
-----------------------------|-------------------------|------------------------------------|------------------
1. Opens shared link        | Taps a link from teacher| Mild curiosity, slight uncertainty| Yes — title/chips/privacy
                             |                         | ("is this legit, how long?")      | notice orient immediately
2. Starts (name/email)      | Fills 2 fields           | Low-friction commitment            | Yes — 2 fields, 1 button
3. Answers questions         | Picks one option per Q  | Focus; rising fatigue by Q15-20;   | Yes (progress bar) but
                             |                         | mild anxiety on hard ones          | no deliberate pacing relief
4. Submits                   | Reviews unanswered warn.| Anticipation                       | Yes
5. Sees result — the PEAK    | Reads score             | Pride (high score) OR exposure/    | Perfect score gets warmth
                             |                         | mild shame (low score)             | ("congratulation"); a LOW
                             |                         |                                    | score gets nothing — just
                             |                         |                                    | a number and a red list
6. Reviews mistakes          | Reads explanations      | Should feel like learning, not     | Explanations exist, but
                             |                         | judgment                           | framing is neutral at best
```

5-second (visceral): the intro screen already does this well (clean, chips orient
instantly). 5-minute (behavioral): the question flow is competent but has no rhythm —
20 identical question cards is a long, undifferentiated middle with nothing marking
progress milestones (e.g. "halfway there"). 5-year (reflective): this is a practice tool
a student might return to repeatedly; a discouraging low-score moment works against
repeat use.

### Finding 4 — the result screen has no emotional support for a low score

A perfect score gets a congratulation. Every other score — including a 20% a genuinely
struggling student needs to see _without feeling punished for trying_ — gets a bare
percentage and a stack of red-bordered "wrong" cards. For a learning product whose own
tagline is "see your score with an explanation for every mistake," the review should
read as coaching, not as a report card.

**Decision 4 (approved): score-tiered result line.** One short line under the score,
tiered by percentage, replacing "congratulation only at 100%":

- **100%:** keep existing congratulation copy.
- **80–99%:** celebratory but specific, e.g. "Strong result — review the {n} below to
  close the gap."
- **50–79%:** encouraging, names the gap without judgment, e.g. "Good effort. {n}
  questions to review below."
- **Below 50%:** matter-of-fact, zero false cheer, e.g. "{n} to review below — that's
  exactly what this is for."
  Review cards (wrong/unanswered) keep their current neutral factual treatment (question,
  your answer, correct answer, why) — Finding 4's "visual alarm" risk is addressed by this
  copy change, not by removing the existing red accent (which is a legitimate, restrained
  "wrong" signal, not alarmist — confirmed against Pass 4 below).

**Pass 3 rating: 5/10 → 8/10.** (Not 10: the "undifferentiated middle" of a 20-question
run — no progress-milestone moment — is deferred to Pass 7 as a nice-to-have, not a
blocking gap.)

---

## Pass 4: AI Slop Risk

**Classifier: OPERATE (App UI)**, not Persuade/Marketing. The home page is a brand/
orientation screen, not a conversion funnel — no pricing, no signup CTA, one static link.
App UI rules apply site-wide: calm hierarchy, dense-but-readable, utility language, brand
lives in the details.

**Evidence used:** `docs/screenshots/{home,quiz-intro,quiz-questions,quiz-result,
dashboard-quizzes,dashboard-quiz}.png` (rendered screenshots, pre-dark-mode but layout/
palette current) for hierarchy and composition; `src/styles/app.css` source for exact
token values, radii, shadows and the absence/presence of specific rules.

**Hard rejection check:** none triggered. The 3-step cards (below) are a near-miss on
#1/#2 but are not the first-impression element (logo/title/description come first) and
are not a feature grid selling anything — still worth fixing (Finding 5).

**Litmus:**

1. Brand/product unmistakable in first screen? **YES** — the Rub el Hizb star + green/
   gold palette is distinctive, not a template mark.
2. One strong visual anchor? **YES** on home/quiz-intro (the star mark, the title). Not
   applicable to the dashboard under App UI rules (calm hierarchy over one big anchor) —
   correctly so.
3. Scannable by headlines only? **YES** — titles and section headings carry the page.
4. Each section has one job? **YES**.
5. Are cards actually necessary? **MOSTLY** — question cards and the sign-in card earn
   their existence (the card IS the interactive unit). The home page's 3 numbered-circle
   "step" cards are the one place cards are decorative, not interactive — see Finding 5.
6. Does motion improve hierarchy or atmosphere? **NO** — see Finding 7.
7. Premium with shadows removed? **YES** — shadow usage is a single restrained token
   (offset + blur, not a flat halo), not relied on for "premium" feel.

**Reviewed and passed, no finding needed:** no purple/gradient defaults; no generic
hero copy; no cookie-cutter section rhythm (there is no such page); `system-ui` appears
only as a fallback, never the primary display font (Figtree is); radii are two
purposeful values (control vs. panel), not one bubbly radius everywhere; the faint
star-pattern texture behind the quiz intro is brand-derived, not a generic decorative
blob/wave/gradient — it's the kind of texture the rules ask for, not forbid; the red
left-border on a "wrong" review card and the ✓/✗/⚠ glyphs in the dashboard are
functional status signals (semantic, consistent, accessible-by-color-plus-text), not
decoration; heading spacing is already asymmetric (more space above than below).

### Finding 5 — home's 3 "how it works" cards match the AI-slop 3-column grid pattern

Numbered circle + bold title + 2-line description, repeated 3× symmetrically in a row —
structurally the most recognizable AI-generated layout (blacklist #2), even though the
content (onboarding steps, not product features) is legitimate and the 3 is a real
constraint-worship count, not padding.

### Finding 6 — browser surfaces aren't themed

No `::selection`, no `caret-color` on the two form pages. These are free, cheap signals
that a page was designed rather than assembled (the skill's own "reflexes no detector
catches" list), and currently default to the browser's native blue selection colour,
which visibly clashes with the green/gold palette.

### Finding 7 — near-zero motion (litmus #6 fail, confirmed from 0C)

`transition` exists only on `:hover`/`:focus-visible` for buttons and inputs. There is no
authored entrance moment anywhere — not on the result screen (the single biggest emotional
beat in the product, per Pass 3), not on the score ring, not on a review card appearing.

**Decision 5 (approved): vertical numbered list.** Replace the 3-card row on home with a
vertical list: large number (not in a circle), title and description inline per row,
connected by a thin left-aligned rule (uses `border-inline-start` + `--line`, logical
property per `CLAUDE.md` rule 7). Removes the 3-column-grid shape entirely while keeping
the same content and "constraint worship" count of 3.

**Decision 6 (approved): theme browser surfaces.** Add globally: `::selection { background:
var(--accent); color: #fff; }` (dark-mode-aware via the token) and `caret-color:
var(--accent);` on `body`. Zero layout risk, fixes a visible native-blue clash with the
green/gold palette in both themes.

**Decision 7 (approved, corrected post-Outside-Voice — see Cross-model tension
[P11]): one entrance moment on the result screen.** `app.css` already has
`.ring-value { transition: stroke-dashoffset 600ms ease; }` plus a correct
`prefers-reduced-motion: reduce` override — **this CSS is not new work.** It is
currently dead: `scoreRing()` (`quizViews.js:112-141`) sets the final
`stroke-dashoffset` at creation time with nothing to transition from. **The actual task
is JS-side:** mount the ring with `stroke-dashoffset` at the full circumference
(0%-filled), then on the next frame (`requestAnimationFrame`, double-rAF for Safari) set
it to the real target value, so the already-existing transition fires. The result card
still fades/translates up slightly on arrival (new, small CSS addition). No motion added
elsewhere (review cards, question cards, page transitions) — one authored moment, not
motion-as-decoration, consistent with the "one authored motion moment" rule.

**Pass 4 rating: 6/10 → 9/10.** (Not 10: a live rendered check against the hard rules —
real computed contrast, real spacing — needs `/design-review` after implementation;
text/source review can't fully substitute for pixels.)

---

## Pass 5: Design System Alignment

**Initial rating: 6/10.** No `DESIGN.md` exists (confirmed in 0B) — rating this plan's
own token/component discipline against the de facto system in `app.css`. Decisions 1, 2,
4, 5, 6 all reuse existing tokens/components with no new vocabulary. Two decisions
introduce something genuinely new without yet specifying it:

### Finding 8 — Decision 3's empty-state icons have no stated style or source

The app currently has zero icon usage beyond the brand mark SVG and a few functional
Unicode glyphs (✓ ✗ ⚠). "A simple line icon" for 3 empty states is a new component
category with no specified style (stroke width, size, source) — left unspecified, it
will be built ad hoc and will likely look inconsistent across the 3 places it's used.

### Finding 9 — Decision 7's motion values aren't tokenized

`app.css` has zero `--duration`/`--ease` custom properties today; existing transitions
use inline magic numbers (`120ms ease`). Adding the score-ring animation as another
inline value (`600ms ease-out`) continues that inconsistency instead of fixing it.

**Decision 8 (approved): hand-drawn inline SVG icons.** 3 small (24px) inline SVGs,
stroke-based (no fill), same stroke width and rounded line-caps as the existing logo/
favicon artwork, coloured `var(--muted)`. No new dependency.

**Decision 9 (approved, corrected post-Outside-Voice — see Cross-model tension
[P10]): tokenize motion.** Add to `:root` (and its dark-mode block needs no override —
timing isn't theme-dependent): `--duration-base: 160ms`, `--duration-emphasis: 600ms`,
`--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`. Migrate **all 3** existing `120ms ease`
rule blocks (`app.css:293` `.field input:focus-visible`; `app.css:339-341` `.button`;
`app.css:458-460` `.option:has(input:checked)::before`, 5 properties total) to
`--duration-base`, the existing `.progress-fill` `200ms ease` (`app.css:550`) — decide
whether it also becomes `--duration-base` or stays distinct, see below — and the
**existing** `.ring-value { transition: stroke-dashoffset 600ms ease; }`
(`app.css:606`) to `--duration-emphasis`/`--ease-out` (not a new rule — see Decision 7
correction).

**Pass 5 rating: 6/10 → 10/10.**

---

## Pass 6: Responsive & Accessibility

**Initial rating: 7/10.** Accessibility is already a real strength here, not an
afterthought: answer tiles are genuine `<label>`/`<input type="radio">` pairs (native
keyboard support), `aria-live` regions on progress/score-save text, `role="alert"` on
the unanswered-questions confirm, route changes move focus to the new heading
(`tabindex="-1"` + `.focus()` in both `quiz.js` and `dashboard.js`), the score ring is
correctly `aria-hidden` because the score is _also_ written out as real text elsewhere
(verified in `quizViews.js` — not a gap, a good pattern), and contrast is tested WCAG AA
in both themes. Two concrete gaps remain:

### Finding 10 — `.button.small` is under the 44px touch-target minimum

`padding: 0.35rem 0.75rem` + `font-size: 0.875rem` computes to roughly 34–36px tall
(measured from source: ~5.6px padding + ~22.4px line box + ~5.6px padding + 2×1px
border). `.button.small` is what the dashboard's Export/Answers/Hide buttons use — real
tap targets on a screen the README already says works on phones (tables scroll
horizontally there).

### Finding 11 — Decision 1's new compact stat row has no stated mobile behaviour

The approved Pass-1 fix (5 summary cards → one inline stat row) doesn't yet say what
happens at phone width: 5 labeled numbers in one row will not fit 320–400px without
either wrapping awkwardly or shrinking illegibly.

**Decision 10 (approved, scoped by Decision 18 below): 44px touch targets.**
`.button.small` gets `min-height: 44px` — **mobile only** (see Decision 18, raised
post-Outside-Voice), not globally. Font-size/padding stay as-is for visual density;
only the hit area grows, and only where touch actually applies.

**Decision 11 (approved): stat row wraps on phones.** Below the existing `30rem` phone
breakpoint (`@media (max-width: 30rem)`, already used elsewhere in `app.css`), the stat
row becomes a 2-column grid (5 items → 3 rows, last row single) instead of one line. No
horizontal scroll, no sub-16px text.

**Pass 6 rating: 7/10 → 10/10.**

---

## Pass 7: Unresolved Design Decisions

```
DECISION NEEDED                                  | IF DEFERRED, WHAT HAPPENS
--------------------------------------------------|---------------------------------------
12. Dashboard quiz-detail: same section order on  | Engineer picks an order ad hoc; could
    mobile as desktop, or reordered?               | put the table below a long per-question
                                                    | section on a phone, burying the primary
                                                    | task (Decision 1).
13. Save-status: stays text-only ("Saving…"), or  | Minor inconsistency: every other async
    gets a small inline indicator?                 | state in this revamp (loading skeleton,
                                                    | result-screen motion) got visual
                                                    | treatment; this one state didn't.
14. 20-question run: add a progress-milestone      | The flagged "undifferentiated middle"
    moment (e.g. "Halfway there"), or leave the    | (Pass 3) stays as noted but unaddressed.
    plain progress bar as the only feedback?        |
```

**Decision 12 (approved):** dashboard quiz-detail keeps the same section order (stat row
→ attempts table → per-question stats) on mobile as desktop — no separate mobile IA.

**Decision 13 (approved):** save-status stays text-only. No icon/indicator added.

**Decision 14 (approved):** no progress-milestone moment. The existing "N of M answered"
progress bar is the only mid-quiz feedback; left as-is.

**Pass 7: 3 resolved, 0 deferred.**

---

## NOT in scope

- **Brand mark, logo, and the two typefaces** (Figtree / KFGQPC Uthmanic Script HAFS) —
  recently and deliberately chosen by the owner; this revamp works within that identity.
- **A written `DESIGN.md`** — recommended separately via `/design-consultation`; this
  review calibrated against the de facto system in `app.css` instead.
- **A manual dark-mode toggle** — stays automatic (`prefers-color-scheme`) only.
- **Dashboard mobile reordering** (Decision 12) — considered, declined; same section
  order as desktop.
- **A visual indicator on the save-status text** (Decision 13) — considered, declined;
  stays text-only.
- **A progress-milestone moment in the question flow** (Decision 14) — considered,
  declined; the existing progress bar is the only mid-quiz feedback.
- **An icon library dependency** (Finding 8 alternative) — declined in favour of 3
  hand-drawn inline SVGs; no new dependency for 3 icons.

## What already exists (reuse, don't rebuild)

Colour tokens (light + dark, WCAG AA tested), `.card`/`.chip`/`.button` variants, the
lettered answer-tile pattern, the score ring, status pills, the brand mark, the
two-typeface system, `richText()` for bidi-safe text, and the route-change focus-
management pattern already in `quiz.js`/`dashboard.js`. Full detail in Step 0C above.

## TODOS.md updates

No deferred design debt. Every finding in this review (1–14) reached a terminal
decision — including the 3 explicitly declined as unnecessary scope (12: same mobile
order, 13: no save indicator, 14: no progress milestone). `TODOS.md` does not exist in
this repo and this review introduces none.

---

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific decision
above. Run with Claude Code; checkbox as you ship.

- [ ] **T1 (P1, human: ~3h / CC: ~25min)** — dashboard — Strip `.tile`'s card chrome
      (background/border/radius/padding) to a plain labeled-number row, reusing `.tiles`'s
      _existing_ grid and breakpoints (`app.css:1029-1054,1196-1218` — no new CSS wrap
      logic, per Outside Voice [P8]); wrap the existing "How each question went" section
      (`dashboardViews.js:527-528`, already positioned after the table per [P9]) in a
      `<details>` disclosure
  - Surfaced by: Pass 1, Decision 1; corrected by Outside Voice [P7] (confirms the card
    chrome is real, Decision 1 stands), [P8] (grid reuse — absorbs former T10), [P9]
    (ordering was already correct; only "collapsible" is new) + Decision 12 (same
    order on mobile)
  - Files: `src/lib/render/dashboardViews.js` (`renderSummary`), `src/styles/app.css`
  - Verify: `tests/unit/dashboardViews.test.js` (new assertions), `npm run test:coverage`,
    manual check at 375px width (confirms the reused grid still wraps correctly)

- [ ] **T2 (P1, human: ~4h / CC: ~30min)** — quiz + dashboard — Loading skeleton on
      first paint instead of a blank `<main>`, with a subtle shimmer/pulse
      (`--duration-base`, Decision 9) so an extended wait reads as loading, not frozen
  - Surfaced by: Pass 2, Decision 2; refined by Eng Review Architecture [P2]/[P3] — on
    the dashboard the skeleton covers the `dashboardAuth.onChange` auth-init gap
    (`dashboard.js:197,215`; `refresh()` already shows its own "Loading results…"
    during the data fetch, `dashboard.js:163-164` — do not duplicate that state)
  - Files: `src/lib/render/quizViews.js`, `src/lib/render/dashboardViews.js`,
    `src/pages/quiz.js`, `src/pages/dashboard.js`, `src/styles/app.css`
  - Verify: new jsdom render test for the skeleton state; e2e check that it's replaced
    once data arrives (`tests/e2e/taker.spec.js`/`dashboard.spec.js`)

- [ ] **T3 (P1, human: ~4h / CC: ~30min)** — dashboard — Designed empty states (no
      quizzes / filtered-to-zero / genuinely-zero attempts) with icon, message and action
  - Surfaced by: Pass 2, Decision 3; Pass 5, Decision 8 (icon style)
  - Files: `src/lib/render/dashboardViews.js` (`renderQuizList`, attempts empty row),
    3 new inline SVG icons, `src/styles/app.css`
  - Verify: `tests/unit/dashboardViews.test.js` — one test per empty-state variant,
    including the Clear-filters action

- [ ] **T4 (P2, human: ~2h / CC: ~15min)** — quiz result — Score-tiered encouragement
      line (100% / 80–99% / 50–79% / <50%)
  - Surfaced by: Pass 3, Decision 4
  - Files: `src/lib/scoring.js` (pure tier-selection function, unit-tested per `CLAUDE.md`
    code-style rule), `src/lib/render/quizViews.js`
  - Verify: new unit test in `tests/unit/scoring.test.js` covering all 4 tiers + the
    boundary values (50, 80, 100)

- [ ] **T5 (P2, human: ~2h / CC: ~15min)** — home — Replace 3-card grid with a vertical
      numbered list
  - Surfaced by: Pass 4, Decision 5
  - Files: `src/pages/index.js`, `src/styles/app.css`
  - Verify: existing `tests/unit/a11y.test.js` run (no regressions), visual check

- [ ] **T6 (P3, human: ~30min / CC: ~5min)** — global — Theme `::selection` and
      `caret-color`
  - Surfaced by: Pass 4, Decision 6
  - Files: `src/styles/app.css`
  - Verify: manual check in light + dark mode

- [ ] **T7 (P2, human: ~4h / CC: ~30min — raised from ~3h/20min, Outside Voice [P11]
      showed this is a JS restructure, not new CSS)** — quiz result — Wire up the
      **already-existing** `.ring-value` transition (`app.css:606`) by mounting the ring at
      0%-filled `stroke-dashoffset` then flipping to the target value via
      `requestAnimationFrame` (double-rAF for Safari) so it actually fires; add the
      result-card fade/translate entrance (new, small CSS). Both `prefers-reduced-motion`-
      safe — the existing override at `app.css:1245-1252` already covers `.ring-value`.
      **Do this after T8** (writes `var(--duration-emphasis)` directly instead of
      migrating a magic number right after introducing it).
  - Surfaced by: Pass 4, Decision 7; corrected by Outside Voice [P11]
  - Files: `src/lib/render/quizViews.js`, `src/styles/app.css`
  - Verify: manual check with `prefers-reduced-motion: reduce` forced on (ring jumps
    straight to final state, no animation); confirm `tests/e2e/taker.spec.js`'s
    result-screen assertions still pass (no timing flakiness introduced)

- [ ] **T8 (P3, human: ~1.5h / CC: ~15min — raised from ~1h/10min, Outside Voice [P10]
      found 3 rule blocks to migrate, not 2)** — global — Tokenize motion
      (`--duration-base`, `--duration-emphasis`, `--ease-out`); migrate all 3 existing
      `120ms ease` blocks (`app.css:293,339-341,458-460`, 5 properties) **and** the existing
      `.ring-value` `600ms ease` (`app.css:606`) to the new tokens; decide `.progress-fill`'s
      `200ms ease` (`app.css:550`) — fold into `--duration-base` or keep distinct (owner's
      call during implementation, cosmetic either way, not raised as a separate decision)
  - Surfaced by: Pass 5, Decision 9; corrected by Outside Voice [P10]
  - Files: `src/styles/app.css`
  - Verify: visual check that button/input hover timing is unchanged

- [ ] **T9 (P2, human: ~15min / CC: ~5min)** — dashboard — `.button.small` →
      `min-height: 44px` **inside `@media (max-width: 30rem)` only** (Decision 18)
  - Surfaced by: Pass 6, Decision 10; Eng Review premise table [P2] confirmed this
    affects Refresh, Sign out, Share, 3 export buttons, Answers **and** Hide
    (`dashboardViews.js:78,79,99,342,431,444`), not only the originally-named
    Export/Answers/Hide; scoped to mobile-only by Outside Voice [P14]/Decision 18 —
    zero row-height cost on the dense desktop table
  - Files: `src/styles/app.css`
  - Verify: `tests/unit/a11y.test.js` (touch-target checks if present), manual check

~~T10 — Stat row wraps to a 2-column grid at ≤30rem~~ — **removed, folded into T1.**
Outside Voice [P8] confirmed `.tiles` already has this exact responsive grid; T1 reuses
it instead of building new wrap CSS. No separate task.

---

## Completion Summary

```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | No DESIGN.md (flagged); full UI scope       |
  | Step 0               | Initial 2/10 (brief = adjectives only);     |
  |                       | focus: all 7 dimensions                     |
  | Pass 1  (Info Arch)  | 3/10 → 8/10 after fixes                     |
  | Pass 2  (States)     | 4/10 → 9/10 after fixes                     |
  | Pass 3  (Journey)    | 5/10 → 8/10 after fixes                     |
  | Pass 4  (AI Slop)    | 6/10 → 9/10 after fixes                     |
  | Pass 5  (Design Sys) | 6/10 → 10/10 after fixes                    |
  | Pass 6  (Responsive) | 7/10 → 10/10 after fixes                    |
  | Pass 7  (Decisions)  | 3 resolved, 0 deferred                      |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (7 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 0 items — no deferred design debt            |
  | Approved Mockups     | 0 generated (gstack designer unavailable —   |
  |                       | no OpenAI key; text-based review instead)   |
  | Decisions made        | 14 added to plan                            |
  | Decisions deferred    | 0                                            |
  | Overall design score | 2/10 → 8/10 (lowest of Passes 1–6)          |
  +====================================================================+
```

Any pass below 8 is noted with why: none — Passes 1–6 are all 8 or above. Pass 3 (8) and
Pass 1 (8) are the lowest, each for a deliberately deferred nice-to-have (Decisions
12 and 14), not an unresolved gap.

Plan is design-complete. Run `/design-review` after implementation for visual QA (text-
based review can't fully substitute for rendered pixels — noted in Pass 4).

## Unresolved Decisions

None. All 14 findings across Passes 1–7 reached an individually-approved decision this
session.

## Eng Review — Reality rows

### Premise table

| Premise | Claim                                                                                                                                       | Receipt                                                                                                                      | Verdict                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P1      | `.button.small` computes to ~34–36px tall                                                                                                   | `src/styles/app.css:369-373` (`padding: 0.35rem 0.75rem; font-size: 0.875rem; border-width: 1px;`)                           | TRUE (arithmetic re-derived; tagged `[estimated]` — not a live rendered measurement)                |
| P2      | `.button.small` is used by Refresh, Sign out, Share, Export×3, Answers **and** Hide (broader than the plan's "Export/Answers/Hide" wording) | `src/lib/render/dashboardViews.js:78,79,99,342,431,444`                                                                      | TRUE — scope of Decision 10/T9 is actually wider (more affected controls) than stated, not narrower |
| P3      | `app.css` has zero `--duration`/`--ease` custom properties today                                                                            | `grep -n "duration\|ease" src/styles/app.css` → no matches outside the new dark-mode/motion decisions written by this review | TRUE                                                                                                |
| P4      | No `::selection`/`caret-color` theming exists                                                                                               | `grep -n "::selection\|caret-color" src/styles/app.css` → no matches                                                         | TRUE                                                                                                |
| P5      | Score ring is `aria-hidden`, score also written as real text elsewhere                                                                      | `src/lib/render/quizViews.js:117` (`'aria-hidden': 'true'`) + `tests/e2e/taker.spec.js` asserts `.score` text content        | TRUE — confirmed NOT a gap (see Pass 6)                                                             |
| P6      | Answer tiles are real `<label>`/`<input type="radio">`                                                                                      | `src/lib/render/quizViews.js:172-173` (grep)                                                                                 | TRUE                                                                                                |
| P7      | Dashboard empty-list state is one plain sentence, no action                                                                                 | `src/lib/render/dashboardViews.js:125-130`                                                                                   | TRUE                                                                                                |
| P8      | `@media (max-width: 30rem)` breakpoint already exists and is reused by Decisions 11/12                                                      | `src/styles/app.css:1205`                                                                                                    | TRUE                                                                                                |
| P9      | Dark `--page` is `#10201a` (used to derive Decision-adjacent contrast reasoning)                                                            | `src/styles/app.css:48`                                                                                                      | TRUE                                                                                                |
| P10     | 44px is the touch-target minimum applied in Decision 10                                                                                     | Industry standard (WCAG 2.5.5 AAA / Apple HIG), not measured from this codebase — tagged `[standard, not measured]`          | TRUE (standard correctly cited, not invented)                                                       |

`unverified=0`.

### Other tier-1 rows

- **already-done:** `git fetch origin main` + `git log origin/main --oneline -- <touched files>` and `--grep` for each task's subject (stat row, skeleton, empty state, score-tier, touch-target, selection/caret) → no hits beyond the font/UI-refresh commits already accounted for in Step 0's baseline. Nothing in this plan has already shipped.
- **surface-check:** no new CLI command, flag or HTTP route is proposed — n/a, pass.
- **binding-decisions:** `gstack-decision-search --scope branch --recent 50` → none recorded; plan has no `## Binding decisions` section to conflict with — n/a, pass.
- **numbers:** touch-target 44px is cited as an industry standard (P10, not measured); `.button.small`'s current height (P1) is `[estimated]` from source arithmetic, not a live render — correctly tagged, not presented as measured. Effort estimates in Implementation Tasks are self-labeled (human/CC) estimates by convention.
- **deferred-asks:** no linked issue exists (the brief was a direct chat request, fully addressed across Passes 1–7) — n/a, pass.
- **pr-count:** no `.gstack/ship-policy.json` → default 1 PR. 10 tasks are one cohesive, same-branch change — matches default, no split proposed.

REALITY: premise-table pass unverified=0, see table above, e.g. src/styles/app.css:369-373
REALITY: already-done pass git log origin/main --oneline -- src/styles/app.css (commit ef0aaf4, no stat-row/skeleton/empty-state/score-tier/touch-target/selection hits)
REALITY: surface-check pass n/a src/styles/app.css:1205 (only reused existing breakpoint, no new CLI/route)
REALITY: binding-decisions pass n/a docs/UI_REVAMP_PLAN.md:1-30 (no `## Binding decisions` heading in this file)
REALITY: numbers pass src/styles/app.css:369-373 (P1 tagged [estimated]); WCAG 2.5.5 (P10 tagged [standard, not measured])
REALITY: deferred-asks pass n/a docs/UI_REVAMP_PLAN.md:26-28 (chat brief, no linked issue)
REALITY: pr-count pass n/a docs/UI_REVAMP_PLAN.md:469-542 (10 tasks, one cohesive branch; no .gstack/ship-policy.json, default 1 PR applies)

### Scope Challenge A — remaining checks

- **What already solves each sub-problem?** Every task reuses existing primitives:
  `el()`/`richText()` (`src/lib/render/dom.js`), existing colour/radius/shadow tokens,
  the existing `30rem` breakpoint, the existing `aria-live`/focus-management patterns.
  No helper is being reinvented.
- **Minimum changes / scope creep check:** all 10 tasks trace to an approved design
  decision; none is speculative. T6 and T8 (lowest-risk, P3) are the only candidates
  for deferral without blocking the rest — kept in-scope since they're each under an
  hour and ride along with files T1/T7 already touch.
- **Complexity check:** 7 distinct source files touched across all 10 tasks
  (`src/lib/render/dashboardViews.js`, `src/lib/render/quizViews.js`,
  `src/pages/quiz.js`, `src/pages/dashboard.js`, `src/pages/index.js`,
  `src/lib/scoring.js`, `src/styles/app.css`), 0 new classes/services (all additions
  are functions/markup/CSS within existing modules). **Below the 8-file / 2-new-service
  threshold → Scope Challenge B (complexity gate) is skipped per the skill's own rule;
  proceeding directly to C.**
- **Search check:** no new architectural pattern, infrastructure component or
  concurrency approach is introduced — `stroke-dashoffset` SVG animation, CSS custom
  properties, inline SVG icons and a skeleton-loading pattern are all standard,
  well-understood web-platform techniques already used elsewhere in this codebase's
  general style. No external research needed; n/a.
- **TODOS cross-reference:** `TODOS.md` does not exist in this repo (confirmed in the
  design review's own Required Outputs) — nothing to cross-reference.
- **Completeness check:** every task in Implementation Tasks already specifies a
  concrete `Verify` step (new unit tests for T1/T3/T4, e2e checks for T2/T7, manual
  checks for the rest) — tests/edges are not scoped out. Detailed per-path coverage is
  Section 3's job below.
- **Distribution check:** no new artifact (package, binary, deploy target) — all
  changes ship through the existing Vite build and Render deploy, already covered by
  CI. N/a.

### Scope Challenge C — findings

No issues found. Scope Challenge result: **scope accepted as-is.**

---

## Section 1: Architecture review

System/component boundaries, dependencies and data flow are unchanged by this plan —
zero new services, zero new auth/API boundaries, zero new data stores. Scope is render
functions and CSS within existing modules.

**[P2] (confidence: 8/10) `src/pages/dashboard.js:197,215` + `src/lib/dashboardAuth.js:62`
— corrects design-review Finding 2's blank-page characterization for the dashboard.**
Design review (Pass 2, Finding 2) said "quiz.html/dashboard.html show a blank page while
the first data fetch is in flight" and attributed it to `loadData()`. Tracing the actual
flow: `dashboard.js`'s `main()` (line 197) wires `dashboardAuth.onChange(...)` (line 215)
before calling either `refresh()` or `showSignIn()`; `onChange` wraps a Firebase
`onAuthStateChanged`-style listener (`dashboardAuth.js:62`), which always fires
asynchronously, even for a cached session. `refresh()` (`dashboard.js:163-164`) _already_
shows "Loading results…" via `renderDashboardMessage` before `loadData()` runs — that
window was never blank. **The real blank window on the dashboard is the auth-
initialization gap before `onChange` fires once, not the data fetch.** quiz.js's blank
window (Finding 2's other half) is accurate as stated — `main()` calls `await
loadQuiz(...)` with nothing rendered first (`src/pages/quiz.js`).

This doesn't change the approved decision (T2: skeleton on first paint) — it changes
_where_ the dashboard skeleton needs to cover. **T2 implementation note (factual
correction, not a new choice — the approved intent already covers this): the dashboard
skeleton renders before `dashboardAuth.onChange` resolves, standing in for the
auth-init gap; it is then replaced by whichever of `refresh()`'s own "Loading results…"
message or `showSignIn()` fires.** No new AskUserQuestion needed — this refines an
already-approved decision's implementation, not a new tradeoff.

**[P3] (confidence: 9/10) `src/lib/quizLoader.js:27,30,45` — the skeleton's "stuck
forever on a network failure" risk is not real.** `loadQuiz` wraps both `fetch` and JSON
parsing in `try/catch` and resolves `{status:'error', message}` rather than rejecting;
`quiz.js`'s `main()` already renders `renderMessage('Something went wrong', ...)` for
that case. T2 does not introduce a new failure mode — a genuinely hung connection (no
timeout at all) would leave today's blank page stuck exactly as long as T2's skeleton
would; the skeleton version is strictly better (shows _something_) for that edge case,
not worse.

**One realistic production failure per new path:** the one new "path" here is the
first-paint skeleton (T2). Failure mode: a slow/offline network leaves the skeleton
visible for an extended period. User sees: the skeleton shape, not a spinner or
progress — distinguishable from "frozen" only if the skeleton itself doesn't pulse/
shimmer. **Recommendation carried into T2 (not a new tradeoff — implementation detail
of the already-approved skeleton):** a subtle shimmer/pulse (reuse `--duration-base`
from Decision 9 once tokenized) so an extended wait reads as "still loading," not
"broken." No user-facing state is silent: `loadQuiz`'s error path and `refresh()`'s
catch block both render explicit messages (`src/pages/quiz.js`, `src/pages/
dashboard.js:168-178`).

No security findings (no new auth/data-access/API boundary). No distribution-
architecture findings (no new artifact). No ASCII diagram needed beyond Pass 1's
existing hierarchy diagrams (design review) — no new data flow to diagram.

**Dispositions:** P2 — accepted as a factual correction, applied directly to T2's
implementation note above, no question asked (no behavior change to the approved
decision). P3 — accepted as a clarifying confirmation (no finding requiring a fix; the
skeleton is net-positive for this edge case). Shimmer/pulse recommendation — accepted
and folded into T2 (implementation detail within the already-approved skeleton
decision, not an independently selectable choice: a skeleton placeholder is by
convention subtly animated, same as the loading states already asked about in the
design review).

---

## Section 2: Code quality review

**Organization:** every task fits the existing module boundaries cleanly — no finding.
`src/lib/scoring.js` (`src/lib/scoring.js:17,61` — 2 small pure exported functions,
65 lines total) is exactly the right shape to receive T4's new tier-selection function
as a 3rd pure function, consistent with its established pattern (CLAUDE.md: "small pure
functions; DOM code only in `src/pages` and `src/lib/render`").

**[P4] (confidence: 7/10) shared-code opportunity for Decision 8's 3 empty-state
icons.** T3 proposes 3 inline SVG icons (Decision 8: hand-drawn, stroke-based,
`var(--muted)`). Written as 3 separate inline SVG blocks directly inside
`renderQuizList`/the attempts-table empty row (`dashboardViews.js`), they'll drift in
stroke-width/viewBox/colour handling over time. `dom.js` already has `el()`/`svgEl()`
helpers (`src/lib/render/dom.js`) as the established pattern for building markup —
**recommend one small `icon(name)` export (in `dom.js` or a new `src/lib/render/
icons.js`, 3 cases) as the single definition point for all 3**, called from each of
T3's 3 call sites. This is new code (no 2 existing callers to prove per the shared-code
rubric — labeled as a plan-stage assumption, not an extraction from duplicated code),
but the cost is near-zero (one small function vs. 3 scattered inline blocks) and it
directly prevents the icons drifting out of visual sync with each other.

**Error handling / edge cases:** Decision 3's "Clear filters" action resets `state.
search/from/to/showHidden` (already a flat object in `renderQuizDetail`,
`dashboardViews.js:297-305`) and the corresponding input elements — the existing state
shape supports a clean reset with no structural change needed. No gap.

**Technical debt:** `app.css` is already organized with section-banner comments (e.g.
`/* ---------- Site header ---------- */`, confirmed by inspection). This plan adds
~5 new rule groups (skeleton, empty-state cards, motion tokens, stat-row grid, touch
targets) — **convention, not a finding: follow the existing banner-comment pattern**
so the file (currently 1253+ lines) stays navigable rather than accreting unlabeled
rules at the end.

No ASCII diagrams in the touched files to check for staleness (none exist today).

**Dispositions:** P4 (icon helper) — this is a genuinely new, independently-acceptable
choice (a small module vs. inline duplication), not covered by any prior approval.

---

## Section 3: Test review

**Test Framework Detection:** `CLAUDE.md` → `## Commands` names `npm run test:coverage`
(Vitest, gate ≥90% lines on `src/lib`) as authoritative. No auto-detection needed.

**Target type:** targeted audit of a plan proposing changes to 7 existing files; no new
framework.

### Step 1 — Trace codepaths

Of the 10 tasks, 3 carry genuine new branching logic (T2, T3, T4); the other 7 (T1, T5,
T6, T7, T8, T9, T10) are presentational/CSS-only — same markup-generation code path as
today, no new conditional. Traced from source, not the plan's prose:

**T3 — `[P5] (confidence: 9/10) dashboardViews.js:384-386,469-482`:** `draw()` computes
`filtered = filterAttempts(data.attempts, {...state, hidden})`; the empty-row branch
fires when `sorted.length === 0` (`sorted` derives from `filtered`). `data.attempts` is
the **full, unfiltered** set for the quiz (confirmed: `dashboard.js` passes the same
`attempts` into both `renderQuizDetail`'s `data.attempts` and `summarise(attempts)`).
**This gives the exact, derivable condition for Decision 3's two empty-state variants:**
`data.attempts.length === 0` → genuinely zero; `data.attempts.length > 0 &&
filtered.length === 0` → filtered-to-zero. No new data is needed — both signals already
exist at the point `draw()` runs.

**[P6] (confidence: 8/10) `dashboardViews.js:297-305,345,386`** — the filter `state`
object has 5 fields: `search`, `from`, `to`, `showHidden` (filters — change which rows
`filterAttempts` returns) and `byTaker` (a **view mode** — switches between the
per-attempt table and the grouped-by-taker table, not a filter). Decision 3 said
"Clear filters" resets "search/date/checkboxes," which is ambiguous about `byTaker`:
resetting the user's chosen view mode when they only meant to widen the filter would be
a surprising side effect.

**T4 — `scoring.js:17,61`:** new pure function, 4 branches by percent range (100 /
80–99 / 50–79 / <50), 2 boundary values (50, 80) — no existing branches to interfere
with; `scoreQuiz`/`unansweredQuestions` are untouched.

**T2 — `quiz.js` (full `main()`), `dashboard.js:197-229`:** traced in Architecture
review above — the skeleton is inserted before the existing `await`/`onChange`, then
naturally replaced by the existing `show()`/`refresh()`/`showSignIn()` paths. No new
branch in the _data_ flow, only in what's rendered before data arrives.

### Step 2 — User flows and edge cases

- **Clear filters:** user searches, finds nothing, clicks Clear filters → expects
  search/date/hidden-filter to reset but (per the finding above) may NOT expect their
  "one row per taker" view to flip back — resolved below.
- **Rapid re-filtering:** typing in search re-renders on every keystroke (existing
  `input` listener, `dashboardViews.js:489` region) — unaffected by this plan, already
  exercised by existing tests.
- **Skeleton → content swap on a slow connection:** user sees the skeleton, then a
  content pop-in with no transition — acceptable (Decision 7 scoped motion to the
  result screen only; adding a skeleton→content transition was not requested and would
  be new scope, not raised as a gap here).
- **Score-tier boundary:** a taker scoring exactly 50% or exactly 80% — must land in the
  tier the plan specifies (50–79% includes 50; 80–99% includes 80) — needs an explicit
  boundary test, not just an interior-value test.

### Step 3 — Branch coverage check (existing tests)

```
CODE PATHS                                                    USER FLOWS
[+] src/lib/scoring.js (new function, T4)                     [+] Dashboard "Clear filters" (T3)
  ├── [GAP] 100%  → congratulation copy                         ├── [GAP] Reset search/from/to/showHidden
  ├── [GAP] 80-99% → celebratory, specific                       └── [PENDING] Reset byTaker too? — Decision 15
  ├── [GAP] 50-79% → encouraging                                [+] Empty states (T3)
  ├── [GAP] <50%   → matter-of-fact                               ├── [GAP] Zero attempts ever (icon+Share CTA)
  └── [GAP] boundaries: exactly 50, exactly 80                    └── [GAP] Filtered-to-zero (icon+Clear filters CTA)
[+] dashboardViews.js renderQuizList (T3)                      [+] First-paint skeleton (T2)
  └── [GAP] zero quizzes → icon+/add-quiz CTA                    ├── [★★ TESTED existing] quiz.js error/closed/not-found
[+] dashboardViews.js attempts empty row (T3)                    │   paths — tests/e2e/taker.spec.js (unaffected by T2)
  ├── [GAP] genuinely zero (data.attempts.length===0)            └── [GAP] [→E2E] skeleton visible then replaced,
  └── [GAP] filtered to zero (filtered.length===0, data>0)           both quiz and dashboard
[+] quizViews.js / dashboardViews.js skeleton (T2)
  └── [GAP] [→E2E] renders pre-data, removed post-data

COVERAGE: 0/13 new paths tested (new code, pre-implementation) | Code paths: 0/8 | User flows: 0/5
GAPS: 13 (2 E2E: skeleton swap, empty-state actions)
```

Legend: `[GAP]` = no test yet (nothing is implemented) | `[→E2E]` = needs an
integration/e2e test, not just unit | `[★★ TESTED existing]` = already covered, cited
for contrast, not a gap.

**LLM/eval scope:** none — no prompt/LLM-touching files in this plan.

### Decision 15 — does "Clear filters" also reset the "one row per taker" view?

**[P6]**, from Step 1. Two independently acceptable answers.

| Choice                           | Current   | A: filters only | B: filters + view |
| -------------------------------- | --------- | --------------- | ----------------- |
| Resets search/from/to/showHidden | n/a (new) | yes             | yes               |
| Resets byTaker (view mode)       | n/a (new) | **no**          | yes               |

**Decision 15 (approved): Clear filters resets search/from/to/showHidden only.**
`byTaker` (the view-mode checkbox) is left untouched — clearing filters never changes
which table layout the user is looking at.

### Step 5 — Tests added to the plan

Each passes the test value bar (protects/fails_when/why_new/seam/no_claim):

- **T4 tier function** (new `tests/unit/scoring.test.js` cases): one assertion per tier
  (100, 85, 65, 30) plus explicit boundary assertions at 50 and 80.
  Value: protects=tier boundaries never drift silently when the thresholds are edited;
  fails_when=an off-by-one on the 50/80 cutoffs ships; why_new=no existing test touches
  result-screen copy selection; seam=none; no_claim=none beyond protects.
- **T3 empty states** (new `tests/unit/dashboardViews.test.js` cases): 3 cases — zero
  quizzes, genuinely-zero attempts, filtered-to-zero attempts — asserting the correct
  icon/message/action per case, plus one case clicking Clear filters and asserting
  `search`/`from`/`to`/`showHidden` reset while `byTaker` does not (Decision 15).
  Value: protects=the 3 empty states never collapse into one generic message, and Clear
  filters never resets the view mode; fails_when=the zero-ever/filtered-to-zero branch
  condition is inverted or merged; why_new=no empty-state test exists today
  (`renderQuizList`'s current single-sentence state is untested); seam=none;
  no_claim=none beyond protects.
- **T2 skeleton** (new jsdom render test + e2e): jsdom asserts the skeleton markup
  renders synchronously before the data promise resolves; e2e (`[→E2E]`, added to
  `tests/e2e/taker.spec.js`/`dashboard.spec.js`) confirms it's gone once the real quiz/
  dashboard content is visible, on both the quiz-loading and dashboard-auth-init paths
  (Architecture review P2).
  Value: protects=the skeleton never gets stuck showing alongside real content (a
  `replaceChildren` bug would leave both in the DOM); fails_when=the skeleton is
  inserted but never removed, or removed before data is ready; why_new=no loading-state
  test exists for either page today; seam=none; no_claim=real network timing is not
  exercised (e2e runs against the built site + emulators, not a throttled connection).

**Tests made obsolete by this plan:** none.

Test review findings/dispositions: P5 (empty-state condition) — accepted, folded
directly into T3's implementation note. P6/Decision 15 — resolved above, folded into T3.

---

## Section 4: Performance review

No database, API or network-volume changes — this plan is render/CSS only. Checked
anyway, per section:

- **N+1 / data access:** none of the 10 tasks touch `dashboardData.js` or
  `firebase.js`; `summarise()`/`questionStats()`/`filterAttempts()` are called exactly
  as today (T1 only changes how their existing output is displayed).
- **Memory:** T3's 3 icons are inline SVG (no extra HTTP request, negligible bytes);
  no new per-render arrays/objects allocated in a loop.
- **Caching:** n/a — no new fetch, no cacheable resource added.
- **Slow/complex paths:** T7's score-ring animation (`stroke-dashoffset`) — confirmed
  implementation-level: **use a CSS `transition`/`@media (prefers-reduced-motion)`
  pair, not a JS `requestAnimationFrame` loop**, so the animation is compositor/paint-
  level and costs nothing on the main thread. This is already what Decision 7's
  "~600ms ease-out" phrasing implies; stated explicitly here so it's built that way,
  not the heavier alternative.

**No issues found.**

---

## Outside Voice — Independent Plan Challenge

Running the outside voice automatically (standard step). Disable: `gstack-config set codex_reviews disabled`.

**Preflight:** `CODEX_MODE: not_installed` → native fallback (Claude subagent,
`subagent_type: "Plan"`, read-only, bounded 5-minute wait). The subagent re-read the
repo directly rather than trusting the plan's prose.

```
OUTSIDE VOICE (Claude subagent):
════════════════════════════════════════════════════════════
[full report delivered — summarized with verification below, each claim re-checked
against source directly by the native reviewer before being accepted or rejected]
════════════════════════════════════════════════════════════
```

### Cross-model tension — each claim re-verified against source

The outside voice's "central finding" claimed Decision 1/11 duplicate already-shipped
code. **Partially right, mostly wrong — verified directly:**

**[P7] (confidence: 10/10) `dashboardViews.js:168-184` + `app.css:1029-1054`.**
`.tile` is `background: var(--surface); border: 1px solid var(--line); border-radius:
var(--radius-panel); padding: 1rem 1.1rem;` — a genuinely **boxed card**, with the CSS's
own comment reading "Summary: plain numbers in a row of **cards**." This matches Finding
1's _problem_ description exactly ("5 summary cards... similar visual weight"), not
Decision 1's _proposed fix_ (a non-card inline row). The outside voice's screenshot
citation is backwards: `dashboard-quiz.png` shows 5 bordered white boxes, confirming the
problem, not the fix. **Decision 1 stands — rejected, no change.**

**[P8] (confidence: 9/10) `app.css:1196-1218`.** The outside voice is right that
`.tiles` already reflows via CSS grid (`repeat(5,1fr)` → `repeat(3,1fr)` at 48rem →
`repeat(2,1fr)` at 30rem) — this mechanism predates this plan. **Accepted as a factual
correction, no behavior change:** the approved outcome ("stat row wraps on phones," the
part of Decision 11 the owner actually approved) is unchanged; what changes is _how_ —
the new row reuses `.tiles`'s existing grid/breakpoints (just strips `.tile`'s card
chrome — background/border/radius/padding — and shrinks the value font-size), instead of
building new flex-row + new breakpoint CSS from scratch. **Decision 11 is folded into
T1 as "reuse `.tiles`'s existing responsive grid" — not a separate CSS task.**

**[P9] (confidence: 8/10) `dashboardViews.js:521-528`.** Per-question stats already
render _after_ the table today (`"Attempts" → controls → table → exportBar → "How each
question went" → stats`), not before. Decision 1's "moves to a collapsed/secondary
section... not inline before the table" overstated what's new — the **ordering** was
already correct; only making it **collapsible** (a `<details>` disclosure, currently
always-expanded) is actually new. **Accepted as a factual correction** — T1's scope
narrows to the stat-row compression + wrapping the existing question-stats section in a
disclosure, not reordering anything.

**[P10] (confidence: 9/10) `app.css:339-341,458-460,550` — Decision 9's inventory was
wrong, confirmed.** 3 rule blocks use `120ms ease` (5 individual transition properties:
`app.css:293,339-341,458-460`), not "2" as stated — plus an uncounted `200ms ease`
transition on `.progress-fill`'s `inline-size` (`app.css:550`). **Accepted, corrected
below.**

**[P11] (confidence: 9/10) `app.css:604-607,1245-1252` — the single most valuable catch
in this review.** `.ring-value { transition: stroke-dashoffset 600ms ease; }`
**already exists**, complete with a `prefers-reduced-motion: reduce` override already
listing `.ring-value` (`app.css:1245-1252`). It does nothing today because `scoreRing()`
(`quizViews.js:112-141`) sets the final `stroke-dashoffset` as a creation-time SVG
attribute with no prior DOM state to transition _from_ — a CSS `transition` only fires
on a value _change_, and there is none. **Decision 7/T7 is corrected: no new CSS
transition rule is needed. What's actually needed is restructuring `scoreRing()`'s
caller to mount the ring at 0%-progress offset (the full circumference) first, then
flip to the target `stroke-dashoffset` one frame later (`requestAnimationFrame`,
double-rAF for Safari reliability) so the already-existing transition actually
triggers.** This also corrects the Performance review's "just a CSS transition, no JS
loop" framing — it undersold the real work (a one-time rAF-driven state flip is still
required; it is not a continuous JS animation loop, so the performance conclusion
itself stands, but the task's effort estimate was too low for "wire up dead CSS," not
"add new CSS").

**Sequencing (folded into task order, no question):** Decision 9's tokenization now
necessarily touches the _existing_ `.ring-value` rule (P11) regardless of pass order —
**T8 (tokenize motion) should land before or in the same edit as T7 (wire up the ring
transition)**, so T7 writes `var(--duration-emphasis)` directly instead of migrating a
magic number immediately after introducing it.

The remaining 3 outside-voice findings are genuine new risks, not corrections — each
gets its own decision below.

### Decision 16 — Outside Voice: the dashboard's T2 skeleton can't match a layout it doesn't know yet

**[P12] (confidence: 8/10) `dashboard.js:197,215`, `dashboardAuth.onChange`.** Before
`onChange` fires, the code doesn't yet know whether it's about to show the signed-in
dashboard (`refresh()`) or the sign-in card (`showSignIn()`) — two structurally
different layouts. A single "matches the real layout" skeleton can't coherently preview
both, and for a browser with no persisted session (the common first-visit case), it
would show dashboard-shaped fake content that's immediately replaced by a password
form — arguably worse than today's brief blank beat.

**Decision 16 (approved): generic neutral skeleton for the dashboard's auth-init
gap.** A page-agnostic placeholder (a centered card-shaped block, not a fake table or
fake form) covers the window before `dashboardAuth.onChange` fires, then is replaced by
whichever of `refresh()`'s own loading state or `showSignIn()` actually applies. T2's
dashboard half is scoped down accordingly — simpler than originally stated, and no
longer previews content that might not match reality.

### Decision 17 — Outside Voice: does a low score's red review-card column undercut Decision 4's softer copy?

**[P13] (confidence: 6/10) `app.css` review-item styling (red left-border + red `dd.wrong`
text), confirmed present and applied per-card with no cap.** Decision 4 (Pass 3) added
softer copy for a low score but explicitly kept the red accent, reasoning it was "a
single restrained signal, not alarmist." The outside voice's point is about **volume**,
not any one card: a 20–30% score produces a long column of repeated red accents, which
reads differently in aggregate than the single-card case Pass 3 reasoned about — a
genuinely new angle on an already-decided point, not a repeat of it.

**Decision 17 (resolved: no change).** Review-card styling stays exactly as Decision 4
left it — red left-border/red text on every wrong/unanswered card regardless of count.
The outside voice's volume concern was considered and declined: a status signal that
changes meaning at different wrong-counts would be a worse inconsistency than the
"loud" column it's trying to avoid.

### Decision 18 — Outside Voice: should the 44px touch target apply everywhere, or only where touch actually applies?

**[P14] (confidence: 6/10) `dashboardViews.js:78,79,99,342,431,444`.** `.button.small`
is also the dashboard's dense, repeated inline-action style (table row Answers/Hide,
toolbar Refresh/Sign out, the export bar) on a screen the plan itself treats as mostly
desktop/mouse (per Pass 6's note). A global `min-height: 44px` will visibly inflate
every attempts-table row and the toolbar — a real cost to the "dense, scannable"
dashboard that Decision 10 didn't weigh against a narrower, mobile-only alternative.

**Decision 18 (approved): 44px touch target scoped to mobile only.** Decision 10's
`.button.small { min-height: 44px; }` moves inside the existing `@media (max-width:
30rem)` block (same breakpoint Decision 1/11's stat-row grid already uses) instead of
applying unconditionally — full touch-target compliance where touch actually happens,
no row-height cost on the dense desktop table.

### Outside Voice — net effect

Of 8 numbered findings from the outside reviewer: 2 ([P7]'s core claim, part of the
"central finding") were **rejected** on direct re-verification (the boxed-card problem
and Decision 1 are real, confirmed from source and the cited screenshot itself); 1
([P9], ordering) was a **minor overclaim** corrected without changing scope; 4
([P8] grid reuse, [P10] transition count, [P11] dead CSS transition, [P6]'s implicit
sequencing point) were **confirmed true and material** — [P11] in particular is a real
implementation-approach correction that would have produced a shipped no-op animation
if missed; 3 ([P12] skeleton incoherence, [P13] review-card volume, [P14] touch-target
scope) were **genuine new findings**, 2 accepted (Decisions 16, 18) and 1 declined after
consideration (Decision 17). Net: the outside voice earned its run — [P11] alone
justifies it — but its headline framing ("the plan duplicates shipped work") was wrong
and would have been actively harmful if accepted without the re-verification above.

---

## Final planning decisions

### TODOS.md updates

No TODO proposals. `TODOS.md` does not exist in this repo; every finding from both the
design review and this eng review (Decisions 1–18) reached a terminal decision this
session, including the one genuinely cosmetic, non-blocking choice (`.progress-fill`'s
`200ms` transition, left to implementation-time judgment, not worth a decision record).

## Approval readiness

Every accepted remedy (Decisions 1–18) cites its own actual AskUserQuestion answer or an
Outside-Voice-triggered factual correction with no behavior change (P7–P11), recorded
inline above. No draft remedy lacks approval.

**Approval readiness: PASS** — checked IDs: Decisions 1–18 (Pass 1–7 design decisions +
Eng Review Decisions 15–18), corrections P1–P11 (factual, no separate approval needed).

## Required outputs

### "NOT in scope" (Eng Review additions to the design review's list)

- **A shared `icon(name)` helper for the 3 empty-state icons** (Code Quality [P4]) —
  recommended, not mandated; left as implementation-time judgment since it's a pure
  organizational choice with no user-visible difference either way.
- **Investigating the actual auth-init gap duration before building Decision 16's
  skeleton** — declined; the owner chose to apply the generic-skeleton fix directly
  rather than measure first.

### "What already exists" (Eng Review corrections to the design review's list)

In addition to the design review's Step 0C inventory, this eng review found 2 more
pieces of real existing infrastructure the design review missed:

- **`.tiles`'s responsive grid** (`app.css:1029-1054,1196-1218`) — already reflows
  5→3→2 columns at 48rem/30rem. T1 reuses this exactly; it is not new CSS.
- **`.ring-value`'s CSS transition** (`app.css:604-607`) and its
  `prefers-reduced-motion` override (`app.css:1245-1252`) — already correct, already
  wired into the reduced-motion media query. T7 only needs to trigger it from JS (mount
  at 0%, flip via rAF); the CSS itself needs no new rule.

### Diagrams

Per-screen hierarchy: Pass 1's ASCII diagrams above (unchanged structure, confirmed
against the actual screenshots and `dashboardViews.js`'s real render order). Code/test
coverage: Section 3's ASCII diagram above. No new data-flow diagram needed — no new
service/API boundary.

### Failure modes

Covered in Architecture review (T2's skeleton: worst case is an extended-but-not-silent
wait, mitigated by the shimmer; no silent failure anywhere — `loadQuiz`'s error path
and `refresh()`'s catch block both render explicit messages). **No critical gaps
flagged.**

### Worktree parallelization strategy

Nearly all 9 remaining tasks touch `src/styles/app.css` (T1, T2, T3, T5, T6, T7, T8, T9
all do; only T4 is CSS-free). A git-worktree split would produce heavy cross-worktree
merge conflicts in that one file for little real parallel benefit. **Sequential
implementation, no parallelization opportunity** — the file-sharing cost outweighs any
gain from splitting 9 small tasks across worktrees. Suggested order within one branch:
T8 (motion tokens) → T7 (ring animation, depends on T8's tokens) → T1 → T3 → T9 → T16
(Decision 16's dashboard skeleton, grouped with T2) → T2 → T4 → T5 → T6.

## Implementation Tasks (Eng Review — corrected JSONL written)

The design review's Implementation Tasks list above (T1–T9, T10 removed/folded) is the
build-actionable list after this eng review's corrections. A fresh
`tasks-eng-review-{datetime}.jsonl` artifact was written reflecting the corrected scope
(see table above for the authoritative task text; this section records that the JSONL
exists for `/autoplan` aggregation, phase=`eng-review`, 9 tasks).

## Unresolved decisions

None. Decisions 15–18 (this eng review) and 1–14 (design review) are all resolved and
approved.

## Completion summary

- Step 0: Scope Challenge — **scope accepted as-is** (below the 8-file/2-new-service
  complexity threshold; Scope Challenge B skipped per the skill's own rule)
- Reality rows: **7/7** applicable rows emitted (`PLAN_REALITY: phase=eng rows=7/7
missing=none unverified=0 verdict=complete`), **0** unverified premises
- Architecture Review: **2** findings (P2 blank-page correction, P3 skeleton-failure-
  mode confirmation) — both resolved as factual corrections, 0 unresolved
- Code Quality Review: **1** finding (P4, shared icon helper) — recommended, not
  blocking
- Test Review: diagram produced, **13** gaps identified (all pre-implementation — no
  code exists yet for T1–T9); 1 new decision (15, Clear-filters/byTaker) resolved
- Performance Review: **0** issues found
- NOT in scope: written
- What already exists: written (2 Eng-Review additions to the design review's list)
- TODOS.md updates: **0** items proposed
- Failure modes: **0** critical gaps flagged
- Unresolved decisions: **0** in this review
- Outside voice: recorded provider **codex** (preflight: not installed) →
  **native fallback** (Claude subagent, `source=in-host`), **completed**,
  `outside_status=unavailable` (native fallback never counts as true outside coverage,
  by design) — 8 findings, 2 rejected on re-verification, 1 minor correction, 4
  confirmed material corrections, 3 genuine new findings (2 accepted, 1 declined)
- Parallelization: **1** lane, sequential (9 of 9 remaining tasks share `app.css`;
  worktree split would cost more in merge conflicts than it would save)
- Lake Score: 13/18 = answers picking the 10/10 (fully-complete) option / answers
  scored for Completeness. (Design review's 14 decisions + this review's Decisions
  15–18, minus the 3 setup/navigation-only answers that carry no completeness score:
  the initial 0D focus-area choice, the Outside-Voice opt-in, and Decision 17's "keep
  current styling" — a kind-note choice, not a coverage tradeoff.)

## GSTACK REVIEW REPORT

| Review         | Trigger                                                | Why                             | Runs | Status       | Findings                                                                                                            |
| -------------- | ------------------------------------------------------ | ------------------------------- | ---- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| CEO Review     | `/plan-ceo-review`                                     | Scope & strategy                | 0    | —            | —                                                                                                                   |
| Outside Review | native fallback (Claude subagent; Codex not installed) | Independent 2nd opinion         | 1    | issues_found | 8 findings: 2 rejected on re-verification, 1 minor correction, 4 confirmed material, 3 new (2 accepted, 1 declined) |
| Eng Review     | `/plan-eng-review`                                     | Architecture & tests (required) | 1    | issues_open  | 16 issues (Arch 2, Code Quality 1, Test gaps 13, Perf 0); 0 unresolved, 0 critical gaps                             |
| Design Review  | `/plan-design-review`                                  | UI/UX gaps                      | 1    | clean        | score: 2/10 → 8/10, 14 decisions                                                                                    |
| DX Review      | `/plan-devex-review`                                   | Developer experience gaps       | 0    | —            | —                                                                                                                   |

- **OUTSIDE COVERAGE:** Design-phase visual mockups (gstack designer): unavailable — no
  OpenAI API key configured; text-based design review used instead. Design-phase outside
  voices (Codex + Claude subagent): skipped, user declined during the design review.
  Eng-phase outside voice: Codex preflight `not_installed` → native fallback (Claude
  subagent, `source=in-host`, `outside_status=unavailable` by definition — a
  same-harness fallback never counts as true outside coverage) — completed, 8 findings,
  resolved via Cross-model tension above.
- **CROSS-MODEL:** n/a — no completed external-provider review exists for this plan (the
  design phase had no outside voice at all; the eng phase's outside voice was a native
  fallback, not a distinct model).
- **VERDICT:** DESIGN REVIEW CLEARED (8/10, 0 unresolved). ENG REVIEW RAN — 16 findings,
  **0 unresolved, 0 critical gaps**, all resolved this session (status `issues_open` per
  the skill's own field rule: any nonzero `issues_found` is `issues_open` regardless of
  resolution — do not read this as outstanding work). The 10 implementation tasks (T1–T9,
  T10 folded into T1) reflect every correction. Eng review required and complete.

NO UNRESOLVED DECISIONS
