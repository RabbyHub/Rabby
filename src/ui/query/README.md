# Rabby UI Query Layer

TanStack Query manages only refetchable server state owned by a Rabby UI
context. Rematch/Zustand remain responsible for client state, and background
services remain authoritative for wallet state.

## Resource shape

Following Rainbow's resource-module pattern, each resource should export its
query key and query options before exposing a React hook. Components must not
assemble raw keys or call `queryClient` with duplicated key logic.

Every value that can change a response belongs in the key. Use
`createQueryKey` for the relevant address, chain/server id, testnet mode, and
currency, followed by resource-specific parameters.

## Wallet boundaries

- Do not use Query or Mutation state for approval, signing, unlock, permission,
  or transaction-submission workflows.
- Do not mirror background-authoritative or Dexie-managed data into Query just
  to add another cache layer.
- The cache is memory-only and local to one UI window. Persistence and
  cross-window broadcasting require a separate security review.
- Account- and chain-specific resources must include those identities in their
  query keys so switching context selects a different cache entry.
- Query functions must be safe to retry manually, even though automatic query
  and mutation retries are disabled globally.
