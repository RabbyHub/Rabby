import { useCallback, useEffect, useMemo, useState } from 'react';

import { CurrencyItem } from '@/background/service/openapi';
import {
  coerceFloat,
  formatCurrency,
  isMeaningfulNumber,
  useWallet,
} from '@/ui/utils';
import { IExtractFromPromise } from '@/ui/utils/type';
import { CurvePointCollection } from '@/background/service/preference';
import { useRequest } from 'ahooks';

type CurveList = Array<{ timestamp: number; usd_value: number }>;

const EXPECTED_CHECK_DIFF = 600;

export const formChartData = (
  data: CurveList,
  /** @notice if realtimeNetWorth is not number, it means 'unknown' due to not-loaded or load-failure */
  realtimeNetWorth?: number | null,
  realtimeTimestamp?: number,
  currency?: CurrencyItem
) => {
  const startData = data[0] || { value: 0, timestamp: 0 };
  const startUsdValue = coerceFloat(startData.usd_value, 0);

  // hotfix: data may be not a array, need to check
  if (!Array.isArray(data)) {
    data = [];
    console.error('CurveList is not a array: ', typeof data);
  }

  const list =
    data?.map((x) => {
      const change = coerceFloat(x.usd_value) - startUsdValue;

      return {
        value: x.usd_value || 0,
        netWorth: x.usd_value
          ? `${formatCurrency(x.usd_value, { currency })}`
          : formatCurrency(0, { currency }),
        change: `${formatCurrency(Math.abs(change), { currency })}`,
        isLoss: change < 0,
        changePercent:
          startUsdValue === 0
            ? `${x.usd_value === 0 ? '0' : '100.00'}%`
            : `${(Math.abs(change * 100) / startUsdValue).toFixed(2)}%`,
        timestamp: x.timestamp,
      };
    }) || [];

  // ONLY patch realtime newworth on realtimeNetWorth is LOADED
  if (
    isMeaningfulNumber(realtimeNetWorth) &&
    realtimeTimestamp &&
    list.length
  ) {
    const realtimeChange = realtimeNetWorth - startUsdValue;

    const lastTwoSecs = [
      list[list.length - 2]?.timestamp || 0,
      list[list.length - 1]?.timestamp || 0,
    ];
    const checkDiff = Math.min(
      Math.max(lastTwoSecs[1] - lastTwoSecs[0], 0),
      EXPECTED_CHECK_DIFF
    );
    const realTimeSec = Math.floor(realtimeTimestamp / 1000);
    const isLastPointSmooth =
      !!lastTwoSecs[1] && realTimeSec - lastTwoSecs[1] <= checkDiff;

    if (isLastPointSmooth) {
      list.push({
        value: realtimeNetWorth || 0,
        netWorth: realtimeNetWorth
          ? `${formatCurrency(realtimeNetWorth, { currency })}`
          : formatCurrency(0, { currency }),
        change: `${formatCurrency(Math.abs(realtimeChange), { currency })}`,
        isLoss: realtimeChange < 0,
        changePercent:
          startUsdValue === 0
            ? `${realtimeNetWorth === 0 ? '0' : '100.00'}%`
            : `${(Math.abs(realtimeChange * 100) / startUsdValue).toFixed(2)}%`,
        timestamp: realTimeSec,
      });
    }
  }

  const endNetWorth = list?.length
    ? coerceFloat(list[list.length - 1]?.value)
    : 0;
  const assetsChange = endNetWorth - startUsdValue;
  const isEmptyAssets = endNetWorth === 0 && startUsdValue === 0;

  return {
    list,
    netWorth:
      endNetWorth === 0
        ? formatCurrency(0, { currency })
        : `${formatCurrency(endNetWorth, { currency })}`,
    change: `${formatCurrency(Math.abs(assetsChange), { currency })}`,
    startUsdValue,
    changePercent:
      startUsdValue !== 0
        ? `${Math.abs((assetsChange * 100) / startUsdValue).toFixed(2)}%`
        : `${endNetWorth === 0 ? '0' : '100.00'}%`,
    isLoss: assetsChange < 0,
    isEmptyAssets,
  };
};

export type CurveChartData = ReturnType<typeof formChartData>;
export const useCurve = (
  address: string | undefined,
  options: {
    nonce: number;
    realtimeNetWorth: number | null;
    initData?: CurvePointCollection;
    currency?: CurrencyItem;
  }
) => {
  const { nonce, realtimeNetWorth, initData = [], currency } = options;
  const [data, setData] = useState<CurvePointCollection>(initData);

  const wallet = useWallet();

  const { runAsync: fetch, loading: isLoading } = useRequest(
    async (addr: string, force = false) => {
      const curve = await wallet.getInMemoryNetCurve(addr, force);
      return curve;
    },
    {
      onSuccess(res) {
        setData(res);
      },
      onError(e) {
        console.error(e);
      },
      manual: true,
    }
  );

  const refresh = useCallback(async () => {
    if (!address) return;
    await fetch(address, true);
  }, [address]);

  const isCurveCollectionExpired = useCallback(async () => {
    if (!address) return false;

    try {
      return wallet.isInMemoryNetCurveExpired(address);
    } catch (error) {
      return false;
    }
  }, [address]);

  useEffect(() => {
    if (nonce < 0) return;

    if (!address) return;

    setData([]);
    fetch(address, false);
  }, [address, nonce]);

  const select = useMemo(() => {
    return formChartData(
      data,
      realtimeNetWorth,
      new Date().getTime(),
      currency
    );
  }, [data, realtimeNetWorth, currency]);

  return {
    curveData: data,
    curveChartData: isLoading ? undefined : select,
    isLoading,
    isCurveCollectionExpired,
    refresh,
  };
};
