---
name: rabby-security-review
description: Hunt architectural, lifecycle, and state-confusion security bugs in Rabby that diff-scoped review misses — consent surviving session boundaries, cross-context message confusion, fail-open guards, and unsafe state across restarts. Use for any security audit of the Rabby codebase, especially non-PR-scoped or release-time audits.
metadata:
  short-description: Rabby architectural security audit
---

# Rabby Security Review (Architectural)

PR-scoped review catches issues introduced by a diff. This skill hunts the
other class: pre-existing flaws that emerge from the *composition* of
background services, the event bus, multiple UI contexts, and persisted
state. Load the invariants in `AGENTS.md` ("Wallet Security Invariants")
first — most checks below falsify one of them.

**The techniques below are the durable part of this skill. The file and API
lists are examples that rot as the code changes — always re-derive the audit
surface (Step 0) instead of trusting the lists.**

## Step 0: Derive the privileged-sink inventory

A *sink* is any operation that moves value, reveals secrets, or changes
security state. A *source* is anything an attacker can influence (dApp
requests, page messages, remote API data, stored data written by older
versions). Enumerate sinks by category — grep for the operations, don't
rely on memory:

- **Signing & sending**: `keyringService.sign*`, transaction broadcast,
  permit/typed-data paths
- **Secrets**: key/seed export, mnemonic reveal, vault decrypt, password or
  biometric verification
- **Authority changes**: permission/session grants, connect, chain & account
  switch, whitelist/allowlist mutations
- **Security-relevant state that can go stale**: approval queue, in-memory
  singletons, `storage.session`, page-state caches, simulation results,
  pending defer/promise callbacks

Every technique below is applied to *this inventory*, not to a fixed file
list.

## Techniques

Each technique: the generic question, then how to instantiate it here.

### 1. Outlier-caller analysis

*Generic:* when an API has an optional guard parameter, the guard is opt-in
and someone will forget it. Enumerate ALL callers, compare argument lists,
and investigate every caller that skips the guard — one omission among many
compliant callers is a finding, not a style choice.

*Instantiate:* find guarded APIs by grepping for security checks behind
optional parameters (pattern: `if (param && param !== ...) return`).
Example: `notificationService.resolveApproval`'s `approvalId` guard —
`grep -rn "resolveApproval(" src/ui` and compare.

### 2. Lifecycle / session-boundary audit

*Generic:* enumerate every event that changes the identity or trust context,
then check what in-flight state survives it that shouldn't. State tied to an
authentication context must not outlive that context.

*Boundaries to enumerate here:* lock, unlock, account switch, chain switch,
dApp disconnect, wallet reset, extension update, and **MV3 service-worker
suspend/restart** (in-memory state vanishes; persisted state survives —
check both directions). For each boundary, grep for its event/broadcast and
list every subscriber and every piece of state it does NOT touch.
Cross-check for consistency: if boundary A wipes a queue and the strictly
stronger boundary B doesn't, the inconsistency itself is the lead.

### 3. Fail-open path walk

*Generic:* wherever the result of a security decision is optional or
nullable downstream, walk the `undefined` path to the sink. `?.` on a
security artifact is a smell; "safe because it crashes" is fragile, not
fail-closed — a later defensive refactor (`?.` added "for safety") turns it
exploitable. Fail-closed must be by construction.

*Instantiate:* take each sink from Step 0, find where its consent/validation
input arrives, and ask: "if this were `undefined`/`null`, does the operation
still proceed?" Example pattern: `approvalRes?.extra` feeding a signing call.

### 4. Cross-context message and broadcast audit

*Generic:* a broadcast reaches more listeners than the sender intends, and
every listener assumes the event is about *its* context. For each bus
event / port message: enumerate listeners per context (popup, notification
window, tab, desktop, content script, dApp page) and ask whether an action
in one context can be consumed as consent or state change in another. On
direct messages, check origin/sender validation.

*Instantiate:* `eventBus.emit(EVENTS.broadcastToUI, ...)` reaches every UI
surface — grep `useEventBusListener` / `addEventListener` per event and map
which window types mount each listener. Also audit
page-provider ↔ content-script ↔ background port boundaries.

### 5. Consent and intent binding (WYSIWYG-sign)

*Generic:* for every privileged sink, trace backward to the exact user
gesture that authorizes it and ask three questions: (a) is the gesture
bound to *this specific* request (by id/component), or does it resolve
whatever happens to be pending? (b) can the gesture be satisfied by an
unrelated action — unlocking, connecting, switching accounts, or just
waiting? (c) does what the user sees match what gets signed (payload,
origin, chain, account — no swap between render and sign)?

*Also check the getaway:* flows that resolve a request and then close the
window or clear the screen leave no evidence — self-closing UI after a
resolve deserves scrutiny.

### 6. Safe-by-accident detection

*Generic:* when reviewing why a scary path is NOT exploitable, name the
mechanism. If the answer is "it happens to throw", "the timing works out",
or "that flag is currently always set", mark it as fragile even when not
exploitable today — refactors break incidental safety first.

## Hotspots (examples, re-derive per Step 0)

Organized by subsystem; extend when new subsystems appear:

- **Consent & approval**: `background/service/notification.ts`,
  `controller/provider/rpcFlow.ts`, `ui/views/Approval/**`,
  `ui/views/Unlock`, `ui/views/SortHat.tsx`
- **Signing & tx pipeline**: `controller/provider/controller.ts`,
  transaction build/simulation/broadcast services
- **Secrets & vault**: `service/keyring/index.ts`, password/biometric utils
- **Permissions & sessions**: permission service, `sessionService`,
  dApp connection management
- **Message bridge**: `content-script/*`, inpage provider,
  `utils/message/*`, `background/index.ts` broadcast wiring
- **Persistence & caches**: `service/preference.ts`, `storage.session`
  usage, page-state cache, auto-lock service

## Rules

- Verify every claim against the actual code before reporting; cite file:line.
- A finding needs a reachable path from an attacker-controllable action to
  the sink — describe the trigger, not just the code smell.
- Never assume a screen the user didn't see counts as confirmation. Always
  ask: which rendered UI did the user confirm, and is the resolve bound to
  that exact request?
- When you find a guard that is opt-in, check every caller — the bug is
  usually the caller, not the guard.
- Timing-dependent findings need a quantified window: estimate each step's
  cost (message round-trips, scheduled `setTimeout`s, renders, unmounts)
  against the trigger's realistic interval (a human double-click is
  ~100–300 ms; a `setTimeout(0)` navigation unmounts within ~10–30 ms).
  A mechanism whose race window a human cannot hit is a hygiene issue,
  not a High — severity follows the window, not the mechanism.
