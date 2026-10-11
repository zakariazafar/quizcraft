import { describe, expect, it } from 'vitest';
import {
  findCommitsMissingChangelog,
  normaliseRange,
  parseGitLog,
  validateChangelog,
} from '../../scripts/lib/changelog.js';

const log =
  '\0aaa111 p1\n\nsrc/a.js\nCHANGELOG.md\n' +
  '\0bbb222 p2\n\nsrc/b.js\n' +
  '\0ccc333 p3 p4\n\nsrc/c.js\n' +
  '\0ddd444 p5\n';

describe('parseGitLog', () => {
  it('parses sha, parents and files', () => {
    const commits = parseGitLog(log);
    expect(commits).toHaveLength(4);
    expect(commits[0]).toEqual({
      sha: 'aaa111',
      parents: ['p1'],
      files: ['src/a.js', 'CHANGELOG.md'],
    });
    expect(commits[2].parents).toEqual(['p3', 'p4']);
    expect(commits[3].files).toEqual([]);
  });

  it('returns nothing for empty output', () => {
    expect(parseGitLog('')).toEqual([]);
  });
});

describe('findCommitsMissingChangelog', () => {
  it('flags only non-merge commits with files but no CHANGELOG change', () => {
    const missing = findCommitsMissingChangelog(parseGitLog(log));
    expect(missing.map((c) => c.sha)).toEqual(['bbb222']);
  });
});

describe('validateChangelog', () => {
  const good = '# Changelog\n\n## 2026-10-12\n- feat: b\n\n## 2026-10-11\n- docs: a\n';

  it('accepts a valid changelog', () => {
    expect(validateChangelog(good)).toEqual([]);
  });

  it('accepts Arabic text in bullets', () => {
    expect(validateChangelog(good + '- quiz: إضافة اختبار التجويد\n')).toEqual([]);
  });

  it('requires the title', () => {
    expect(validateChangelog('## 2026-10-11\n- x\n')).toContain('Missing "# Changelog" title.');
  });

  it('requires at least one date section', () => {
    expect(validateChangelog('# Changelog\n')).toContain('No "## YYYY-MM-DD" date sections found.');
  });

  it('rejects headings that are not dates', () => {
    const problems = validateChangelog('# Changelog\n## Unreleased\n- x\n');
    expect(problems[0]).toMatch(/not a valid YYYY-MM-DD/);
  });

  it('rejects impossible dates', () => {
    expect(validateChangelog('# Changelog\n## 2026-13-45\n')[0]).toMatch(/not a valid/);
  });

  it('rejects dates in the wrong order', () => {
    const problems = validateChangelog('# Changelog\n## 2026-10-11\n## 2026-10-12\n');
    expect(problems.join()).toMatch(/newest first/);
  });

  it('rejects duplicate dates', () => {
    const problems = validateChangelog('# Changelog\n## 2026-10-11\n## 2026-10-11\n');
    expect(problems.join()).toMatch(/more than once/);
  });
});

describe('normaliseRange', () => {
  it('defaults to origin/main..HEAD', () => {
    expect(normaliseRange(undefined)).toBe('origin/main..HEAD');
  });
  it('keeps a normal range', () => {
    expect(normaliseRange('abc..def')).toBe('abc..def');
  });
  it('checks all history on a first push (zero sha)', () => {
    expect(normaliseRange('0000000000..def')).toBe('def');
    expect(normaliseRange('0000..')).toBe('HEAD');
  });
});
