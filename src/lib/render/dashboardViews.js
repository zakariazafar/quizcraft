// @ts-check
import { containerDirection } from '../bidi.js';
import { filterAttempts, formatDateTime, groupByTaker, sortAttempts } from '../dashboardData.js';
import { el, richText } from './dom.js';

/**
 * @typedef {import('../validate.js').Quiz} Quiz
 * @typedef {import('../dashboardData.js').CheckedAttempt} CheckedAttempt
 * @typedef {ReturnType<typeof import('../dashboardData.js').quizRows>[number]} QuizRow
 * @typedef {ReturnType<typeof import('../dashboardData.js').summarise>} Summary
 * @typedef {ReturnType<typeof import('../dashboardData.js').questionStats>} QuestionStats
 * @typedef {(quizId: string) => Promise<{ result: 'copied' | 'manual', url: string }>} ShareFn
 */

const pct = (/** @type {number | null} */ v) => (v === null ? '—' : `${v}%`);

/**
 * Password-only sign-in form.
 * @param {{ onSubmit: (password: string) => void }} handlers
 */
export function renderSignIn({ onSubmit }) {
  const input = /** @type {HTMLInputElement} */ (
    el('input', {
      id: 'dashboard-password',
      type: 'password',
      autocomplete: 'current-password',
      required: true,
      'aria-describedby': 'dashboard-password-error',
    })
  );
  const error = el('p', {
    class: 'field-error',
    id: 'dashboard-password-error',
    'aria-live': 'polite',
  });
  const button = /** @type {HTMLButtonElement} */ (
    el('button', { type: 'submit', class: 'button primary' }, ['Sign in'])
  );
  const form = el('form', { class: 'taker-form', novalidate: true }, [
    el('div', { class: 'field' }, [
      el('label', { for: 'dashboard-password' }, ['Dashboard password']),
      input,
      error,
    ]),
    button,
  ]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onSubmit(input.value);
  });
  const view = el('section', { class: 'signin' }, [
    el('h1', {}, ['Quiz results']),
    el('p', { class: 'meta' }, ['Enter the dashboard password to see who took each quiz.']),
    form,
  ]);
  return {
    view,
    /** @param {boolean} busy */
    setBusy(busy) {
      button.disabled = busy;
      button.textContent = busy ? 'Signing in…' : 'Sign in';
    },
    /** @param {string} message */
    setError(message) {
      error.textContent = message;
      input.toggleAttribute('aria-invalid', Boolean(message));
      if (message) input.focus();
    },
  };
}

/**
 * Top bar with refresh and sign-out, around the current view.
 * @param {HTMLElement} content
 * @param {{ onRefresh: () => void, onSignOut: () => void, status?: string }} handlers
 */
export function renderShell(content, { onRefresh, onSignOut, status = '' }) {
  const refresh = el('button', { type: 'button', class: 'button small' }, ['Refresh']);
  const signOut = el('button', { type: 'button', class: 'button small' }, ['Sign out']);
  refresh.addEventListener('click', onRefresh);
  signOut.addEventListener('click', onSignOut);
  return el('div', { class: 'dashboard' }, [
    el('div', { class: 'topbar' }, [
      el('a', { href: '#/', class: 'brand' }, ['QuizCraft results']),
      el('span', { class: 'topbar-status', 'aria-live': 'polite' }, [status]),
      refresh,
      signOut,
    ]),
    content,
  ]);
}

/**
 * A Share button that copies the quiz link, with a toast or a selectable fallback.
 * @param {string} quizId
 * @param {ShareFn} share
 */
export function shareButton(quizId, share) {
  const button = el('button', { type: 'button', class: 'button small', 'data-share': quizId }, [
    'Share',
  ]);
  const note = el('span', { class: 'share-note', role: 'status' });
  button.addEventListener('click', async () => {
    const { result, url } = await share(quizId);
    if (result === 'copied') {
      note.replaceChildren('Link copied');
      setTimeout(() => note.replaceChildren(), 2500);
    } else {
      const field = /** @type {HTMLInputElement} */ (
        el('input', { class: 'share-url', readonly: true, 'aria-label': 'Quiz link', dir: 'ltr' })
      );
      field.value = url;
      note.replaceChildren(field);
      field.focus();
      field.select();
    }
  });
  return el('span', { class: 'share' }, [button, note]);
}

/**
 * @param {QuizRow[]} rows
 * @param {{ onOpen: (quizId: string) => void, share: ShareFn }} handlers
 */
