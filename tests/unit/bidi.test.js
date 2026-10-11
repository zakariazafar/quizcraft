import { describe, expect, it } from 'vitest';
import {
  arabicRatio,
  containerDirection,
  hasArabic,
  splitRuns,
  textDirection,
} from '../../src/lib/bidi.js';

describe('hasArabic / arabicRatio', () => {
  it('detects Arabic with and without diacritics', () => {
    expect(hasArabic('مُسْلِمٌ')).toBe(true);
    expect(hasArabic('مسلم')).toBe(true);
    expect(hasArabic('Muslim')).toBe(false);
  });

  it('measures the share of Arabic letters', () => {
    expect(arabicRatio('مسلم')).toBe(1);
    expect(arabicRatio('Muslim')).toBe(0);
    expect(arabicRatio('ab مس')).toBe(0.5);
    expect(arabicRatio('123 !?')).toBe(0);
  });

  it('ignores diacritics when counting Arabic letters', () => {
    expect(arabicRatio('رَفْعَ ab')).toBe(arabicRatio('رفع ab'));
  });
});

describe('textDirection', () => {
  it('uses the main script of the text', () => {
    expect(textDirection('ما حالة كلمة «مُسْلِمٌ»؟')).toBe('rtl');
    expect(textDirection('What does the ending of مُسْلِمَانِ tell you?')).toBe('ltr');
    expect(textDirection("رَفْعَ (Raf'a)")).toBe('ltr');
    expect(textDirection('الَّذِي means “the one who”, الَّذَانِ means “the two who”')).toBe('ltr');
    expect(textDirection('مُسْلِمَا')).toBe('rtl');
    expect(textDirection('2026 !')).toBe('auto');
  });
});

describe('splitRuns', () => {
  it('splits mixed text into Arabic and non-Arabic runs and keeps every character', () => {
    const text = 'What does the ending of مُسْلِمَانِ tell you?';
    const runs = splitRuns(text);
    expect(runs).toEqual([
      { text: 'What does the ending of ', arabic: false },
      { text: 'مُسْلِمَانِ', arabic: true },
      { text: ' tell you?', arabic: false },
    ]);
    expect(runs.map((r) => r.text).join('')).toBe(text);
  });

  it('joins several Arabic words separated by spaces into one run', () => {
    const runs = splitRuns('Say اَلْحَمْدُ لِلَّهِ often');
    expect(runs[1]).toEqual({ text: 'اَلْحَمْدُ لِلَّهِ', arabic: true });
  });

  it('handles pure Arabic, pure English and empty text', () => {
    expect(splitRuns('رَفْعَ')).toEqual([{ text: 'رَفْعَ', arabic: true }]);
    expect(splitRuns('Status')).toEqual([{ text: 'Status', arabic: false }]);
    expect(splitRuns('')).toEqual([]);
  });

  it('keeps Arabic diacritics unchanged', () => {
    const word = 'الَّذِينَ';
    expect(splitRuns(`Those who: ${word}`)[1].text).toBe(word);
  });
});

describe('containerDirection', () => {
  it('maps quiz language to dir and lang', () => {
    expect(containerDirection('ar')).toEqual({ dir: 'rtl', lang: 'ar' });
    expect(containerDirection('en')).toEqual({ dir: 'ltr', lang: 'en' });
    expect(containerDirection('mixed')).toEqual({ dir: 'ltr', lang: 'en' });
  });
});
