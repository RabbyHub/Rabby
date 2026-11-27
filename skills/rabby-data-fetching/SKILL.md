---
name: rabby-data-fetching
description: Fetch, cache and refresh server data in the Rabby UI with TanStack Query (useQuery plus the resource modules in src/ui/query) instead of useEffect + setState, ahooks useRequest, or react-use useAsync. Use when adding or changing a data request in UI code, migrating an existing request hook, fixing a stale-response race, or deciding whether data belongs in Query, a background-synced store, or neither.
metadata:
  short-description: Rabby server-state fetching with TanStack Query
---

# Rabby Data Fetching

New server reads in the UI go through TanStack Query. Query stores each response under the key built from its inputs, so a slow response for an earlier input cannot overwrite the result for the current one.

- **Hand-written effects that `await` and then `setState` have exactly that race**, unless they add a `cancelled` flag, an `AbortController` or a request id.
- **ahooks `useRequest` and react-use `useAsync` already drop late results.** But each call keeps its own private cache and loading state. Query gives one shared cache per window, keys that carry account and chain identity, and one way to refetch and invalidate.

This skill is the policy for the query layer in `src/ui/query` (`queryClient.ts`, `queryKey.ts`, `resources/`).

## 1. Decide Whether Query Fits

Query owns only refetchable server state read by one UI window. UI-only client state stays in component state or Rematch/Zustand. Background services stay authoritative for wallet state.

Use Query for refetchable data a UI window reads: OpenAPI and RPC reads through `wallet`, and browser APIs such as `browser.action.getUserSettings`. Existing queries cover token info, token price and gas market (shared resources), plus extension version info and toolbar pin state (inline).

Do not use Query for:

- **Approval, signing, unlock, permission, or transaction-submission workflows.** Neither Query nor Mutation state may drive them.
  - The one precedent is the current-chain lookup in `src/ui/views/Approval/components/SignTypedData.tsx`. It is a read-only context lookup. Its key includes `approvalId`, and it sets `gcTime: 0`, `staleTime: 0`, `refetchOnMount: 'always'`, `retry: false` and `networkMode: 'always'`. The approval treats pending and error as not ready.
  - Any new Query use in these areas needs `skills/rabby-security-review/SKILL.md` and the invariants in `AGENTS.md`.
  - New reads in these flows use the existing patterns instead; see Guardrails.
- **Background-authoritative wallet state** such as accounts, preferences, keyrings and whitelists. Use a background-synced store instead; see `skills/rabby-create-store/SKILL.md`.
- **Dexie-managed data.** Do not mirror it into Query just to add a cache layer.
- **Subscriptions and event streams.** Use `useSyncExternalStore`, or an effect that cleans up its listener.
- **Code rendered outside the app root.**
  - `QueryClientProvider` wraps only the root in `src/ui/app.tsx`.
  - Components mounted by `wrapModalPromise` (`src/ui/component/Modal/WrapPromise.tsx`) or `Popup.open` (`src/ui/component/Popup/index.tsx`) render into their own React roots without a provider, so `useQuery` throws "No QueryClient set" there. Either wrap that root with `<QueryClientProvider client={queryClient}>` (import `queryClient` from `@/ui/query`) in the same change, or do not use Query in that component.
  - `src/content-script/**` runs in the page and has no query client at all.

## 2. Pick the Lightest Shape

Choose the first shape that covers the use:

1. **A single OpenAPI read, from any number of components: use `openapiQueryOptions`** from `@/ui/query/openapiQuery`. No resource file is needed.

   ```ts
   const { data } = useQuery({
     ...openapiQueryOptions('getToken', [address, chainServerId, tokenId], {
       address,
       chainId: chainServerId,
     }),
     enabled: Boolean(address && chainServerId && tokenId),
     select: (token) => token.logo_url,
     staleTime: 10_000,
   });
   ```

   - **The key is built from the method name and arguments.** EVM addresses in the arguments are lower-cased in the key only; the request still gets the originals. Every caller with the same method and arguments shares one cache entry.
   - **`queryFn` returns the raw response.** Shape the data with `select`, never by wrapping `queryFn`, so the shared entry keeps one shape.
   - **Pass `scope` (the third argument) when the cache must be invalidated per account or chain.** Positional arguments cannot be matched by name. Invalidation filters: `['rabby', 'openapi', { address }]` for one account, `['rabby', 'openapi', {}, { method: 'getToken' }]` for one method, `['rabby', 'openapi']` for everything (for example after the OpenAPI host changes, since the host is not in the key).
   - **The types accept only methods that resolve to data.** Client setters and `void` writes are rejected, and the arguments are checked against the method. A write that returns data still type-checks, so never pass one.
   - **Use it only for HTTP reads.** Wallet controller methods such as `gasMarketV2` depend on background state (custom RPC, testnet) and need their own resource or inline query.

