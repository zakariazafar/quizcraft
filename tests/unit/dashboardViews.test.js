// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prepareAttempts,
  questionStats,
  quizRows,
  summarise,
} from '../../src/lib/dashboardData.js';
import {
  renderAttemptDetail,
  renderDashboardMessage,
  renderQuizDetail,
  renderQuizList,
  renderShell,
  renderSignIn,
  renderSkeleton,
  shareButton,
} from '../../src/lib/render/dashboardViews.js';
import { rawAttempts } from '../fixtures/attempts.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const quizzes = new Map([[arabic.id, arabic]]);
const all = prepareAttempts(rawAttempts, quizzes);
const current = all.filter((a) => a.quizId === 'arabic-sample');
const index = [
  {
    id: 'arabic-sample',
    title: arabic.title,
    language: 'ar',
    questionCount: 5,
    active: true,
    version: 1,
    createdAt: '2026-10-11',
  },
  {
    id: 'closed-quiz',
    title: 'Closed one',
    language: 'en',
    questionCount: 3,
    active: false,
    version: 1,
    createdAt: '2026-10-10',
  },
];
const rows = quizRows(index, all);
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => document.body.replaceChildren());
afterEach(() => vi.useRealTimers());

describe('renderSkeleton', () => {
  it('is a generic placeholder, hidden from screen readers, with no sign-in form or data', () => {
    const view = renderSkeleton();
    expect(view.getAttribute('aria-hidden')).toBe('true');
    expect(view.querySelector('form')).toBeNull();
    expect(view.querySelector('table')).toBeNull();
    expect(view.querySelectorAll('.skeleton-block').length).toBeGreaterThan(0);
  });
});

describe('renderSignIn', () => {
  it('submits the password and shows busy and error states', () => {
    const onSubmit = vi.fn();
    const form = renderSignIn({ onSubmit });
    document.body.append(form.view);
    form.view.querySelector('#dashboard-password').value = 'test-pass';
    form.view.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(onSubmit).toHaveBeenCalledWith('test-pass');

    form.setBusy(true);
    const button = form.view.querySelector('button');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Signing in…');
    form.setBusy(false);
    expect(button.textContent).toBe('Sign in');

    form.setError('That password is not right.');
    expect(form.view.querySelector('.field-error').textContent).toBe('That password is not right.');
    expect(document.activeElement.id).toBe('dashboard-password');
    form.setError('');
    expect(form.view.querySelector('#dashboard-password').hasAttribute('aria-invalid')).toBe(false);
  });

  it('never shows or pre-fills a password', () => {
    const { view } = renderSignIn({ onSubmit: vi.fn() });
    expect(view.querySelector('input').type).toBe('password');
    expect(view.querySelector('input').value).toBe('');
  });
});

describe('renderShell', () => {
  it('wires refresh and sign-out', () => {
    const onRefresh = vi.fn();
    const onSignOut = vi.fn();
    const shell = renderShell(document.createElement('p'), {
      onRefresh,
      onSignOut,
      status: 'Updated 10:00',
    });
    const [refresh, signOut] = shell.querySelectorAll('.toolbar button');
    refresh.click();
    signOut.click();
    expect(onRefresh).toHaveBeenCalled();
    expect(onSignOut).toHaveBeenCalled();
    expect(shell.textContent).toContain('Updated 10:00');
    expect(
      renderShell(document.createElement('p'), { onRefresh, onSignOut }).textContent,
    ).toContain('Results dashboard');
  });
});

describe('shareButton', () => {
  it('shows "Link copied" when the copy works, then clears it', async () => {
    vi.useFakeTimers();
    const share = vi.fn().mockResolvedValue({ result: 'copied', url: 'https://x/q/abc' });
    const node = shareButton('abc', share);
    node.querySelector('button').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(share).toHaveBeenCalledWith('abc');
    expect(node.querySelector('.share-note').textContent).toBe('Link copied');
    await vi.advanceTimersByTimeAsync(2600);
    expect(node.querySelector('.share-note').textContent).toBe('');
  });

  it('shows the link selected when the browser blocks copying', async () => {
    const share = vi.fn().mockResolvedValue({ result: 'manual', url: 'https://x/q/abc' });
    const node = shareButton('abc', share);
    document.body.append(node);
    node.querySelector('button').click();
    await flush();
    const field = node.querySelector('input.share-url');
    expect(field.value).toBe('https://x/q/abc');
    expect(document.activeElement).toBe(field);
  });
});

