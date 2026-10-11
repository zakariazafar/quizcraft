// @ts-check
/** Public quiz links and copying them. */

/**
 * @param {string} siteUrl VITE_SITE_URL (may be empty)
 * @param {string} origin location.origin fallback
 * @param {string} quizId
 */
export function quizUrl(siteUrl, origin, quizId) {
  const base = (siteUrl || origin).replace(/\/+$/, '');
  return `${base}/q/${encodeURIComponent(quizId)}`;
}

/**
 * Copy text with the Clipboard API.
 * @param {string} text
 * @param {{ writeText: (t: string) => Promise<void> } | undefined} clipboard
 * @returns {Promise<'copied' | 'manual'>} 'manual' when the browser refuses (show the link instead)
 */
export async function copyText(text, clipboard) {
  try {
    if (!clipboard) return 'manual';
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