2. **Anything else read by one component, with nothing prefetching or invalidating it: call `useQuery` inline.** Typical cases are a browser API or a wallet controller method. The key still comes from `createQueryKey`. See `src/ui/views/NewUserImport/PinGuideTips.tsx`.

   ```ts
   const { data: isPinned } = useQuery({
     queryKey: createQueryKey('actionUserSettings'),
     queryFn: () =>
       browser.action.getUserSettings().then((s) => !!s.isOnToolbar),
   });
   ```

3. **Several places share logic beyond one OpenAPI call (combining calls, or choosing a method by chain), or code prefetches, invalidates or calls `getQueryData` / `setQueryData` on it: export a resource** from `src/ui/query/resources/<name>.ts`. A resource is a key builder plus a `queryOptions` factory. Because `queryOptions` tags the key with the data type, `getQueryData(tokenPriceQueryKey(id))` is typed too.

   ```ts
   import { queryOptions } from '@tanstack/react-query';
   import { wallet } from '@/ui/wallet';
   import { createQueryKey } from '../queryKey';

   export const tokenPriceQueryKey = (tokenId: string) =>
     createQueryKey('tokenPrice', {}, { tokenId });

   export const tokenPriceQueryOptions = (tokenId: string) =>
     queryOptions({
       queryKey: tokenPriceQueryKey(tokenId),
       queryFn: async () => {
         const { change_percent = 0, last_price = 0 } =
           await wallet.openapi.tokenPrice(tokenId);
         return { currentPrice: last_price, percentage: change_percent };
       },
       enabled: Boolean(tokenId),
       staleTime: 5_000,
     });
   ```

4. **Add a hook only when it adds logic** on top of the options, such as an extra `enabled` condition (`src/ui/hooks/useTokenInfo.ts`), a `select`, or combining several queries. A hook that only returns `useQuery(xQueryOptions(...))` adds nothing; call `useQuery` with the options directly.

Promote a shape when a second use appears, not in advance.

Resources import the UI `wallet` singleton from `@/ui/wallet`. Do not take `wallet` as a parameter: `useWallet()` returns that same object, which `app.tsx` passes to the only `WalletProvider`. Tests replace it with `jest.mock('@/ui/wallet', ...)`; see `__tests__/ui/queryClient.test.ts`.

Rules:

- **Build every key with `createQueryKey(resourceName, scope, params)`.**
  - Pass account, chain or server id, testnet mode and currency through `scope`. It normalizes address and currency casing, and switching account or chain then selects a different cache entry.
  - Put every other input that can change the response in `params`.
- **The `queryFn` reads only values that are in the key.** A value it closes over without putting it in the key serves stale data when that value changes.
- **Guard missing inputs with `enabled`, and still fail inside `queryFn`.** Throw as `resources/token.ts` does, or use `skipToken`, so a forced `refetch()` cannot request with missing inputs.
- **Set `staleTime` per resource.**
  - The global defaults are `staleTime: 0`, `gcTime` 5 minutes, `retry: false`, and no refetch on window focus or reconnect. Do not change them for one resource.
  - The cache is memory-only and local to one extension window. Adding persistence or cross-window broadcasting needs a separate security review (`skills/rabby-security-review/SKILL.md`).
- **`queryFn` must be safe to run again.** A user-triggered `refetch()` may repeat it.
- **Keep query-client operations out of components.** A resource that needs invalidation exports a helper, such as `invalidateTokenPrice(queryClient, tokenId)`, built from its own key builder.

## 3. Use It in Components

```ts
const { data, isPending, isFetching, isError, refetch } = useQuery(
  tokenPriceQueryOptions(tokenId)
);
```

