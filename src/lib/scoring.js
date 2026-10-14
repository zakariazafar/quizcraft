// @ts-check
/** Pure scoring. Answers map question id → selected option id (or null / missing). */

/**
 * @typedef {import('./validate.js').Quiz} Quiz
 * @typedef {{ questionId: string, selected: string | null, correct: boolean }} AnswerRecord
 * @typedef {{ questionId: string, number: number, question: string, yourAnswer: string | null,
 *   correctAnswer: string, explanation: string }} ReviewItem
 */

/**
 * @param {Quiz} quiz
 * @param {Record<string, string | null | undefined>} answers
 * @returns {{ score: number, total: number, percent: number, answers: AnswerRecord[],
 *   review: ReviewItem[], unanswered: number }}
 */
export function scoreQuiz(quiz, answers) {
  /** @type {AnswerRecord[]} */
  const records = [];
  /** @type {ReviewItem[]} */
  const review = [];
  let score = 0;
  let unanswered = 0;
  quiz.questions.forEach((q, i) => {
    const raw = answers[q.id];
    const chosen = q.options.find((o) => o.id === raw) ?? null;
    const correctOption = /** @type {{ id: string, text: string }} */ (
      q.options.find((o) => o.id === q.correct)
    );
    const isCorrect = chosen?.id === q.correct;
    if (isCorrect) score += 1;
    if (!chosen) unanswered += 1;
    records.push({ questionId: q.id, selected: chosen ? chosen.id : null, correct: isCorrect });
    if (!isCorrect) {
      review.push({
        questionId: q.id,
        number: i + 1,
        question: q.text,
        yourAnswer: chosen ? chosen.text : null,
        correctAnswer: correctOption.text,
        explanation: q.explanation,
      });
    }
  });
  const total = quiz.questions.length;
  return {
    score,
    total,
    percent: Math.round((score / total) * 100),
    answers: records,
    review,
    unanswered,
  };
}

/**
 * A short line for the result screen, tiered by score. Not used for a perfect score,
 * which gets its own congratulation. Plain wording, no dashes.
 * @param {number} percent
 * @param {number} reviewCount how many questions are listed below to review
 * @returns {string}
 */
export function resultTier(percent, reviewCount) {
  const items = `${reviewCount} question${reviewCount === 1 ? '' : 's'}`;
  if (percent >= 80) return `Well done. Review the ${items} below.`;
  if (percent >= 50) return `Good effort. Review the ${items} below.`;
  return `Keep going. The ${items} below show what to study next.`;
}

/**
 * Ids of questions with no valid answer yet.
 * @param {Quiz} quiz
 * @param {Record<string, string | null | undefined>} answers
 */
export function unansweredQuestions(quiz, answers) {
  return quiz.questions
    .filter((q) => !q.options.some((o) => o.id === answers[q.id]))
    .map((q) => q.id);
}
