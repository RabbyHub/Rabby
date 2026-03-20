# PR Review Command (Codex)

Perform a PR review using two perspectives:
1. Code reviewer perspective (correctness/maintainability/regression)
2. Security reviewer perspective (exploitability/fund safety)

Use these internal standards:
- `.codex/agents/code-reviewer.md`
- `.codex/agents/security-reviewer.md`

Review only the changes introduced by this PR.
Assume workflow checked out `refs/pull/<number>/merge`, so use the merge-commit parents to scope changes:
- `HEAD^1`: base side
- `HEAD^2`: PR head side
- Preferred diff command: `git diff --name-status HEAD^1...HEAD^2`

## Process
1. Inspect the PR diff and relevant surrounding code.
2. Identify only noteworthy issues.
3. Remove duplicate/low-signal feedback.
4. Keep comments concise and actionable.

## Commenting Rules
- Use inline comments for specific line-level issues.
- Use one top-level summary comment for cross-cutting concerns.
- Avoid noise and avoid speculative findings without evidence.
- Inline comments must target changed lines on the PR head side (RIGHT).

## Output Format (MUST be JSON only)
Return valid JSON only (no markdown, no code fences), following this shape:

{
  "summary": "short summary for top-level PR comment",
  "comments": [
    {
      "path": "relative/file/path.ts",
      "line": 123,
      "body": "inline review comment text",
      "severity": "high"
    }
  ]
}

Rules:
- `path` must be repository-relative and match a file changed in this PR.
- `line` must be the new-file line number on the RIGHT side of the diff.
- `body` should be concise and actionable.
- Emit only noteworthy issues. If no issues, return an empty `comments` array and explain in `summary`.
