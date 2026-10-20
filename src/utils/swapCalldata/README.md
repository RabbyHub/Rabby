# Local calldata decoders

`index.ts` dispatches by DEX. Each DEX has its own entry point and ABI definitions.
All versions return the same `DecodeCalldataResult` from `types.ts`.

Live quotes pass the current chain's native token through `DecodeCalldataOptions`.
Recorded fixtures fall back to the repository's supported-chain snapshot and then
the SDK chain list. Missing chain metadata throws `decode.chain` instead of
silently returning null. Quote requests and local diagnostics use the SDK's
DEX support list with the backend exclusions in `testSupport.ts` applied.

## Uniswap

- `uni/index.ts`: handles Universal Router `execute` and SwapProxy calls.
- `uni/abi.ts`: obtains both entry-point ABIs from `@uniswap/universal-router-sdk`.
- `uni/universalRouter/profiles.ts`: matches the backend's chain-specific Router version and resolves its address through the official SDK. Arc and Robinhood use 2.1.1; other supported chains request 2.0. zkSync's shared 1.2/2.0 deployment retains its verified 1.2 layout and 5-bit command mask.
- `uni/universalRouter/sdk.ts`: delegates command, V3 path and V4 parameter decoding to the official SDK. Commands and V4 actions are parsed individually to preserve exact failing indexes. Only the standard `bytes,bytes[]` plan envelope is decoded locally.
- `uni/universalRouter/commands.ts`: interprets decoded exact-input swaps, payments and nested plans.
- `uni/universalRouter/v4/index.ts`: interprets decoded V4 exact-input swaps and settlements without maintaining version-specific tuple schemas.

The SDK is pinned to 5.14.0. Its `CommandParser` selects the version-specific
command and V4 action layouts; it does not calculate the final wallet swap result.
The local `shared.ts` continues to aggregate user inputs and final payouts.

SwapProxy version selection uses the inner `router` argument. Addresses outside
the current backend configuration fail explicitly. Traditional V2 Router,
V3 SwapRouter, SwapRouter02, signed execution, exact-output swaps and other
Router versions are outside this local quote-decoding scope. This is a scope
restriction, not a claim that those contracts are inactive onchain.

