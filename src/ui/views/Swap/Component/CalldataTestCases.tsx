import React, { useMemo } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { CHAINS_ENUM } from '@debank/common';
import {
  CalldataTestPair,
  CalldataTestScenario,
  CALLDATA_TEST_SLIPPAGES,
  CALLDATA_TEST_PAIR_LIMITS,
  CALLDATA_TEST_USD_SIZES,
  getCalldataTestAmount,
  getCalldataTestCases,
} from '@/utils/swapCalldata/testCases';
import {
  CalldataTestCoverage,
  getCalldataTestScenarioKey,
} from '@/utils/swapCalldata/testResults';
import type { useCalldataTest } from '../hooks/calldataTest';
import clsx from 'clsx';

const PairGroup = ({
  chain,
  type,
  pairs,
  byPair,
  coverage,
  test,
  onApplyPair,
}: {
  chain: CHAINS_ENUM;
  type: CalldataTestPair['type'];
  pairs: CalldataTestPair[];
  byPair: Map<string, CalldataTestScenario[]>;
  coverage: CalldataTestCoverage;
  test: ReturnType<typeof useCalldataTest>;
  onApplyPair: (pair: CalldataTestPair, amount: string) => void;
}) => {
  const { t } = useTranslation();
  const busy = !!test.progress;
  return (
    <details className="mt-8 pt-8 border-t border-r-neutral-line" open>
      <summary className="cursor-pointer text-12 font-medium">
        {t(`page.swap.calldataTest.${type}`)} · {pairs.length}
      </summary>
      <div className="flex items-center gap-4 mt-4">
        <span className="text-11 text-r-neutral-foot mr-auto">
          {t('page.swap.calldataTest.pairPage', { count: pairs.length })}
        </span>
        <Button
          size="small"
          disabled={busy || !pairs.length || !test.dexes.length}
          onClick={() => test.run(pairs.map((pair) => pair.id))}
        >
          {t('page.swap.calldataTest.testGroup')}
        </Button>
      </div>
      {pairs.map((pair) => {
        const scenarios = byPair.get(pair.id) || [];
        return (
          <div key={pair.id} className="mt-8 text-11">
            <div className="flex items-center gap-4">
              <span
                className="mr-auto min-w-0 break-all"
                title={`${pair.from.id} → ${pair.to.id}`}
              >
                {pair.from.symbol} → {pair.to.symbol}
              </span>
              <Button
                size="small"
                disabled={busy}
                title={t('page.swap.calldataTest.fillSize', {
                  usd: test.usdSizes[0].toLocaleString(),
                })}
                onClick={() =>
                  onApplyPair(
                    pair,
                    getCalldataTestAmount(pair.from, test.usdSizes[0])
                  )
                }
              >
                {t('page.swap.calldataTest.fill')}
              </Button>
              <Button
                size="small"
                disabled={busy || !test.dexes.length}
                onClick={() => test.run([pair.id])}
              >
                {t('page.swap.calldataTest.testRequests', {
                  count: scenarios.length * test.dexes.length,
                })}
              </Button>
            </div>
            <div className="flex flex-wrap gap-8 mt-2">
              {test.dexes.map((dex) => {
                const counts = scenarios.map((scenario) =>
                  coverage.byScenario.get(
                    getCalldataTestScenarioKey(chain, dex, scenario.id)
                  )
                );
                const passed = counts.filter(
                  (item) => item?.lastStatus === 'passed'
                ).length;
                const failed = counts.filter(
                  (item) => item?.lastStatus === 'failed'
                ).length;
                const mismatch = counts.filter(
                  (item) => item?.lastStatus === 'mismatch'
                ).length;
                const quoted = passed + failed + mismatch;
                return (
                  <span
                    key={dex}
                    className={clsx(
                      failed || mismatch
                        ? 'text-r-red-default'
                        : passed === quoted && passed
                        ? 'text-r-green-default'
                        : 'text-r-neutral-foot'
                    )}
                  >
                    Uni {quoted ? `${passed}/${quoted}` : '—'}
                    {!!failed &&
                      ` · ${t('page.swap.calldataTest.decodeFailures', {
                        count: failed,
                      })}`}
                    {!!mismatch &&
                      ` · ${t('page.swap.calldataTest.resultMismatches', {
                        count: mismatch,
                      })}`}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </details>
  );
};

export const CalldataTestCases = ({
  chain,
  coverage,
  test,
  onApplyPair,
}: {
  chain: CHAINS_ENUM;
  coverage: CalldataTestCoverage;
  test: ReturnType<typeof useCalldataTest>;
  onApplyPair: (pair: CalldataTestPair, amount: string) => void;
}) => {
  const { t } = useTranslation();
  const busy = !!test.progress;
  const caseTypes = getCalldataTestCases(chain);
  const byPair = useMemo(() => {
    const map = new Map<string, CalldataTestScenario[]>();
    test.scenarios.forEach((scenario) => {
      const list = map.get(scenario.pair.id) || [];
      list.push(scenario);
      map.set(scenario.pair.id, list);
    });
    return map;
  }, [test.scenarios]);
  const missing = test.scenarios.some((scenario) =>
    test.dexes.some(
      (dex) =>
        coverage.byScenario.get(
          getCalldataTestScenarioKey(chain, dex, scenario.id)
        )?.lastStatus !== 'passed'
    )
  );
  const unavailableTypes = caseTypes.filter(
    (type) => !test.pairs.some((pair) => pair.type === type)
  );

  return (
    <div className="mt-8">
      <div className="text-11 text-r-neutral-foot">
        {t('page.swap.calldataTest.caseLimit', {
          count: test.pairLimit,
        })}
      </div>
      <div className="mt-8 text-11 text-r-neutral-foot">
        {t('page.swap.calldataTest.pairLimit')}
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {CALLDATA_TEST_PAIR_LIMITS.map((limit) => (
          <Button
            key={limit}
            size="small"
            type={test.pairLimit === limit ? 'primary' : 'default'}
            aria-pressed={test.pairLimit === limit}
            disabled={busy}
            onClick={() => test.setPairLimit(limit)}
          >
            {limit}
          </Button>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button
          size="small"
          disabled={busy}
          loading={test.loading}
          onClick={test.reload}
        >
          {t('page.swap.calldataTest.reloadPairs')}
        </Button>
        <Button
          size="small"
          disabled={busy || test.loading || test.discoverAll}
          onClick={test.discoverMore}
        >
          {t('page.swap.calldataTest.discoverMore')}
        </Button>
      </div>
      <div className="mt-8 flex items-center gap-4 text-11">
        <span className="text-r-neutral-foot mr-auto">
          {t('page.swap.calldataTest.size')}
        </span>
        <Button
          size="small"
          disabled={
            busy || test.usdSizes.length === CALLDATA_TEST_USD_SIZES.length
          }
          onClick={test.selectAllSizes}
        >
          {t('page.swap.calldataTest.selectAll')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        {CALLDATA_TEST_USD_SIZES.map((usd) => (
          <Button
            key={usd}
            size="small"
            type={test.usdSizes.includes(usd) ? 'primary' : 'default'}
            aria-pressed={test.usdSizes.includes(usd)}
            disabled={busy}
            onClick={() => test.toggleUsd(usd)}
          >
            ${usd.toLocaleString()}
          </Button>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4 text-11">
        <span className="text-r-neutral-foot mr-auto">
          {t('page.swap.calldataTest.slippage')}
        </span>
        <Button
          size="small"
          disabled={
            busy || test.slippages.length === CALLDATA_TEST_SLIPPAGES.length
          }
          onClick={test.selectAllSlippages}
        >
          {t('page.swap.calldataTest.selectAll')}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {CALLDATA_TEST_SLIPPAGES.map((value) => (
          <Button
            key={value}
            size="small"
            type={test.slippages.includes(value) ? 'primary' : 'default'}
            aria-pressed={test.slippages.includes(value)}
            disabled={busy}
            onClick={() => test.toggleSlippage(value)}
          >
            {value}%
          </Button>
        ))}
      </div>
      <div className="mt-4 text-11 text-r-neutral-foot">
        {t('page.swap.calldataTest.matrixSelection', {
          sizes: test.usdSizes.length,
          slippages: test.slippages.length,
        })}
      </div>
      {test.loading && (
        <div className="mt-8 text-11 text-r-neutral-foot">
          {t('page.swap.calldataTest.loadingPairs')}
        </div>
      )}
      {caseTypes.length < 3 && (
        <div className="mt-8 text-11 text-r-neutral-foot">
          {t('page.swap.calldataTest.tip20Only')}
        </div>
      )}
      <div className="mt-8 text-12 font-medium">
        {t('page.swap.calldataTest.matrixSize', {
          pairs: test.pairs.length,
          scenarios: test.scenarios.length,
          requests: test.scenarios.length * test.dexes.length,
        })}
      </div>
      <div className="mt-8 flex flex-wrap gap-8">
        <Button
          type="primary"
          size="small"
          disabled={busy || !test.pairs.length || !test.dexes.length}
          onClick={() => test.run(test.pairs.map((pair) => pair.id))}
        >
          {t('page.swap.calldataTest.runAll', { count: test.pairs.length })}
        </Button>
        <Button
          size="small"
          disabled={busy || !missing || !test.pairs.length}
          onClick={() =>
            test.run(
              test.pairs.map((pair) => pair.id),
              true
            )
          }
        >
          {t('page.swap.calldataTest.runMissing')}
        </Button>
        {busy && (
          <Button size="small" disabled={test.stopping} onClick={test.stop}>
            {t(`page.swap.calldataTest.${test.stopping ? 'stopping' : 'stop'}`)}
          </Button>
        )}
      </div>
      <div className="mt-4 text-11 text-r-neutral-foot break-all">
        {test.progress
          ? t('page.swap.calldataTest.running', {
              done: test.progress.done,
              total: test.progress.total,
              pair: `${test.progress.current.pair.from.symbol} → ${test.progress.current.pair.to.symbol}`,
              amount: test.progress.current.payAmount,
              usd: test.progress.current.usd.toLocaleString(),
              slippage: test.progress.current.slippage,
            })
          : t('page.swap.calldataTest.quoteOnly')}
      </div>
      {(test.runError || (!test.loading && unavailableTypes.length > 0)) && (
        <div className="mt-8 text-11 text-r-red-default break-all">
          {test.runError ||
            `${t('page.swap.calldataTest.missingPairs')} ${test.error || ''}`}
        </div>
      )}
      {caseTypes.map((type) => (
        <PairGroup
          key={`${chain}:${type}`}
          chain={chain}
          type={type}
          pairs={test.pairs.filter((pair) => pair.type === type)}
          byPair={byPair}
          coverage={coverage}
          test={test}
          onApplyPair={onApplyPair}
        />
      ))}
    </div>
  );
};
