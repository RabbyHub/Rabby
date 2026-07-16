# Rabby Agent Entry

This repository keeps shared agent skills in `skills/*/SKILL.md`.

For Codex-style agents, start with `.codex/SKILL.md`. It explains how to discover and load repo-local skills without duplicating skill bodies under `.codex/`.

## Commit Messages

All generated commit messages must follow the Conventional Commits format:

```text
type(scope): description
```

- `type` must be one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`.
- `scope` is optional but recommended when it adds clarity.
- `description` is required and must use the imperative mood, such as `add` instead of `added`.
- Use a body when additional context is useful.
- Use a footer for breaking changes or issue references. Breaking changes may also use `!` before the colon.

Before generating or creating a commit, load and follow `skills/conventional-commit/SKILL.md`.