- **Add per-use options by spreading**, as in `useQuery({ ...tokenQueryOptions(params), enabled: ready })`. Keep the resource itself free of per-caller options.
- **`isPending` means there is no data yet; `isFetching` means a request is in flight**, including background refetches. Show skeletons on `isPending`.
- **Debounce the input, not the request.** Pass the input through `useDebouncedValue` (`src/ui/hooks/useDebounceValue.ts`) and build the key from the debounced value.
- **Use `placeholderData: keepPreviousData` to keep the previous result visible while the key changes**, for example when paging or switching filters.
- **Never copy `data` into `useState`.** Derive values from it during render.
- **`useQuery` has no `onSuccess` or `onError` callbacks in v5.** Derive from `data` and `error` instead, or handle the outcome in the event handler that started the action.

## 4. Migrate an Existing Request

Migrate only the requests in files you are already changing, and never in approval, signing, unlock or permission flows (section 1). Keep behaviour the same: loading UI, error handling, and when the request fires.

| Existing | TanStack Query |
| --- | --- |
| `useEffect` + `await` / `.then` + `setState` | `useQuery` with the effect's dependencies in the key |
| `useAsync(fn, deps)` (react-use) | `useQuery`, with `deps` in the key |
| `useRequest(fn, { refreshDeps })` (ahooks) | `useQuery`, with `refreshDeps` in the key |
| any of the above wrapping a single `wallet.openapi.x(...args)` call | `useQuery(openapiQueryOptions('x', args))`, with any post-processing moved to `select` |
| `ready` | `enabled` |
| `loading` | `isPending` for first load, `isFetching` for any request in flight |
| `refresh()` / `retry()` | `refetch()` |
| `cacheKey` | the query key |
| `pollingInterval` | `refetchInterval` |
| `debounceWait` | `useDebouncedValue` on the input |
| `onSuccess` | derive from `data`, or handle in the triggering event handler |
| `useRequest(fn, { manual: true })` used to submit something | not a read. See section 5 |

## 5. Writes

- **Keep signing, approval and transaction-submission writes in their existing flows.** They do not use Query or Mutation state.
- **Other server writes may use `useMutation`.** On success, call the invalidation helper of each resource the write changes. Automatic mutation retries are disabled globally, and they must stay off for writes that are not idempotent.
- **The repo has no `useMutation` callers yet.** The first one should follow the boundaries in section 1 and be reviewed as such.

## 6. Verify

1. Run `npx eslint <changed files>`. The repo's `react-hooks` and `react-you-might-not-need-an-effect` warnings in the touched files should go down, not up.
2. Run `yarn typecheck`.
3. Add or extend a test under `__tests__/ui/*.test.ts`:
   - Use a fresh `createQueryClient()` per test, rendered inside `QueryClientProvider`. See `__tests__/ui/extensionVersionInfoQuery.test.ts`.
   - Assert key identity: changing the account, chain or currency must produce a different key. See `__tests__/ui/queryClient.test.ts`.
   - When the change fixes a race, assert that a late response for the old input never shows for the new one.
4. Before committing, follow `skills/rabby-yarn-v4-commit-check/SKILL.md`.

## Guardrails

- For new server reads, prefer `useQuery` (or `openapiQueryOptions`) over `useEffect` + `setState`, ahooks `useRequest`, or react-use `useAsync`. Reviewers check this; CI does not. If an effect that fetches is still the right tool, guard it against late responses with a `cancelled` flag, an `AbortController` or a request id.
- In approval, signing, unlock and permission flows, where Query is not allowed (section 1), new reads keep the existing patterns: `useRequest`, `useAsync`, or an effect with that guard. Review them with `skills/rabby-security-review/SKILL.md`.
- Do not put a response-changing input anywhere except the key.
- Do not reshape data inside an `openapiQueryOptions` query; use `select`, because every caller of that method and arguments shares the entry.
- Do not use Query in approval, signing, unlock or permission flows without a security review.
- Do not call `useQuery` in a component that can mount outside the app's `QueryClientProvider`.
- Do not change the global `QueryClient` defaults for one resource; override them on that resource.
- Do not persist the query cache or share it across windows without a security review.
