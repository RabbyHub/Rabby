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

SwapProxy transfers and native wraps keep the full input fixed while individual
route legs are decoded. Direct parallel inputs are summed; intermediate token
balances never replace the original input. Terminal payments distinguish the
output from a refund of the input asset. Intermediate balances and external
payouts are tracked separately, including interleaved split routes and V4-to-V2
handoffs. Explicit TRANSFER and TAKE amounts describe the actual payment;
balance sentinels use the remaining output bound. Multiple final assets or
receivers fail instead of returning just the last payout. Unresolved dynamic inputs fail with
the command/action step instead of returning a zero-amount success.

`uni/assets.ts` normalizes Arc's ERC20 USDC (6 decimals) to the native USDC
identifier and 18-decimal units after aggregation. It does not turn Tempo
pathUSD into the API's `tempo` placeholder: pathUSD stays a 6-decimal TIP20.

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

- `magpie/dexAggregator.ts`: `swapWithBackendSignature(bytes)`.
- `magpie/packed.ts`: bounded reads of absolute calldata offsets and compact integers.

Magpie confirmed on 2026-10-16 that its current quote API uses DexAggregator
only and that the older MagpieRouter contracts are deprecated. The local
decoder therefore accepts only `swapWithBackendSignature(bytes)` (`0x46ec278a`).
Other selectors return an explicit unsupported-selector error and an unknown
version. Magpie also confirmed that all chains use the same version; deployment
addresses can differ, but the packed-data decoder is shared across chains.

`CalldataDecodeError.step` identifies the version, command/action index or packed field that failed. The quote logger preserves that step and the original quote.

Recorded quotes live in `__tests__/fixtures/swap-calldata/`. Keep real quotes unchanged and assert decoded values independently of the currently selected account.

## Collecting chain coverage locally

The Swap page requests quotes only from Uniswap and Magpie, filtered by each
DEX's supported chains. Unsupported chains are hidden from the chain selector.
DEX badges show passed / planned concrete scenarios; a cross marks a scenario
whose latest parse failed. Historical failures remain in the sample counts.

Each chain gets at most **10 pairs**. With sufficient assets, the selection
contains 3 native → ERC20, 3 ERC20 → native and 4 ERC20 → ERC20 pairs. It
prefers tokens not yet used, then distinct contract addresses, and avoids
repeating the same symbols through bridged aliases. If a type is unavailable,
other valid pairs fill its slots. Fewer pairs are shown when tokens are scarce.
Direct wrap / unwrap pairs and Arc's duplicate native-USDC alias are excluded.

Discovery uses real API metadata, including chain-specific addresses and
precision. Initial searches mix stablecoins, BTC, ETH, governance and chain
tokens; **Discover more tokens** broadens the candidate pool while retaining
the ten-pair limit.

Choose **one** approximate USD size ($1 / $5 / $20 / $100 / $1,000 / $10,000)
and **one** slippage (0.1% / 1% / 3%). A full run has up to 10 scenarios per
supported DEX, or 20 requests when both DEXes support the chain. Without a
price, the fallback is 0.01 tokens. Test all pairs, one swap type, or an
individual pair.
Quotes run one scenario at a time with its supported DEXes in parallel and a
250 ms gap between scenarios. Insufficient-balance quote mode skips allowance,
nonce and pre-execution. **Fill form** applies the selected size to the
normal swap form. **Retry not passed** skips only concrete scenarios whose
latest result passed, independently for each DEX. **Stop** lets in-flight quotes
finish and saves them before stopping. Chain/account changes cancel the rest of
the queue; in-flight records retain their original request metadata.

Each run saves the full selected matrix before requesting quotes, including
when running a single pair or type. Stopped or incomplete runs therefore stay visible in coverage and exports. The identity
of a scenario includes source/destination addresses, exact input base units and
slippage; passing one pair does not mark a whole swap type as passed.
**Next untested chain** selects a supported chain with no plan or with planned
requests still unattempted. Quote issues count as attempts but never as passes.

Tempo is an exception to the three native/ERC20 categories: it uses TIP20 fee
tokens, so recommendations and coverage include only ERC20/TIP20 to ERC20/TIP20.
The API's `tempo` / 18-decimal placeholder is not requested. Token discovery
uses the actual pathUSD contract and its 6-decimal metadata. Historical native
requests remain in the saved records but do not count toward applicable coverage.

The test panel automatically saves samples in the separate IndexedDB database
`rabby-swap-calldata-tests`. Reopening the page preserves the dataset. Every
parsed sample includes the chain, DEX, router version, request, original quote,
decoded values or failing step, and boolean verification results. Quote request
errors and empty responses are recorded separately from parsing failures.
Existing version-1/2 samples are preserved, classified and indexed by exact
scenario when the database upgrades to version 3. The latest six samples can be
inspected and copied individually;
successful samples show decoded values, and failed samples show the failing
step and error. Copying a sample includes its full original quote.

Use **Export JSON** to download `swap-calldata-results-<timestamp>.json`. It
contains all original samples, test plans, exact-scenario summaries and
per-chain/DEX coverage, alongside the original swap-type counts. Scenario
coverage uses the latest bounded plan for each chain and each scenario's latest
outcome. Older large plans and all historical samples remain in the export,
but do not inflate the current ten-case coverage.
Use **Clear** after
exporting to start a fresh batch when changing the parser. Samples are stored
under the current browser profile and extension origin; they are not uploaded.

## Regression tests

Run `npm run test:swap-calldata` for the recorded quotes, router versions and
quote diagnostic tests together. The standard Jest run also includes them.
The [fixture index](../../../__tests__/fixtures/swap-calldata/README.md) describes
the 2026-10-16 dataset: all 222 quoted records, six Uni protocol-route families,
15 version/entry/route combinations, 27 command shapes, and Magpie's observed
DexAggregator format. Every record asserts exact decoded fields, including the
two native-refund regressions with intended outputs pinned from calldata.
The two native-refund cases are fixed and must pass the same assertions;
diagnostic markers do not exempt a sample from successful-result assertions.
`swapCalldataCorrectness.test.ts` adds payment, split-route and compact-integer
regressions that assert all fields, including cases that previously returned
a successful but incorrect result. V4 version tests avoid a later repeated
payment bound masking an incorrectly decoded swap minimum.

`uni-cross-chain-regressions.json` preserves all 11 relevant original records
from the 2026-10-15 export, with independently specified expected results. Eight
exposed decoder errors before the fix; three Tempo samples preserve correct
TIP20 decoding despite invalid native-placeholder request metadata. Assertions
check decoded fields, not just whether the decoder returned an object.

The expected values come from SwapProxy ingress, the summed swap legs, and final
SWEEP/UNWRAP bounds. Contract evidence is recorded with the dataset. BSC's
verified UniversalRouter source defines V4 OPEN_DELTA as zero (dynamic credit),
not a zero user input; SWEEP pays the specified asset and can also refund input.
Tempo's pathUSD `decimals()` was read from the live RPC and returned 6. The
original quotes were not broadcast, so these are calldata regression cases,
not successful onchain execution assertions.
