// @ts-check
import { containerDirection } from '../bidi.js';
import { unansweredQuestions } from '../scoring.js';
import { EMAIL_MAX, NAME_MAX, validateTaker } from '../takerForm.js';
import { el, richText } from './dom.js';

/**
 * @typedef {import('../validate.js').Quiz} Quiz
 * @typedef {{ name: string, email: string }} Taker
 * @typedef {ReturnType<typeof import('../scoring.js').scoreQuiz>} Result
 */

/**
 * Full-page message (quiz not found, closed, or failed to load).
 * @param {string} title
 * @param {string} body
 */
export function renderMessage(title, body) {
  return el('section', { class: 'message', 'aria-live': 'polite' }, [
    richText(title, 'h1'),
    el('p', {}, [body]),
  ]);
}

/**
 * @param {string} id
 * @param {string} label
 * @param {Record<string, string>} attrs
 */
function field(id, label, attrs) {
  const error = el('p', { class: 'field-error', id: `${id}-error`, 'aria-live': 'polite' });
  const input = el('input', {
    id,
    name: id,
    dir: 'auto',
    class: 'bidi',
    'aria-describedby': `${id}-error`,
    ...attrs,
  });
  return {
    wrap: el('div', { class: 'field' }, [el('label', { for: id }, [label]), input, error]),
    input,
    error,
  };
}

/**
 * Quiz intro with the name/email form.
 * @param {Quiz} quiz
 * @param {{ onStart: (taker: Taker) => void, initial?: Partial<Taker> }} opts
 */
export function renderIntro(quiz, { onStart, initial = {} }) {
  const name = field('taker-name', 'Your name', {
    autocomplete: 'name',
    maxlength: String(NAME_MAX),
    required: 'true',
  });
  const email = field('taker-email', 'Your email', {
    type: 'email',
    autocomplete: 'email',
    maxlength: String(EMAIL_MAX),
    required: 'true',
  });
  /** @type {HTMLInputElement} */ (name.input).value = initial.name ?? '';
  /** @type {HTMLInputElement} */ (email.input).value = initial.email ?? '';

  const count = quiz.questions.length;
  const form = el('form', { class: 'taker-form', novalidate: true }, [
    name.wrap,
    email.wrap,
    el('p', { class: 'privacy' }, [
      'Your name, email and answers are saved so the quiz owner can see results.',
    ]),
    el('button', { type: 'submit', class: 'button primary' }, ['Start quiz']),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const check = validateTaker({
      name: /** @type {HTMLInputElement} */ (name.input).value,
      email: /** @type {HTMLInputElement} */ (email.input).value,
    });
    name.error.textContent = check.errors.name ?? '';
    email.error.textContent = check.errors.email ?? '';
    name.input.toggleAttribute('aria-invalid', Boolean(check.errors.name));
    email.input.toggleAttribute('aria-invalid', Boolean(check.errors.email));
    if (!check.ok) {
      (check.errors.name ? name.input : email.input).focus();
      return;
    }
    onStart(check.values);
  });

  return el('section', { class: 'intro' }, [
    richText(quiz.title, 'h1'),
    quiz.description ? richText(quiz.description, 'p', { class: 'lede' }) : null,
    el('p', { class: 'meta' }, [`${count} question${count === 1 ? '' : 's'} · multiple choice`]),
    form,
  ]);
}

/**
 * All questions on one page, with a progress bar and an unanswered-questions check.
 * @param {Quiz} quiz
 * @param {Taker} taker
 * @param {{ onSubmit: (answers: Record<string, string>) => void }} opts
 */
