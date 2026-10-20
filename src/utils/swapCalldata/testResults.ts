import { Dexie } from 'dexie';
import type { Chain, CHAINS_ENUM } from '@debank/common';
import type { DEX_ENUM, VerifySdkResult } from '@rabby-wallet/rabby-swap';
import type { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import type { DecodeCalldataResult } from './types';
import {
  validateCalldataResult,
  isCalldataMatch,
  CalldataResultValidation,
} from './verify';
import BigNumber from 'bignumber.js';
import { getCalldataTestDexes, isCalldataTestDex } from './testSupport';
import {
  getCalldataTestCases,
  CalldataTestCase,
  classifyCalldataTestCase,
  getCalldataTestScenarioId,
  CALLDATA_TEST_PAIR_LIMIT,
  CALLDATA_TEST_MAX_PAIRS,
} from './testCases';

export type CalldataTestStatus =
  | 'passed'
  | 'failed'
  | 'mismatch'
  | 'ignored'
  // Legacy statuses are read during migration, never added as new results.
  | 'quote-failed'
  | 'no-quote';

export interface CalldataTestRequest {
  // Approximate USD preset selected for a batch quote; absent for manual quotes.
  targetUsd?: number;
  fromToken: string;
  fromTokenAmount: string;
  toToken: string;
  userAddress: string;
  slippage: string;
  nativeTokenAddress: string;
}

export interface CalldataTestRecord {
  id?: number;
  recordedAt: number;
  dex: DEX_ENUM;
  version: string;
  chain: string;
  chainId: number;
  status: CalldataTestStatus;
  testCase?: CalldataTestCase;
  scenarioId?: string;
  request: CalldataTestRequest;
  // Preserve successful quotes too, so every recorded decode can become a fixture.
  quote?: QuoteResult;
  decoded?: DecodeCalldataResult;
  firstFailedStep?: string;
  reason?: string;
  error?: unknown;
  checks?: Pick<
    VerifySdkResult,
    | 'routerPass'
    | 'spenderPass'
    | 'callDataPass'
    | 'receiverPass'
    | 'isSdkDataPass'
  >;
  validation?: CalldataResultValidation;
}

export interface CalldataTestCounts {
  passed: number;
  failed: number;
  mismatch: number;
  attempted?: boolean;
  lastStatus: CalldataTestStatus;
  lastVersion: string;
  lastRecordedAt: number;
  lastFailedStep?: string;
  lastReason?: string;
}

export interface CalldataTestSummary extends CalldataTestCounts {
  key: string;
  chain: string;
  chainId: number;
  dex: DEX_ENUM;
  cases: Partial<Record<CalldataTestCase, CalldataTestCounts>>;
}

export interface CalldataTestScenarioSummary extends CalldataTestCounts {
  key: string;
  chain: string;
  chainId: number;
  dex: DEX_ENUM;
  scenarioId: string;
  testCase?: CalldataTestCase;
  request: CalldataTestRequest;
}

export interface CalldataTestPlan {
  key: string;
  chain: string;
  createdAt: number;
  dexes: DEX_ENUM[];
  tokens: { id: string; symbol: string; decimals: number }[];
  sizesUsd: number[];
  slippages: string[];
  pairIds?: string[];
  scenarioIds: string[];
}

export const getCalldataTestScenarioKey = (
  chain: string,
  dex: DEX_ENUM,
  scenarioId: string
) => `${chain}:${dex}:${scenarioId}`;

const addScenario = (
  previous: CalldataTestScenarioSummary | undefined,
  record: CalldataTestRecord
): CalldataTestScenarioSummary => {
  const scenarioId = getCalldataTestScenarioId(record.request);
  return {
    ...addResult(previous, record),
    key: getCalldataTestScenarioKey(record.chain, record.dex, scenarioId),
    chain: record.chain,
    chainId: record.chainId,
    dex: record.dex,
    scenarioId,
    testCase: record.testCase,
    request: record.request,
  };
};

const addResult = (
  previous: CalldataTestCounts | undefined,
  record: CalldataTestRecord
): CalldataTestCounts => ({
  passed: (previous?.passed || 0) + Number(record.status === 'passed'),
  failed: (previous?.failed || 0) + Number(record.status === 'failed'),
  mismatch: (previous?.mismatch || 0) + Number(record.status === 'mismatch'),
  attempted: true,
  lastStatus: record.status,
  lastVersion: record.version,
  lastRecordedAt: record.recordedAt,
  lastFailedStep: record.firstFailedStep,
  lastReason:
    record.reason ||
    (record.error as { message?: string } | undefined)?.message,
});

const addSummary = (
  previous: CalldataTestSummary | undefined,
  record: CalldataTestRecord
): CalldataTestSummary => ({
  ...addResult(previous, record),
  key: `${record.chain}:${record.dex}`,
  chain: record.chain,
  chainId: record.chainId,
  dex: record.dex,
  cases: {
    ...previous?.cases,
    ...(record.testCase
      ? {
          [record.testCase]: addResult(
            previous?.cases?.[record.testCase],
            record
          ),
        }
      : {}),
  },
});

export const getCalldataTestParseStatus = (counts?: CalldataTestCounts) =>
  counts?.failed
    ? counts.passed || counts.mismatch
      ? 'mixed'
      : 'failed'
    : counts?.passed || counts?.mismatch
    ? 'passed'
    : 'untested';

export const hasCalldataTestAttempt = (counts?: CalldataTestCounts) =>
  !!counts &&
  (!!counts.attempted ||
    counts.passed + counts.failed + (counts.mismatch || 0) > 0);

const hasQuotedResult = (counts?: CalldataTestCounts) =>
  !!counts && counts.passed + counts.failed + (counts.mismatch || 0) > 0;

const refreshRecordedValidation = (record: CalldataTestRecord) => {
  if (!record.quote || !record.decoded) return record;
  const validation = validateCalldataResult({
    dexId: record.dex,
    data: {
      ...record.quote,
      fromToken: record.request.fromToken,
      fromTokenAmount: record.request.fromTokenAmount,
      toToken: record.request.toToken,
    },
    tx: { ...record.quote.tx, chainId: record.chainId },
    decoded: record.decoded,
    nativeTokenAddress: record.request.nativeTokenAddress,
    userAddress: record.request.userAddress,
    slippage: new BigNumber(record.request.slippage).div(100).toFixed(),
  });
  if (!validation) return record;
  const failedField = Object.entries(validation.checks).find(
    ([, pass]) => !pass
  )?.[0];
  const callDataPass = isCalldataMatch(validation);
  const receiverPass = validation.checks.toTokenReceiver;
  return {
    ...record,
    status: validation.passed ? ('passed' as const) : ('mismatch' as const),
    validation,
    ...(record.checks
      ? {
          checks: {
            ...record.checks,
            callDataPass,
            receiverPass,
            isSdkDataPass:
              record.checks.routerPass &&
              record.checks.spenderPass &&
              callDataPass &&
              receiverPass,
          },
        }
      : {}),
    firstFailedStep: failedField ? `validate.${failedField}` : undefined,
    reason: failedField
      ? validation.error ||
        `Decoded ${failedField} does not match the expected result.`
      : undefined,
  };
};

// Keep the test dataset separate from wallet data and its schema migrations.
const db = new Dexie('rabby-swap-calldata-tests');
db.version(1).stores({
  results: '++id,[chain+dex],recordedAt,status',
  summaries: '&key,chain,dex',
});
db.version(2)
  .stores({
    results: '++id,[chain+dex],recordedAt,status,testCase',
    summaries: '&key,chain,dex',
  })
  .upgrade(async (transaction) => {
    const rebuilt = new Map<string, CalldataTestSummary>();
    await transaction
      .table<CalldataTestRecord, number>('results')
      .toCollection()
      .modify((record) => {
        record.testCase = classifyCalldataTestCase(record.request);
        const key = `${record.chain}:${record.dex}`;
        rebuilt.set(key, addSummary(rebuilt.get(key), record));
      });
    const summaryTable = transaction.table<CalldataTestSummary, string>(
      'summaries'
    );
    await summaryTable.clear();
    await summaryTable.bulkPut(Array.from(rebuilt.values()));
  });
db.version(3)
  .stores({
    results: '++id,[chain+dex],recordedAt,status,testCase',
    summaries: '&key,chain,dex',
    scenarios: '&key,[chain+dex],chain,dex',
    plans: '&key,chain',
  })
  .upgrade(async (transaction) => {
    const rebuilt = new Map<string, CalldataTestScenarioSummary>();
    await transaction
      .table<CalldataTestRecord, number>('results')
      .toCollection()
      .modify((record) => {
        record.scenarioId = getCalldataTestScenarioId(record.request);
        const key = getCalldataTestScenarioKey(
          record.chain,
          record.dex,
          record.scenarioId
        );
        rebuilt.set(key, addScenario(rebuilt.get(key), record));
      });
    await transaction
      .table<CalldataTestScenarioSummary, string>('scenarios')
      .bulkPut(Array.from(rebuilt.values()));
  });
db.version(4)
  .stores({
    results: '++id,[chain+dex],recordedAt,status,testCase',
    summaries: '&key,chain,dex',
    scenarios: '&key,[chain+dex],chain,dex',
    plans: '&key,chain',
  })
  .upgrade(async (transaction) => {
    const records = await transaction
      .table<CalldataTestRecord, number>('results')
      .orderBy('recordedAt')
      .toArray();
    const summaryMap = new Map<string, CalldataTestSummary>();
    const scenarioMap = new Map<string, CalldataTestScenarioSummary>();
    for (const original of records) {
      const key = getCalldataTestScenarioKey(
        original.chain,
        original.dex,
        getCalldataTestScenarioId(original.request)
      );
      // Keep only an attempt marker for old requests without quotes. Such a
      // request must not replace the latest quoted outcome for that scenario.
      if (!original.quote) {
        if (!scenarioMap.has(key))
          scenarioMap.set(
            key,
            addScenario(undefined, {
              ...original,
              status: 'ignored',
              error: undefined,
              reason: undefined,
              firstFailedStep: undefined,
            })
          );
        continue;
      }
      const record = refreshRecordedValidation(original);
      await transaction
        .table<CalldataTestRecord, number>('results')
        .put(record);
      const summaryKey = `${record.chain}:${record.dex}`;
      summaryMap.set(
        summaryKey,
        addSummary(summaryMap.get(summaryKey), record)
      );
      scenarioMap.set(key, addScenario(scenarioMap.get(key), record));
    }
    const summaryTable = transaction.table<CalldataTestSummary, string>(
      'summaries'
    );
    const scenarioTable = transaction.table<
      CalldataTestScenarioSummary,
      string
    >('scenarios');
    await summaryTable.clear();
    await scenarioTable.clear();
    if (summaryMap.size)
      await summaryTable.bulkPut(Array.from(summaryMap.values()));
    if (scenarioMap.size)
      await scenarioTable.bulkPut(Array.from(scenarioMap.values()));
  });
const results = db.table<CalldataTestRecord, number>('results');
const summaries = db.table<CalldataTestSummary, string>('summaries');
const scenarios = db.table<CalldataTestScenarioSummary, string>('scenarios');
const plans = db.table<CalldataTestPlan, string>('plans');

export const buildCalldataTestCoverage = (
  scenarioSummaries: CalldataTestScenarioSummary[],
  testPlans: CalldataTestPlan[]
) => {
  const byScenario = new Map(
    scenarioSummaries
      .filter((item) => isCalldataTestDex(item.dex))
      .map((item) => [item.key, item])
  );
  const planned = new Map<string, Set<string>>();
  const latestPlans = new Map<string, CalldataTestPlan>();
  getActiveTestPlans(testPlans).forEach((plan) => {
    // Expanded plans count up to 100 pairs, independently of amount/slippage
    // combinations. Unmarked legacy plans retain the old scenario limit.
    if (
      plan.pairIds
        ? plan.pairIds.length > CALLDATA_TEST_MAX_PAIRS
        : plan.scenarioIds.length > CALLDATA_TEST_PAIR_LIMIT
    )
      return;
    const previous = latestPlans.get(plan.chain);
    if (!previous || plan.createdAt >= previous.createdAt)
      latestPlans.set(plan.chain, plan);
  });
  latestPlans.forEach((plan) =>
    getCalldataTestDexes(plan.chain as CHAINS_ENUM, plan.dexes).forEach(
      (dex) => {
        const key = `${plan.chain}:${dex}`;
        let ids = planned.get(key);
        if (!ids) planned.set(key, (ids = new Set()));
        plan.scenarioIds.forEach((id) => ids!.add(id));
      }
    )
  );
  const byChainDex = new Map<
    string,
    {
      total: number;
      attempted: number;
      passed: number;
      failed: number;
      mismatch: number;
      quoted: number;
    }
  >();
  planned.forEach((ids, key) => {
    const counts = {
      total: ids.size,
      attempted: 0,
      passed: 0,
      failed: 0,
      mismatch: 0,
      quoted: 0,
    };
    ids.forEach((id) => {
      const result = byScenario.get(`${key}:${id}`);
      if (hasCalldataTestAttempt(result)) counts.attempted++;
      if (result?.lastStatus === 'passed') counts.passed++;
      if (result?.lastStatus === 'failed') counts.failed++;
      if (result?.lastStatus === 'mismatch') counts.mismatch++;
      if (hasQuotedResult(result)) counts.quoted++;
    });
    byChainDex.set(key, counts);
  });
  return { byScenario, byChainDex };
};

export type CalldataTestCoverage = ReturnType<typeof buildCalldataTestCoverage>;

let pendingWrites: Promise<void> = Promise.resolve();
let storageError: string | null = null;
const listeners = new Set<() => void>();

export const getCalldataTestStorageError = () => storageError;
export const subscribeCalldataTestStorage = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const setStorageError = (error: unknown) => {
  storageError =
    error == null
      ? null
      : error instanceof Error
      ? error.message
      : String(error);
  listeners.forEach((listener) => listener());
};

export const describeCalldataTestError = (error: unknown) =>
  error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : String(error);

export const recordCalldataTestResult = (
  record: Omit<
    CalldataTestRecord,
    'id' | 'recordedAt' | 'testCase' | 'scenarioId'
  >
) => {
  if (!isCalldataTestDex(record.dex) || !record.quote) return;
  // Snapshot before queuing: quote consumers may subsequently mutate API data.
  let snapshot: CalldataTestRecord;
  try {
    snapshot = JSON.parse(
      JSON.stringify({
        ...record,
        testCase: classifyCalldataTestCase(record.request),
        scenarioId: getCalldataTestScenarioId(record.request),
        recordedAt: Date.now(),
      })
    );
  } catch (error) {
    setStorageError(error);
    return;
  }
  pendingWrites = pendingWrites
    .then(() =>
      db.transaction('rw', results, summaries, scenarios, async () => {
        const key = `${snapshot.chain}:${snapshot.dex}`;
        const previous = await summaries.get(key);
        const scenarioKey = getCalldataTestScenarioKey(
          snapshot.chain,
          snapshot.dex,
          snapshot.scenarioId!
        );
        const previousScenario = await scenarios.get(scenarioKey);
        await results.add(snapshot);
        await summaries.put(addSummary(previous, snapshot));
        await scenarios.put(addScenario(previousScenario, snapshot));
      })
    )
    .then(() => undefined)
    .catch(setStorageError);
};

export const flushCalldataTestResults = () => pendingWrites;

// Track navigation progress without retaining quote errors or empty responses.
export const recordCalldataTestAttempt = (
  record: Pick<CalldataTestRecord, 'dex' | 'chain' | 'chainId' | 'request'>
) => {
  const snapshot = JSON.parse(JSON.stringify(record)) as typeof record;
  pendingWrites = pendingWrites
    .then(async () => {
      const scenarioId = getCalldataTestScenarioId(snapshot.request);
      const key = getCalldataTestScenarioKey(
        snapshot.chain,
        snapshot.dex,
        scenarioId
      );
      await db.transaction('rw', scenarios, async () => {
        if (await scenarios.get(key)) return;
        await scenarios.put(
          addScenario(undefined, {
            ...snapshot,
            scenarioId,
            recordedAt: Date.now(),
            version: 'unknown',
            status: 'ignored',
            testCase: classifyCalldataTestCase(snapshot.request),
          })
        );
      });
    })
    .catch(setStorageError);
};

export const recordCalldataTestPlan = (plan: CalldataTestPlan) => {
  const snapshot = JSON.parse(JSON.stringify(plan)) as CalldataTestPlan;
  const write = pendingWrites.then(() => plans.put(snapshot));
  pendingWrites = write.then(() => undefined).catch(setStorageError);
  return write;
};

// Retain old records in IndexedDB, but keep inactive DEXes out of the UI
// and exports. Mixed historical plans still apply to their remaining DEXes.
const getActiveTestPlans = (items: CalldataTestPlan[]) =>
  items
    .map((plan) => ({ ...plan, dexes: plan.dexes.filter(isCalldataTestDex) }))
    .filter((plan) => plan.dexes.length > 0);

export const readCalldataTestScenarios = async () => {
  try {
    return await scenarios
      .filter((item) => isCalldataTestDex(item.dex))
      .toArray();
  } catch (error) {
    setStorageError(error);
    return [];
  }
};
export const readCalldataTestPlans = async () => {
  try {
    return getActiveTestPlans(await plans.toArray());
  } catch (error) {
    setStorageError(error);
    return [];
  }
};

export const readLatestCalldataTestResults = async (chain: string) => {
  try {
    return await results
      .orderBy('recordedAt')
      .reverse()
      .filter(
        (record) =>
          record.chain === chain &&
          !!record.quote &&
          isCalldataTestDex(record.dex)
      )
      .limit(6)
      .toArray();
  } catch (error) {
    setStorageError(error);
    return [];
  }
};

export const readCalldataTestSummaries = async () => {
  try {
    return await summaries
      .filter((item) => isCalldataTestDex(item.dex))
      .toArray();
  } catch (error) {
    setStorageError(error);
    return [];
  }
};

export const readCalldataTestDataset = async () => {
  await pendingWrites;
  return db.transaction(
    'r',
    results,
    summaries,
    scenarios,
    plans,
    async () => ({
      records: await results
        .filter((record) => !!record.quote && isCalldataTestDex(record.dex))
        .toArray(),
      summaries: await summaries
        .filter((item) => isCalldataTestDex(item.dex))
        .toArray(),
      scenarios: await scenarios
        .filter((item) => hasQuotedResult(item) && isCalldataTestDex(item.dex))
        .toArray(),
      plans: getActiveTestPlans(await plans.toArray()),
      captureError: storageError,
    })
  );
};

export const buildCalldataTestExport = (
  dataset: Awaited<ReturnType<typeof readCalldataTestDataset>>,
  chains: Pick<Chain, 'enum' | 'id' | 'name'>[]
) => {
  const byPair = new Map(dataset.summaries.map((item) => [item.key, item]));
  const coverage = buildCalldataTestCoverage(dataset.scenarios, dataset.plans);
  return {
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
    database: db.name,
    ...dataset,
    coverage: chains.flatMap((chain) =>
      getCalldataTestDexes(chain.enum)
        .filter((dex) => hasQuotedResult(byPair.get(`${chain.enum}:${dex}`)))
        .map((dex) => {
          const summary = byPair.get(`${chain.enum}:${dex}`);
          const passed = summary?.passed || 0;
          const failed = summary?.failed || 0;
          return {
            chain: chain.enum,
            chainId: chain.id,
            chainName: chain.name,
            dex,
            parseStatus: getCalldataTestParseStatus(summary),
            passed,
            failed,
            mismatch: summary?.mismatch || 0,
            decoded: passed + (summary?.mismatch || 0),
            lastVersion: summary?.lastVersion || null,
            lastRecordedAt: summary?.lastRecordedAt || null,
            scenarios: coverage.byChainDex.get(`${chain.enum}:${dex}`) || {
              total: 0,
              attempted: 0,
              passed: 0,
              failed: 0,
              mismatch: 0,
              quoted: 0,
            },
            cases: getCalldataTestCases(chain.enum).map((testCase) => {
              const counts = summary?.cases?.[testCase];
              return {
                testCase,
                attempted: hasQuotedResult(counts),
                parseStatus: getCalldataTestParseStatus(counts),
                passed: counts?.passed || 0,
                failed: counts?.failed || 0,
                mismatch: counts?.mismatch || 0,
                lastStatus: counts?.lastStatus || null,
                lastVersion: counts?.lastVersion || null,
                lastRecordedAt: counts?.lastRecordedAt || null,
              };
            }),
          };
        })
    ),
  };
};

export const clearCalldataTestResults = () => {
  const clear = pendingWrites.then(() =>
    db.transaction('rw', results, summaries, scenarios, plans, async () => {
      await results.clear();
      await summaries.clear();
      await scenarios.clear();
      await plans.clear();
    })
  );
  pendingWrites = clear
    .then(() => setStorageError(null))
    .catch(setStorageError);
  return clear;
};
