# Local calldata decoders

`index.ts` dispatches by DEX. Each DEX has its own entry point and ABI definitions.
All versions return the same `DecodeCalldataResult` from `types.ts`.

Live quotes pass the current chain's native token through `DecodeCalldataOptions`.
Recorded fixtures fall back to the repository's supported-chain snapshot and then
the SDK chain list. Missing chain metadata throws `decode.chain` instead of
silently returning null. Quote requests and local diagnostics follow the SDK's
DEX support list for the selected chain.

## Uniswap

- `uni/index.ts`: selects Universal Router / SwapProxy or traditional SwapRouter calls.
- `uni/universalRouter/deployments.ts`: chain and address to deployed Router version, restricted to the 15 chains currently supported by the installed Uniswap integration. These entries select a decoder and do not change approval whitelists.
- `uni/universalRouter/profiles.ts`: version-specific command masks and V4 parameter versions.
- `uni/universalRouter/commands.ts`: shared swap, payment and sub-plan commands. Legacy Seaport commands are never treated as V4.
- `uni/universalRouter/v4/v2_0.ts`: V4 structs without per-hop price fields.
- `uni/universalRouter/v4/v2_1_0.ts`: deprecated 2.1.0 structs; single swaps retain the 2.0 format, while path swaps insert `maxHopSlippage` before amounts.
- `uni/universalRouter/v4/v2_1.ts`: V4 structs for Router 2.1.1, 2.1.2 and 2.2.0.
- `uni/swapRouter/`: original V3 SwapRouter, SwapRouter02, traditional V2 swaps and multicalls.

SwapProxy version selection uses the inner `router` argument. Unknown Universal Router addresses fail explicitly instead of guessing a command layout.
`executeSigned` is decoded structurally; this code does not validate signatures or on-chain execution.

The official `v1.1.0` tag points to the original V1 deployment addresses, so those
contracts use the shared `1.0/1.1` label and 5-bit command mask. zkSync also uses a
5-bit mask despite the SDK's 1.2/2.0 aliases. Monad's shared address is a verified
2.0 deployment. Soneium and testnets are outside the current DEX support list.

Deployment sources:

- [Current official deployments](https://github.com/Uniswap/universal-router/tree/main/deploy-addresses).
- [Original V1 addresses](https://github.com/Uniswap/universal-router/tree/v1.1.0/deploy-addresses).
- [Deprecated 2.1.0 addresses](https://github.com/Uniswap/sdks/blob/1d9acec18f51f7138121a33759dea30c86e6e24f/sdks/universal-router-sdk/src/utils/constants.ts).
- [Verified 2.1.0 source and ABI](https://etherscan.io/address/0xd92a36b0000531ef3063ded4de20a0783308446c#code).

## Magpie

- `magpie/routerV2.ts`: `swap(bytes)` and `silentSwap(bytes)`, including the sum of input amount pointers.
- `magpie/routerV3.ts`: `swapWithMagpieSignature(bytes)` and `swapWithUserSignature(bytes)`; the inspected V3_1 deployments share this layout.
- `magpie/dexAggregator.ts`: `swapWithBackendSignature(bytes)`.
- `magpie/packed.ts`: bounded reads of absolute calldata offsets and compact integers.

`CalldataDecodeError.step` identifies the version, command/action index or packed field that failed. The quote logger preserves that step and the original quote.

Recorded quotes live in `__tests__/fixtures/swap-calldata/`. Keep real quotes unchanged and assert decoded values independently of the currently selected account.