export function renderQuizList(rows, { onOpen, share }) {
  if (rows.length === 0) {
    return el('section', {}, [
      el('h1', {}, ['Quizzes']),
      el('p', {}, ['No quizzes are published yet. Add one with /add-quiz in Claude Code.']),
    ]);
  }
  const body = rows.map((r) => {
    const open = el('button', { type: 'button', class: 'link-button', 'data-open': r.id }, [
      richText(r.title),
    ]);
    open.addEventListener('click', () => onOpen(r.id));
    const status = !r.published ? 'Removed' : r.active ? 'Open' : 'Closed';
    return el('tr', {}, [
      el('th', { scope: 'row' }, [open, el('span', { class: 'quiz-id' }, [r.id])]),
      el('td', { class: 'num' }, [String(r.questionCount)]),
      el('td', { class: 'num' }, [String(r.attempts)]),
      el('td', { class: 'num' }, [pct(r.average)]),
      el('td', {}, [el('span', { class: `status status-${status.toLowerCase()}` }, [status])]),
      el('td', {}, [r.published ? shareButton(r.id, share) : '']),
    ]);
  });
  return el('section', {}, [
    el('h1', {}, ['Quizzes']),
    el('div', { class: 'table-wrap' }, [
      el('table', { class: 'data' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { scope: 'col' }, ['Quiz']),
            el('th', { scope: 'col', class: 'num' }, ['Questions']),
            el('th', { scope: 'col', class: 'num' }, ['Attempts']),
            el('th', { scope: 'col', class: 'num' }, ['Average']),
            el('th', { scope: 'col' }, ['Status']),
            el('th', { scope: 'col' }, [el('span', { class: 'visually-hidden' }, ['Share'])]),
          ]),
        ]),
        el('tbody', {}, body),
      ]),
    ]),
  ]);
}

/** @param {Summary} s */
function renderSummary(s) {
  /** @type {[string, string][]} */
  const tiles = [
    ['Attempts', String(s.attempts)],
    ['Takers', String(s.takers)],
    ['Average', pct(s.average)],
    ['Highest', pct(s.highest)],
    ['Lowest', pct(s.lowest)],
  ];
  return el(
    'dl',
    { class: 'tiles' },
    tiles.map(([label, value]) =>
      el('div', { class: 'tile' }, [el('dt', {}, [label]), el('dd', {}, [value])]),
    ),
  );
}

/**
 * Per-question share of right answers: one thin bar each, value written next to it.
 * @param {QuestionStats} stats
 * @param {Quiz} quiz
 */
function renderQuestionStats(stats, quiz) {
  return el(
    'ol',
    { class: 'qstats', ...containerDirection(quiz.language) },
    stats.map((s) => {
      const bar = el('span', { class: 'qbar-fill' });
      bar.style.inlineSize = `${s.correctPct ?? 0}%`;
      return el('li', { class: 'qstat', value: String(s.number) }, [
        richText(s.text, 'p', { class: 'qstat-text' }),
        el('div', { class: 'qbar-row' }, [
          el(
            'span',
            {
              class: 'qbar',
              role: 'img',
              'aria-label': `${pct(s.correctPct)} answered correctly`,
              title: `${s.correct} of ${s.total} right · ${s.unanswered} unanswered`,
            },
            [bar],
          ),
          el('span', { class: 'qbar-value' }, [
            s.total ? `${pct(s.correctPct)} right (${s.correct} of ${s.total})` : 'No answers yet',
          ]),
        ]),
        s.mostChosenWrong
          ? el('p', { class: 'qstat-wrong' }, [
              'Most chosen wrong answer: ',
              richText(s.mostChosenWrong.text),
              ` (${s.mostChosenWrong.count})`,
            ])
          : null,
      ]);
    }),
  );
}

/**
 * Answers of one attempt, question by question.
 * @param {Quiz | undefined} quiz
 * @param {CheckedAttempt} a
 */
export function renderAttemptDetail(quiz, a) {
  if (!quiz || a.checked.versionChanged) {
    return el('p', { class: 'meta' }, [
      'This attempt was taken on an earlier version of the quiz, so its answers can’t be shown question by question. Stored score: ',
      `${a.score} of ${a.total}.`,
    ]);
  }
  const byId = new Map(a.answers.map((x) => [x.questionId, x.selected]));
  return el(
    'ol',
    { class: 'answer-list', ...containerDirection(quiz.language) },
    quiz.questions.map((q, i) => {
      const sel = byId.get(q.id) ?? null;
      const chosen = q.options.find((o) => o.id === sel);
      const right = /** @type {{ text: string }} */ (q.options.find((o) => o.id === q.correct));
      const ok = sel === q.correct;
      return el('li', { class: ok ? 'answer ok' : 'answer bad', value: String(i + 1) }, [
        richText(q.text, 'p', { class: 'q-text' }),
        el('p', {}, [
          el('span', { class: 'mark', 'aria-hidden': 'true' }, [ok ? '✓' : '✗']),
          el('span', { class: 'visually-hidden' }, [ok ? 'Right: ' : 'Wrong: ']),
          chosen ? richText(chosen.text) : el('em', {}, ['Not answered']),
          ok ? null : el('span', { class: 'correct-hint' }, ['Correct: ', richText(right.text)]),
        ]),
      ]);
    }),
  );
}

