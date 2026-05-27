import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Skeleton, message } from 'antd';
import { useRequest } from 'ahooks';
import BigNumber from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import type { TokenItem } from 'background/service/openapi';
import type { Hex } from 'viem';
import { useTranslation } from 'react-i18next';

import {
  UNIV2_PAIR_ABI,
  UNIV3_POOL_ABI,
  buildUniv2AddLiquidityTx,
  buildUniv2RemoveLiquidityTx,
  buildUniv3CollectTx,
  buildUniv3DecreaseAndCollectTx,
  buildUniv3IncreaseLiquidityTx,
  buildUniv3MintTx,
  encodeUniv3Collect,
  encodeUniv3Multicall,
  getSqrtRatioAtUniv3Tick,
  getUniv3AmountsForLiquidity,
  getUniv3LiquidityForAmount0,
  getUniv3LiquidityForAmount1,
  quoteUniv2AddLiquidity,
  quoteUniv3DecreaseLiquidity,
  quoteUniv3Liquidity,
  quoteUniv3RangeDeposit,
  resolveUniv2PoolEntryWithClient,
  resolveUniv3PoolEntryWithClient,
} from '@rabby-wallet/staking-sdk';
import type {
  StakingPool as SdkStakingPool,
  StakingTxBuildResult,
  Univ2PoolKey,
  Univ3PoolKey,
  Univ3QuotePoolState,
  Univ3RangeStrategy,
} from '@rabby-wallet/staking-sdk';

