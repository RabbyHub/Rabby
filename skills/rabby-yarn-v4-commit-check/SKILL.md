---
name: rabby-yarn-v4-commit-check
description: Use in the Rabby repository on Yarn v4 branches before creating, amending, merging, or pushing commits. Requires running yarn and yarn check from the repository root before committing, and blocks commits when either command fails.
metadata:
  short-description: Run Rabby Yarn v4 commit checks
---

# Rabby Yarn v4 Commit Check

Use this workflow whenever a task in the Rabby repository will create a commit, amend a commit, create a merge commit, or push a branch that should already include committed work.

## Required Check

Before running `git commit`, `git commit --amend`, or completing a merge commit, run these commands from the repository root:

```bash
yarn
yarn check
```

Treat the sequence as `yarn && yarn check`: only run `yarn check` after `yarn` exits successfully.

## Commit Rules

- Do not commit if `yarn` or `yarn check` exits non-zero.
- If `yarn` changes tracked dependency files, inspect the diff and include only intentional changes.
- If the failure appears unrelated to the current edit, report the exact failing command and the relevant error output before deciding whether to proceed.
- Do not substitute `npm install`, `npm run check`, `yarn lint`, or `yarn typecheck` for the required sequence unless the user explicitly redirects the workflow.
- After committing or pushing, report the commit hash and the validation commands that passed.

