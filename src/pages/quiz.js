import '../styles/fonts.js';
import { loadQuiz, quizIdFromLocation } from '../lib/quizLoader.js';
import {
  renderIntro,
  renderMessage,
  renderQuestions,
  renderResult,
} from '../lib/render/quizViews.js';
import { scoreQuiz } from '../lib/scoring.js';

const app = /** @type {HTMLElement} */ (document.getElementById('app'));

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

async function main() {
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
        onStart: (taker) =>
          show(
            renderQuestions(quiz, taker, {
              onSubmit: (answers) => {
                const scored = scoreQuiz(quiz, answers);
                show(renderResult(quiz, taker, scored, { onRestart: () => start(taker) }));
              },
            }),
          ),
      }),
    );
  start();
}

main();