export function renderQuestions(quiz, taker, { onSubmit }) {
  /** @type {Record<string, string>} */
  const answers = {};
  const total = quiz.questions.length;

  const list = el(
    'ol',
    { class: 'questions', ...containerDirection(quiz.language) },
    quiz.questions.map((q, i) =>
      el('li', { class: 'question', id: `question-${q.id}` }, [
        el('fieldset', {}, [
          el('legend', {}, [
            el('span', { class: 'q-number' }, [`Question ${i + 1} of ${total}`]),
            richText(q.text, 'span', { class: 'q-text' }),
          ]),
          el(
            'div',
            { class: 'options' },
            q.options.map((o) =>
              el('label', { class: 'option' }, [
                el('input', { type: 'radio', name: q.id, value: o.id }),
                richText(o.text, 'span', { class: 'option-text' }),
              ]),
            ),
          ),
        ]),
      ]),
    ),
  );

  const progressText = el('span', { class: 'progress-text', 'aria-live': 'polite' });
  const bar = el('span', { class: 'progress-fill' });
  const submit = el('button', { type: 'submit', class: 'button primary' }, ['Submit answers']);
  const confirmBox = el('div', { class: 'confirm', hidden: true, role: 'alert' });

  const updateProgress = () => {
    const done = total - unansweredQuestions(quiz, answers).length;
    progressText.textContent = `${done} of ${total} answered`;
    bar.style.inlineSize = `${(done / total) * 100}%`;
  };

  const form = el('form', { class: 'quiz-form', novalidate: true }, [
    el('header', { class: 'quiz-header' }, [
      richText(quiz.title, 'h1'),
      el('p', { class: 'meta' }, ['Answering as ', richText(taker.name, 'strong')]),
    ]),
    list,
    confirmBox,
    el('div', { class: 'progress' }, [
      el('span', { class: 'progress-track', 'aria-hidden': 'true' }, [bar]),
      progressText,
      submit,
    ]),
  ]);

  form.addEventListener('change', (event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    if (input.type !== 'radio') return;
    answers[input.name] = input.value;
    confirmBox.hidden = true;
    updateProgress();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const missing = unansweredQuestions(quiz, answers);
    if (missing.length === 0 || form.dataset.confirmed === 'true') {
      onSubmit({ ...answers });
      return;
    }
    const numbers = missing.map((id) => quiz.questions.findIndex((q) => q.id === id) + 1);
    const back = el('button', { type: 'button', class: 'button' }, [
      `Go to question ${numbers[0]}`,
    ]);
    const anyway = el('button', { type: 'button', class: 'button danger' }, ['Submit anyway']);
    confirmBox.replaceChildren(
      el('p', {}, [
        `${missing.length} question${missing.length === 1 ? ' is' : 's are'} not answered (${numbers.join(', ')}). Unanswered questions count as wrong.`,
      ]),
      el('div', { class: 'confirm-actions' }, [back, anyway]),
    );
    confirmBox.hidden = false;
    back.addEventListener('click', () => {
      const target = form.querySelector(`#question-${missing[0]} input`);
      /** @type {HTMLElement | null} */ (target)?.focus();
      confirmBox.hidden = true;
    });
    anyway.addEventListener('click', () => {
      form.dataset.confirmed = 'true';
      onSubmit({ ...answers });
    });
  });

  updateProgress();
  return form;
}

/**
 * Result screen: score plus review of every wrong or unanswered question.
 * @param {Quiz} quiz
 * @param {Taker} taker
 * @param {Result} result
 * @param {{ onRestart?: () => void }} [opts]
 */
export function renderResult(quiz, taker, result, { onRestart } = {}) {
  const perfect = result.review.length === 0;
  const restart = onRestart
    ? el('button', { type: 'button', class: 'button' }, ['Take the quiz again'])
    : null;
  restart?.addEventListener('click', () => onRestart?.());

  const review = perfect
    ? el('p', { class: 'perfect' }, ['Every answer is right. Well done!'])
    : el('section', { class: 'review', 'aria-labelledby': 'review-heading' }, [
        el('h2', { id: 'review-heading' }, [`${result.review.length} to review`]),
        el(
          'ol',
          { class: 'review-list', ...containerDirection(quiz.language) },
          result.review.map((item) =>
            el('li', { class: 'review-item', value: String(item.number) }, [
              richText(item.question, 'p', { class: 'q-text' }),
              el('dl', {}, [
                el('dt', {}, ['Your answer']),
                item.yourAnswer === null
                  ? el('dd', { class: 'wrong not-answered' }, ['Not answered'])
                  : richText(item.yourAnswer, 'dd', { class: 'wrong' }),
                el('dt', {}, ['Correct answer']),
                richText(item.correctAnswer, 'dd', { class: 'right' }),
                el('dt', {}, ['Why']),
                richText(item.explanation, 'dd', { class: 'why' }),
              ]),
            ]),
          ),
        ),
      ]);

  return el('section', { class: 'result' }, [
    richText(quiz.title, 'p', { class: 'meta' }),
    el('h1', {}, ['Your result']),
    el('p', { class: 'score' }, [
      richText(taker.name, 'strong'),
      `, you scored `,
      el('span', { class: 'score-figure' }, [`${result.score} out of ${result.total}`]),
      ` (${result.percent}%).`,
    ]),
    el('p', { class: 'save-status', 'aria-live': 'polite', id: 'save-status' }),
    review,
    restart,
  ]);
}