describe('renderQuizList', () => {
  it('lists quizzes with attempts, average, status and share buttons', () => {
    const onOpen = vi.fn();
    const view = renderQuizList(rows, { onOpen, share: vi.fn() });
    const trs = view.querySelectorAll('tbody tr');
    expect(trs).toHaveLength(3);
    expect(trs[0].textContent).toContain('arabic-sample');
    expect(trs[0].textContent).toContain('65%');
    expect(trs[0].querySelector('.status').textContent).toBe('Open');
    expect(trs[1].querySelector('.status').textContent).toBe('Closed');
    expect(trs[1].textContent).toContain('n/a');
    expect(trs[2].querySelector('.status').textContent).toBe('Removed');
    expect(trs[2].querySelector('[data-share]')).toBeNull();
    expect(trs[0].querySelector('[data-share="arabic-sample"]')).not.toBeNull();
    trs[0].querySelector('[data-open]').click();
    expect(onOpen).toHaveBeenCalledWith('arabic-sample');
    expect(trs[0].querySelector('.bidi').getAttribute('dir')).toBe('rtl');
  });

  it('explains an empty site with an icon and no quiz table', () => {
    const view = renderQuizList([], { onOpen: vi.fn(), share: vi.fn() });
    expect(view.textContent).toContain('No quizzes published yet');
    expect(view.querySelector('.empty-icon')).not.toBeNull();
    expect(view.querySelector('table')).toBeNull();
  });
});

function detail(overrides = {}, onExport = undefined) {
  const onToggleHidden = vi.fn();
  let hidden = new Set();
  onToggleHidden.mockImplementation((id) => {
    hidden = new Set(hidden);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    return hidden;
  });
  const view = renderQuizDetail(
    {
      quiz: arabic,
      row: rows[0],
      attempts: current,
      summary: summarise(current),
      stats: questionStats(arabic, current),
      hidden: new Set(),
      ...overrides,
    },
    { share: vi.fn(), onToggleHidden, onExport },
  );
  document.body.append(view);
  return { view, onToggleHidden };
}
const names = (view) =>
  [...view.querySelectorAll('.table-wrap tbody tr:not(.detail) td:first-child')].map(
    (td) => td.textContent,
  );