import type { Account } from '@/background/service/preference';
import { Popup } from '@/ui/component';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { formatPrice, useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

import { ActionPopupTitle } from './ActionModalShared';
import {
  LpClaimContent,
  LpDepositContent,
  LpFooterMessages,
  LpPercentActionContent,
} from './LpActionModalSections';
import type {
  LpActionModalTokenBalanceInfo as TokenBalanceInfo,
  LpTokenInputSide as TokenInputSide,
  LpV3RangeOption as V3RangeOption,
} from './LpActionModalSections';
import type { StakingPool, StakingToken } from '../types';
import type { StakingPositionItem } from '../hooks/useStakingPositionSummary';
import type { StakingUniv3RangeBps } from '../hooks/useStakingPendingActions';
import { useStakingMiniSign } from '../hooks/useStakingMiniSign';
import {
  getStakingTokenBalanceAmount,
  isStakingAmountPrecisionExceeded,
} from '../utils/format';
import { normalizeStakingPoolToPoolKey } from '../utils/poolKey';
import {
  buildStakingMiniSignTxs,
  createStakingReadContractClient,
  getStakingMainTxHash,
  readStakingContract,
} from '../utils/tx';
import './actionModal.less';

type LpAction = 'deposit' | 'withdraw' | 'claim';
type V3PositionInputAvailability = TokenInputSide | 'both';
type V3QuotedRangeForDisplay = StakingUniv3RangeBps & {
  mode?: string;
  side?: TokenInputSide;
};

interface LpActionModalProps {
  visible: boolean;
  action: LpAction;
  pool: StakingPool;
  account: Account;
  position?: StakingPositionItem | null;
  claimPositions?: StakingPositionItem[];
  onCancel: () => void;
  onSubmitted: (payload: {
    hash: string;
    univ3Range?: StakingUniv3RangeBps;
  }) => void;
}

const DEFAULT_SLIPPAGE_BPS = 50;
const DEFAULT_DEADLINE_SECONDS = 20 * 60;
const V3_DEFAULT_RANGE_PRESET: V3RangeOption = '20%';
const V3_RANGE_OPTIONS: Array<{ label: V3RangeOption; bps: number }> = [
  { label: '1%', bps: 100 },
  { label: '10%', bps: 1_000 },
  { label: '20%', bps: 2_000 },
  { label: '40%', bps: 4_000 },
];
const PRICE_DIFF_CONFIRM_THRESHOLD = 0.05;
const Q96 = new BigNumber(2).pow(96);

const toSdkPool = (pool: StakingPool) => (pool as unknown) as SdkStakingPool;

const toRawDecimal = (amount: string, decimals: number) =>
  parseUnits(amount || '0', decimals).toString();

const toRawBigInt = (amount: string | number | undefined, decimals: number) => {
  try {
    return BigInt(toRawDecimal(String(amount || '0'), decimals));
  } catch {
    return 0n;
  }
};

const safeBigInt = (value?: string | bigint | number | null) => {
  try {
    return BigInt(value || 0);
  } catch {
    return 0n;
  }
};

const rawToDecimalInput = (raw: string | bigint, decimals: number) => {
  const text = formatUnits(raw.toString(), decimals);
  return text.includes('.') ? text.replace(/\.?0+$/, '') || '0' : text;
};

const toDeadline = () =>
  Math.floor(Date.now() / 1000 + DEFAULT_DEADLINE_SECONDS).toString();

const sameAddress = (left?: string | null, right?: string | null) =>
  !!left && !!right && left.toLowerCase() === right.toLowerCase();

const getTokenBalanceRaw = (tokenInfo?: TokenBalanceInfo) =>
  tokenInfo ? toRawBigInt(tokenInfo.balance, tokenInfo.decimals) : 0n;

const getSelectedV3Range = (preset: V3RangeOption) =>
  V3_RANGE_OPTIONS.find((item) => item.label === preset) || V3_RANGE_OPTIONS[2];

const formatRangeBps = (bps: number) =>
  `${new BigNumber(bps).div(100).toFixed()}%`;

const formatSignedRangeBps = (bps: number, sign: '-' | '+') =>
  bps === 0 ? '0%' : `${sign}${formatRangeBps(bps)}`;

const formatV3RangeText = (range: V3QuotedRangeForDisplay) => {
  if (range.mode === 'single-sided') {
    const sign = range.side === 'token1' ? '-' : '+';
    return `${formatSignedRangeBps(
      range.lowerBps,
      sign
    )} / ${formatSignedRangeBps(range.upperBps, sign)}`;
  }

  return `${formatSignedRangeBps(range.lowerBps, '-')} / ${formatSignedRangeBps(
    range.upperBps,
    '+'
  )}`;
};

const formatPriceNumber = (value?: BigNumber | null) => {
  if (!value || !value.isFinite() || value.lte(0)) {
    return '-';
  }
  return formatPrice(value.toFixed());
};

const getV3PositionSqrtRatios = (tickLower: number, tickUpper: number) => {
  const sqrtLower = BigInt(getSqrtRatioAtUniv3Tick(tickLower).toString());
  const sqrtUpper = BigInt(getSqrtRatioAtUniv3Tick(tickUpper).toString());

  return sqrtLower < sqrtUpper
    ? { sqrtA: sqrtLower, sqrtB: sqrtUpper }
    : { sqrtA: sqrtUpper, sqrtB: sqrtLower };
};

const getV3PositionInputAvailability = ({
  poolState,
  tickLower,
  tickUpper,
}: {
  poolState: Univ3QuotePoolState;
  tickLower: number;
  tickUpper: number;
}): V3PositionInputAvailability | null => {
  try {
    const sqrtX = BigInt(poolState.sqrtPriceX96.toString());
    const { sqrtA, sqrtB } = getV3PositionSqrtRatios(tickLower, tickUpper);

    if (sqrtX <= sqrtA) {
      return 'token0';
    }
    if (sqrtX >= sqrtB) {
      return 'token1';
    }
    return 'both';
  } catch {
    return null;
  }
};

const quoteV3PositionAmountsFromSide = ({
  poolState,
  tickLower,
  tickUpper,
  side,
  inputRaw,
}: {
  poolState: Univ3QuotePoolState;
  tickLower: number;
  tickUpper: number;
  side: TokenInputSide;
  inputRaw: string;
}) => {
  const amount = safeBigInt(inputRaw);
  if (amount <= 0n) {
    return { amount0: 0n, amount1: 0n };
  }

  const sqrtX = BigInt(poolState.sqrtPriceX96.toString());
  const { sqrtA, sqrtB } = getV3PositionSqrtRatios(tickLower, tickUpper);
  let liquidity = 0n;

  if (side === 'token0') {
    if (sqrtX >= sqrtB) {
      return null;
    }
    liquidity = getUniv3LiquidityForAmount0({
      sqrtRatioAX96: sqrtX > sqrtA ? sqrtX : sqrtA,
      sqrtRatioBX96: sqrtB,
      amount0: amount,
    });
  } else {
    if (sqrtX <= sqrtA) {
      return null;
    }
    liquidity = getUniv3LiquidityForAmount1({
      sqrtRatioAX96: sqrtA,
      sqrtRatioBX96: sqrtX < sqrtB ? sqrtX : sqrtB,
      amount1: amount,
    });
  }

  if (liquidity <= 0n) {
    return { amount0: 0n, amount1: 0n };
  }

  return getUniv3AmountsForLiquidity({
    sqrtRatioX96: sqrtX,
    sqrtRatioAX96: sqrtA,
    sqrtRatioBX96: sqrtB,
    liquidity,
    roundUp: true,
  });
};

const getV2PoolPrice = ({
  reserve0,
  reserve1,
  token0Decimals,
  token1Decimals,
}: {
  reserve0: bigint;
  reserve1: bigint;
  token0Decimals: number;
  token1Decimals: number;
}) => {
  if (reserve0 <= 0n || reserve1 <= 0n) {
    return null;
  }
  return new BigNumber(reserve1.toString())
    .div(reserve0.toString())
    .multipliedBy(new BigNumber(10).pow(token0Decimals - token1Decimals));
};

const getV3PoolPrice = ({
  sqrtPriceX96,
  token0Decimals,
  token1Decimals,
}: {
  sqrtPriceX96: string;
  token0Decimals: number;
  token1Decimals: number;
}) => {
  const sqrt = new BigNumber(sqrtPriceX96);
  if (!sqrt.isFinite() || sqrt.lte(0)) {
    return null;
  }
  return sqrt
    .div(Q96)
    .pow(2)
    .multipliedBy(new BigNumber(10).pow(token0Decimals - token1Decimals));
};

const multiplyRawByPercent = (raw: string, percent: number) =>
  ((BigInt(raw || '0') * BigInt(percent)) / 100n).toString();

const hasPositiveRaw = (raw?: string | bigint) => BigInt(raw || '0') > 0n;

const getV3RangeStrategy = ({
  raw0,
  raw1,
  selectedRange,
}: {
  raw0: string;
  raw1: string;
  selectedRange: { bps: number };
}): Univ3RangeStrategy | null => {
  const amount0Positive = hasPositiveRaw(raw0);
  const amount1Positive = hasPositiveRaw(raw1);

  if (!amount0Positive && !amount1Positive) {
    return null;
  }

  if (amount0Positive && !amount1Positive) {
    return {
      type: 'single-sided',
      side: 'token0',
      widthBps: selectedRange.bps,
      gapBps: 0,
    };
  }

  if (!amount0Positive && amount1Positive) {
    return {
      type: 'single-sided',
      side: 'token1',
      widthBps: selectedRange.bps,
      gapBps: 0,
    };
  }

  return {
    type: 'amount-ratio',
    constraints: {
      mustIncludeCurrentPrice: true,
      targetWidthBps: selectedRange.bps,
      maxWidthBps: selectedRange.bps,
    },
  };
};

const applySlippageToRaw = (raw: bigint, slippageBps = DEFAULT_SLIPPAGE_BPS) =>
  ((raw * BigInt(10000 - slippageBps)) / 10000n).toString();

const findToken = (
  tokens: StakingToken[],
  address?: string,
  fallbackIndex = 0
) =>
  tokens.find((token) => sameAddress(token.id, address)) ||
  tokens[fallbackIndex];

const buildTokenBalanceInfo = async ({
  wallet,
  account,
  pool,
  token,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  token: StakingToken;
}): Promise<TokenBalanceInfo> => {
  const apiToken = await wallet.openapi.getToken(
    account.address,
    token.chain_id || pool.chain_id,
    token.id
  );
  const decimals = apiToken?.decimals ?? token.decimals ?? 18;
  const balance = getStakingTokenBalanceAmount(apiToken, apiToken?.amount);
  const price = apiToken?.price ?? token.price;
  const debankPrice = apiToken?.price;

  return {
    token: {
      ...token,
      decimals,
      price: price ?? undefined,
      logo_url: token.logo_url || apiToken?.logo_url,
    },
    tokenItem: {
      id: token.id,
      chain: token.chain_id || pool.chain_id,
      symbol: token.symbol,
      display_symbol: token.symbol,
      logo_url: token.logo_url || apiToken?.logo_url,
      amount: Number(balance || 0),
      decimals,
      price: price ?? undefined,
      raw_amount_hex_str: apiToken?.raw_amount_hex_str,
    } as TokenItem,
    balance,
    decimals,
    price,
    debankPrice,
  };
};

export const LpActionModal = ({
  visible,
  action,
  pool,
  account,
  position,
  claimPositions,
  onCancel,
  onSubmitted,
}: LpActionModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const { sign } = useStakingMiniSign({
    account,
    chainServerId: pool.chain_id,
  });
  const chainInfo = findChainByServerID(pool.chain_id);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [lastInputSide, setLastInputSide] = useState<TokenInputSide | null>(
    null
  );
  const [v3RangePreset, setV3RangePreset] = useState<V3RangeOption>(
    V3_DEFAULT_RANGE_PRESET
  );
  const [priceWarningAccepted, setPriceWarningAccepted] = useState(false);
  const [percent, setPercent] = useState(100);
  const [selectedPercentPreset, setSelectedPercentPreset] = useState<
    number | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAmount0('');
      setAmount1('');
      setLastInputSide(null);
      setV3RangePreset(V3_DEFAULT_RANGE_PRESET);
      setPriceWarningAccepted(false);
      setPercent(100);
      setSelectedPercentPreset(null);
    }
  }, [visible]);

  const token0 = pool.tokens.supplies[0];
  const token1 = pool.tokens.supplies[1];
  const title =
    action === 'deposit'
      ? t('page.staking.actions.deposit')
      : action === 'withdraw'
      ? t('page.staking.actions.withdraw')
      : t('page.staking.actions.claim');
  const isV2 = pool.type === 'univ2';
  const isV3 = pool.type === 'univ3';
  const isPositionAction = !!position?.raw?.univ3;
  const isV3PositionDeposit = isV3 && isPositionAction && action === 'deposit';
  const isV3RangeDeposit = isV3 && !isPositionAction && action === 'deposit';

  const { data: tokenInfos, loading: tokenLoading } = useRequest(
    async () => {
      if (!visible || action === 'claim') {
        return [];
      }
      const tokens = [token0, token1].filter(Boolean) as StakingToken[];
      return Promise.all(
        tokens.map((token) =>
          buildTokenBalanceInfo({ wallet, account, pool, token })
        )
      );
    },
    {
      ready: visible && action !== 'claim' && !!token0 && !!token1,
      refreshDeps: [account.address, pool.chain_id, pool.id, visible, action],
    }
  );

  const { data: univ2Entry } = useRequest(
    async () => {
      if (!visible || !isV2) {
        return null;
      }
      const client = createStakingReadContractClient({
        wallet,
        chainServerId: pool.chain_id,
        account,
      });
      return resolveUniv2PoolEntryWithClient({
        key: normalizeStakingPoolToPoolKey(pool) as Univ2PoolKey,
        client,
      });
    },
    {
      ready: visible && isV2,
      refreshDeps: [account.address, pool.chain_id, pool.id, visible],
    }
  );

  const { data: univ3Entry } = useRequest(
    async () => {
      if (!visible || !isV3) {
        return null;
      }
      const client = createStakingReadContractClient({
        wallet,
        chainServerId: pool.chain_id,
        account,
      });
      return resolveUniv3PoolEntryWithClient({
        key: normalizeStakingPoolToPoolKey(pool) as Univ3PoolKey,
        client,
      });
    },
    {
      ready: visible && isV3,
      refreshDeps: [account.address, pool.chain_id, pool.id, visible],
    }
  );

  const { data: univ2Facts } = useRequest(
    async () => {
      if (!visible || !univ2Entry) {
        return null;
      }
      const [rawReserves, rawTotalSupply, rawLpBalance] = await Promise.all([
        readStakingContract({
          wallet,
          chainServerId: pool.chain_id,
          account,
          address: univ2Entry.pair,
          abi: UNIV2_PAIR_ABI,
          functionName: 'getReserves',
        }),
        readStakingContract({
          wallet,
          chainServerId: pool.chain_id,
          account,
          address: univ2Entry.pair,
          abi: UNIV2_PAIR_ABI,
          functionName: 'totalSupply',
        }),
        readStakingContract({
          wallet,
          chainServerId: pool.chain_id,
          account,
          address: univ2Entry.lpToken,
          abi: UNIV2_PAIR_ABI,
          functionName: 'balanceOf',
          args: [account.address],
        }),
      ]);
      const reserves = rawReserves as readonly unknown[];
      return {
        reserve0: BigInt(String(reserves[0] || 0)),
        reserve1: BigInt(String(reserves[1] || 0)),
        totalSupply: BigInt(String(rawTotalSupply || 0)),
        lpBalance: BigInt(String(rawLpBalance || 0)),
      };
    },
    {
      ready: visible && isV2 && !!univ2Entry,
      refreshDeps: [
        account.address,
        pool.chain_id,
        pool.id,
        visible,
        univ2Entry?.pair,
      ],
    }
  );

  const { data: univ3PoolState } = useRequest(
    async () => {
      if (!visible || !univ3Entry) {
        return null;
      }
      const slot0 = (await readStakingContract({
        wallet,
        chainServerId: pool.chain_id,
        account,
        address: univ3Entry.pool,
        abi: UNIV3_POOL_ABI,
        functionName: 'slot0',
      })) as readonly unknown[];
      return {
        sqrtPriceX96: String(slot0[0]),
        tickCurrent: Number(slot0[1]),
        tickSpacing: univ3Entry.tickSpacing,
        token0: univ3Entry.token0,
        token1: univ3Entry.token1,
        fee: univ3Entry.fee,
      };
    },
    {
      ready: visible && isV3 && !!univ3Entry,
      refreshDeps: [
        account.address,
        pool.chain_id,
        pool.id,
        visible,
        univ3Entry?.pool,
      ],
    }
  );

  const normalizedTokens = useMemo(() => {
    if (!tokenInfos?.length) {
      return { token0Info: undefined, token1Info: undefined };
    }
    if (!univ2Entry && !univ3Entry) {
      return { token0Info: tokenInfos[0], token1Info: tokenInfos[1] };
    }
    const resolvedToken0 = univ2Entry?.token0 || univ3Entry?.token0;
    const resolvedToken1 = univ2Entry?.token1 || univ3Entry?.token1;
    return {
      token0Info:
        tokenInfos.find((item) => sameAddress(item.token.id, resolvedToken0)) ||
        tokenInfos[0],
      token1Info:
        tokenInfos.find((item) => sameAddress(item.token.id, resolvedToken1)) ||
        tokenInfos[1],
    };
  }, [tokenInfos, univ2Entry, univ3Entry]);

  const actionState = pool.actions?.[action];
  const disabledReason = !chainInfo
    ? t('page.staking.actionModal.unsupportedChain')
    : actionState?.is_supported !== true
    ? actionState?.reason || t('page.staking.actionModal.unavailable')
    : undefined;
  const amount0PrecisionExceeded =
    action === 'deposit' &&
    !!amount0 &&
    isStakingAmountPrecisionExceeded(
      amount0,
      normalizedTokens.token0Info?.decimals
    );
  const amount1PrecisionExceeded =
    action === 'deposit' &&
    !!amount1 &&
    isStakingAmountPrecisionExceeded(
      amount1,
      normalizedTokens.token1Info?.decimals
    );
  const amountInputError = amount0PrecisionExceeded || amount1PrecisionExceeded;

  const raw0 = useMemo(() => {
    try {
      if (amount0PrecisionExceeded) {
        return '0';
      }
      return normalizedTokens.token0Info
        ? toRawDecimal(amount0, normalizedTokens.token0Info.decimals)
        : '0';
    } catch {
      return '0';
    }
  }, [amount0, amount0PrecisionExceeded, normalizedTokens.token0Info]);
  const raw1 = useMemo(() => {
    try {
      if (amount1PrecisionExceeded) {
        return '0';
      }
      return normalizedTokens.token1Info
        ? toRawDecimal(amount1, normalizedTokens.token1Info.decimals)
        : '0';
    } catch {
      return '0';
    }
  }, [amount1, amount1PrecisionExceeded, normalizedTokens.token1Info]);

  const token0BalanceRaw = useMemo(
    () => getTokenBalanceRaw(normalizedTokens.token0Info),
    [normalizedTokens.token0Info]
  );
  const token1BalanceRaw = useMemo(
    () => getTokenBalanceRaw(normalizedTokens.token1Info),
    [normalizedTokens.token1Info]
  );
  const v3SelectedRange = useMemo(() => getSelectedV3Range(v3RangePreset), [
    v3RangePreset,
  ]);
  const v3PositionInputAvailability = useMemo(() => {
    const raw = position?.raw?.univ3;
    if (!isV3PositionDeposit || !raw || !univ3PoolState) {
      return null;
    }

    return getV3PositionInputAvailability({
      poolState: univ3PoolState,
      tickLower: raw.tickLower,
      tickUpper: raw.tickUpper,
    });
  }, [isV3PositionDeposit, position, univ3PoolState]);
  const token0V3PositionUnavailable =
    isV3PositionDeposit && v3PositionInputAvailability === 'token1';
  const token1V3PositionUnavailable =
    isV3PositionDeposit && v3PositionInputAvailability === 'token0';
  const token0InputDisabled =
    token0V3PositionUnavailable ||
    (isV3PositionDeposit && lastInputSide === 'token1');
  const token1InputDisabled =
    token1V3PositionUnavailable ||
    (isV3PositionDeposit && lastInputSide === 'token0');
  const token0MaxDisabled = token0V3PositionUnavailable;
  const token1MaxDisabled = token1V3PositionUnavailable;
  const v2InputSide = useMemo<TokenInputSide | null>(() => {
    if (!isV2 || action !== 'deposit') {
      return null;
    }
    if (lastInputSide) {
      return lastInputSide;
    }
    if (hasPositiveRaw(raw0)) {
      return 'token0';
    }
    if (hasPositiveRaw(raw1)) {
      return 'token1';
    }
    return null;
  }, [action, isV2, lastInputSide, raw0, raw1]);

  const v2AddQuote = useMemo(() => {
    if (!isV2 || !univ2Facts || action !== 'deposit' || !v2InputSide) {
      return null;
    }
    try {
      return quoteUniv2AddLiquidity({
        reserve0: univ2Facts.reserve0,
        reserve1: univ2Facts.reserve1,
        amount0Desired: v2InputSide === 'token0' ? raw0 : undefined,
        amount1Desired: v2InputSide === 'token1' ? raw1 : undefined,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });
    } catch {
      return null;
    }
  }, [action, isV2, raw0, raw1, univ2Facts, v2InputSide]);

  const v2WithdrawQuote = useMemo(() => {
    if (!isV2 || !univ2Facts || action !== 'withdraw') {
      return null;
    }
    if (univ2Facts.totalSupply <= 0n || univ2Facts.lpBalance <= 0n) {
      return null;
    }
    const liquidity = (univ2Facts.lpBalance * BigInt(percent)) / 100n;
    const amount0 = (liquidity * univ2Facts.reserve0) / univ2Facts.totalSupply;
    const amount1 = (liquidity * univ2Facts.reserve1) / univ2Facts.totalSupply;
    return {
      liquidity,
      amount0,
      amount1,
      amount0Min: applySlippageToRaw(amount0),
      amount1Min: applySlippageToRaw(amount1),
    };
  }, [action, isV2, percent, univ2Facts]);

  const v3DepositQuote = useMemo(() => {
    if (!isV3 || !univ3PoolState || action !== 'deposit') {
      return null;
    }
    try {
      if (position?.raw?.univ3) {
        return quoteUniv3Liquidity({
          poolState: univ3PoolState,
          amount0Desired: raw0,
          amount1Desired: raw1,
          tickLower: position.raw.univ3.tickLower,
          tickUpper: position.raw.univ3.tickUpper,
          slippageBps: DEFAULT_SLIPPAGE_BPS,
        });
      }

      if (isV3RangeDeposit && (amount0 === '' || amount1 === '')) {
        return null;
      }

      const rangeStrategy = getV3RangeStrategy({
        raw0,
        raw1,
        selectedRange: v3SelectedRange,
      });
      if (!rangeStrategy) {
        return null;
      }

      return quoteUniv3RangeDeposit({
        poolState: univ3PoolState,
        amount0Desired: raw0,
        amount1Desired: raw1,
        rangeStrategy,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });
    } catch {
      return null;
    }
  }, [
    action,
    amount0,
    amount1,
    isV3,
    isV3RangeDeposit,
    position,
    raw0,
    raw1,
    univ3PoolState,
    v3SelectedRange,
  ]);

  const v3WithdrawQuote = useMemo(() => {
    const raw = position?.raw?.univ3;
    if (!isV3 || !raw || !univ3PoolState || action !== 'withdraw') {
      return null;
    }
    try {
      const liquidity = multiplyRawByPercent(raw.liquidity, percent);
      if (BigInt(liquidity) <= 0n) {
        return null;
      }
      return quoteUniv3DecreaseLiquidity({
        poolState: univ3PoolState,
        tickLower: raw.tickLower,
        tickUpper: raw.tickUpper,
        liquidity,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
        tokensOwed0: raw.tokensOwed0,
        tokensOwed1: raw.tokensOwed1,
      });
    } catch {
      return null;
    }
  }, [action, isV3, percent, position, univ3PoolState]);

  const claimTargets = useMemo(() => {
    if (action !== 'claim') {
      return [];
    }
    if (position?.raw?.univ3) {
      return [position];
    }
    return (claimPositions || []).filter((item) => item.raw?.univ3);
  }, [action, claimPositions, position]);

  const requiredRaw0ForBalance = useMemo(() => {
    if (action !== 'deposit') {
      return 0n;
    }
    if (isV2) {
      return v2AddQuote?.amount0 || 0n;
    }
    if (isV3) {
      return v3DepositQuote?.amount0 || safeBigInt(raw0);
    }
    return 0n;
  }, [action, isV2, isV3, raw0, v2AddQuote, v3DepositQuote]);

  const requiredRaw1ForBalance = useMemo(() => {
    if (action !== 'deposit') {
      return 0n;
    }
    if (isV2) {
      return v2AddQuote?.amount1 || 0n;
    }
    if (isV3) {
      return v3DepositQuote?.amount1 || safeBigInt(raw1);
    }
    return 0n;
  }, [action, isV2, isV3, raw1, v2AddQuote, v3DepositQuote]);

  const token0Insufficient =
    action === 'deposit' && requiredRaw0ForBalance > token0BalanceRaw;
  const token1Insufficient =
    action === 'deposit' && requiredRaw1ForBalance > token1BalanceRaw;
  const token0InputError = token0Insufficient || amount0PrecisionExceeded;
  const token1InputError = token1Insufficient || amount1PrecisionExceeded;
  const v3RangeDepositInputsComplete =
    !isV3RangeDeposit || (amount0 !== '' && amount1 !== '');
  const v3RangeDepositHasPositiveAmount =
    !isV3RangeDeposit || hasPositiveRaw(raw0) || hasPositiveRaw(raw1);
  const balanceError = useMemo(() => {
    const symbols = [
      token0Insufficient ? normalizedTokens.token0Info?.token.symbol : null,
      token1Insufficient ? normalizedTokens.token1Info?.token.symbol : null,
    ].filter(Boolean);
    if (!symbols.length) {
      return '';
    }
    return t('page.staking.actionModal.insufficientBalance', {
      symbols: symbols.join(' & '),
    });
  }, [
    normalizedTokens.token0Info?.token.symbol,
    normalizedTokens.token1Info?.token.symbol,
    t,
    token0Insufficient,
    token1Insufficient,
  ]);

  const priceDiffInfo = useMemo(() => {
    if (
      action !== 'deposit' ||
      !normalizedTokens.token0Info ||
      !normalizedTokens.token1Info
    ) {
      return null;
    }
    const token0Price = new BigNumber(
      normalizedTokens.token0Info.debankPrice || 0
    );
    const token1Price = new BigNumber(
      normalizedTokens.token1Info.debankPrice || 0
    );
    if (
      !token0Price.isFinite() ||
      !token1Price.isFinite() ||
      token0Price.lte(0) ||
      token1Price.lte(0)
    ) {
      return null;
    }

    const marketPrice = token0Price.div(token1Price);
    const poolPrice = isV2
      ? univ2Facts
        ? getV2PoolPrice({
            reserve0: univ2Facts.reserve0,
            reserve1: univ2Facts.reserve1,
            token0Decimals: normalizedTokens.token0Info.decimals,
            token1Decimals: normalizedTokens.token1Info.decimals,
          })
        : null
      : isV3 && univ3PoolState
      ? getV3PoolPrice({
          sqrtPriceX96: univ3PoolState.sqrtPriceX96,
          token0Decimals: normalizedTokens.token0Info.decimals,
          token1Decimals: normalizedTokens.token1Info.decimals,
        })
      : null;

    if (!poolPrice || !poolPrice.isFinite() || poolPrice.lte(0)) {
      return null;
    }

    return {
      poolPrice,
      marketPrice,
      diffRatio: poolPrice.minus(marketPrice).abs().div(marketPrice).toNumber(),
      token0Symbol: normalizedTokens.token0Info.token.symbol,
      token1Symbol: normalizedTokens.token1Info.token.symbol,
    };
  }, [
    action,
    isV2,
    isV3,
    normalizedTokens.token0Info,
    normalizedTokens.token1Info,
    univ2Facts,
    univ3PoolState,
  ]);
  const needsPriceConfirm =
    action === 'deposit' &&
    !!priceDiffInfo &&
    priceDiffInfo.diffRatio > PRICE_DIFF_CONFIRM_THRESHOLD;
  const priceDiffSignature = priceDiffInfo
    ? [
        priceDiffInfo.token0Symbol,
        priceDiffInfo.token1Symbol,
        priceDiffInfo.poolPrice.toFixed(),
        priceDiffInfo.marketPrice.toFixed(),
      ].join('|')
    : '';

  useEffect(() => {
    setPriceWarningAccepted(false);
  }, [priceDiffSignature]);

  const canSubmit = useMemo(() => {
    if (disabledReason) {
      return false;
    }
    if (action === 'deposit' && balanceError) {
      return false;
    }
    if (action === 'deposit' && amountInputError) {
      return false;
    }
    if (action === 'deposit') {
      if (!v3RangeDepositInputsComplete) {
        return false;
      }
      if (!v3RangeDepositHasPositiveAmount) {
        return false;
      }
      return isV2
        ? !!v2AddQuote &&
            hasPositiveRaw(v2AddQuote.amount0) &&
            hasPositiveRaw(v2AddQuote.amount1)
        : !!v3DepositQuote &&
            (hasPositiveRaw(v3DepositQuote.amount0) ||
              hasPositiveRaw(v3DepositQuote.amount1));
    }
    if (action === 'withdraw') {
      return isV2 ? !!v2WithdrawQuote : !!v3WithdrawQuote;
    }
    return !!claimTargets.length;
  }, [
    action,
    amountInputError,
    balanceError,
    claimTargets.length,
    disabledReason,
    isV2,
    v2AddQuote,
    v2WithdrawQuote,
    v3DepositQuote,
    v3RangeDepositHasPositiveAmount,
    v3RangeDepositInputsComplete,
    v3WithdrawQuote,
  ]);

  const v3QuotedRange = (v3DepositQuote as {
    range?: StakingUniv3RangeBps;
  } | null)?.range;

  const buildUniv3ClaimAllTx = useCallback((): StakingTxBuildResult => {
    if (!chainInfo || !univ3Entry || !claimTargets.length) {
      throw new Error(t('page.staking.actionModal.noClaimableRewards'));
    }

    const calls = claimTargets
      .map((item) => item.raw?.univ3)
      .filter(Boolean)
      .map((raw) =>
        encodeUniv3Collect({
          tokenId: raw!.tokenId,
          receiver: account.address,
        })
      );

    return {
      tx: {
        from: account.address as `0x${string}`,
        to: univ3Entry.nonfungiblePositionManager,
        data: encodeUniv3Multicall(calls as Hex[]),
        value: '0x0',
        chainId: chainInfo.id,
      },
      meta: {
        poolId: pool.id,
        chainId: pool.chain_id,
        type: pool.type,
        protocolId: pool.protocol.id,
        addressVerification: univ3Entry.verification,
      },
    };
  }, [account.address, chainInfo, claimTargets, pool, t, univ3Entry]);

  const buildTxs = useCallback(async () => {
    if (!chainInfo) {
      throw new Error(t('page.staking.actionModal.unsupportedChain'));
    }

    let buildResult: StakingTxBuildResult;
    const common = {
      pool: toSdkPool(pool),
      from: account.address,
      receiver: account.address,
      evmChainId: chainInfo.id,
    };

    if (isV2) {
      if (!univ2Entry) {
        throw new Error(t('page.staking.actionModal.failedResolveV2Pool'));
      }
      if (action === 'deposit') {
        if (!v2AddQuote) {
          throw new Error('Invalid token amounts');
        }
        buildResult = buildUniv2AddLiquidityTx({
          ...common,
          addressBook: [univ2Entry],
          amount0Desired: v2AddQuote.amount0.toString(),
          amount1Desired: v2AddQuote.amount1.toString(),
          amount0Min: v2AddQuote.amount0Min.toString(),
          amount1Min: v2AddQuote.amount1Min.toString(),
          deadline: toDeadline(),
        });
      } else if (action === 'withdraw') {
        if (!v2WithdrawQuote) {
          throw new Error(t('page.staking.actionModal.noLpPositionToWithdraw'));
        }
        buildResult = buildUniv2RemoveLiquidityTx({
          ...common,
          addressBook: [univ2Entry],
          liquidity: v2WithdrawQuote.liquidity.toString(),
          amount0Min: v2WithdrawQuote.amount0Min,
          amount1Min: v2WithdrawQuote.amount1Min,
          deadline: toDeadline(),
        });
      } else {
        throw new Error(t('page.staking.actionModal.v2RewardsUnsupported'));
      }
    } else if (isV3) {
      if (!univ3Entry) {
        throw new Error(t('page.staking.actionModal.failedResolveV3Pool'));
      }
      if (action === 'deposit') {
        if (!v3DepositQuote) {
          throw new Error('Invalid token amounts');
        }
        if (position?.raw?.univ3) {
          buildResult = buildUniv3IncreaseLiquidityTx({
            ...common,
            addressBook: [univ3Entry],
            tokenId: position.raw.univ3.tokenId,
            position: {
              token0: position.raw.univ3.token0,
              token1: position.raw.univ3.token1,
              fee: position.raw.univ3.fee,
            },
            ...v3DepositQuote.increaseLiquidityParams,
            deadline: toDeadline(),
          });
        } else {
          buildResult = buildUniv3MintTx({
            ...common,
            addressBook: [univ3Entry],
            ...v3DepositQuote.mintParams,
            deadline: toDeadline(),
          });
        }
      } else if (action === 'withdraw') {
        const raw = position?.raw?.univ3;
        if (!raw || !v3WithdrawQuote) {
          throw new Error(
            t('page.staking.actionModal.selectV3PositionToWithdraw')
          );
        }
        buildResult = buildUniv3DecreaseAndCollectTx({
          ...common,
          addressBook: [univ3Entry],
          tokenId: raw.tokenId,
          position: {
            token0: raw.token0,
            token1: raw.token1,
            fee: raw.fee,
          },
          ...v3WithdrawQuote.decreaseLiquidityParams,
          deadline: toDeadline(),
        });
      } else if (claimTargets.length === 1 && claimTargets[0].raw?.univ3) {
        const raw = claimTargets[0].raw.univ3;
        buildResult = buildUniv3CollectTx({
          ...common,
          addressBook: [univ3Entry],
          tokenId: raw.tokenId,
          position: {
            token0: raw.token0,
            token1: raw.token1,
            fee: raw.fee,
          },
        });
      } else {
        buildResult = buildUniv3ClaimAllTx();
      }
    } else {
      throw new Error(t('page.staking.actionModal.unsupportedLpPool'));
    }

    return buildStakingMiniSignTxs({
      wallet,
      chainServerId: pool.chain_id,
      evmChainId: chainInfo.id,
      account,
      buildResult,
    });
  }, [
    account,
    action,
    buildUniv3ClaimAllTx,
    chainInfo,
    claimTargets,
    isV2,
    isV3,
    pool,
    position,
    t,
    univ2Entry,
    univ3Entry,
    v2AddQuote,
    v2WithdrawQuote,
    v3DepositQuote,
    v3WithdrawQuote,
    wallet,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    if (needsPriceConfirm && !priceWarningAccepted) {
      return;
    }

    let submitted = false;
    try {
      setSubmitting(true);
      const { txs } = await buildTxs();
      const hashes = await sign({
        txs,
        trigger: title,
        logo: pool.protocol.logo_url,
      });
      const mainHash = getStakingMainTxHash(hashes);

      if (mainHash) {
        setSubmitting(false);
        submitted = true;
        onSubmitted({
          hash: mainHash,
          univ3Range:
            action === 'deposit' && isV3 && !position?.raw?.univ3
              ? v3QuotedRange
              : undefined,
        });
      }
    } catch (error) {
      if (
        error === MINI_SIGN_ERROR.USER_CANCELLED ||
        error === MINI_SIGN_ERROR.CANT_PROCESS
      ) {
        return;
      }
      console.error('staking lp action error', error);
      message.error(
        t('page.staking.actionModal.submitFailed', {
          action: title.toLowerCase(),
        })
      );
    } finally {
      if (!submitted) {
        setSubmitting(false);
      }
    }
  }, [
    account,
    action,
    buildTxs,
    canSubmit,
    isV3,
    needsPriceConfirm,
    onSubmitted,
    priceWarningAccepted,
    position,
    sign,
    t,
    title,
    v3QuotedRange,
  ]);

  const getV2CounterValue = useCallback(
    (side: TokenInputSide, value: string) => {
      if (
        !value ||
        !univ2Facts ||
        !normalizedTokens.token0Info ||
        !normalizedTokens.token1Info
      ) {
        return '';
      }

      try {
        const inputDecimals =
          side === 'token0'
            ? normalizedTokens.token0Info.decimals
            : normalizedTokens.token1Info.decimals;
        const outputDecimals =
          side === 'token0'
            ? normalizedTokens.token1Info.decimals
            : normalizedTokens.token0Info.decimals;
        const inputRaw = toRawDecimal(value, inputDecimals);

        if (safeBigInt(inputRaw) <= 0n) {
          return '';
        }

        const quote = quoteUniv2AddLiquidity({
          reserve0: univ2Facts.reserve0,
          reserve1: univ2Facts.reserve1,
          amount0Desired: side === 'token0' ? inputRaw : undefined,
          amount1Desired: side === 'token1' ? inputRaw : undefined,
          slippageBps: DEFAULT_SLIPPAGE_BPS,
        });
        const counterRaw = side === 'token0' ? quote.amount1 : quote.amount0;
        if (counterRaw <= 0n) {
          return '';
        }
        return rawToDecimalInput(counterRaw, outputDecimals);
      } catch {
        return '';
      }
    },
    [normalizedTokens.token0Info, normalizedTokens.token1Info, univ2Facts]
  );

  const setV2AmountsFromSide = useCallback(
    (side: TokenInputSide, value: string) => {
      setLastInputSide(value ? side : null);
      if (side === 'token0') {
        setAmount0(value);
        setAmount1(getV2CounterValue(side, value));
      } else {
        setAmount1(value);
        setAmount0(getV2CounterValue(side, value));
      }
    },
    [getV2CounterValue]
  );

  useEffect(() => {
    if (action !== 'deposit' || !isV2 || !lastInputSide) {
      return;
    }

    const sourceValue = lastInputSide === 'token0' ? amount0 : amount1;
    const counterValue = getV2CounterValue(lastInputSide, sourceValue);

    if (lastInputSide === 'token0') {
      if (amount1 !== counterValue) {
        setAmount1(counterValue);
      }
      return;
    }

    if (amount0 !== counterValue) {
      setAmount0(counterValue);
    }
  }, [action, amount0, amount1, getV2CounterValue, isV2, lastInputSide]);

  const setV3PositionAmountsFromSide = useCallback(
    (side: TokenInputSide, value: string) => {
      setPriceWarningAccepted(false);
      setLastInputSide(value ? side : null);

      if (side === 'token0') {
        setAmount0(value);
      } else {
        setAmount1(value);
      }

      const clearCounterAmount = () => {
        if (side === 'token0') {
          setAmount1('');
        } else {
          setAmount0('');
        }
      };

      if (
        !value ||
        !position?.raw?.univ3 ||
        !univ3PoolState ||
        !normalizedTokens.token0Info ||
        !normalizedTokens.token1Info
      ) {
        clearCounterAmount();
        return;
      }

      try {
        const inputDecimals =
          side === 'token0'
            ? normalizedTokens.token0Info.decimals
            : normalizedTokens.token1Info.decimals;
        const inputRaw = toRawDecimal(value, inputDecimals);

        if (safeBigInt(inputRaw) <= 0n) {
          setLastInputSide(null);
          clearCounterAmount();
          return;
        }

        const amounts = quoteV3PositionAmountsFromSide({
          poolState: univ3PoolState,
          tickLower: position.raw.univ3.tickLower,
          tickUpper: position.raw.univ3.tickUpper,
          side,
          inputRaw,
        });

        if (!amounts) {
          setLastInputSide(null);
          clearCounterAmount();
          return;
        }

        if (side === 'token0') {
          setAmount1(
            rawToDecimalInput(
              amounts.amount1,
              normalizedTokens.token1Info.decimals
            )
          );
        } else {
          setAmount0(
            rawToDecimalInput(
              amounts.amount0,
              normalizedTokens.token0Info.decimals
            )
          );
        }
      } catch {
        setLastInputSide(null);
        clearCounterAmount();
      }
    },
    [
      normalizedTokens.token0Info,
      normalizedTokens.token1Info,
      position,
      univ3PoolState,
    ]
  );

  const handleAmount0Change = useCallback(
    (value: string) => {
      if (token0InputDisabled) {
        return;
      }
      setPriceWarningAccepted(false);
      if (isV2) {
        setV2AmountsFromSide('token0', value);
        return;
      }
      if (isV3PositionDeposit) {
        setV3PositionAmountsFromSide('token0', value);
        return;
      }
      setLastInputSide('token0');
      setAmount0(value);
      if (isV3RangeDeposit && value !== '') {
        setAmount1((current) => (current === '' ? '0' : current));
      }
    },
    [
      isV2,
      isV3PositionDeposit,
      isV3RangeDeposit,
      setV2AmountsFromSide,
      setV3PositionAmountsFromSide,
      token0InputDisabled,
    ]
  );

  const handleAmount1Change = useCallback(
    (value: string) => {
      if (token1InputDisabled) {
        return;
      }
      setPriceWarningAccepted(false);
      if (isV2) {
        setV2AmountsFromSide('token1', value);
        return;
      }
      if (isV3PositionDeposit) {
        setV3PositionAmountsFromSide('token1', value);
        return;
      }
      setLastInputSide('token1');
      setAmount1(value);
      if (isV3RangeDeposit && value !== '') {
        setAmount0((current) => (current === '' ? '0' : current));
      }
    },
    [
      isV2,
      isV3PositionDeposit,
      isV3RangeDeposit,
      setV2AmountsFromSide,
      setV3PositionAmountsFromSide,
      token1InputDisabled,
    ]
  );

  const handleMax0 = useCallback(() => {
    if (token0MaxDisabled) {
      return;
    }
    setPriceWarningAccepted(false);
    if (isV2 && normalizedTokens.token0Info) {
      setV2AmountsFromSide(
        'token0',
        rawToDecimalInput(
          token0BalanceRaw,
          normalizedTokens.token0Info.decimals
        )
      );
      return;
    }
    if (isV3PositionDeposit && normalizedTokens.token0Info) {
      setV3PositionAmountsFromSide(
        'token0',
        String(normalizedTokens.token0Info.balance || '0')
      );
      return;
    }
    if (isV3RangeDeposit && normalizedTokens.token0Info) {
      setLastInputSide('token0');
      setAmount0(String(normalizedTokens.token0Info.balance || '0'));
      setAmount1((current) => (current === '' ? '0' : current));
      return;
    }
    setLastInputSide('token0');
    setAmount0(String(normalizedTokens.token0Info?.balance || '0'));
  }, [
    isV2,
    isV3PositionDeposit,
    isV3RangeDeposit,
    normalizedTokens.token0Info,
    setV2AmountsFromSide,
    setV3PositionAmountsFromSide,
    token0BalanceRaw,
    token0MaxDisabled,
  ]);

  const handleMax1 = useCallback(() => {
    if (token1MaxDisabled) {
      return;
    }
    setPriceWarningAccepted(false);
    if (isV2 && normalizedTokens.token1Info) {
      setV2AmountsFromSide(
        'token1',
        rawToDecimalInput(
          token1BalanceRaw,
          normalizedTokens.token1Info.decimals
        )
      );
      return;
    }
    if (isV3PositionDeposit && normalizedTokens.token1Info) {
      setV3PositionAmountsFromSide(
        'token1',
        String(normalizedTokens.token1Info.balance || '0')
      );
      return;
    }
    if (isV3RangeDeposit && normalizedTokens.token1Info) {
      setLastInputSide('token1');
      setAmount0((current) => (current === '' ? '0' : current));
      setAmount1(String(normalizedTokens.token1Info.balance || '0'));
      return;
    }
    setLastInputSide('token1');
    setAmount1(String(normalizedTokens.token1Info?.balance || '0'));
  }, [
    isV2,
    isV3PositionDeposit,
    isV3RangeDeposit,
    normalizedTokens.token1Info,
    setV2AmountsFromSide,
    setV3PositionAmountsFromSide,
    token1BalanceRaw,
    token1MaxDisabled,
  ]);

  const rangeText = v3QuotedRange
    ? formatV3RangeText(v3QuotedRange as V3QuotedRangeForDisplay)
    : undefined;

  const handleRangePresetChange = useCallback((value: V3RangeOption) => {
    setPriceWarningAccepted(false);
    setV3RangePreset(value);
  }, []);

  const handlePercentChange = useCallback((value: number) => {
    setPercent(value);
    setSelectedPercentPreset(null);
  }, []);

  const handlePercentPresetChange = useCallback((value: number) => {
    setPercent(value);
    setSelectedPercentPreset(value);
  }, []);

  const handlePriceWarningToggle = useCallback(() => {
    setPriceWarningAccepted((accepted) => !accepted);
  }, []);

  const receive0 = v2WithdrawQuote?.amount0 || v3WithdrawQuote?.amount0 || 0n;
  const receive1 = v2WithdrawQuote?.amount1 || v3WithdrawQuote?.amount1 || 0n;

  const previewToken0 = findToken(
    pool.tokens.supplies,
    univ2Entry?.token0 || univ3Entry?.token0,
    0
  );
  const previewToken1 = findToken(
    pool.tokens.supplies,
    univ2Entry?.token1 || univ3Entry?.token1,
    1
  );

  const popupHeight =
    action === 'deposit'
      ? isV3 && !isPositionAction
        ? 490 + (needsPriceConfirm ? 24 : 0)
        : 460 + (needsPriceConfirm ? 24 : 0)
      : action === 'claim'
      ? 340
      : 480;
  const loading = tokenLoading && action !== 'claim';
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);
  const footerError = disabledReason || balanceError || '';
  const priceWarningTitle = priceDiffInfo
    ? t('page.staking.actionModal.poolPriceTitle', {
        token0: priceDiffInfo.token0Symbol,
        token1: priceDiffInfo.token1Symbol,
        poolPrice: formatPriceNumber(priceDiffInfo.poolPrice),
        marketPrice: formatPriceNumber(priceDiffInfo.marketPrice),
      })
    : '';
  const submitDisabled =
    !canSubmit || (needsPriceConfirm && !priceWarningAccepted);

  return (
    <Popup
      visible={visible}
      title={
        <ActionPopupTitle
          title={title}
          onBack={handleCancel}
          className="staking-lp-action-title"
          backClassName="staking-lp-action-title-back"
        />
      }
      onCancel={handleCancel}
      height={popupHeight}
      closable={false}
      isNew
      isSupportDarkMode
      className="staking-lp-action-popup"
    >
      <div className="staking-lp-action-body">
        {loading ? (
          <div className="staking-lp-action-content is-loading">
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          </div>
        ) : (
          <>
            <div className="staking-lp-action-content">
              {action === 'deposit' ? (
                <LpDepositContent
                  isV3={isV3}
                  isPositionAction={isPositionAction}
                  rangeOptions={V3_RANGE_OPTIONS}
                  rangePreset={v3RangePreset}
                  onRangePresetChange={handleRangePresetChange}
                  amount0={amount0}
                  amount1={amount1}
                  token0Info={normalizedTokens.token0Info}
                  token1Info={normalizedTokens.token1Info}
                  onAmount0Change={handleAmount0Change}
                  onAmount1Change={handleAmount1Change}
                  onMax0={handleMax0}
                  onMax1={handleMax1}
                  token0Insufficient={token0InputError}
                  token1Insufficient={token1InputError}
                  token0Disabled={token0InputDisabled}
                  token1Disabled={token1InputDisabled}
                  token0MaxDisabled={token0MaxDisabled}
                  token1MaxDisabled={token1MaxDisabled}
                  rangeText={rangeText}
                  v2AddQuote={v2AddQuote}
                />
              ) : null}
              {action === 'withdraw' ? (
                <LpPercentActionContent
                  percent={percent}
                  onPercentChange={handlePercentChange}
                  selectedPresetPercent={selectedPercentPreset}
                  onPresetPercentChange={handlePercentPresetChange}
                  receive0={receive0}
                  receive1={receive1}
                  previewToken0={previewToken0}
                  previewToken1={previewToken1}
                  pool={pool}
                />
              ) : null}
              {action === 'claim' ? (
                <LpClaimContent claimTargets={claimTargets} pool={pool} />
              ) : null}
            </div>
            <div className="staking-lp-action-footer">
              <LpFooterMessages
                footerError={footerError}
                needsPriceConfirm={needsPriceConfirm}
                priceWarningTitle={priceWarningTitle}
                priceWarningAccepted={priceWarningAccepted}
                onPriceWarningAcceptedChange={handlePriceWarningToggle}
              />
              <Button
                type="primary"
                block
                className="staking-lp-submit"
                disabled={submitDisabled}
                loading={submitting}
                onClick={handleSubmit}
              >
                {title}
              </Button>
            </div>
          </>
        )}
      </div>
    </Popup>
  );
};
