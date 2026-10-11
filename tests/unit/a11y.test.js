// @vitest-environment jsdom
// Automated accessibility checks (axe-core) on every screen. Colour contrast needs real layout,
// so it is checked separately in contrast.test.js.
import { readFileSync } from 'node:fs';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prepareAttempts,
  questionStats,
  quizRows,
  summarise,
} from '../../src/lib/dashboardData.js';
import {
  renderQuizDetail,
  renderQuizList,
  renderShell,
  renderSignIn,
} from '../../src/lib/render/dashboardViews.js';
import {
  renderIntro,
  renderMessage,
  renderQuestions,
  renderResult,
} from '../../src/lib/render/quizViews.js';
import { scoreQuiz } from '../../src/lib/scoring.js';
import { rawAttempts } from '../fixtures/attempts.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const mixed = JSON.parse(readFileSync('tests/fixtures/mixed-quiz.json', 'utf8'));
const taker = { name: 'زكريا', email: 'z@example.com' };

async function check(view) {
  document.documentElement.lang = 'en';
  document.title = 'Test';
  const main = document.createElement('main');
  main.append(view);
  document.body.replaceChildren(main);
  const result = await axe.run(document, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`);
}

beforeEach(() => document.body.replaceChildren());

describe('accessibility: quiz screens', () => {
  it('intro form', async () => {
    expect(await check(renderIntro(mixed, { onStart: vi.fn() }))).toEqual([]);
  });
  it('questions (mixed and Arabic)', async () => {
    expect(await check(renderQuestions(mixed, taker, { onSubmit: vi.fn() }))).toEqual([]);
    expect(await check(renderQuestions(arabic, taker, { onSubmit: vi.fn() }))).toEqual([]);
  });
  it('result with review', async () => {
    const view = renderResult(mixed, taker, scoreQuiz(mixed, { q1: 'b' }), { onRestart: vi.fn() });
    expect(await check(view)).toEqual([]);
  });
  it('message', async () => {
    expect(await check(renderMessage('Quiz not found', 'Check the link.'))).toEqual([]);
  });
});

describe('accessibility: dashboard screens', () => {
  const all = prepareAttempts(rawAttempts, new Map([[arabic.id, arabic]]));
  const current = all.filter((a) => a.quizId === arabic.id);
  const index = [
    {
      id: arabic.id,
      title: arabic.title,
      language: 'ar',
      questionCount: 5,
      active: true,
      version: 1,
      createdAt: '',
    },
  ];
  const rows = quizRows(index, all);
  const shell = (c) => renderShell(c, { onRefresh: vi.fn(), onSignOut: vi.fn() });

  it('sign-in', async () => {
    expect(await check(renderSignIn({ onSubmit: vi.fn() }).view)).toEqual([]);
  });
  it('quiz list', async () => {
    expect(await check(shell(renderQuizList(rows, { onOpen: vi.fn(), share: vi.fn() })))).toEqual(
      [],
    );
  });
  it('quiz detail with an attempt opened', async () => {
    const view = renderQuizDetail(
      {
        quiz: arabic,
        row: rows[0],
        attempts: current,
        summary: summarise(current),
        stats: questionStats(arabic, current),
        hidden: new Set(),
      },
      { share: vi.fn(), onToggleHidden: () => new Set(), onExport: vi.fn() },
    );
    view.querySelector('[data-view="a2"]').click();
    expect(await check(shell(view))).toEqual([]);
  });
});