describe('renderQuizDetail', () => {
  it('shows the summary numbers', () => {
    const { view } = detail();
    const tiles = [...view.querySelectorAll('.tile')].map((t) => t.textContent);
    expect(tiles).toEqual(['Attempts4', 'Takers3', 'Average65%', 'Highest100%', 'Lowest20%']);
    expect(view.querySelector('h1').textContent).toBe(arabic.title);
    expect(
      [...view.querySelectorAll('div.meta > .chip, div.meta > .status')].map((e) => e.textContent),
    ).toEqual(['5 questions', 'Version 1', 'Open']);
  });

  it('lists attempts newest first, with corrected-score and older-version flags', () => {
    const { view } = detail();
    expect(view.querySelector('.count').textContent).toBe('4 attempts');
    expect(names(view)).toEqual(['زكريا', 'Amina', 'Cheater', 'Old']);
    const cheater = view.querySelectorAll('.table-wrap tbody tr')[2];
    expect(cheater.textContent).toContain('1 / 5');
    expect(cheater.querySelector('.flag').textContent).toBe('⚠ score corrected');
    expect(cheater.querySelector('.flag').title).toBe('Saved as 5/5; answers give 1/5');
    expect(view.querySelectorAll('.table-wrap tbody tr')[3].textContent).toContain('older version');
  });

  it('sorts by clicking column headers, toggling direction', () => {
    const { view } = detail();
    view.querySelector('[data-sort="name"]').click();
    expect(names(view)).toEqual(['Amina', 'Cheater', 'Old', 'زكريا']);
    expect(view.querySelector('[data-sort="name"]').closest('th').getAttribute('aria-sort')).toBe(
      'ascending',
    );
    view.querySelector('[data-sort="name"]').click();
    expect(names(view)[0]).toBe('زكريا');
    view.querySelector('[data-sort="score"]').click();
    expect(names(view).at(-1)).toBe('Cheater');
    view.querySelector('[data-sort="email"]').click();
    expect(names(view)[0]).toBe('Amina');
  });

  it('filters by search text and dates', () => {
    const { view } = detail();
    const search = view.querySelector('#f-search');
    search.value = 'amina';
    search.dispatchEvent(new Event('input'));
    expect(names(view)).toEqual(['Amina']);
    search.value = 'nobody';
    search.dispatchEvent(new Event('input'));
    expect(view.querySelector('.empty').textContent).toContain('No attempts match your filters.');
    expect(view.querySelector('.count').textContent).toBe('0 attempts');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    const from = view.querySelector('#f-from');
    from.value = '2026-10-11';
    from.dispatchEvent(new Event('change'));
    const to = view.querySelector('#f-to');
    to.value = '2026-10-11';
    to.dispatchEvent(new Event('change'));
    expect(names(view)).toEqual(['Amina']);
    expect(view.querySelector('.count').textContent).toBe('1 attempt');
  });

  it('empty state says "no one has taken this quiz yet" when there are no attempts at all', () => {
    const { view } = detail({ attempts: [], summary: summarise([]) });
    expect(view.querySelector('.empty').textContent).toContain('No one has taken this quiz yet.');
    expect(view.querySelector('.empty .share')).not.toBeNull();
  });

  it('Clear filters resets search/dates/hidden but not the "one row per taker" view', () => {
    const { view } = detail();
    const byTaker = view.querySelector('#f-taker');
    byTaker.checked = true;
    byTaker.dispatchEvent(new Event('change'));
    const search = view.querySelector('#f-search');
    search.value = 'nobody-matches-this';
    search.dispatchEvent(new Event('input'));
    expect(view.querySelector('.empty').textContent).toContain('No attempts match your filters.');

    view.querySelector('.empty button').click();

    expect(search.value).toBe('');
    expect(view.querySelector('.empty')).toBeNull();
    expect(view.querySelector('.count').textContent).not.toBe('0 takers');
    // byTaker is a view choice, not a filter — Clear filters must not reset it.
    expect(byTaker.checked).toBe(true);
  });

  it('opens and closes the answers of one attempt', () => {
    const { view } = detail();
    view.querySelector('[data-view="a2"]').click();
    const opened = view.querySelector('tr.detail');
    expect(opened.querySelectorAll('.answer')).toHaveLength(5);
    expect(view.querySelector('[data-view="a2"]').getAttribute('aria-expanded')).toBe('true');
    view.querySelector('[data-view="a2"]').click();
    expect(view.querySelector('tr.detail')).toBeNull();
  });

  it('hides an attempt as spam and can show hidden ones again', () => {
    const { view, onToggleHidden } = detail();
    view.querySelector('[data-hide="a3"]').click();
    expect(onToggleHidden).toHaveBeenCalledWith('a3');
    expect(names(view)).not.toContain('Cheater');
    const show = view.querySelector('#f-hidden');
    show.checked = true;
    show.dispatchEvent(new Event('change'));
    const row = view.querySelector('[data-hide="a3"]').closest('tr');
    expect(row.classList.contains('is-hidden')).toBe(true);
    expect(row.querySelector('[data-hide]').textContent).toBe('Unhide');
  });

  it('groups attempts by taker', () => {
    const { view } = detail();
    const check = view.querySelector('#f-taker');
    check.checked = true;
    check.dispatchEvent(new Event('change'));
    expect(view.querySelector('.count').textContent).toBe('3 takers');
    const z = [...view.querySelectorAll('.table-wrap tbody tr')].find((r) =>
      r.textContent.includes('Zakaria@Example.com'),
    );
    expect(z.textContent).toContain('2');
    expect(z.textContent).toContain('100%');
    check.checked = false;
    check.dispatchEvent(new Event('change'));
    expect(view.querySelector('.count').textContent).toBe('4 attempts');
  });

  it('says "1 taker" for a single taker', () => {
    const one = [current[1]];
    const { view } = detail({ attempts: one, summary: summarise(one) });
    const check = view.querySelector('#f-taker');
    check.checked = true;
    check.dispatchEvent(new Event('change'));
    expect(view.querySelector('.count').textContent).toBe('1 taker');
  });

  it('shows per-question bars with the value written out and the most chosen wrong answer', () => {
    const { view } = detail();
    const items = view.querySelectorAll('.qstat');
    expect(items).toHaveLength(5);
    expect(view.querySelector('.qstats').getAttribute('dir')).toBe('rtl');
    expect(items[0].querySelector('.qbar-value').textContent).toBe('33% right (1 of 3)');
    expect(items[0].querySelector('.qbar').getAttribute('aria-label')).toBe(
      '33% answered correctly',
    );
    expect(items[0].querySelector('.qbar-fill').style.inlineSize).toBe('33%');
    expect(items[0].querySelector('.qstat-wrong').textContent).toBe(
      'Most chosen wrong answer: نَصْبٌ (2)',
    );
    expect(items[1].querySelector('.qstat-wrong')).toBeNull();
  });

  it('collapses per-question stats into a closed-by-default disclosure', () => {
    const { view } = detail();
    const details = view.querySelector('details.question-stats');
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(details.querySelector('summary').textContent).toBe('How each question went');
    expect(details.querySelectorAll('.qstat')).toHaveLength(5);
  });

  it('copes with a closed quiz and no attempts', () => {
    const { view } = detail({
      row: { ...rows[0], active: false },
      attempts: [],
      summary: summarise([]),
      stats: questionStats(arabic, []),
    });
    expect(view.textContent).toContain('Closed');
    expect(view.querySelector('.qbar-value').textContent).toBe('No answers yet');
    expect(view.querySelector('.qbar-fill').style.inlineSize).toBe('0%');
  });
});

