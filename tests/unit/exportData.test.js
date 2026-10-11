// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { prepareAttempts } from '../../src/lib/dashboardData.js';
import {
  BOM,
  answersToCsv,
  attemptsToCsv,
  attemptsToJson,
  csvCell,
  downloadFile,
  exportFileName,
  toCsv,
} from '../../src/lib/exportData.js';
import { rawAttempts } from '../fixtures/attempts.js';

const arabic = JSON.parse(readFileSync('tests/fixtures/arabic-quiz.json', 'utf8'));
const all = prepareAttempts(rawAttempts, new Map([[arabic.id, arabic]]));
const current = all.filter((a) => a.quizId === 'arabic-sample');

/** Minimal CSV parser for checking output (handles quotes, commas and newlines). */
function parseCsv(text) {
  expect(text.startsWith(BOM)).toBe(true);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const s = text.slice(1);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && s[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  return rows;
}

describe('csvCell', () => {
  it('leaves plain values alone and blanks null/undefined', () => {
    expect(csvCell('Amina')).toBe('Amina');
    expect(csvCell(5)).toBe('5');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });
  it('neutralises spreadsheet formulas typed by takers', () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\tx')).toBe("'\tx");
  });
  it('keeps Arabic text and diacritics exactly', () => {
    expect(csvCell('نَصْبٌ')).toBe('نَصْبٌ');
  });
});

describe('toCsv', () => {
  it('starts with a BOM and uses CRLF line endings', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, 2],
      ]),
    ).toBe(`${BOM}a,b\r\n1,2\r\n`);
  });
});

describe('attemptsToCsv', () => {
  const rows = parseCsv(attemptsToCsv(current));
  it('has a header and one row per attempt', () => {
    expect(rows[0][0]).toBe('Attempt ID');
    expect(rows[0]).toContain('Checked percent');
    expect(rows).toHaveLength(5);
  });
  it('writes stored and checked scores, flags and UTC times (Arabic intact)', () => {
    const h = rows[0];
    const col = (r, name) => r[h.indexOf(name)];
    const z = rows.find((r) => r[0] === 'a1');
    expect(col(z, 'Name')).toBe('زكريا');
    expect(col(z, 'Quiz title')).toBe('اختبار تجريبي في النحو');
    expect(col(z, 'Submitted at (UTC)')).toBe('2026-10-12T09:00:00.000Z');
    const cheat = rows.find((r) => r[0] === 'a3');
    expect(col(cheat, 'Score')).toBe('5');
    expect(col(cheat, 'Checked score')).toBe('1');
    expect(col(cheat, 'Checked percent')).toBe('20');
    expect(col(cheat, 'Score corrected')).toBe('yes');
    expect(
      col(
        rows.find((r) => r[0] === 'a4'),
        'Older quiz version',
      ),
    ).toBe('yes');
  });
  it('leaves missing dates empty', () => {
    const noDates = [{ ...current[0], startedAt: null, submittedAt: null }];
    const r = parseCsv(attemptsToCsv(noDates));
    expect(r[1].slice(-2)).toEqual(['', '']);
  });
});

describe('answersToCsv', () => {
  const rows = parseCsv(answersToCsv(current, arabic));
  const h = rows[0];
  const col = (r, name) => r[h.indexOf(name)];
  it('has one row per answer with question and option texts', () => {
    expect(rows).toHaveLength(1 + 5 + 5 + 5 + 1);
    const amina = rows.filter((r) => r[0] === 'a2');
    expect(col(amina[0], 'Question number')).toBe('1');
    expect(col(amina[0], 'Question')).toBe('ما حالة كلمة «مُسْلِمٌ»؟');
    expect(col(amina[0], 'Selected answer')).toBe('نَصْبٌ');
    expect(col(amina[0], 'Correct answer')).toBe('رَفْعٌ');
    expect(col(amina[0], 'Right')).toBe('no');
    expect(col(amina[1], 'Right')).toBe('yes');
    expect(col(amina[3], 'Selected answer')).toBe('Not answered');
    expect(col(amina[3], 'Selected option')).toBe('');
  });
  it('re-checks answers against the quiz (a faked "correct" flag is ignored)', () => {
    const cheat = rows.filter((r) => r[0] === 'a3');
    expect(cheat.filter((r) => col(r, 'Right') === 'yes')).toHaveLength(1);
  });
  it('uses the stored flag for an older version and leaves unknown questions blank', () => {
    const old = rows.find((r) => r[0] === 'a4');
    expect(col(old, 'Right')).toBe('yes');
    const unknown = [
      { ...current[1], answers: [{ questionId: 'gone', selected: 'x', correct: false }] },
    ];
    const r = parseCsv(answersToCsv(unknown, arabic))[1];
    expect(col(r, 'Question number')).toBe('');
    expect(col(r, 'Question')).toBe('');
    expect(col(r, 'Selected answer')).toBe('');
    expect(col(r, 'Right')).toBe('no');
  });
});

describe('attemptsToJson', () => {
  it('exports the stored records with id and ISO dates', () => {
    const data = JSON.parse(attemptsToJson(current));
    expect(data).toHaveLength(4);
    expect(data[0]).toEqual({
      id: 'a1',
      quizId: 'arabic-sample',
      quizVersion: 1,
      quizTitle: 'اختبار تجريبي في النحو',
      takerName: 'زكريا',
      takerEmail: 'Zakaria@Example.com',
      takerEmailLower: 'zakaria@example.com',
      answers: rawAttempts[0].answers,
      score: 5,
      total: 5,
      percent: 100,
      startedAt: '2026-10-12T08:55:00.000Z',
      submittedAt: '2026-10-12T09:00:00.000Z',
    });
    expect(data[2].score).toBe(5); // stored value, not the corrected one
  });
  it('writes empty strings for missing dates', () => {
    const d = JSON.parse(attemptsToJson([{ ...current[0], startedAt: null, submittedAt: null }]));
    expect(d[0].submittedAt).toBe('');
  });
});

describe('exportFileName', () => {
  it('uses the quiz id, kind and Sydney date', () => {
    const late = new Date('2026-10-11T20:00:00Z');
    expect(exportFileName('ism-four-properties', 'attempts', 'csv', late)).toBe(
      'ism-four-properties-attempts-2026-10-12.csv',
    );
    expect(exportFileName('x-y-z', 'answers', 'csv')).toMatch(
      /^x-y-z-answers-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});

describe('downloadFile', () => {
  it('creates a temporary link, clicks it and revokes the URL', async () => {
    vi.useFakeTimers();
    const URLs = { createObjectURL: vi.fn(() => 'blob:1'), revokeObjectURL: vi.fn() };
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('a.csv');
      expect(this.getAttribute('href')).toBe('blob:1');
    });
    downloadFile('a.csv', 'x', 'text/csv', { document, URL: URLs });
    expect(click).toHaveBeenCalled();
    expect(URLs.createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(URLs.revokeObjectURL).toHaveBeenCalledWith('blob:1');
    click.mockRestore();
    vi.useRealTimers();
  });

  it('defaults to the page document and URL', () => {
    const create = vi.fn(() => 'blob:2');
    const revoke = vi.fn();
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadFile('b.json', '{}', 'application/json');
    expect(create).toHaveBeenCalled();
    click.mockRestore();
  });
});
