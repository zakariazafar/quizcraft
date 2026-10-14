// @ts-check
/** Arabic / right-to-left helpers. */

const AR = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const ARABIC_CHAR = new RegExp(`[${AR}]`);
/** Arabic diacritics and Quranic marks: not counted as letters. */
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g;
const ARABIC_LETTER = new RegExp(`[${AR}]`, 'g');
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/g;
/** Arabic words, joined across the spaces between them. */
const ARABIC_RUN = new RegExp(`[${AR}]+(?:[\\s\\u00A0]+[${AR}]+)*`, 'g');

/** @param {string} text */
export function hasArabic(text) {
  return ARABIC_CHAR.test(text);
}

/**
 * Share of letters that are Arabic (0–1). Diacritics are ignored.
 * @param {string} text
 */
export function arabicRatio(text) {
  const ar = (text.replace(ARABIC_MARKS, '').match(ARABIC_LETTER) || []).length;
  const la = (text.match(LATIN_LETTER) || []).length;
  return ar + la === 0 ? 0 : ar / (ar + la);
}

/**
 * Direction for a piece of quiz or taker text, decided by its main script, so an English
 * sentence that starts with an Arabic word still reads left to right.
 * @param {string} text
 * @returns {'rtl' | 'ltr' | 'auto'}
 */
export function textDirection(text) {
  const ar = (text.replace(ARABIC_MARKS, '').match(ARABIC_LETTER) || []).length;
  const la = (text.match(LATIN_LETTER) || []).length;
  if (ar + la === 0) return 'auto';
  return ar > la ? 'rtl' : 'ltr';
}

/**
 * Split text into Arabic and non-Arabic runs, so Arabic can be styled on its own.
 * Joining the run texts gives back the original string exactly.
 * @param {string} text
 * @returns {{ text: string, arabic: boolean }[]}
 */
export function splitRuns(text) {
  /** @type {{ text: string, arabic: boolean }[]} */
  const runs = [];
  let last = 0;
  for (const m of text.matchAll(ARABIC_RUN)) {
    const start = /** @type {number} */ (m.index);
    if (start > last) runs.push({ text: text.slice(last, start), arabic: false });
    runs.push({ text: m[0], arabic: true });
    last = start + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), arabic: false });
  return runs;
}

/**
 * Direction attributes for the list of questions or review items. Only Arabic quizzes flip
 * to right-to-left; the surrounding interface (English labels, progress bar) stays LTR.
 * @param {'ar'|'en'|'mixed'} language
 * @returns {{ dir: 'rtl'|'ltr', lang: string }}
 */
export function containerDirection(language) {
  return language === 'ar' ? { dir: 'rtl', lang: 'ar' } : { dir: 'ltr', lang: 'en' };
}

/**
 * Base direction for text that belongs to a quiz (titles, questions, options, explanations).
 * English and mixed quizzes are English sentences that quote Arabic, so they read left to
 * right even when a sentence holds more Arabic letters than English ones; each Arabic run
 * inside keeps its own right-to-left direction. Arabic quizzes read right to left.
 * @param {string | undefined} language 'ar' | 'en' | 'mixed'
 * @returns {'rtl' | 'ltr' | undefined} undefined when the language is unknown (detect instead)
 */
export function quizTextDir(language) {
  if (language === 'ar') return 'rtl';
  if (language === 'en' || language === 'mixed') return 'ltr';
  return undefined;
}