describe('export buttons', () => {
  it('export exactly the attempts shown, in table order', () => {
    const onExport = vi.fn();
    const { view } = detail({}, onExport);
    expect(view.querySelector('.exports-label').textContent).toBe('Export the 4 attempts shown:');
    const search = view.querySelector('#f-search');
    search.value = 'zakaria@';
    search.dispatchEvent(new Event('input'));
    expect(view.querySelector('.exports-label').textContent).toBe('Export the 2 attempts shown:');
    view.querySelector('[data-export="csv"]').click();
    expect(onExport).toHaveBeenCalledWith('csv', expect.any(Array));
    expect(onExport.mock.calls[0][1].map((a) => a.id)).toEqual(['a1', 'a3']);
    view.querySelector('[data-export="answers"]').click();
    view.querySelector('[data-export="json"]').click();
    expect(onExport.mock.calls.map((c) => c[0])).toEqual(['csv', 'answers', 'json']);
  });

  it('says "1 attempt" and disables buttons when nothing is shown', () => {
    const onExport = vi.fn();
    const { view } = detail({}, onExport);
    const search = view.querySelector('#f-search');
    search.value = 'amina';
    search.dispatchEvent(new Event('input'));
    expect(view.querySelector('.exports-label').textContent).toBe('Export the 1 attempt shown:');
    search.value = 'nobody';
    search.dispatchEvent(new Event('input'));
    expect(view.querySelector('[data-export="csv"]').disabled).toBe(true);
  });

  it('are left out when no export handler is given', () => {
    const { view } = detail();
    expect(view.querySelector('[data-export]')).toBeNull();
  });
});

describe('renderAttemptDetail', () => {
  it('marks right and wrong answers and shows the correct one', () => {
    const view = renderAttemptDetail(arabic, current[1]);
    const items = view.querySelectorAll('.answer');
    expect(items[0].classList.contains('bad')).toBe(true);
    expect(items[0].querySelector('.correct-hint').textContent).toBe('Correct: رَفْعٌ');
    expect(items[1].classList.contains('ok')).toBe(true);
    expect(items[3].textContent).toContain('Not answered');
  });

  it('explains when answers cannot be shown for an older version', () => {
    expect(renderAttemptDetail(arabic, current[3]).textContent).toContain('earlier version');
    expect(renderAttemptDetail(undefined, current[0]).textContent).toContain(
      'Stored score: 5 of 5',
    );
  });
});

describe('renderDashboardMessage', () => {
  it('renders a title and body', () => {
    const v = renderDashboardMessage('Loading results…', 'Fetching.');
    expect(v.querySelector('h1').textContent).toBe('Loading results…');
  });
});
