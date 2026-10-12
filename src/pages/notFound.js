import '../styles/fonts.js';
import { el } from '../lib/render/dom.js';

const app = /** @type {HTMLElement} */ (document.getElementById('app'));
app.append(
  el('section', { class: 'home' }, [
    el('img', { src: '/logo.svg', alt: '', class: 'home-logo', width: '96', height: '96' }),
    el('h1', {}, ['Page not found']),
    el('p', { class: 'lede' }, [
      'There is nothing at this address. If you were given a quiz link, check that it was copied in full: quiz links look like ',
      el('code', { dir: 'ltr' }, [`${window.location.origin}/q/quiz-name`]),
      '.',
    ]),
    el('p', {}, [el('a', { class: 'button primary', href: '/' }, ['Go to the home page'])]),
  ]),
);
