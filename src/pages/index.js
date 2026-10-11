import { el } from '../lib/render/dom.js';

const app = /** @type {HTMLElement} */ (document.getElementById('app'));
app.append(
  el('section', { class: 'message' }, [
    el('h1', {}, ['QuizCraft']),
    el('p', { class: 'lede' }, [
      'Quizzes here are shared by link. Open the link you were given to take a quiz.',
    ]),
    el('p', { class: 'meta' }, [
      el('a', { href: '/dashboard' }, ['Quiz owners: open the results dashboard']),
    ]),
  ]),
);
