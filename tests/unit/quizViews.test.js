// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { el, richText } from '../../src/lib/render/dom.js';
import {
  renderIntro,
  renderMessage,
  renderQuestions,
  renderResult,
  scoreRing,
} from '../../src/lib/render/quizViews.js';
import { scoreQuiz } from '../../src/lib/scoring.js';

const load = (n) => JSON.parse(readFileSync(`tests/fixtures/${n}`, 'utf8'));
const arabic = load('arabic-quiz.json');
const english = load('english-quiz.json');
const mixed = JSON.parse(readFileSync('tests/fixtures/mixed-quiz.json', 'utf8'));
const taker = { name: 'زكريا Zakaria', email: 'z@example.com' };

beforeEach(() => {
  document.body.replaceChildren();
});

/** Every element that shows quiz or taker text must have a dir and class bidi. */
function expectBidiOn(root, selector) {
  const nodes = root.querySelectorAll(selector);
  expect(nodes.length).toBeGreaterThan(0);
  for (const n of nodes) {
    expect(['ltr', 'rtl', 'auto']).toContain(n.getAttribute('dir'));
    expect(n.classList.contains('bidi')).toBe(true);
  }
}

function choose(form, qid, oid) {
  const input = form.querySelector(`input[name="${qid}"][value="${oid}"]`);
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('dom helpers', () => {
  it('el() skips empty children and boolean false attributes', () => {
    const node = el('div', { hidden: true, title: undefined, 'data-x': false }, ['a', null, false]);
    expect(node.hasAttribute('hidden')).toBe(true);
    expect(node.hasAttribute('title')).toBe(false);
    expect(node.hasAttribute('data-x')).toBe(false);
    expect(node.textContent).toBe('a');
  });

  it('richText() wraps Arabic runs and never parses HTML', () => {
    const node = richText('<img src=x onerror=alert(1)> مُسْلِمٌ', 'p', { class: 'x' });
    expect(node.querySelector('img')).toBeNull();
    expect(node.textContent).toBe('<img src=x onerror=alert(1)> مُسْلِمٌ');
    expect(node.className).toBe('bidi x');
    expect(node.getAttribute('dir')).toBe('ltr');
    expect(richText('رَفْعَ').getAttribute('dir')).toBe('rtl');
    const ar = node.querySelector('span.ar');
    expect(ar.getAttribute('lang')).toBe('ar');
    expect(ar.textContent).toBe('مُسْلِمٌ');
  });
});

describe('renderMessage', () => {
  it('shows a title and body', () => {
    const view = renderMessage('Quiz not found', 'Check the link.');
    expect(view.querySelector('h1').textContent).toBe('Quiz not found');
    expect(view.textContent).toContain('Check the link.');
  });
});

describe('renderIntro', () => {
  it('shows title, description, question count and privacy notice with bidi markup', () => {
    const view = renderIntro(mixed, { onStart: vi.fn() });
    expect(view.querySelector('h1').textContent).toBe(mixed.title);
    expect(view.querySelector('h1 .ar').textContent).toBe('اِسْم');
    expect(view.textContent).toContain('20 questions');
    expect(view.textContent).toContain('saved so the quiz owner can see results');
    expectBidiOn(view, 'h1, .lede, input');
  });

  it('says "1 question" and omits a missing description', () => {
    const one = { ...english, description: undefined, questions: english.questions.slice(0, 1) };
    const view = renderIntro(one, { onStart: vi.fn() });
    expect([...view.querySelectorAll('.chip')].map((c) => c.textContent)).toEqual([
      '1 question',
      'Multiple choice',
      'About 1 min',
    ]);
    expect(view.querySelector('.lede')).toBeNull();
  });

  it('shows errors and does not start when fields are invalid', () => {
    const onStart = vi.fn();
    const view = renderIntro(english, { onStart });
    document.body.append(view);
    view.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(onStart).not.toHaveBeenCalled();
    expect(view.querySelector('#taker-name-error').textContent).toBe('Enter your name.');
    expect(view.querySelector('#taker-name').hasAttribute('aria-invalid')).toBe(true);
    expect(document.activeElement.id).toBe('taker-name');
  });

  it('focuses the email field when only the email is wrong', () => {
    const view = renderIntro(english, { onStart: vi.fn(), initial: { name: 'A', email: 'bad' } });
    document.body.append(view);
    view.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(view.querySelector('#taker-email-error').textContent).toMatch(/name@example.com/);
    expect(document.activeElement.id).toBe('taker-email');
  });

  it('starts with cleaned values', () => {
    const onStart = vi.fn();
    const view = renderIntro(english, {
      onStart,
      initial: { name: '  زكريا  ', email: ' z@example.com ' },
    });
    view.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(onStart).toHaveBeenCalledWith({ name: 'زكريا', email: 'z@example.com' });
  });
});

describe('renderQuestions', () => {
  it('renders every question and option with bidi markup and no answers in the page', () => {
    const form = renderQuestions(arabic, taker, { onSubmit: vi.fn() });
    expect(form.querySelectorAll('.question')).toHaveLength(5);
    expect(form.querySelectorAll('input[type=radio]')).toHaveLength(20);
    expectBidiOn(form, '.q-text, .option-text, h1, strong');
    expect(form.textContent).toContain('Question 1 of 5');
    expect(form.textContent).toContain('مُسْلِمٌ');
    expect(form.outerHTML).not.toMatch(/correct|explanation/i);
  });

  it('flips only the question list to right-to-left for Arabic quizzes', () => {
    const ar = renderQuestions(arabic, taker, { onSubmit: vi.fn() });
    expect(ar.querySelector('.questions').getAttribute('dir')).toBe('rtl');
    expect(ar.querySelector('.questions').getAttribute('lang')).toBe('ar');
    expect(ar.hasAttribute('dir')).toBe(false);
    const mix = renderQuestions(mixed, taker, { onSubmit: vi.fn() });
    expect(mix.querySelector('.questions').getAttribute('dir')).toBe('ltr');
  });

  it('shows the taker name as text (no HTML injection)', () => {
    const evil = { name: '<script>alert(1)</script>', email: 'e@x.io' };
    const form = renderQuestions(english, evil, { onSubmit: vi.fn() });
    expect(form.querySelector('script')).toBeNull();
    expect(form.querySelector('strong').textContent).toBe('<script>alert(1)</script>');
  });

  it('updates progress when answers change and ignores non-radio changes', () => {
    const form = renderQuestions(english, taker, { onSubmit: vi.fn() });
    expect(form.querySelector('.progress-text').textContent).toBe('0 of 5 answered');
    choose(form, 'q1', 'a');
    choose(form, 'q2', 'c');
    expect(form.querySelector('.progress-text').textContent).toBe('2 of 5 answered');
    expect(form.querySelector('.progress-fill').style.inlineSize).toBe('40%');
    const text = document.createElement('input');
    form.append(text);
    text.dispatchEvent(new Event('change', { bubbles: true }));
    expect(form.querySelector('.progress-text').textContent).toBe('2 of 5 answered');
  });

  it('submits straight away when everything is answered', () => {
    const onSubmit = vi.fn();
    const form = renderQuestions(english, taker, { onSubmit });
    english.questions.forEach((q) => choose(form, q.id, 'a'));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(onSubmit).toHaveBeenCalledWith({ q1: 'a', q2: 'a', q3: 'a', q4: 'a', q5: 'a' });
  });

  it('warns about unanswered questions, can go back, and can submit anyway', () => {
    const onSubmit = vi.fn();
    const form = renderQuestions(english, taker, { onSubmit });
    document.body.append(form);
    choose(form, 'q1', 'a');
    choose(form, 'q3', 'b');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    const box = form.querySelector('.confirm');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('3 questions are not answered (2, 4, 5)');

    const [back, anyway] = box.querySelectorAll('button');
    expect(back.textContent).toBe('Go to question 2');
    back.click();
    expect(box.hidden).toBe(true);
    expect(document.activeElement.name).toBe('q2');

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    form.querySelectorAll('.confirm button')[1].click();
    expect(onSubmit).toHaveBeenCalledWith({ q1: 'a', q3: 'b' });
    expect(anyway.isConnected).toBe(false);

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('uses the singular wording for one unanswered question and hides the warning on change', () => {
    const form = renderQuestions(english, taker, { onSubmit: vi.fn() });
    ['q1', 'q2', 'q3', 'q4'].forEach((id) => choose(form, id, 'a'));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(form.querySelector('.confirm').textContent).toContain('1 question is not answered (5)');
    choose(form, 'q5', 'a');
    expect(form.querySelector('.confirm').hidden).toBe(true);
  });
});

describe('renderResult', () => {
  it('shows score, and for each mistake your answer, the correct answer and why', () => {
    const answers = Object.fromEntries(mixed.questions.map((q) => [q.id, q.correct]));
    answers.q7 = mixed.questions[6].options.find((o) => o.id !== mixed.questions[6].correct).id;
    delete answers.q20;
    const result = scoreQuiz(mixed, answers);
    const view = renderResult(mixed, taker, result);

    expect(view.querySelector('.score').textContent).toBe(
      'زكريا Zakaria, you scored 18 out of 20 (90%).',
    );
    expect(view.querySelector('h2').textContent).toBe('2 to review');
    const items = view.querySelectorAll('.review-item');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('value')).toBe('7');
    expect(items[0].querySelector('.review-number').textContent).toBe('Question 7');
    expect([...view.querySelectorAll('.breakdown .chip')].map((c) => c.textContent)).toEqual([
      '18 right',
      '1 wrong',
      '1 not answered',
    ]);
    expect(view.querySelector('.ring-percent').textContent).toBe('90%');
    expect(items[0].querySelector('.right').textContent).toBe('Dual (a pair), in رَفْعَ status');
    expect(items[0].querySelector('.why').textContent).toContain('مُسْلِمَيْنِ');
    expect(items[1].querySelector('.not-answered').textContent).toBe('Not answered');
    expectBidiOn(view, '.q-text, dd.right, .why, dd.wrong:not(.not-answered), strong');
    expect(view.querySelector('#save-status')).not.toBeNull();
    // An English explanation that starts with an Arabic word still reads left to right.
    expect(items[1].querySelector('.why').getAttribute('dir')).toBe('ltr');
  });

  it('congratulates a perfect score and offers a restart', () => {
    const onRestart = vi.fn();
    const all = Object.fromEntries(english.questions.map((q) => [q.id, q.correct]));
    const view = renderResult(english, taker, scoreQuiz(english, all), { onRestart });
    expect(view.querySelector('.perfect').textContent).toBe('Every answer is right. Well done!');
    expect(view.querySelector('.review')).toBeNull();
    const wrongAr = renderResult(arabic, taker, scoreQuiz(arabic, {}));
    expect(wrongAr.querySelector('.review-list').getAttribute('dir')).toBe('rtl');
    view.querySelector('button').click();
    expect(onRestart).toHaveBeenCalled();
  });

  it('has no restart button without a handler', () => {
    const view = renderResult(english, taker, scoreQuiz(english, {}));
    expect(view.querySelector('button')).toBeNull();
  });
});

describe('scoreRing', () => {
  const offset = (ring) =>
    Number(ring.querySelector('.ring-value').getAttribute('stroke-dashoffset'));
  const full = 2 * Math.PI * 52;
  // The entrance animation needs a starting point to transition from: the ring mounts
  // fully undrawn, then flips to the real value one frame later (double rAF).
  const flushFrames = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  it('mounts empty, then draws in to the right proportion a frame later', async () => {
    const ring0 = scoreRing(0);
    const ring50 = scoreRing(50);
    const ring100 = scoreRing(100);
    expect(offset(ring0)).toBeCloseTo(full, 1);
    expect(offset(ring50)).toBeCloseTo(full, 1);
    expect(offset(ring100)).toBeCloseTo(full, 1);

    await flushFrames();

    expect(offset(ring0)).toBeCloseTo(full, 1);
    expect(offset(ring50)).toBeCloseTo(full / 2, 1);
    expect(offset(ring100)).toBeCloseTo(0, 1);
  });
  it('is hidden from screen readers and uses real SVG markup', () => {
    expect(scoreRing(40).getAttribute('aria-hidden')).toBe('true');
    expect(scoreRing(40).querySelector('svg').namespaceURI).toBe('http://www.w3.org/2000/svg');
  });
  it('lands on the final value immediately when requestAnimationFrame is unavailable', () => {
    const raf = globalThis.requestAnimationFrame;
    // @ts-expect-error - simulating an environment with no requestAnimationFrame
    delete globalThis.requestAnimationFrame;
    try {
      expect(offset(scoreRing(50))).toBeCloseTo(full / 2, 1);
    } finally {
      globalThis.requestAnimationFrame = raf;
    }
  });
  it('keeps values between 0 and 100', () => {
    expect(scoreRing(140).querySelector('.ring-percent').textContent).toBe('100%');
    expect(scoreRing(-5).querySelector('.ring-percent').textContent).toBe('0%');
  });
});
