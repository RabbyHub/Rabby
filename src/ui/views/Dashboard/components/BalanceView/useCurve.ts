import {
  coerceFloat,
  formatUsdValue,
  isMeaningfulNumber,
  useWallet,
} from '@/ui/utils';
import { useEffect, useMemo, useState } from 'react';

type CurveList = Array<{ timestamp: number; usd_value: number }>;

const formChartData = (
  data: CurveList,
  /** @notice if realtimeNetWorth is not number, it means 'unknown' due to not-loaded or load-failure */
  realtimeNetWorth?: number | null,
  realtimeTimestamp?: number
) => {
  const startData = data[0] || { value: 0, timestamp: 0 };
  const startUsdValue = coerceFloat(startData.usd_value, 0);

  const list =
    data?.map((x) => {
      const change = coerceFloat(x.usd_value) - startUsdValue;

      return {
        value: x.usd_value || 0,
        netWorth: x.usd_value ? `${formatUsdValue(x.usd_value)}` : '$0',
        change: `${formatUsdValue(Math.abs(change))}`,
        isLoss: change < 0,
        changePercent:
          startUsdValue === 0
            ? `${x.usd_value === 0 ? '0' : '100.00'}%`
            : `${(Math.abs(change * 100) / startUsdValue).toFixed(2)}%`,
        timestamp: x.timestamp,
      };
    }) || [];

  // ONLY patch realtime newworth on realtimeNetWorth is LOADED
  if (isMeaningfulNumber(realtimeNetWorth) && realtimeTimestamp) {
    const realtimeChange = realtimeNetWorth - startUsdValue;

    list.push({
      value: realtimeNetWorth || 0,
      netWorth: realtimeNetWorth
        ? `$${formatUsdValue(realtimeNetWorth)}`
        : '$0',
      change: `${formatUsdValue(Math.abs(realtimeChange))}`,
      isLoss: realtimeChange < 0,
      changePercent:
        startUsdValue === 0
          ? `${realtimeNetWorth === 0 ? '0' : '100.00'}%`
          : `${(Math.abs(realtimeChange * 100) / startUsdValue).toFixed(2)}%`,
      timestamp: Math.floor(realtimeTimestamp / 1000),
    });
  }

  const endNetWorth = list?.length
    ? coerceFloat(list[list.length - 1]?.value)
    : 0;
  const assetsChange = endNetWorth - startUsdValue;
  const isEmptyAssets = endNetWorth === 0 && startUsdValue === 0;

  return {
    list,
    netWorth: endNetWorth === 0 ? '$0' : `${formatUsdValue(endNetWorth)}`,
    change: `${formatUsdValue(Math.abs(assetsChange))}`,
    changePercent:
      startUsdValue !== 0
        ? `${Math.abs((assetsChange * 100) / startUsdValue).toFixed(2)}%`
        : `${endNetWorth === 0 ? '0' : '100.00'}%`,
    isLoss: assetsChange < 0,
    isEmptyAssets,
  };
};

export const useCurve = (
  address: string | undefined,
  nonce: number,
  realtimeNetWorth: number | null
) => {
  const [data, setData] = useState<
    {
      timestamp: number;
      usd_value: number;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const select = useMemo(() => {
    return formChartData(data, realtimeNetWorth, new Date().getTime());
  }, [data, realtimeNetWorth]);
  const wallet = useWallet();

  const fetch = async (addr: string, force = false) => {
    const curve = await wallet.getNetCurve(addr, force);
    setData(curve);
    setIsLoading(false);
  };

  const refresh = async () => {
    if (!address) return;
    setIsLoading(true);
    await fetch(address, true);
  };

  useEffect(() => {
    setIsLoading(true);
    setData([]);
  }, [address]);

  useEffect(() => {
    if (!address) return;
    fetch(address);
  }, [address, nonce]);

  return {
    result: isLoading ? undefined : select,
    isLoading,
    refresh,
  };
};
