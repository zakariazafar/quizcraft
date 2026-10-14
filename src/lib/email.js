// @ts-check
/** Pure formatting of a result email's content. No network, no DOM. */

/**
 * @typedef {import('./validate.js').Quiz} Quiz
 * @typedef {{ name: string, email: string }} Taker
 * @typedef {ReturnType<typeof import('./scoring.js').scoreQuiz>} Result
 */

/**
 * Plain-text body: a greeting, the score line, then one block per question to review.
 * Works for any number of questions, since EmailJS templates can't loop over a dynamic
 * list themselves — this builds the whole reviewable part as one text field.
 * @param {Quiz} quiz
 * @param {Taker} taker
 * @param {Result} result
 */
export function resultEmailBody(quiz, taker, result) {
  const wrong = result.total - result.score - result.unanswered;
  const lines = [
    `Hi ${taker.name},`,
    '',
    `Your result for "${quiz.title}": ${result.score} out of ${result.total} (${result.percent}%).`,
    `${result.score} right, ${wrong} wrong, ${result.unanswered} not answered.`,
  ];
  if (result.review.length === 0) {
    lines.push('', 'Every answer is right. Well done!');
  } else {
    lines.push('', `${result.review.length} to review:`);
    for (const item of result.review) {
      lines.push(
        '',
        `${item.number}. ${item.question}`,
        `Your answer: ${item.yourAnswer ?? 'Not answered'}`,
        `Correct answer: ${item.correctAnswer}`,
        `Why: ${item.explanation}`,
      );
    }
  }
  return lines.join('\n');
}

/**
 * Template variables sent to EmailJS. The template itself (subject, layout) is configured
 * in the EmailJS dashboard, not here; `message` carries the whole reviewable body as text.
 * @param {Quiz} quiz
 * @param {Taker} taker
 * @param {Result} result
 */
export function resultEmailParams(quiz, taker, result) {
  return {
    to_email: taker.email,
    to_name: taker.name,
    quiz_title: quiz.title,
    score: result.score,
    total: result.total,
    percent: result.percent,
    message: resultEmailBody(quiz, taker, result),
  };
}
