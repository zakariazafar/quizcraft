// @ts-check
/**
 * Pure helpers behind scripts/check-changelog.mjs.
 * Rule (CLAUDE.md): every non-merge commit that changes files must also change CHANGELOG.md,
 * and CHANGELOG.md must use "## YYYY-MM-DD" headings, newest first.
 */

export const CHANGELOG_FILE = 'CHANGELOG.md';

/**
 * @typedef {{ sha: string, parents: string[], files: string[] }} Commit
 */

/**
 * Parse output of: git log --format=%x00%H %P --name-only <range>
 * @param {string} output
 * @returns {Commit[]}
 */
export function parseGitLog(output) {
  return output
    .split('\0')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [header, ...rest] = chunk.split('\n');
      const [sha, ...parents] = header.trim().split(/\s+/);
      const files = rest.map((l) => l.trim()).filter(Boolean);
      return { sha, parents, files };
    });
}

/**
 * @param {Commit[]} commits
 * @returns {Commit[]} commits that break the rule
 */
export function findCommitsMissingChangelog(commits) {
  return commits.filter(
    (c) => c.parents.length <= 1 && c.files.length > 0 && !c.files.includes(CHANGELOG_FILE),
  );
}

/**
 * Validate CHANGELOG.md structure.
 * @param {string} text
 * @returns {string[]} problems (empty when valid)
 */
export function validateChangelog(text) {
  const problems = [];
  if (!/^# Changelog\b/m.test(text)) problems.push('Missing "# Changelog" title.');
  const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  if (headings.length === 0) problems.push('No "## YYYY-MM-DD" date sections found.');
  const dates = [];
  for (const h of headings) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h) || Number.isNaN(Date.parse(h))) {
      problems.push(`Heading "## ${h}" is not a valid YYYY-MM-DD date.`);
    } else {
      dates.push(h);
    }
  }
  if (new Set(dates).size !== dates.length) problems.push('A date section appears more than once.');
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] > dates[i - 1]) {
      problems.push(`Dates must be newest first: ${dates[i]} comes after ${dates[i - 1]}.`);
    }
  }
  return problems;
}

/**
 * Normalise a CI-provided range. An all-zero "before" sha (first push) means "check everything".
 * @param {string | undefined} range
 * @returns {string}
 */
export function normaliseRange(range) {
  if (!range) return 'origin/main..HEAD';
  const [from, to] = range.split('..');
  if (to !== undefined && /^0+$/.test(from)) return to || 'HEAD';
  return range;
}
