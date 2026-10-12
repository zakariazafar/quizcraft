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
 * Text from a quiz or a taker. Gets class .bidi and a dir from its main script
 * (see textDirection), and Arabic runs are wrapped in <span class="ar" lang="ar"> so they
 * use the Arabic font.
 * @param {string} text
 * @param {string} [tag]
 * @param {Record<string, string | boolean | undefined>} [attrs]
 */
export function richText(text, tag = 'span', attrs = {}) {
  const cls = ['bidi', attrs.class].filter(Boolean).join(' ');
  const runs = splitRuns(text).map((r) =>
    r.arabic ? el('span', { class: 'ar', lang: 'ar' }, [r.text]) : r.text,
  );
  return el(tag, { ...attrs, dir: textDirection(text), class: cls }, runs);
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
