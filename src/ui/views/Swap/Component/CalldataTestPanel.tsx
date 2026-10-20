import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { Button, Modal } from 'antd';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import type { CHAINS_ENUM } from '@debank/common';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { useRabbySelector } from '@/ui/store';
import {
  buildCalldataTestExport,
  buildCalldataTestCoverage,
  CalldataTestCoverage,
  CalldataTestSummary,
  clearCalldataTestResults,
  getCalldataTestStorageError,
  readCalldataTestDataset,
  readLatestCalldataTestResults,
  readCalldataTestSummaries,
  readCalldataTestScenarios,
  readCalldataTestPlans,
  subscribeCalldataTestStorage,
} from '@/utils/swapCalldata/testResults';
import { getCalldataTestDexes } from '@/utils/swapCalldata/testSupport';
import clsx from 'clsx';
import {
  CalldataTestPair,
  CALLDATA_TEST_PRIORITY_CHAINS,
} from '@/utils/swapCalldata/testCases';
import { useCalldataTest } from '../hooks/calldataTest';
import { CalldataTestCases } from './CalldataTestCases';

const dexLabel = (dex: DEX_ENUM) => (dex === DEX_ENUM.UNI ? 'Uni' : dex);

export const useCalldataTestSummaries = () =>
  useLiveQuery(readCalldataTestSummaries, [], []) || [];

export const useCalldataTestCoverage = () => {
  const scenarios = useLiveQuery(readCalldataTestScenarios, [], []) || [];
  const plans = useLiveQuery(readCalldataTestPlans, [], []) || [];
  return useMemo(() => buildCalldataTestCoverage(scenarios, plans), [
    scenarios,
    plans,
  ]);
};

export const CalldataChainBadges = ({
  chain,
  summaries,
  coverage,
}: {
  chain: CHAINS_ENUM;
  summaries: CalldataTestSummary[];
  coverage: CalldataTestCoverage;
}) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-4 mr-8 shrink-0">
      {getCalldataTestDexes(chain).map((dex) => {
        const summary = summaries.find(
          (item) => item.chain === chain && item.dex === dex
        );
        const counts = coverage.byChainDex.get(`${chain}:${dex}`);
        const hasFailure = !!counts?.failed || !!counts?.mismatch;
        return (
          <span
            key={dex}
            className={clsx(
              'text-11 leading-[18px] rounded px-4 whitespace-nowrap',
              hasFailure
                ? 'text-r-red-default bg-r-red-light'
                : !!counts?.quoted && counts.passed === counts.quoted
                ? 'text-r-green-default bg-r-green-light'
                : 'text-r-blue-default bg-r-blue-light1'
            )}
            title={t('page.swap.calldataTest.counts', {
              passed: summary?.passed || 0,
              failed: summary?.failed || 0,
              mismatch: summary?.mismatch || 0,
            })}
          >
            {dexLabel(dex)}
            {counts?.quoted ? ` ${counts.passed}/${counts.quoted}` : ' —'}
            {hasFailure ? ' ✕' : ''}
          </span>
        );
      })}
    </span>
  );
};

