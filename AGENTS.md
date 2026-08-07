# Rabby Agent Entry

This repository keeps shared agent skills in `skills/*/SKILL.md`.

For Codex-style agents, start with `.codex/SKILL.md`. It explains how to discover and load repo-local skills without duplicating skill bodies under `.codex/`.

## Wallet Security Invariants

These invariants hold for every change. Reviewers must check them even when a PR does not touch security code directly, and any audit task must load `skills/rabby-security-review/SKILL.md`.

- Consent does not survive re-authentication. Lock, unlock, account switch, and chain switch are session boundaries: any pending approval, signature request, or permission prompt must be rejected or re-confirmed across them. Check what happens to `notificationService.currentApproval` on `lock`.
- `resolveApproval` / `rejectApproval` must always be called with an `approvalId`, and callers must verify `approvalComponent`. A resolve without an id resolves *whatever is pending* — treat any such caller as a finding.
- Signing paths must fail closed: an undefined or mismatched `approvalRes` must reject the request, never sign. `approvalRes?.extra`-style tolerance downstream of an approval is fail-open.
- `broadcastToUI` events reach every window (popup, notification, tab). A listener must not treat a global event (e.g. `UNLOCK_WALLET`) as local user consent for a pending request in its own window.
- Membership in a relaxation whitelist (e.g. `QUEUE_APPROVAL_COMPONENTS_WHITELIST`) means the component can coexist with other queued approvals; every member must be coexistence-safe.

