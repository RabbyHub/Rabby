# Recorded calldata fixtures

Run the Uni decoder suites, including these real quotes:

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

The 159 Magpie quotes in this historical file are archived only. Active tests
select the 63 Uni cases. Standalone Magpie fixtures and the Magpie records in
`amount-validation-2026-10-19.json` also remain as raw archives; they are no
longer imported or executed as Magpie tests. New live captures and exports
include Uni only.

Real samples absent from this export are explicitly listed under
`coverage.absentFromThisExport`: V4's single-pool struct action and a combined
V2+V3+V4 route. Synthetic version-format coverage remains in
`__tests__/utils/swapCalldataVersions.test.ts`.

Uni decoding now uses the official Universal Router SDK for the current backend
scope: SwapProxy or direct execute, Router 2.0 / 2.1.1 and zkSync's 1.2 alias,
and exact-input swaps. Traditional Routers, signed execution, exact-output
swaps and other Router versions are excluded explicitly. Their absence is not
counted as a gap in this quote dataset. All original quotes and expected fields
are preserved.

## Expected results and historical failures

Expected values are fixed in `expected`, independently read from Uni
ingress amounts, swap paths and terminal payout bounds.
They are not recomputed by the production decoder during the test. Address
case is normalized; amount strings must match exactly. Arc USDC uses the
6-to-18-decimal normalization without adding sub-contract-unit quote dust.

All 63 active Uni cases assert complete successful decode results. Records **548**
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

## 2026-10-20 V2 handoff failures

`uni-v2-handoffs-2026-10-20.json` preserves all 16 Uni records that failed final
result aggregation in `swap-calldata-results-2026-10-20T06-03-10-057Z.json`:

- Polygon: 1906, 1908, 1910, 1912, 1914, 1918, 1920 (POL → wstETH).
- Tempo: 2593, 2603, 2613, 3204, 3223, 3242 (OUSD → TIMECOIN,
  cbBTC → TCAT, USDT0 → LUNA).
- Ethereum: 3568, 3570, 3572 (ENA → AAVE).

Each upstream V3 swap or V4 TAKE pays the next V2 pair directly. The V2
instruction uses CONTRACT_BALANCE, not ALREADY_PAID. The fixture records the
handoff currency, exact computed pair and command indexes as evidence.
The export SHA-256 is recorded in the header; each complete original record,
including its quote and failure diagnostics, remains unchanged.

Expected fields are fixed from transaction value / proxy ingress and the final
SWEEP, independently of the local decoder. `swapCalldataCorrectness.test.ts`
requires every case to decode and pass all five field comparisons. The normal
`test:swap-calldata` command already includes this test file.
The separate minimum-output rounding mismatch (record 3294) is outside this
handoff fixture and this fix.
It distinguishes user payouts from intermediate balances and sums payments
to the same receiver. Multiple final assets or receivers fail explicitly
because one `DecodeCalldataResult` cannot describe them.

Version-format tests take the V4 output with OPEN_DELTA rather than repeating
the expected minimum in TAKE_ALL, so a bad swap amount cannot be hidden by
a later payment bound. Both V4 pool directions and the current 2.0 / 2.1.1
single/path layouts are checked. Out-of-scope versions and entry points must
be rejected, rather than retained as successful decoding cases.
