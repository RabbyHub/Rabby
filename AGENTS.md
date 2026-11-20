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


## Styling Conventions

New UI code follows these rules; `yarn check:style` (run in CI) fails if a legacy approach grows.

- Style components with Tailwind. Colors come only from the theme classes (`text-r-*`, `bg-r-*`, `border-r-*`, `*-rb-*`), which switch with dark mode.
- Rabby's Tailwind scale is not the default one: `p-16` is 16px, spacing only has the keys in the `@theme` block of `src/ui/style/tailwind.css` (use `p-[22px]` otherwise), and `sm` means `max-width: 600px`. Classes copied from docs or other projects will be the wrong size.
- Do not add `styled-components`, `createGlobalStyle` or new `.less` files.
- Overrides of antd internals: component-scoped ones go in a co-located `.module.css` (`.root :global(.ant-select-selector) { ... }`); app-wide ones go in `src/ui/style/antd-overwrite.less`. In `.module.css`, use `var(--r-*)` and plain CSS, never `@apply`.
- Cascade layers decide who wins, not `!important`: antd and all Less/CSS (including `.module.css`) are wrapped in `@layer legacy` at build time, which sits below Tailwind's `utilities`. A Tailwind class beats any legacy rule regardless of specificity; an inline style beats a Tailwind class. Do not add `!important` to Less/CSS: a legacy `!important` beats every Tailwind class, even `!`-prefixed ones.
- Values only known at runtime: pass a CSS variable through `style` and read it from a class (`w-(--w)`). Never set the same property both inline and with a Tailwind class.
- Merge class names with `cn()` from `@/ui/utils/cn` whenever a caller may override a component's classes; `clsx` alone does not resolve conflicts. New custom font sizes or weights in that `@theme` block must also be registered in `cn.ts`.
- Do not build Tailwind class names from strings (`` `bg-${color}` ``); the build cannot see them.
