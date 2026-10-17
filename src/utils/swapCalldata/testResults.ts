import { Dexie } from 'dexie';
import type { Chain } from '@debank/common';
import type { DEX_ENUM, VerifySdkResult } from '@rabby-wallet/rabby-swap';
import type { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import type { DecodeCalldataResult } from './types';
import { getCalldataTestDexes, isCalldataTestDex } from './testSupport';
import {
  getCalldataTestCases,
  CalldataTestCase,
  classifyCalldataTestCase,
  getCalldataTestScenarioId,
  CALLDATA_TEST_PAIR_LIMIT,
} from './testCases';

export type CalldataTestStatus =
  | 'passed'
  | 'failed'
  | 'quote-failed'
  | 'no-quote';

export interface CalldataTestRequest {
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
}

export interface CalldataTestCounts {
  passed: number;
  failed: number;
  quoteFailed: number;
  noQuote: number;
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
  quoteFailed:
    (previous?.quoteFailed || 0) + Number(record.status === 'quote-failed'),
  noQuote: (previous?.noQuote || 0) + Number(record.status === 'no-quote'),
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
    ? counts.passed
      ? 'mixed'
      : 'failed'
    : counts?.passed
    ? 'passed'
    : 'untested';

export const hasCalldataTestAttempt = (counts?: CalldataTestCounts) =>
  !!counts &&
  counts.passed + counts.failed + counts.quoteFailed + counts.noQuote > 0;

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
const results = db.table<CalldataTestRecord, number>('results');
const summaries = db.table<CalldataTestSummary, string>('summaries');
const scenarios = db.table<CalldataTestScenarioSummary, string>('scenarios');
const plans = db.table<CalldataTestPlan, string>('plans');

export const buildCalldataTestCoverage = (
  scenarioSummaries: CalldataTestScenarioSummary[],
  testPlans: CalldataTestPlan[]
) => {
  const byScenario = new Map(scenarioSummaries.map((item) => [item.key, item]));
  const planned = new Map<string, Set<string>>();
  const latestPlans = new Map<string, CalldataTestPlan>();
  testPlans.forEach((plan) => {
    // Keep expanded historical plans in exports, but count the latest bounded
    // selection for each chain. Old thousands-case runs must not inflate it.
    if (plan.scenarioIds.length > CALLDATA_TEST_PAIR_LIMIT) return;
    const previous = latestPlans.get(plan.chain);
    if (!previous || plan.createdAt >= previous.createdAt)
      latestPlans.set(plan.chain, plan);
  });
  latestPlans.forEach((plan) =>
    plan.dexes.forEach((dex) => {
      const key = `${plan.chain}:${dex}`;
      let ids = planned.get(key);
      if (!ids) planned.set(key, (ids = new Set()));
      plan.scenarioIds.forEach((id) => ids!.add(id));
    })
  );
  const byChainDex = new Map<
    string,
    {
      total: number;
      attempted: number;
      passed: number;
      failed: number;
      quoteIssues: number;
    }
  >();
  planned.forEach((ids, key) => {
    const counts = {
      total: ids.size,
      attempted: 0,
      passed: 0,
      failed: 0,
      quoteIssues: 0,
    };
    ids.forEach((id) => {
      const result = byScenario.get(`${key}:${id}`);
      if (hasCalldataTestAttempt(result)) counts.attempted++;
      if (result?.lastStatus === 'passed') counts.passed++;
      if (result?.lastStatus === 'failed') counts.failed++;
      if (
        result?.lastStatus === 'quote-failed' ||
        result?.lastStatus === 'no-quote'
      )
        counts.quoteIssues++;
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
  if (!isCalldataTestDex(record.dex)) return;
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

export const recordCalldataTestPlan = (plan: CalldataTestPlan) => {
  const snapshot = JSON.parse(JSON.stringify(plan)) as CalldataTestPlan;
  const write = pendingWrites.then(() => plans.put(snapshot));
  pendingWrites = write.then(() => undefined).catch(setStorageError);
  return write;
};

export const readCalldataTestScenarios = async () => {
  try {
    return await scenarios.toArray();
  } catch (error) {
    setStorageError(error);
    return [];
  }
};
export const readCalldataTestPlans = async () => {
  try {
    return await plans.toArray();
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
      .filter((record) => record.chain === chain)
      .limit(6)
      .toArray();
  } catch (error) {
    setStorageError(error);
    return [];
  }
};

export const readCalldataTestSummaries = async () => {
  try {
    return await summaries.toArray();
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
      records: await results.toArray(),
      summaries: await summaries.toArray(),
      scenarios: await scenarios.toArray(),
      plans: await plans.toArray(),
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
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    database: db.name,
    ...dataset,
    coverage: chains.flatMap((chain) =>
      getCalldataTestDexes(chain.enum).map((dex) => {
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
          quoteFailed: summary?.quoteFailed || 0,
          noQuote: summary?.noQuote || 0,
          lastVersion: summary?.lastVersion || null,
          lastRecordedAt: summary?.lastRecordedAt || null,
          scenarios: coverage.byChainDex.get(`${chain.enum}:${dex}`) || {
            total: 0,
            attempted: 0,
            passed: 0,
            failed: 0,
            quoteIssues: 0,
          },
          cases: getCalldataTestCases(chain.enum).map((testCase) => {
            const counts = summary?.cases?.[testCase];
            return {
              testCase,
              attempted: hasCalldataTestAttempt(counts),
              parseStatus: getCalldataTestParseStatus(counts),
              passed: counts?.passed || 0,
              failed: counts?.failed || 0,
              quoteFailed: counts?.quoteFailed || 0,
              noQuote: counts?.noQuote || 0,
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
