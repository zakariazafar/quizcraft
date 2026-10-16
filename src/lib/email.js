// @ts-check
/** Pure formatting of a result email's content. No network, no DOM. */

/**
 * @typedef {import('./validate.js').Quiz} Quiz
 * @typedef {{ name: string, email: string }} Taker
 * @typedef {ReturnType<typeof import('./scoring.js').scoreQuiz>} Result
 */

/**
 * Plain-text body: a greeting, the score line, then every question with the answer given,
 * the correct answer, and (for a mistake) why. Works for any number of questions, since
 * EmailJS templates can't loop over a dynamic list themselves — this builds the whole
 * thing as one text field.
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
    '',
    result.review.length === 0
      ? 'Every answer is right. Well done!'
      : `${result.review.length} to review below.`,
    '',
    'Your answers:',
  ];
  quiz.questions.forEach((q, i) => {
    const answer = result.answers[i];
    const chosen = q.options.find((o) => o.id === answer.selected);
    const correctOption = /** @type {{ text: string }} */ (
      q.options.find((o) => o.id === q.correct)
    );
    lines.push(
      '',
      `${i + 1}. ${q.text}`,
      `Your answer: ${chosen ? chosen.text : 'Not answered'} (${answer.correct ? 'correct' : 'incorrect'})`,
      `Correct answer: ${correctOption.text}`,
    );
    if (!answer.correct) lines.push(`Why: ${q.explanation}`);
  });
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