/** @param {CheckedAttempt} a */
function flags(a) {
  const out = [];
  if (a.checked.mismatch) {
    out.push(
      el(
        'span',
        {
          class: 'flag',
          title: `Saved as ${a.score}/${a.total}; answers give ${a.checked.score}/${a.checked.total}`,
        },
        ['⚠ score corrected'],
      ),
    );
  }
  if (a.checked.versionChanged) {
    out.push(
      el('span', { class: 'flag muted', title: `Taken on version ${a.quizVersion}` }, [
        'older version',
      ]),
    );
  }
  return out;
}

/**
 * The quiz page: summary, per-question stats and the attempts table with filters.
 * @param {{ quiz: Quiz, row: QuizRow, attempts: CheckedAttempt[], summary: Summary,
 *   stats: QuestionStats, hidden: Set<string> }} data
 * @param {{ share: ShareFn, onToggleHidden: (id: string) => Set<string> }} handlers
 */
export function renderQuizDetail(data, { share, onToggleHidden }) {
  const { quiz, row } = data;
  let hidden = data.hidden;
  /** @type {{ search: string, from: string, to: string, showHidden: boolean, byTaker: boolean,
   *   sortKey: 'submittedAt' | 'name' | 'email' | 'score', sortDir: 'asc' | 'desc', open: string | null }} */
  const state = {
    search: '',
    from: '',
    to: '',
    showHidden: false,
    byTaker: false,
    sortKey: 'submittedAt',
    sortDir: 'desc',
    open: null,
  };

  const search = /** @type {HTMLInputElement} */ (
    el('input', {
      type: 'search',
      id: 'f-search',
      dir: 'auto',
      class: 'bidi',
      placeholder: 'Name or email',
    })
  );
  const from = /** @type {HTMLInputElement} */ (el('input', { type: 'date', id: 'f-from' }));
  const to = /** @type {HTMLInputElement} */ (el('input', { type: 'date', id: 'f-to' }));
  const showHidden = /** @type {HTMLInputElement} */ (
    el('input', { type: 'checkbox', id: 'f-hidden' })
  );
  const byTaker = /** @type {HTMLInputElement} */ (
    el('input', { type: 'checkbox', id: 'f-taker' })
  );
  const count = el('p', { class: 'meta count', 'aria-live': 'polite' });
  const tableArea = el('div', { class: 'table-wrap' });

  const controls = el('div', { class: 'filters' }, [
    el('div', { class: 'field' }, [el('label', { for: 'f-search' }, ['Search']), search]),
    el('div', { class: 'field' }, [el('label', { for: 'f-from' }, ['From']), from]),
    el('div', { class: 'field' }, [el('label', { for: 'f-to' }, ['To']), to]),
    el('label', { class: 'check', for: 'f-taker' }, [byTaker, ' One row per taker']),
    el('label', { class: 'check', for: 'f-hidden' }, [showHidden, ' Show hidden']),
  ]);

  /** @param {'submittedAt' | 'name' | 'email' | 'score'} key @param {string} label */
  const sortHeader = (key, label, cls = '') => {
    const active = state.sortKey === key;
    const b = el('button', { type: 'button', class: 'sort', 'data-sort': key }, [
      label,
      active ? (state.sortDir === 'asc' ? ' ▲' : ' ▼') : '',
    ]);
    b.addEventListener('click', () => {
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else {
        state.sortKey = key;
        state.sortDir = key === 'name' || key === 'email' ? 'asc' : 'desc';
      }
      draw();
    });
    return el(
      'th',
      {
        scope: 'col',
        class: cls,
        'aria-sort': active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : undefined,
      },
      [b],
    );
  };

  function draw() {
    const filtered = filterAttempts(data.attempts, { ...state, hidden });
    if (state.byTaker) {
      const takers = groupByTaker(filtered);
      count.textContent = `${takers.length} taker${takers.length === 1 ? '' : 's'}`;
      tableArea.replaceChildren(
        el('table', { class: 'data' }, [
          el('thead', {}, [
            el('tr', {}, [
              el('th', { scope: 'col' }, ['Name']),
              el('th', { scope: 'col' }, ['Email']),
              el('th', { scope: 'col', class: 'num' }, ['Attempts']),
              el('th', { scope: 'col', class: 'num' }, ['Best']),
              el('th', { scope: 'col', class: 'num' }, ['Latest']),
              el('th', { scope: 'col' }, ['Last taken']),
            ]),
          ]),
          el(
            'tbody',
            {},
            takers.map((t) =>
              el('tr', {}, [
                el('td', {}, [richText(t.name)]),
                el('td', { dir: 'ltr' }, [t.email]),
                el('td', { class: 'num' }, [String(t.attempts)]),
                el('td', { class: 'num' }, [`${t.best}%`]),
                el('td', { class: 'num' }, [`${t.latestPercent}%`]),
                el('td', {}, [formatDateTime(t.latestAt)]),
              ]),
            ),
          ),
        ]),
      );
      return;
    }
    const sorted = sortAttempts(filtered, state.sortKey, state.sortDir);
    count.textContent = `${sorted.length} attempt${sorted.length === 1 ? '' : 's'}`;
    const rows = sorted.flatMap((a) => {
      const isOpen = state.open === a.id;
      const view = el(
        'button',
        {
          type: 'button',
          class: 'button small',
          'aria-expanded': String(isOpen),
          'data-view': a.id,
        },
        [isOpen ? 'Close' : 'Answers'],
      );
      view.addEventListener('click', () => {
        state.open = isOpen ? null : a.id;
        draw();
      });
      const isHidden = hidden.has(a.id);
      const hide = el(
        'button',
        { type: 'button', class: 'button small quiet', 'data-hide': a.id },
        [isHidden ? 'Unhide' : 'Hide'],
      );
      hide.addEventListener('click', () => {
        hidden = onToggleHidden(a.id);
        draw();
      });
      const tr = el('tr', { class: isHidden ? 'is-hidden' : undefined }, [
        el('td', {}, [richText(a.takerName)]),
        el('td', { dir: 'ltr' }, [a.takerEmail]),
        el('td', { class: 'num' }, [`${a.checked.score} / ${a.checked.total}`]),
        el('td', { class: 'num' }, [`${a.checked.percent}%`, ...flags(a)]),
        el('td', {}, [formatDateTime(a.submittedAt)]),
        el('td', { class: 'actions' }, [view, hide]),
      ]);
      if (!isOpen) return [tr];
      return [
        tr,
        el('tr', { class: 'detail' }, [el('td', { colspan: '6' }, [renderAttemptDetail(quiz, a)])]),
      ];
    });
    tableArea.replaceChildren(
      el('table', { class: 'data' }, [
        el('thead', {}, [
          el('tr', {}, [
            sortHeader('name', 'Name'),
            sortHeader('email', 'Email'),
            el('th', { scope: 'col', class: 'num' }, ['Score']),
            sortHeader('score', '%', 'num'),
            sortHeader('submittedAt', 'Submitted'),
            el('th', { scope: 'col' }, [el('span', { class: 'visually-hidden' }, ['Actions'])]),
          ]),
        ]),
        el(
          'tbody',
          {},
          rows.length
            ? rows
            : [el('tr', {}, [el('td', { colspan: '6', class: 'empty' }, ['No attempts match.'])])],
        ),
      ]),
    );
  }

  search.addEventListener('input', () => {
    state.search = search.value;
    draw();
  });
  for (const [input, key] of /** @type {const} */ ([
    [from, 'from'],
    [to, 'to'],
  ])) {
    input.addEventListener('change', () => {
      state[key] = input.value;
      draw();
    });
  }
  showHidden.addEventListener('change', () => {
    state.showHidden = showHidden.checked;
    draw();
  });
  byTaker.addEventListener('change', () => {
    state.byTaker = byTaker.checked;
    draw();
  });

  draw();
  const status = row.active ? 'Open' : 'Closed';
  return el('section', { class: 'quiz-detail' }, [
    el('p', { class: 'back' }, [el('a', { href: '#/' }, ['All quizzes'])]),
    richText(quiz.title, 'h1'),
    el('p', { class: 'meta' }, [
      `${quiz.questions.length} questions · version ${quiz.version} · ${status} · `,
      shareButton(quiz.id, share),
    ]),
    renderSummary(data.summary),
    el('h2', {}, ['Attempts']),
    controls,
    count,
    tableArea,
    el('h2', {}, ['How each question went']),
    renderQuestionStats(data.stats, quiz),
  ]);
}

/**
 * Simple full-page message inside the dashboard.
 * @param {string} title
 * @param {string} body
 */
export function renderDashboardMessage(title, body) {
  return el('section', { class: 'message' }, [el('h1', {}, [title]), el('p', {}, [body])]);
}
