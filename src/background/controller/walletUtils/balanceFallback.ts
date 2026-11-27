import type {
  AppChainListResponse,
  TotalBalanceResponse,
} from '@rabby-wallet/rabby-api/dist/types';
import {
  BalanceCacheData,
  normalizeBalanceCacheData,
} from '@/db/schema/balance';

// 仅用于跳出 cached() 避免续期 TTL，外层会捕获并返回 fallbackBalance
export class PartialBalanceError extends Error {
  constructor(public fallbackBalance: BalanceCacheData) {
    super('Incomplete balance');
  }
}

// 判断是否为 EVM 缺链错误（error_code = 2）
export const isMissingChainError = (error: unknown): boolean => {
  const message = (error as { message?: unknown })?.message;
  if (typeof message !== 'string') return false;
  try {
    return JSON.parse(message)?.error_code === 2;
  } catch {
    return false;
  }
};

type AppChainSummary = {
  appChainUsdValue: number;
  appChainIds: string[];
};

export const extractValidEvmBalance = (
  result: PromiseSettledResult<TotalBalanceResponse>
): TotalBalanceResponse | null =>
  result.status === 'fulfilled' &&
  typeof result.value?.total_usd_value === 'number'
    ? result.value
    : null;

export const extractValidAppChainBalance = (
  result: PromiseSettledResult<AppChainListResponse>
): AppChainSummary | null => {
  if (result.status !== 'fulfilled') return null;
  const data = result.value;
  // 任意 app 报错都视为本次 AppChain 数据不完整
  if (!Array.isArray(data?.apps) || data.error_apps?.length) return null;

  let appChainUsdValue = 0;
  for (const app of data.apps) {
    for (const item of app?.portfolio_item_list || []) {
      appChainUsdValue += item.stats.net_usd_value;
    }
  }
  return {
    appChainUsdValue,
    appChainIds: data.apps.map((app) => app.id),
  };
};

export const mergeBalanceWithFallback = ({
  evm,
  appChain,
  previous,
  evmError,
}: {
  evm: TotalBalanceResponse | null;
  appChain: AppChainSummary | null;
  previous: BalanceCacheData | null;
  evmError?: unknown;
}): { data: BalanceCacheData; isComplete: boolean } => {
  // 两边都失败，或无旧缓存且 EVM 失败时直接抛错，避免误显示 0
  if (!evm && (!appChain || !previous)) {
    throw evmError ?? new Error('Incomplete balance');
  }

  const evmBase = evm || previous!;
  const evmUsdValue = evm ? evm.total_usd_value : previous!.evmUsdValue;
  const appChainUsdValue =
    appChain?.appChainUsdValue ?? previous?.appChainUsdValue ?? 0;
  const appChainIds = appChain?.appChainIds ?? previous?.appChainIds ?? [];

  return {
    data: normalizeBalanceCacheData({
      ...evmBase,
      evmUsdValue,
      total_usd_value: evmUsdValue + appChainUsdValue,
      appChainIds,
      appChainUsdValue,
    }),
    isComplete: Boolean(evm && appChain),
  };
};
