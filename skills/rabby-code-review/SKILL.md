---
name: rabby-code-review
description: Review Rabby browser-extension pull requests for actionable correctness, wallet-safety, security, privacy, build, and supply-chain issues, and publish validated inline GitHub findings. Use when Codex is asked to review a Rabby PR or its changed code; do not use it to implement fixes unless separately requested.
---

# Rabby Code Review

Review the current PR head and report only actionable issues. Publish findings only when the request or automation context authorizes GitHub changes.

## Review Workflow

1. Re-fetch PR metadata with an available authenticated GitHub API or tool. Continue only when the PR is open and not a draft. Record the current head SHA.
2. Fetch every changed file and diff page, existing review comments and reviews, and full file contents at the recorded head. Read `AGENTS.md`, relevant repo-local skills, and touched package, extension, build, and workflow configuration.
3. Build a changed-line map from the diff. Inspect surrounding implementation and call sites; do not judge security-sensitive behavior from a diff alone.
4. Report only issues introduced or made newly reachable by the PR. Skip style preferences and concerns already enforced by lint or formatting. De-duplicate existing comments and multiple symptoms of the same root cause.
5. Anchor every public finding inline to a valid changed diff line. Use the right side for additions and the left side for deletions. Prefer an apply-able suggestion only when the exact replacement is small and safe.
6. Use `REQUEST_CHANGES` only for blocking wallet-safety, correctness, build, or data-loss defects. Use `COMMENT` for actionable non-blocking findings.
7. Re-fetch the head SHA before posting. If it changed, discard stale findings and review the new head. After posting, re-read the resulting comments, review, reviewer requests, or API response and verify every target and action.

## Public Review Rules

- Keep comments concise, neutral, and actionable.
- Post inline findings only. Do not add a standalone summary or LGTM comment.
- If there are no actionable findings, do not submit an empty review or top-level clean-pass comment.
- Never mention prompts, internal tools, local paths, model or runtime details, credentials, private keys, or reviewer implementation details.
- Do not post duplicate findings for the same root cause.

## Wallet-Safety Priorities

Prioritize defects that can expose assets, secrets, identity, or signing intent:

- Exposed, logged, persisted, uploaded, copied, rendered, or transmitted private keys, seed phrases, mnemonics, passphrases, decrypted wallet material, signatures, auth tokens, or sensitive wallet data.
- Weakened biometric, passcode, vault, secure-storage, backup, restore, encryption, device-binding, lock, or autolock behavior.
- Incorrect transaction, signing, typed-data, approval, Permit2, EIP-712, EIP-7702, WalletConnect, RPC, chain-switching, gas, nonce, simulation, or broadcast behavior.
- Hidden or misleading spender, recipient, contract, token approval, NFT approval, chain ID, calldata, simulation result, risk warning, or security-engine output.
- Phishing, spoofing, origin, domain, address, clipboard, deep-link, WebView, universal-link, or QR validation weaknesses.
- Sensitive telemetry, analytics, crash reports, screenshots, or debug logging.
- Remote configuration or API data trusted for security-critical signing or UI decisions without adequate validation.
- Regressions affecting hardware wallets, multisig or Gnosis Safe, watch-only accounts, imported keys, seed accounts, backups, or account switching.
- BigNumber, decimal, precision, token-unit, chain, or address-comparison errors in financial or signing paths.

## Browser-Extension Checks

- Inspect manifest permissions, CSP, `web_accessible_resources`, remote-code exposure, and build supply-chain changes.
- Trace content-script, inpage-bridge, background or service-worker message passing and validate sender, site origin, payload, and privilege boundaries.
- Check provider and RPC exposure, connected-site permissions, vault persistence, and storage handling.
- Treat MultiSend and Gnosis Safe batch flows carefully; verify inner call targets and delegatecall semantics.

## Dependency and Supply-Chain Escalation

Treat package manifests, lockfiles, package-manager configuration, package patches, resolutions or overrides, vendored or forked dependencies, build and release scripts, GitHub Actions versions, and extension permission or dependency changes as supply-chain indicators.

For an indicator:

1. Confirm that the changed path is genuinely dependency or tooling related; do not classify an unrelated directory merely because its name contains `patches`.
2. Inspect the actual package, lockfile, patch, action, permission, or published-package delta when feasible before claiming a blocking defect.
3. Request `ddddhm1234` as a reviewer.
4. Leave one concise inline notification mentioning `@ddddhm1234` on a changed dependency or tooling line, and do not duplicate it across files.