Recipient sentinels follow the Router's execution context: `address(1)` is
the Router caller and `address(2)` is the Router itself. For SwapProxy calls,
`address(1)` and V4 `TAKE_ALL` pay the proxy, not the outer user. Explicit user
addresses remain unchanged, and recipient validation still compares against
the requested user. See the [official SwapProxy warning](https://github.com/Uniswap/universal-router/blob/main/contracts/SwapProxy.sol)
and [V4 recipient handling](https://github.com/Uniswap/v4-periphery/blob/main/src/base/BaseActionsRouter.sol).

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
For native-funded Arc USDC routes, the complete input comes from `msg.value`,
converted to 6-decimal units before processing split legs. This prevents
`payerIsUser=false` legs from losing part of the input. Refund identification
compares the native and ERC20 USDC interfaces as the same asset; raw balances
and amounts keep their respective units until final result normalization.
See [Arc's shared-balance model](https://docs.arc.io/arc/concepts/stablecoin-native-model#two-interfaces-one-balance).

SDK source: [official Universal Router SDK](https://github.com/Uniswap/sdks/tree/main/sdks/universal-router-sdk).
Its deployment configuration replaces the former local address table. Quote
requests and test recommendations still use the installed Rabby integration's
DEX support list; SDK deployment metadata does not expand that list or approval
whitelists.

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

## Result composition checks

The SDK handles the instruction layouts; local code must also account for who
funds each instruction and where the assets move. Router balances and V4
PoolManager credits use separate minimum-bound maps. A V4 `TAKE` moves its
credit to the router or recipient; `SETTLE` can consume router funds or create
pool credit before an `OPEN_DELTA` swap. Both settlement orders present in the
recorded quotes are supported. Router and pool fees reduce their respective
remaining output bounds before later balance-based payments.

- A second user-funded asset, or another direct user debit after a fixed
  prepaid input, fails at its command/action rather than being omitted.
- V2 `amountIn=0` is the documented `ALREADY_PAID` pair handoff. A later
  router-funded V3 swap does not erase an earlier external payment.
- Separate native wraps retain the complete transaction input budget.
- V4 `SETTLE_PAIR`, `TAKE_PAIR`, `CLOSE_CURRENCY`, `SWEEP` and `UNWRAP` are not
  modeled here and fail explicitly; an SDK ABI entry alone does not establish
  support for their payment effects. Returning the root asset in a V4 route
  without a prepaid budget also fails when net input depends on pool state.
- Magpie automatic native input (`amountIn=0`) is reconstructed from value
  minus native fees. Automatic ERC20 input requires onchain balance/allowance
  and fails explicitly offline. Native value must cover exactly the input and
  encoded native fees. `toAddress` remains literal, including zero; it is not
  replaced with the user address.

Sources: [Uniswap payment and fee semantics](https://github.com/Uniswap/universal-router/blob/main/contracts/modules/Payments.sol),
[V2 prepaid-pair input](https://github.com/Uniswap/universal-router/blob/main/contracts/modules/uniswap/v2/V2SwapRouter.sol),
[V4 action semantics](https://github.com/Uniswap/v4-periphery/blob/main/src/V4Router.sol),
[V4 credit/debt resolution](https://github.com/Uniswap/v4-periphery/blob/main/src/base/DeltaResolver.sol),
[verified Magpie DexAggregator / LibRouter](https://sourcify.dev/server/v2/contract/42161/0x20F6ee51340aDEed01A59B0e65cB3703f3dc860c?fields=sources).

The correctness suite independently encodes these instruction combinations
and asserts complete results or a specific refusal. These cases supplement
the real quote fixtures; they are not claims of successful onchain execution.

## Input amount verification

`verify.ts` compares all five decoded fields with the requested swap and quote,
adapting input amounts to each contract's semantics. Each sample includes
`validation.checks`, `validation.expected` and the comparable total input
amount, alongside the unchanged decoded values and original quote. Minimum
receive is compared with `quote.toTokenAmount * (1 - slippage)`, using the
SDK's existing 5% relative tolerance, which is explicit in the sample and UI.
The recipient must match the requesting user. These checks compare quote and
calldata contents; they do not prove onchain execution success.
Failed decoding or missing validation returns false for calldata verification;
quote diagnostics also mark recipient verification false when it could not
be performed, rather than reporting a skipped check as a pass.

- Magpie: compare `amountIn + input-asset fees` with the requested total.
  Read actual fee assets and amounts from the packed fee arrays; do not assume
  a fixed percentage or introduce an amount tolerance. `LibRouter.getData()`
  defines the arrays and `transferFees()` transfers them separately before
  `DexAggregator.swap()` spends `amountIn`.
  Sources: [verified contract](https://sourcify.dev/server/v2/contract/42161/0x20F6ee51340aDEed01A59B0e65cB3703f3dc860c?fields=sources),
  [official affiliate fee documentation](https://docs.fly.trade/developers/api-reference/evm-swap-integration-guide#step-1-get-a-quote).
- Uniswap on Arc: accept an exact native input or the exact 18-to-6 decimal
  conversion `floor(requested / 10^12) * 10^12` for native USDC. Other chains
  and assets retain exact input comparison.
  Sources: [Arc's shared balance and truncation rules](https://docs.arc.io/arc/concepts/stablecoin-native-model#two-interfaces-one-balance),
  [official integer conversion example](https://www.arc.io/blog/arc-compatibility-guide-for-existing-evm-apps).

`amount-validation-2026-10-19.json` retains records 613, 645, 648, 651 and 915
from the latest export, covering an actual input fee, the three Arc precision
cases and a zero-fee quote. The correctness suite checks these amounts and
rejects an incorrect decoded amount, rather than only checking decode success.

`arc-native-regressions-2026-10-19.json` preserves original records 1005,
1238 and 1246 from the 03:51 export. Literal expected results are pinned from
the summed root-input legs and final output SWEEP, covering V3 native-funded
splits and the V4 routes' trailing native-USDC refunds. All five decoded fields
and all five quote-comparison checks must pass in the correctness suite.

## Collecting chain coverage locally

The Swap page requests quotes only from Uniswap and Magpie, filtered by each
DEX's SDK support list and the backend's active handlers. Uniswap excludes
Celo and Monad; Magpie excludes Fantom, Polygon zkEVM and Stable. Monad still
offers Magpie, and chains with neither DEX are hidden from the chain selector.
The same filter applies to quote requests, badges, batch runs and coverage.
Historical records and plans remain exportable, but excluded combinations do
not count toward current coverage.
DEX badges show verified / quoted concrete scenarios; a cross marks a quoted
scenario whose latest decode failed or whose decoded result did not match.
Requests without a quote are excluded from the denominator and result counts.

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
latest quoted result decoded and passed field validation, independently for each DEX. **Stop** lets in-flight quotes
finish and saves them before stopping. Chain/account changes cancel the rest of
the queue; in-flight records retain their original request metadata.

Each run saves the full selected matrix before requesting quotes, including
when running a single pair or type. Stopped or incomplete runs therefore stay visible in coverage and exports. The identity
of a scenario includes source/destination addresses, exact input base units and
slippage; passing one pair does not mark a whole swap type as passed.
**Next untested chain** selects a supported chain with no plan or with planned
requests still unattempted. Requests without quotes retain only an internal
attempt marker for navigation; their errors and empty responses are not saved
as samples, displayed or exported.

Tempo is an exception to the three native/ERC20 categories: it uses TIP20 fee
tokens, so recommendations and coverage include only ERC20/TIP20 to ERC20/TIP20.
The API's `tempo` / 18-decimal placeholder is not requested. Token discovery
uses the actual pathUSD contract and its 6-decimal metadata. Historical native
requests remain in the saved records but do not count toward applicable coverage.

The test panel automatically saves samples in the separate IndexedDB database
`rabby-swap-calldata-tests`. Reopening the page preserves the dataset. Every
parsed sample includes the chain, DEX, router version, request, original quote,
decoded values or failing step, field validation and boolean verification
results. Results distinguish `passed` (decoded and verified), `failed` (decode
error) and `mismatch` (decoded but an unexpected result). Version 4 rebuilds
historical summaries from quoted samples only and validates previously saved
decoded fields with the current rules. Original quotes remain intact; old
quote-request errors are excluded from reads and exports. The latest six quoted
samples show decoded values, expected values and per-field checks; failures
show the failing field or decode step. Copying includes the full original quote.

Use **Export JSON** to download `swap-calldata-results-<timestamp>.json`. It
contains quoted samples, test plans, exact-scenario summaries and
per-chain/DEX coverage, alongside the original swap-type counts. Scenario
coverage uses the latest bounded plan for each chain and each scenario's latest
quoted outcome. Older large plans and historical quoted samples remain in the export,
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
