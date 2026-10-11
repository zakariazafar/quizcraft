// @ts-check
/** JSON and CSV exports of attempt records (UTF-8; CSV starts with a BOM so Excel shows Arabic). */

/**
 * @typedef {import('./validate.js').Quiz} Quiz
 * @typedef {import('./dashboardData.js').CheckedAttempt} CheckedAttempt
 */

export const BOM = '﻿';

/** @param {Date | null} d */
const iso = (d) => (d ? d.toISOString() : '');

/**
 * The attempt records as saved in Firestore, plus their document id. Dates as ISO strings.
 * @param {CheckedAttempt[]} attempts
 */
export function attemptsToJson(attempts) {
  const records = attempts.map((a) => ({
    id: a.id,
    quizId: a.quizId,
    quizVersion: a.quizVersion,
    quizTitle: a.quizTitle,
    takerName: a.takerName,
    takerEmail: a.takerEmail,
    takerEmailLower: a.takerEmailLower,
    answers: a.answers,
    score: a.score,
    total: a.total,
    percent: a.percent,
    startedAt: iso(a.startedAt),
    submittedAt: iso(a.submittedAt),
  }));
  return JSON.stringify(records, null, 2) + '\n';
}

/**
 * One CSV cell: quoted when needed, and protected against spreadsheet formula injection
 * (text a taker typed that starts with = + - @ tab or CR is prefixed with ').
 * @param {unknown} value
 */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** @param {unknown[][]} rows */
export function toCsv(rows) {
  return BOM + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/**
 * One row per attempt.
 * @param {CheckedAttempt[]} attempts
 */
export function attemptsToCsv(attempts) {
  const header = [
    'Attempt ID',
    'Quiz ID',
    'Quiz version',
    'Quiz title',
    'Name',
    'Email',
    'Score',
    'Total',
    'Percent',
    'Checked score',
    'Checked total',
    'Checked percent',
    'Score corrected',
    'Older quiz version',
    'Started at (UTC)',
    'Submitted at (UTC)',
  ];
  const rows = attempts.map((a) => [
    a.id,
    a.quizId,
    a.quizVersion,
    a.quizTitle,
    a.takerName,
    a.takerEmail,
    a.score,
    a.total,
    a.percent,
    a.checked.score,
    a.checked.total,
    a.checked.percent,
    a.checked.mismatch ? 'yes' : 'no',
    a.checked.versionChanged ? 'yes' : 'no',
    iso(a.startedAt),
    iso(a.submittedAt),
  ]);
  return toCsv([header, ...rows]);
}

/**
 * One row per answer, with the question and option texts from the quiz file.
 * @param {CheckedAttempt[]} attempts
 * @param {Quiz} quiz
 */
export function answersToCsv(attempts, quiz) {
  const header = [
    'Attempt ID',
    'Name',
    'Email',
    'Submitted at (UTC)',
    'Question number',
    'Question ID',
    'Question',
    'Selected option',
    'Selected answer',
    'Correct option',
    'Correct answer',
    'Right',
  ];
  const position = new Map(quiz.questions.map((q, i) => [q.id, i]));
  const rows = attempts.flatMap((a) =>
    a.answers.map((ans) => {
      const idx = position.get(ans.questionId);
      const q = idx === undefined ? undefined : quiz.questions[idx];
      const selected = q?.options.find((o) => o.id === ans.selected);
      const correct = q?.options.find((o) => o.id === q.correct);
      const right = q && !a.checked.versionChanged ? ans.selected === q.correct : ans.correct;
      return [
        a.id,
        a.takerName,
        a.takerEmail,
        iso(a.submittedAt),
        idx === undefined ? '' : idx + 1,
        ans.questionId,
        q?.text ?? '',
        ans.selected ?? '',
        ans.selected === null ? 'Not answered' : (selected?.text ?? ''),
        q?.correct ?? '',
        correct?.text ?? '',
        right ? 'yes' : 'no',
      ];
    }),
  );
  return toCsv([header, ...rows]);
}

/**
 * @param {string} quizId
 * @param {'attempts' | 'answers'} kind
 * @param {'csv' | 'json'} ext
 * @param {Date} [now]
 */
export function exportFileName(quizId, kind, ext, now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(now);
  return `${quizId}-${kind}-${day}.${ext}`;
}

/**
 * Save text as a file in the browser.
 * @param {string} name
 * @param {string} content
 * @param {string} type MIME type
 * @param {{ document: Document, URL: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> }} [env]
 */
export function downloadFile(name, content, type, env = { document, URL }) {
  const url = env.URL.createObjectURL(new Blob([content], { type }));
  const a = env.document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  env.document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => env.URL.revokeObjectURL(url), 1000);
}
