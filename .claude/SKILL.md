---
name: rabby-claude-skill-index
description: Entry point for Claude-style agents working in the Rabby repository. Use it to discover shared repo-local skills stored under skills/*/SKILL.md.
metadata:
  short-description: Rabby Claude skill index
---

# Rabby Claude Skill Index

This repository stores shared skills under `skills/*/SKILL.md`.

Before starting a task, inspect the frontmatter and opening section of each matching skill file under `skills/`. Load and follow any skill whose `name` or `description` applies to the task.

Do not add Claude-only copies under `.claude/skills/`. Add new reusable skills under `skills/<skill-name>/SKILL.md` so other agents can use the same instructions.

