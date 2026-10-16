# Recorded calldata fixtures

Run every local decoder suite, including these real quotes:

```sh
npm run test:swap-calldata
```

Run only the 2026-10-16 export, with each sample named in the output:

```sh
npx jest --runInBand --watchman=false --runTestsByPath __tests__/utils/swapCalldataDataset.test.ts --verbose
```

No quote backend, RPC, wallet balance or selected UI account is needed.
These tests validate decoding and its fields, not transaction execution.

## 2026-10-16 export

`recorded-swaps-2026-10-16.json` preserves all 222 records containing a quote
from `swap-calldata-results-2026-10-16T02-37-54-552Z.json`. The original JSON
values, including full calldata, quote metadata and previous diagnostics, are
retained in each case's `record`. The 178 quote-request failures are excluded.
The source file SHA-256 and complete coverage index are in the fixture header.

The 63 Uniswap quotes contain six protocol-route families:

- V2: 3 records.
- V3: 30 records.
- V4: 21 records.
- V2 + V3: 1 record.
- V2 + V4: 3 records.
- V3 + V4: 5 records.

They cover Universal Router 1.2 (5), 2.0 (46), and 2.1.1 (12), through direct
calls (19) and SwapProxy (44). The fixture index lists all 15 observed
version/entry/route combinations and all 27 command shapes, with record IDs.
Both single-hop and multi-hop routes, multiple swap commands and all three
native/ERC20 directions are retained. Every quoted swap is exact-input; V4
uses its path-based `SWAP_EXACT_IN` action (`0x07`).

The 159 Magpie quotes all use `DexAggregator` and
`swapWithBackendSignature(bytes)` (`0x46ec278a`). They include native → ERC20
(50), ERC20 → native (48), and ERC20 → ERC20 (61). This is one **outer parser
format**; the opaque packed payload can route through other DEXes internally.
It is not classified here as a single underlying swap or a single-hop route.

Real samples absent from this export are explicitly listed under
`coverage.absentFromThisExport`. In particular, it does not contain Uni
exact-output swaps, V4's single-pool struct action, or every supported
Universal Router version. Synthetic version-format coverage
remains in `__tests__/utils/swapCalldataVersions.test.ts`.

Magpie confirmed on 2026-10-16 that its current quote API uses DexAggregator
only, with the same version across chains. Deprecated MagpieRouter V2/V3/V3_1
formats are excluded from the decoder and its coverage requirements. Tests
verify that their entry points are rejected explicitly; all real Magpie quotes
and DexAggregator correctness cases remain covered.

## Expected results and historical failures

Expected values are fixed in `expected`, independently read from the packed
Magpie fields, Uni ingress amounts, swap paths and terminal payout bounds.
They are not recomputed by the production decoder during the test. Address
case is normalized; amount strings must match exactly. Arc USDC uses the
6-to-18-decimal normalization without adding sub-contract-unit quote dust.

All 222 cases assert complete successful decode results. Records **548**
(Unichain, ETH → LINK, Router 2.0) and **562** (zkSync, ETH → ZF, Router 1.2)
are the two original failures: a trailing native-input refund replaced the
ERC20 payout. Both are now fixed. Their intended outputs remain pinned from
the original `SWEEP`, and the original failed diagnostics are preserved.

`knownFailure` preserves the original diagnosis only; it never skips a case or
changes an assertion into an expected exception. A separate check verifies
the expected payout and refund command directly from the original calldata.
The parser fix turns these same result assertions green without changing the
original quotes or their expected outputs.

## Correctness beyond successful parsing

`__tests__/utils/swapCalldataCorrectness.test.ts` asserts complete decoded
objects for refunds, router-only payments, explicit TRANSFER / V4 TAKE
amounts, interleaved split routes, V4-to-V2 handoffs and reused router funds.
It distinguishes user payouts from intermediate balances and sums payments
to the same receiver. Multiple final assets or receivers fail explicitly
because one `DecodeCalldataResult` cannot describe them.

Magpie compact-number cases independently encode non-byte-aligned shifts,
two-byte pointers, nonzero discarded bits and amounts above JavaScript's
safe integer range. All five decoded fields must match the original values.
Version-format tests take the V4 output with OPEN_DELTA rather than repeating
the expected minimum in TAKE_ALL, so a bad swap amount cannot be hidden by
a later payment bound. Both V4 pool directions and the deprecated 2.1.0
single/path layouts are checked.
