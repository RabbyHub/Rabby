# Local calldata decoders

`index.ts` dispatches by DEX. Each DEX has its own entry point and ABI definitions.
All versions return the same `DecodeCalldataResult` from `types.ts`.

## Uniswap

- `uni/index.ts`: selects Universal Router / SwapProxy or traditional SwapRouter calls.
- `uni/universalRouter/deployments.ts`: chain and address to deployed Router version, from the official Uniswap SDK. These entries select a decoder and do not change approval whitelists.
- `uni/universalRouter/profiles.ts`: version-specific command masks and V4 parameter versions.
- `uni/universalRouter/commands.ts`: shared swap, payment and sub-plan commands. Router 1.2's Seaport command is never treated as V4.
- `uni/universalRouter/v4/v2_0.ts`: V4 structs without per-hop price fields.
- `uni/universalRouter/v4/v2_1.ts`: V4 structs for Router 2.1.1, 2.1.2 and 2.2.0.
- `uni/swapRouter/`: original V3 SwapRouter, SwapRouter02, traditional V2 swaps and multicalls.

SwapProxy version selection uses the inner `router` argument. Unknown Universal Router addresses fail explicitly instead of guessing a command layout.
`executeSigned` is decoded structurally; this code does not validate signatures or on-chain execution.

## Magpie

- `magpie/routerV2.ts`: `swap(bytes)` and `silentSwap(bytes)`, including the sum of input amount pointers.
- `magpie/routerV3.ts`: `swapWithMagpieSignature(bytes)` and `swapWithUserSignature(bytes)`; the inspected V3_1 deployments share this layout.
- `magpie/dexAggregator.ts`: `swapWithBackendSignature(bytes)`.
- `magpie/packed.ts`: bounded reads of absolute calldata offsets and compact integers.

`CalldataDecodeError.step` identifies the version, command/action index or packed field that failed. The quote logger preserves that step and the original quote.

Recorded quotes live in `__tests__/fixtures/swap-calldata/`. Keep real quotes unchanged and assert decoded values independently of the currently selected account.
