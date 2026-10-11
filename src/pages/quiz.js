import '../styles/fonts.js';
import {
  SAVE_MESSAGES,
  buildAttemptRecord,
  createAttemptSaver,
  getClientId,
} from '../lib/attempts.js';
import { readConfig } from '../lib/config.js';
import { firestoreAttemptWriter } from '../lib/firebase.js';
import { loadQuiz, quizIdFromLocation } from '../lib/quizLoader.js';
import {
  renderIntro,
  renderMessage,
  renderQuestions,
  renderResult,
} from '../lib/render/quizViews.js';
import { scoreQuiz } from '../lib/scoring.js';

const app = /** @type {HTMLElement} */ (document.getElementById('app'));
const config = readConfig(import.meta.env);

/** @returns {Storage | null} */
function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = safeStorage();
const saver = config.configured
  ? createAttemptSaver({ write: firestoreAttemptWriter(config), storage })
  : null;
if (!config.configured)
  console.warn('QuizCraft: Firebase is not configured; attempts are not saved.');

/** @param {HTMLElement} view */
function show(view) {
  app.replaceChildren(view);
  window.scrollTo(0, 0);
  const heading = view.querySelector('h1');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

/** @param {keyof typeof SAVE_MESSAGES} state */
function setSaveStatus(state) {
  const el = document.getElementById('save-status');
  if (el) {
    el.textContent = SAVE_MESSAGES[state];
    el.dataset.state = state;
  }
}

async function main() {
  // Send any attempt that could not be saved last time (offline, closed tab, …).
  saver?.flush().catch(() => {});

  const result = await loadQuiz(quizIdFromLocation(window.location), (url) => fetch(url));
  if (result.status === 'not-found') {
    document.title = 'Quiz not found · QuizCraft';
    show(
      renderMessage(
        'Quiz not found',
        'Check the link you were given. It may be mistyped or the quiz may have been removed.',
      ),
    );
    return;
  }
  if (result.status === 'error') {
    show(renderMessage('Something went wrong', result.message));
    return;
  }
  const quiz = result.quiz;
  document.title = `${quiz.title} · QuizCraft`;
  if (result.status === 'closed') {
    show(renderMessage(quiz.title, 'This quiz is closed and no longer accepts answers.'));
    return;
  }

  /** @param {Partial<{ name: string, email: string }>} initial */
  const start = (initial = {}) =>
    show(
      renderIntro(quiz, {
        initial,
        onStart: (taker) => {
          const startedAt = new Date();
          show(
            renderQuestions(quiz, taker, {
              onSubmit: (answers) => {
                const scored = scoreQuiz(quiz, answers);
                show(renderResult(quiz, taker, scored, { onRestart: () => start(taker) }));
                if (!saver) {
                  setSaveStatus('disabled');
                  return;
                }
                setSaveStatus('saving');
                const record = buildAttemptRecord({
                  quiz,
                  taker,
                  scored,
                  startedAt,
                  clientId: getClientId(storage),
                  userAgent: navigator.userAgent,
                });
                saver
                  .save(record)
                  .then(setSaveStatus)
                  .catch(() => setSaveStatus('failed'));
              },
            }),
          );
        },
      }),
    );
  start();
}

main();
