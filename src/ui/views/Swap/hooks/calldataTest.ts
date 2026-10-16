import { useEffect, useMemo, useRef, useState } from 'react';
import type { CHAINS_ENUM } from '@debank/common';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import { utils } from 'ethers';
import { useWallet } from '@/ui/utils';
import { findChainByEnum } from '@/utils/chain';
import {
  getDefaultSwapToTokenItem,
  StablecoinMapAggregatedByChain,
} from '@/constant/dex-swap';
import {
  buildCalldataTestPairs,
  buildCalldataTestScenarios,
  CALLDATA_TEST_TOKEN_SEARCHES,
  CalldataTestScenario,
} from '@/utils/swapCalldata/testCases';
import { TEMPO_PATH_USD_TOKEN } from '@/constant/tempo';
import { getCalldataTestDexes } from '@/utils/swapCalldata/testSupport';
import {
  CalldataTestCoverage,
  flushCalldataTestResults,
  getCalldataTestScenarioKey,
  getCalldataTestStorageError,
  recordCalldataTestPlan,
} from '@/utils/swapCalldata/testResults';
import { useQuoteMethods } from './quote';
import { getRabbyFeeRate } from './fee';

export const useCalldataTest = ({
  chain,
  userAddress,
  coverage,
}: {
  chain: CHAINS_ENUM;
  userAddress: string;
  coverage: CalldataTestCoverage;
}) => {
  const wallet = useWallet();
  const { getDexQuote, supportedDEXList } = useQuoteMethods();
  const [reloadId, setReloadId] = useState(0);
  const [discoverAll, setDiscoverAll] = useState(false);
  const [usd, setUsd] = useState(20);
  const [slippage, setSlippage] = useState('1');
  const [tokens, setTokens] = useState<{
    key: string;
    native?: TokenItem;
    list: TokenItem[];
    error?: string;
  }>();
  const [progress, setProgress] = useState<{
    current: CalldataTestScenario;
    done: number;
    total: number;
  }>();
  const [runError, setRunError] = useState('');
  const runId = useRef(0);
  const running = useRef(false);
  const stopRequested = useRef(false);
  const [stopping, setStopping] = useState(false);
  const key = `${chain}:${userAddress}:${reloadId}:${discoverAll}`;
  const dexes = getCalldataTestDexes(chain, supportedDEXList);

  useEffect(() => {
    let active = true;
    const chainInfo = findChainByEnum(chain);
    if (!chainInfo || !userAddress || !getCalldataTestDexes(chain).length)
      return;
    const load = async () => {
      const stablecoins = StablecoinMapAggregatedByChain[chain];
      const ids = Array.from(
        new Set(
          [
            chain === 'TEMPO'
              ? TEMPO_PATH_USD_TOKEN
              : chainInfo.nativeTokenAddress,
            getDefaultSwapToTokenItem(chain)?.id,
            stablecoins?.usdc,
            stablecoins?.usdt,
            stablecoins?.dai,
            WrapTokenAddressMap[chain],
          ].filter((id): id is string => !!id)
        )
      );
      const responses = await Promise.allSettled([
        wallet.openapi.getSwapTokenList(userAddress, chainInfo.serverId),
        ...ids.map((id) =>
          wallet.openapi.getToken(userAddress, chainInfo.serverId, id)
        ),
      ]);
      if (!active) return;
      const list = responses.flatMap((result) =>
        result.status === 'fulfilled'
          ? Array.isArray(result.value)
            ? result.value
            : [result.value]
          : []
      );
      const searches = discoverAll
        ? CALLDATA_TEST_TOKEN_SEARCHES
        : CALLDATA_TEST_TOKEN_SEARCHES.slice(0, 12);
      // Use API metadata, never guessed token addresses or decimal precision.
      // Limit discovery concurrency separately from DEX quote requests.
      for (let index = 0; index < searches.length && active; index += 4) {
        const batch = await Promise.allSettled(
          searches
            .slice(index, index + 4)
            .map((symbol) =>
              wallet.openapi.searchToken(
                userAddress,
                symbol,
                chainInfo.serverId
              )
            )
        );
        batch.forEach((result) => {
          if (result.status === 'fulfilled')
            list.push(
              ...result.value.filter(
                (token) =>
                  (token.is_core || token.is_verified) &&
                  searches.some(
                    (symbol) =>
                      symbol.toLowerCase() === token.symbol.toLowerCase()
                  )
              )
            );
        });
      }
      if (!active) return;
      const native = list.find(
        (token) =>
          token.chain === chainInfo.serverId &&
          token.id.toLowerCase() === chainInfo.nativeTokenAddress.toLowerCase()
      );
      const firstError = responses.find(
        (result) => result.status === 'rejected'
      );
      setTokens({
        key,
        native,
        list,
        error:
          firstError?.status === 'rejected'
            ? String(firstError.reason?.message || firstError.reason)
            : undefined,
      });
    };
    load().catch((error) => {
      if (active)
        setTokens({ key, list: [], error: String(error?.message || error) });
    });
    return () => {
      active = false;
    };
  }, [chain, key, userAddress, wallet.openapi, discoverAll]);

  useEffect(() => {
    runId.current += 1;
    running.current = false;
    stopRequested.current = false;
    setStopping(false);
    setProgress(undefined);
    setRunError('');
    return () => {
      runId.current += 1;
      running.current = false;
    };
  }, [chain, userAddress]);

  const pairs = useMemo(() => {
    const chainInfo = findChainByEnum(chain);
    return chainInfo && tokens?.key === key
      ? buildCalldataTestPairs(chainInfo, tokens.native, tokens.list)
      : [];
  }, [chain, key, tokens]);
  const scenarios = useMemo(
    () => buildCalldataTestScenarios(pairs, [usd], [slippage]),
    [pairs, usd, slippage]
  );

  const run = async (pairIds: readonly string[], onlyMissing = false) => {
    if (running.current || !userAddress || !dexes.length) return;
    const selectedIds = new Set(pairIds);
    const selected = scenarios.filter((item) => selectedIds.has(item.pair.id));
    const jobs = selected
      .map((scenario) => ({
        scenario,
        dexes: dexes.filter(
          (dex) =>
            !onlyMissing ||
            coverage.byScenario.get(
              getCalldataTestScenarioKey(chain, dex, scenario.id)
            )?.lastStatus !== 'passed'
        ),
      }))
      .filter((job) => job.dexes.length);
    if (!jobs.length) return;
    running.current = true;
    stopRequested.current = false;
    setStopping(false);
    setRunError('');
    const id = ++runId.current;
    const total = jobs.reduce((sum, job) => sum + job.dexes.length, 0);
    let done = 0;
    setProgress({ current: jobs[0].scenario, done, total });
    try {
      // Save the expected matrix before quoting, so stopped/unfinished runs remain
      // visible in coverage and exports. Hash the large manifest for a compact key.
      const scenarioIds = scenarios.map((item) => item.id).sort();
      await recordCalldataTestPlan({
        key: utils.id(JSON.stringify([chain, [...dexes].sort(), scenarioIds])),
        chain,
        createdAt: Date.now(),
        dexes,
        scenarioIds,
        tokens: Array.from(
          new Map(
            pairs
              .flatMap((pair) => [pair.from, pair.to])
              .map((token) => [
                token.id.toLowerCase(),
                {
                  id: token.id,
                  symbol: token.symbol,
                  decimals: token.decimals,
                },
              ])
          ).values()
        ),
        sizesUsd: [usd],
        slippages: [slippage],
      });
      for (const job of jobs) {
        if (runId.current !== id || stopRequested.current) break;
        const { pair, payAmount, slippage } = job.scenario;
        setProgress({ current: job.scenario, done, total });
        // Insufficient-balance mode skips allowance, nonce and pre-execution.
        // Only fetch and decode quotes; never sign or submit a transaction.
        await Promise.allSettled(
          job.dexes.map((dexId) =>
            getDexQuote({
              chain,
              dexId,
              userAddress,
              payToken: pair.from,
              receiveToken: pair.to,
              payAmount,
              slippage,
              fee: getRabbyFeeRate({
                payAmount,
                payTokenPrice: pair.from.price,
                payToken: pair.from,
                receiveToken: pair.to,
                isWrapToken: false,
              }),
              inSufficient: true,
            })
          )
        );
        await flushCalldataTestResults();
        if (runId.current !== id) break;
        const error = getCalldataTestStorageError();
        if (error) throw new Error(error);
        done += job.dexes.length;
        setProgress({ current: job.scenario, done, total });
        // Avoid starting a burst of hundreds of requests on fast/error responses.
        if (done < total && !stopRequested.current && runId.current === id)
          await new Promise((resolve) => setTimeout(resolve, 250));
      }
    } catch (error) {
      if (runId.current === id)
        setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      if (runId.current === id) {
        running.current = false;
        setProgress(undefined);
        setStopping(false);
      }
    }
  };

  return {
    pairs,
    scenarios,
    dexes,
    usd,
    slippage,
    setUsd,
    setSlippage,
    discoverAll,
    discoverMore: () => {
      setDiscoverAll(true);
      setReloadId((value) => value + 1);
    },
    progress,
    stopping,
    runError,
    loading:
      !!userAddress &&
      !!getCalldataTestDexes(chain).length &&
      tokens?.key !== key,
    error: tokens?.key === key ? tokens.error : undefined,
    reload: () => setReloadId((value) => value + 1),
    run,
    stop: () => {
      stopRequested.current = true;
      setStopping(true);
    },
  };
};
