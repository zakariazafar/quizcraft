// @ts-check
// Finds things in built HTML that the Content-Security-Policy would block.

/**
 * @param {string} html
 * @returns {string[]} problems
 */
export function findCspProblems(html) {
  const problems = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(m[1]) && m[2].trim()) problems.push('inline <script> block');
  }
  if (/<style\b/i.test(html)) problems.push('inline <style> block');
  if (/<[a-z][^>]*\sstyle\s*=/i.test(html)) problems.push('inline style="" attribute');
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) problems.push('inline event handler (on…="")');
  if (/(src|href)\s*=\s*["']javascript:/i.test(html)) problems.push('javascript: URL');
  return problems;
}
