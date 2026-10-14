// @ts-check
import { splitRuns, textDirection } from '../bidi.js';

/**
 * Create an element. Children that are strings become text nodes (never parsed as HTML).
 * @param {string} tag
 * @param {Record<string, string | boolean | undefined>} [attrs]
 * @param {(Node | string | null | undefined | false)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/**
 * Text from a quiz or a taker. Gets class .bidi and a dir: the one passed in attrs.dir (quiz
 * text uses its quiz's language, see quizTextDir) or else the text's main script (see
 * textDirection, used for free text such as names). Arabic runs are wrapped in
 * <span class="ar" lang="ar" dir="rtl"> so they use the Arabic font and keep their own order.
 * @param {string} text
 * @param {string} [tag]
 * @param {Record<string, string | boolean | undefined>} [attrs]
 */
export function richText(text, tag = 'span', attrs = {}) {
  const cls = ['bidi', attrs.class].filter(Boolean).join(' ');
  const runs = splitRuns(text).map((r) =>
    r.arabic ? el('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, [r.text]) : r.text,
  );
  const dir = typeof attrs.dir === 'string' ? attrs.dir : textDirection(text);
  return el(tag, { ...attrs, dir, class: cls }, runs);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG element with attributes (no text content; used for small graphics).
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {Element[]} [children]
 */
export function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

/** Shapes for {@link icon}, one `name` per empty state. */
const ICON_SHAPES = {
  list: () => [
    svgEl('rect', { x: '4', y: '3', width: '16', height: '18', rx: '2' }),
    svgEl('path', { d: 'M8 8h8M8 12h8M8 16h5' }),
  ],
  search: () => [
    svgEl('circle', { cx: '10.5', cy: '10.5', r: '6.5' }),
    svgEl('path', { d: 'M19 19l-4.3-4.3' }),
  ],
  share: () => [
    svgEl('circle', { cx: '12', cy: '12', r: '9' }),
    svgEl('path', { d: 'M12 8v8M8.5 11.5 12 8l3.5 3.5' }),
  ],
};

/**
 * A small hand-drawn line icon for an empty state: stroke-based, no fill, same
 * line-cap/-join style as the brand mark. Colour comes from CSS (`currentColor`).
 * Decorative only — always pair with real text, never the only content.
 * @param {'list' | 'search' | 'share'} name
 */
export function icon(name) {
  return svgEl(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '28',
      height: '28',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.75',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      class: 'empty-icon',
    },
    ICON_SHAPES[name](),
  );
}