export const CalldataTestPanel = ({
  chain,
  summaries,
  coverage,
  isWrapToken = false,
  userAddress,
  onSwitchChain,
  onApplyPair,
}: {
  chain: CHAINS_ENUM;
  summaries: CalldataTestSummary[];
  coverage: CalldataTestCoverage;
  isWrapToken?: boolean;
  userAddress: string;
  onSwitchChain: (chain: CHAINS_ENUM) => void;
  onApplyPair: (pair: CalldataTestPair, amount: string) => void;
}) => {
  const { t } = useTranslation();
  const chains = useRabbySelector((state) => state.chains.mainnetList);
  const supportedChains = useMemo(
    () => chains.filter((item) => getCalldataTestDexes(item.enum).length),
    [chains]
  );
  const test = useCalldataTest({ chain, userAddress, coverage });
  const priorityChains = CALLDATA_TEST_PRIORITY_CHAINS.flatMap((chainEnum) => {
    const item = supportedChains.find(
      (candidate) => candidate.enum === chainEnum
    );
    return item ? [item] : [];
  });
  const latest =
    useLiveQuery(() => readLatestCalldataTestResults(chain), [chain], []) || [];
  const storageError = useSyncExternalStore(
    subscribeCalldataTestStorage,
    getCalldataTestStorageError
  );
  const [actionError, setActionError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState<number>();
  const sampleCount = summaries.reduce(
    (sum, item) => sum + item.passed + item.failed + item.mismatch,
    0
  );
  const overall = summaries.reduce(
    (counts, item) => ({
      passed: counts.passed + item.passed,
      failed: counts.failed + item.failed,
      mismatch: counts.mismatch + item.mismatch,
    }),
    { passed: 0, failed: 0, mismatch: 0 }
  );
  const chainIndex = supportedChains.findIndex((item) => item.enum === chain);
  const needsAttempt = (chainEnum: CHAINS_ENUM) =>
    getCalldataTestDexes(chainEnum).some((dex) => {
      const counts = coverage.byChainDex.get(`${chainEnum}:${dex}`);
      return !counts?.total || counts.attempted < counts.total;
    });
  const nextUntested = [
    ...supportedChains.slice(chainIndex + 1),
    ...supportedChains.slice(0, Math.max(chainIndex, 0)),
  ].find((item) => needsAttempt(item.enum));

  const exportResults = async () => {
    setExporting(true);
    setActionError('');
    try {
      const data = buildCalldataTestExport(
        await readCalldataTestDataset(),
        chains
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `swap-calldata-results-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  };

  const clearResults = () => {
    Modal.confirm({
      title: t('page.swap.calldataTest.clearTitle'),
      content: t('page.swap.calldataTest.clearDescription'),
      okText: t('page.swap.calldataTest.clear'),
      cancelText: t('global.cancelButton'),
      onOk: async () => {
        setClearing(true);
        setActionError('');
        try {
          await clearCalldataTestResults();
        } catch (error) {
          setActionError(
            error instanceof Error ? error.message : String(error)
          );
        } finally {
          setClearing(false);
        }
      },
    });
  };

  return (
    <div className="mx-20 mb-8 px-12 py-8 rounded-lg bg-r-neutral-card1 text-r-neutral-title-1">
      <div className="flex items-center gap-8">
        <span className="text-13 font-medium">
          {t('page.swap.calldataTest.title')}
        </span>
        <span className="ml-auto flex gap-8">
          <Button
            size="small"
            onClick={exportResults}
            loading={exporting}
            disabled={!sampleCount || clearing || !!test.progress}
          >
            {t('page.swap.calldataTest.export')}
          </Button>
          <Button
            size="small"
            onClick={clearResults}
            disabled={!sampleCount || exporting || clearing || !!test.progress}
          >
            {t('page.swap.calldataTest.clear')}
          </Button>
        </span>
      </div>
      <div className="mt-4 text-11 text-r-neutral-foot">
        {t('page.swap.calldataTest.progress', {
          samples: sampleCount,
          passed: overall.passed,
          failed: overall.failed,
          mismatch: overall.mismatch,
        })}
      </div>
      <div className="mt-8 text-11 text-r-neutral-foot">
        {t('page.swap.calldataTest.priorityChains')}
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {priorityChains.map((item) => (
          <Button
            key={item.enum}
            size="small"
            type={item.enum === chain ? 'primary' : 'default'}
            disabled={!!test.progress}
            onClick={() => item.enum !== chain && onSwitchChain(item.enum)}
          >
            {item.name}
          </Button>
        ))}
      </div>
      <div className="mt-8 flex items-center gap-4">
        <Button
          size="small"
          aria-label={t('page.swap.calldataTest.previousChain')}
          disabled={!!test.progress || chainIndex <= 0}
          onClick={() => onSwitchChain(supportedChains[chainIndex - 1].enum)}
        >
          ←
        </Button>
        <select
          className="min-w-0 flex-1 rounded px-4 py-4 bg-r-neutral-bg-1 text-12"
          aria-label={t('page.swap.calldataTest.selectChain')}
          value={chain}
          disabled={!!test.progress}
          onChange={(event) => onSwitchChain(event.target.value as CHAINS_ENUM)}
        >
          {supportedChains.map((item) => (
            <option key={item.enum} value={item.enum}>
              {item.name} ·{' '}
              {getCalldataTestDexes(item.enum).map(dexLabel).join(' / ')}
            </option>
          ))}
        </select>
        <Button
          size="small"
          aria-label={t('page.swap.calldataTest.nextChain')}
          disabled={
            !!test.progress ||
            chainIndex < 0 ||
            chainIndex >= supportedChains.length - 1
          }
          onClick={() => onSwitchChain(supportedChains[chainIndex + 1].enum)}
        >
          →
        </Button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <CalldataChainBadges
          chain={chain}
          summaries={summaries}
          coverage={coverage}
        />
        <Button
          size="small"
          disabled={!!test.progress || !nextUntested}
          onClick={() => nextUntested && onSwitchChain(nextUntested.enum)}
        >
          {t('page.swap.calldataTest.nextUntested')}
        </Button>
      </div>
      <CalldataTestCases
        chain={chain}
        coverage={coverage}
        test={test}
        onApplyPair={onApplyPair}
      />
      {isWrapToken && (
        <div className="mt-4 text-11 text-r-neutral-foot">
          {t('page.swap.calldataTest.wrapPairNotice')}
        </div>
      )}
      {getCalldataTestDexes(chain).map((dex) => {
        const summary = summaries.find(
          (item) => item.chain === chain && item.dex === dex
        );
        if (!summary) return null;
        return (
          <div
            key={dex}
            className="mt-2 text-11 flex items-center justify-between gap-4"
          >
            <span>{dexLabel(dex)}</span>
            <span className="text-r-neutral-foot">
              {t('page.swap.calldataTest.counts', {
                passed: summary.passed,
                failed: summary.failed,
                mismatch: summary.mismatch,
              })}
            </span>
          </div>
        );
      })}
      {!!latest.length && (
        <details className="mt-8 text-11">
          <summary className="cursor-pointer text-r-blue-default">
            {t('page.swap.calldataTest.latestSamples')}
          </summary>
          <div className="mt-4 text-r-neutral-foot">
            {t('page.swap.calldataTest.validationPolicy')}
          </div>
          {latest.map((record) => (
            <details key={record.id} className="mt-8">
              <summary className="cursor-pointer break-all">
                {dexLabel(record.dex)} | {record.version} |{' '}
                {record.testCase
                  ? t(`page.swap.calldataTest.${record.testCase}`)
                  : ''}{' '}
                · {t(`page.swap.calldataTest.${record.status}`)}
                {record.request.targetUsd !== undefined &&
                  ` · ≈ $${record.request.targetUsd.toLocaleString()}`}
                {` · ${record.request.slippage}%`}
              </summary>
              <Button
                size="small"
                className="mt-4"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(record, null, 2)
                    );
                    setCopied(record.id);
                  } catch (error) {
                    setActionError(
                      error instanceof Error ? error.message : String(error)
                    );
                  }
                }}
              >
                {t(
                  `page.swap.calldataTest.${
                    copied === record.id ? 'copied' : 'copySample'
                  }`
                )}
              </Button>
              <pre className="mt-4 max-h-[200px] overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(
                  record.decoded
                    ? {
                        decoded: record.decoded,
                        validation: record.validation,
                        firstFailedStep: record.firstFailedStep,
                        reason: record.reason,
                      }
                    : {
                        firstFailedStep: record.firstFailedStep,
                        reason: record.reason,
                        error: record.error,
                      },
                  null,
                  2
                )}
              </pre>
            </details>
          ))}
        </details>
      )}
      {(storageError || actionError) && (
        <div className="mt-4 text-11 text-r-red-default break-all">
          {t('page.swap.calldataTest.storageError', {
            message: storageError || actionError,
          })}
        </div>
      )}
    </div>
  );
};
