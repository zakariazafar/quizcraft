import '../styles/fonts.js';
import { registerServiceWorker } from '../lib/registerServiceWorker.js';
import { el } from '../lib/render/dom.js';

if (import.meta.env.PROD) registerServiceWorker(navigator);

const app = /** @type {HTMLElement} */ (document.getElementById('app'));
app.append(
  el('section', { class: 'home' }, [
    el('img', { src: '/logo.svg', alt: '', class: 'home-logo', width: '96', height: '96' }),
    el('h1', {}, ['QuizCraft']),
    el('p', { class: 'lede' }, [
      'Short quizzes on Arabic grammar and other topics, shared by link. Answer the questions and see your score with an explanation for every mistake.',
    ]),
    el('ol', { class: 'home-steps' }, [
      el('li', {}, [
        el('strong', {}, ['Open your link']),
        el('span', {}, ['Your teacher shares a link to each quiz.']),
      ]),
      el('li', {}, [
        el('strong', {}, ['Answer the questions']),
        el('span', {}, ['Enter your name and email, then choose one answer per question.']),
      ]),
      el('li', {}, [
        el('strong', {}, ['Learn from the review']),
        el('span', {}, ['See the right answer and the reason for each one you missed.']),
      ]),
    ]),
    el('p', { class: 'meta' }, [
      el('a', { href: '/dashboard' }, ['Quiz owners: open the results dashboard']),
    ]),
  ]),
);
