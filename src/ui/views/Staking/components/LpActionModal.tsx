import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Skeleton, message } from 'antd';
import { useRequest } from 'ahooks';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import type { TokenItem } from 'background/service/openapi';
import type { Hex } from 'viem';

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
  quoteUniv2AddLiquidity,
  quoteUniv2CounterAmount,
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
} from '@rabby-wallet/staking-sdk';

import type { Account } from '@/background/service/preference';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { Popup, TokenWithChain } from '@/ui/component';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { SwapSlider } from '@/ui/views/Swap/Component/Slider';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

import type { StakingPool, StakingToken } from '../types';
import type { StakingPositionItem } from '../hooks/useStakingPositionSummary';
import { useStakingMiniSign } from '../hooks/useStakingMiniSign';
import { formatStakingAmount, formatStakingUsd } from '../utils/format';
import { normalizeStakingPoolToPoolKey } from '../utils/poolKey';
import {
  buildStakingMiniSignTxs,
  createStakingReadContractClient,
  getStakingMainTxHash,
  readStakingContract,
  waitForStakingTxReceipt,
} from '../utils/tx';

type LpAction = 'deposit' | 'withdraw' | 'claim';

interface LpActionModalProps {
  visible: boolean;
  action: LpAction;
  pool: StakingPool;
  account: Account;
  position?: StakingPositionItem | null;
  claimPositions?: StakingPositionItem[];
  onCancel: () => void;
  onSubmitted: () => void;
  onConfirmed: () => void;
}

type TokenBalanceInfo = {
  token: StakingToken;
  tokenItem: TokenItem;
  balance: string;
  decimals: number;
  price?: number | null;
};

type TokenInputSide = 'token0' | 'token1';
type V3RangeOption = '1%' | '10%' | '20%' | '40%';

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

const ActionPopupTitle = ({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) => (
  <div className="staking-lp-action-title">
    <button
      type="button"
      className="staking-lp-action-title-back"
      onClick={onBack}
      aria-label="Back"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M13.5 3L6.5 10L13.5 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
    <span>{title}</span>
  </div>
);

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

const minRaw = (left: bigint, right: bigint) => (left < right ? left : right);

const toDeadline = () =>
  Math.floor(Date.now() / 1000 + DEFAULT_DEADLINE_SECONDS).toString();

const sameAddress = (left?: string | null, right?: string | null) =>
  !!left && !!right && left.toLowerCase() === right.toLowerCase();

const getTokenUsdText = (amount: string, price?: number | null) => {
  const value = new BigNumber(amount || 0).multipliedBy(price || 0);
  return value.isFinite() ? formatUsdValue(value.toString()) : '$0.00';
};

const getTokenBalanceRaw = (tokenInfo?: TokenBalanceInfo) =>
  tokenInfo ? toRawBigInt(tokenInfo.balance, tokenInfo.decimals) : 0n;

const getSelectedV3Range = (preset: V3RangeOption) =>
  V3_RANGE_OPTIONS.find((item) => item.label === preset) || V3_RANGE_OPTIONS[2];

const formatRangeBps = (bps: number) =>
  `${new BigNumber(bps).div(100).toFixed()}%`;

const formatPriceNumber = (value?: BigNumber | null) => {
  if (!value || !value.isFinite() || value.lte(0)) {
    return '-';
  }
  if (value.gte(1_000)) {
    return value.decimalPlaces(2, BigNumber.ROUND_DOWN).toFormat();
  }
  if (value.gte(1)) {
    return value.decimalPlaces(6, BigNumber.ROUND_DOWN).toFixed();
  }
  return value.decimalPlaces(8, BigNumber.ROUND_DOWN).toFixed();
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

const applySlippageToRaw = (raw: bigint, slippageBps = DEFAULT_SLIPPAGE_BPS) =>
  ((raw * BigInt(10000 - slippageBps)) / 10000n).toString();

const findToken = (
  tokens: StakingToken[],
  address?: string,
  fallbackIndex = 0
) =>
  tokens.find((token) => sameAddress(token.id, address)) ||
  tokens[fallbackIndex];

const mergePreviewAssets = (
  assets: Array<{ token: StakingToken; rawAmount: string }>
) => {
  const merged = new Map<string, { token: StakingToken; rawAmount: bigint }>();

  assets.forEach((asset) => {
    const key = `${asset.token.chain_id || ''}-${asset.token.id}`.toLowerCase();
    const current = merged.get(key);
    merged.set(key, {
      token: current?.token || asset.token,
      rawAmount: (current?.rawAmount || 0n) + BigInt(asset.rawAmount || '0'),
    });
  });

  return Array.from(merged.values());
};

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
  const balance = String(apiToken?.amount ?? 0);
  const price = apiToken?.price ?? token.price;

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
    } as TokenItem,
    balance,
    decimals,
    price,
  };
};

const AmountInputBlock = ({
  label,
  value,
  tokenInfo,
  onChange,
  onMax,
  error,
  disabled,
}: {
  label?: string;
  value: string;
  tokenInfo?: TokenBalanceInfo;
  onChange: (value: string) => void;
  onMax?: () => void;
  error?: boolean;
  disabled?: boolean;
}) => (
  <div className={clsx('staking-lp-token-input', error && 'is-error')}>
    {label ? <div className="staking-lp-input-label">{label}</div> : null}
    <div className="staking-lp-input-row">
      <div className="staking-lp-input-main">
        <Input
          className="staking-lp-input ant-input"
          placeholder="0"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            if (next === '' || INPUT_NUMBER_RE.test(next)) {
              onChange(next === '' ? '' : filterNumber(next));
            }
          }}
        />
        <div className="staking-lp-input-usd">
          {getTokenUsdText(value, tokenInfo?.price)}
        </div>
      </div>
      <div className="staking-lp-token-side">
        {tokenInfo ? (
          <div className="staking-lp-token-main">
            <TokenWithChain
              width="32px"
              height="32px"
              chainSize={16}
              token={tokenInfo.tokenItem}
              hideConer
            />
            <span>{tokenInfo.token.symbol}</span>
          </div>
        ) : null}
        <div className="staking-lp-balance-row">
          <RcIconWalletCC viewBox="0 0 16 16" className="w-[14px] h-[14px]" />
          <span className="staking-lp-balance-text">
            {formatStakingAmount(tokenInfo?.balance || '0')}
          </span>
          {onMax ? (
            <button type="button" className="staking-lp-max" onClick={onMax}>
              Max
            </button>
          ) : null}
        </div>
      </div>
    </div>
  </div>
);

const AssetPreviewRow = ({
  token,
  rawAmount,
  pool,
}: {
  token?: StakingToken;
  rawAmount: string | bigint;
  pool: StakingPool;
}) => {
  if (!token) {
    return null;
  }
  const decimals = token.decimals ?? 18;
  const amount = formatUnits(rawAmount.toString(), decimals);
  const usdValue =
    token.price === undefined || token.price === null
      ? null
      : new BigNumber(amount).multipliedBy(token.price).toNumber();
  const tokenItem = {
    id: token.id,
    chain: token.chain_id || pool.chain_id,
    symbol: token.symbol,
    display_symbol: token.symbol,
    logo_url: token.logo_url,
    amount: Number(amount || 0),
    decimals,
    price: token.price,
  } as TokenItem;

  return (
    <div className="staking-lp-preview-row">
      <div className="staking-lp-preview-left">
        <TokenWithChain
          width="24px"
          height="24px"
          chainSize={12}
          token={tokenItem}
          hideConer
        />
        <span>
          {formatStakingAmount(amount)} {token.symbol}
        </span>
      </div>
      <span>{formatStakingUsd(usdValue)}</span>
    </div>
  );
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
  onConfirmed,
}: LpActionModalProps) => {
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAmount0('');
      setAmount1('');
      setLastInputSide(null);
      setV3RangePreset(V3_DEFAULT_RANGE_PRESET);
      setPriceWarningAccepted(false);
      setPercent(100);
    }
  }, [visible]);

  const token0 = pool.tokens.supplies[0];
  const token1 = pool.tokens.supplies[1];
  const title =
    action === 'deposit'
      ? 'Deposit'
      : action === 'withdraw'
      ? 'Withdraw'
      : 'Claim';
  const isV2 = pool.type === 'univ2';
  const isV3 = pool.type === 'univ3';
  const isPositionAction = !!position?.raw?.univ3;

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
    ? 'Unsupported chain'
    : actionState?.is_supported !== true
    ? actionState?.reason || 'Unavailable'
    : undefined;

  const raw0 = useMemo(() => {
    try {
      return normalizedTokens.token0Info
        ? toRawDecimal(amount0, normalizedTokens.token0Info.decimals)
        : '0';
    } catch {
      return '0';
    }
  }, [amount0, normalizedTokens.token0Info]);
  const raw1 = useMemo(() => {
    try {
      return normalizedTokens.token1Info
        ? toRawDecimal(amount1, normalizedTokens.token1Info.decimals)
        : '0';
    } catch {
      return '0';
    }
  }, [amount1, normalizedTokens.token1Info]);

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

      return quoteUniv3RangeDeposit({
        poolState: univ3PoolState,
        amount0Desired: raw0,
        amount1Desired: raw1,
        rangeStrategy: {
          type: 'amount-ratio',
          constraints: {
            mustIncludeCurrentPrice: true,
            targetWidthBps: v3SelectedRange.bps,
            maxWidthBps: v3SelectedRange.bps,
          },
        },
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });
    } catch {
      return null;
    }
  }, [action, isV3, position, raw0, raw1, univ3PoolState, v3SelectedRange]);

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
  const balanceError = useMemo(() => {
    const symbols = [
      token0Insufficient ? normalizedTokens.token0Info?.token.symbol : null,
      token1Insufficient ? normalizedTokens.token1Info?.token.symbol : null,
    ].filter(Boolean);
    if (!symbols.length) {
      return '';
    }
    return `Insufficient ${symbols.join(' & ')} balance`;
  }, [
    normalizedTokens.token0Info?.token.symbol,
    normalizedTokens.token1Info?.token.symbol,
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
    const token0Price = new BigNumber(normalizedTokens.token0Info.price || 0);
    const token1Price = new BigNumber(normalizedTokens.token1Info.price || 0);
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
    if (action === 'deposit') {
      return isV2
        ? !!v2AddQuote &&
            (hasPositiveRaw(v2AddQuote.amount0) ||
              hasPositiveRaw(v2AddQuote.amount1))
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
    balanceError,
    claimTargets.length,
    disabledReason,
    isV2,
    v2AddQuote,
    v2WithdrawQuote,
    v3DepositQuote,
    v3WithdrawQuote,
  ]);

  const buildUniv3ClaimAllTx = useCallback((): StakingTxBuildResult => {
    if (!chainInfo || !univ3Entry || !claimTargets.length) {
      throw new Error('No claimable V3 position');
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
  }, [account.address, chainInfo, claimTargets, pool, univ3Entry]);

  const buildTxs = useCallback(async () => {
    if (!chainInfo) {
      throw new Error('Unsupported chain');
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
        throw new Error('Failed to resolve V2 pool');
      }
      if (action === 'deposit') {
        if (!v2AddQuote) {
          throw new Error('Enter valid token amounts');
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
          throw new Error('No LP position to withdraw');
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
        throw new Error('V2 rewards are not supported');
      }
    } else if (isV3) {
      if (!univ3Entry) {
        throw new Error('Failed to resolve V3 pool');
      }
      if (action === 'deposit') {
        if (!v3DepositQuote) {
          throw new Error('Enter valid token amounts');
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
          throw new Error('Select a V3 position to withdraw');
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
      throw new Error('Unsupported LP pool');
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
      const hashes = await sign({ txs, trigger: title });
      const mainHash = getStakingMainTxHash(hashes);

      if (mainHash) {
        message.success(`${title} submitted`);
        setSubmitting(false);
        submitted = true;
        onSubmitted();
        const receipt = await waitForStakingTxReceipt({
          wallet,
          chainServerId: pool.chain_id,
          account,
          hash: mainHash,
        });
        if (receipt) {
          onConfirmed();
        }
      }
    } catch (error) {
      if (
        error === MINI_SIGN_ERROR.USER_CANCELLED ||
        error === MINI_SIGN_ERROR.CANT_PROCESS
      ) {
        return;
      }
      console.error('staking lp action error', error);
      message.error(`Failed to submit ${title.toLowerCase()}`);
    } finally {
      if (!submitted) {
        setSubmitting(false);
      }
    }
  }, [
    account,
    buildTxs,
    canSubmit,
    needsPriceConfirm,
    onConfirmed,
    onSubmitted,
    priceWarningAccepted,
    pool.chain_id,
    sign,
    title,
    wallet,
  ]);

  const setV2AmountsFromSide = useCallback(
    (side: TokenInputSide, value: string) => {
      setLastInputSide(side);
      if (side === 'token0') {
        setAmount0(value);
      } else {
        setAmount1(value);
      }

      if (
        !value ||
        !univ2Facts ||
        !normalizedTokens.token0Info ||
        !normalizedTokens.token1Info
      ) {
        if (side === 'token0') {
          setAmount1('');
        } else {
          setAmount0('');
        }
        return;
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
          if (side === 'token0') {
            setAmount1('');
          } else {
            setAmount0('');
          }
          return;
        }
        const counterRaw =
          side === 'token0'
            ? quoteUniv2CounterAmount({
                inputAmount: inputRaw,
                inputReserve: univ2Facts.reserve0,
                outputReserve: univ2Facts.reserve1,
              })
            : quoteUniv2CounterAmount({
                inputAmount: inputRaw,
                inputReserve: univ2Facts.reserve1,
                outputReserve: univ2Facts.reserve0,
              });
        const counterValue = rawToDecimalInput(counterRaw, outputDecimals);
        if (side === 'token0') {
          setAmount1(counterValue);
        } else {
          setAmount0(counterValue);
        }
      } catch {
        if (side === 'token0') {
          setAmount1('');
        } else {
          setAmount0('');
        }
      }
    },
    [normalizedTokens.token0Info, normalizedTokens.token1Info, univ2Facts]
  );

  const handleAmount0Change = useCallback(
    (value: string) => {
      setPriceWarningAccepted(false);
      if (isV2) {
        setV2AmountsFromSide('token0', value);
        return;
      }
      setLastInputSide('token0');
      setAmount0(value);
    },
    [isV2, setV2AmountsFromSide]
  );

  const handleAmount1Change = useCallback(
    (value: string) => {
      setPriceWarningAccepted(false);
      if (isV2) {
        setV2AmountsFromSide('token1', value);
        return;
      }
      setLastInputSide('token1');
      setAmount1(value);
    },
    [isV2, setV2AmountsFromSide]
  );

  const getV2MaxRaw = useCallback(
    (side: TokenInputSide) => {
      if (!univ2Facts) {
        return side === 'token0' ? token0BalanceRaw : token1BalanceRaw;
      }
      try {
        if (side === 'token0') {
          const maxByToken1 = quoteUniv2CounterAmount({
            inputAmount: token1BalanceRaw,
            inputReserve: univ2Facts.reserve1,
            outputReserve: univ2Facts.reserve0,
          });
          return minRaw(token0BalanceRaw, maxByToken1);
        }
        const maxByToken0 = quoteUniv2CounterAmount({
          inputAmount: token0BalanceRaw,
          inputReserve: univ2Facts.reserve0,
          outputReserve: univ2Facts.reserve1,
        });
        return minRaw(token1BalanceRaw, maxByToken0);
      } catch {
        return side === 'token0' ? token0BalanceRaw : token1BalanceRaw;
      }
    },
    [token0BalanceRaw, token1BalanceRaw, univ2Facts]
  );

  const handleMax0 = useCallback(() => {
    setPriceWarningAccepted(false);
    if (isV2 && normalizedTokens.token0Info) {
      setV2AmountsFromSide(
        'token0',
        rawToDecimalInput(
          getV2MaxRaw('token0'),
          normalizedTokens.token0Info.decimals
        )
      );
      return;
    }
    setLastInputSide('token0');
    setAmount0(String(normalizedTokens.token0Info?.balance || '0'));
  }, [getV2MaxRaw, isV2, normalizedTokens.token0Info, setV2AmountsFromSide]);

  const handleMax1 = useCallback(() => {
    setPriceWarningAccepted(false);
    if (isV2 && normalizedTokens.token1Info) {
      setV2AmountsFromSide(
        'token1',
        rawToDecimalInput(
          getV2MaxRaw('token1'),
          normalizedTokens.token1Info.decimals
        )
      );
      return;
    }
    setLastInputSide('token1');
    setAmount1(String(normalizedTokens.token1Info?.balance || '0'));
  }, [getV2MaxRaw, isV2, normalizedTokens.token1Info, setV2AmountsFromSide]);

  const v3QuotedRange = (v3DepositQuote as {
    range?: { lowerBps: number; upperBps: number };
  } | null)?.range;
  const rangeText = v3QuotedRange
    ? `-${formatRangeBps(v3QuotedRange.lowerBps)} / +${formatRangeBps(
        v3QuotedRange.upperBps
      )}`
    : v3SelectedRange.label;

  const renderRangeSelector = () =>
    isV3 && !isPositionAction ? (
      <div className="staking-lp-range-selector">
        <div className="staking-lp-range-title">Set Price Range</div>
        <div className="staking-lp-range-options">
          {V3_RANGE_OPTIONS.map((item) => (
            <button
              type="button"
              key={item.label}
              className={clsx(v3RangePreset === item.label && 'is-active')}
              onClick={() => {
                setPriceWarningAccepted(false);
                setV3RangePreset(item.label);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const renderTokenSeparator = () => (
    <div className="staking-lp-token-separator">
      <div className="staking-lp-token-separator-line" />
      <span>+</span>
    </div>
  );

  const renderDeposit = () => (
    <>
      {renderRangeSelector()}
      <div className="staking-lp-input-stack">
        <AmountInputBlock
          value={amount0}
          tokenInfo={normalizedTokens.token0Info}
          onChange={handleAmount0Change}
          onMax={handleMax0}
          error={token0Insufficient}
        />
        {renderTokenSeparator()}
        <AmountInputBlock
          value={amount1}
          tokenInfo={normalizedTokens.token1Info}
          onChange={handleAmount1Change}
          onMax={handleMax1}
          error={token1Insufficient}
        />
      </div>
      <div className="staking-lp-info">
        {isV3 && !isPositionAction ? (
          <div className="staking-lp-info-row">
            <span>Range</span>
            <span>{rangeText}</span>
          </div>
        ) : null}
        {v2AddQuote &&
        (v2AddQuote.amount0Unused > 0n || v2AddQuote.amount1Unused > 0n) ? (
          <>
            <div className="staking-lp-info-row">
              <span>Unused</span>
              <span>
                {formatUnits(
                  v2AddQuote.amount0Unused.toString(),
                  normalizedTokens.token0Info?.decimals || 18
                )}{' '}
                {normalizedTokens.token0Info?.token.symbol || ''}
                {' / '}
                {formatUnits(
                  v2AddQuote.amount1Unused.toString(),
                  normalizedTokens.token1Info?.decimals || 18
                )}{' '}
                {normalizedTokens.token1Info?.token.symbol || ''}
              </span>
            </div>
          </>
        ) : null}
        {v3DepositQuote &&
        (v3DepositQuote.amount0Unused > 0n ||
          v3DepositQuote.amount1Unused > 0n) ? (
          <>
            <div className="staking-lp-info-row">
              <span>Unused</span>
              <span>
                {formatUnits(
                  v3DepositQuote.amount0Unused.toString(),
                  normalizedTokens.token0Info?.decimals || 18
                )}{' '}
                {normalizedTokens.token0Info?.token.symbol || ''}
                {' / '}
                {formatUnits(
                  v3DepositQuote.amount1Unused.toString(),
                  normalizedTokens.token1Info?.decimals || 18
                )}{' '}
                {normalizedTokens.token1Info?.token.symbol || ''}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </>
  );

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

  const renderPercentAction = () => {
    const receive0 = v2WithdrawQuote?.amount0 || v3WithdrawQuote?.amount0 || 0n;
    const receive1 = v2WithdrawQuote?.amount1 || v3WithdrawQuote?.amount1 || 0n;

    return (
      <>
        <div className="staking-lp-percent-box">
          <div className="staking-lp-percent-value">
            <span>{percent}</span>
            <span>%</span>
          </div>
          <SwapSlider
            className="staking-lp-percent-slider"
            min={0}
            max={100}
            step={1}
            value={percent}
            tooltipVisible={false}
            onChange={(value) => setPercent(Number(value))}
          />
          <div className="staking-lp-presets">
            {[25, 50, 75, 100].map((item) => (
              <button
                type="button"
                key={item}
                className={clsx(percent === item && 'is-active')}
                onClick={() => setPercent(item)}
              >
                {item}%
              </button>
            ))}
          </div>
        </div>
        <div className="staking-lp-preview">
          <div className="staking-lp-preview-title">Receive</div>
          <div className="staking-lp-preview-card">
            <AssetPreviewRow
              token={previewToken0}
              rawAmount={receive0}
              pool={pool}
            />
            <AssetPreviewRow
              token={previewToken1}
              rawAmount={receive1}
              pool={pool}
            />
          </div>
        </div>
      </>
    );
  };

  const renderClaim = () => {
    const rows = mergePreviewAssets(
      claimTargets.flatMap((item) =>
        item.rewards.map((asset) => ({
          token: asset.token,
          rawAmount: asset.rawAmount,
        }))
      )
    );
    return (
      <div className="staking-lp-preview">
        <div className="staking-lp-preview-title">
          Rewards{claimTargets.length > 1 ? ` (${claimTargets.length})` : ''}
        </div>
        <div className="staking-lp-preview-card">
          {rows.length ? (
            rows.map((asset) => (
              <AssetPreviewRow
                key={`${asset.token.chain_id || pool.chain_id}-${
                  asset.token.id
                }`}
                token={asset.token}
                rawAmount={asset.rawAmount}
                pool={pool}
              />
            ))
          ) : (
            <div className="staking-lp-empty">No claimable rewards</div>
          )}
        </div>
      </div>
    );
  };

  const popupHeight =
    action === 'deposit'
      ? isV3 && !isPositionAction
        ? 520 + (needsPriceConfirm ? 24 : 0)
        : 460 + (needsPriceConfirm ? 24 : 0)
      : action === 'claim'
      ? 340
      : 480;
  const loading = tokenLoading && action !== 'claim';
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);
  const footerError = disabledReason || balanceError;
  const priceWarningTitle = priceDiffInfo
    ? `Pool price: 1 ${priceDiffInfo.token0Symbol} = ${formatPriceNumber(
        priceDiffInfo.poolPrice
      )} ${priceDiffInfo.token1Symbol}; Market price: 1 ${
        priceDiffInfo.token0Symbol
      } = ${formatPriceNumber(priceDiffInfo.marketPrice)} ${
        priceDiffInfo.token1Symbol
      }`
    : '';
  const showFooterMessages = !!footerError || needsPriceConfirm;
  const submitDisabled =
    !canSubmit || (needsPriceConfirm && !priceWarningAccepted);

  return (
    <Popup
      visible={visible}
      title={<ActionPopupTitle title={title} onBack={handleCancel} />}
      onCancel={handleCancel}
      height={popupHeight}
      closable={false}
      isNew
      isSupportDarkMode
      className="staking-lp-action-popup"
    >
      <style>
        {`
          .staking-lp-action-popup .ant-drawer-content {
            background: var(--r-neutral-card1) !important;
            border-radius: 16px 16px 0 0;
            box-shadow: 0 -12px 20px rgba(19, 20, 26, 0.05);
          }

          .staking-lp-action-popup .ant-drawer-header {
            height: 60px;
            padding: 0;
          }

          .staking-lp-action-popup .ant-drawer-title {
            height: 60px;
            width: 100%;
            color: var(--r-neutral-title1);
            font-size: 20px;
            line-height: 24px;
            font-weight: 500;
          }

          .staking-lp-action-popup .staking-lp-action-title {
            position: relative;
            display: flex;
            width: 100%;
            height: 60px;
            align-items: center;
            justify-content: center;
          }

          .staking-lp-action-popup .staking-lp-action-title-back {
            position: absolute;
            left: 20px;
            top: 20px;
            display: flex;
            width: 20px;
            height: 20px;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 0;
            background: transparent;
            color: var(--r-neutral-title1);
          }

          .staking-lp-action-popup .ant-drawer-body {
            padding: 0;
            height: calc(100% - 60px);
            overflow: hidden;
          }

          .staking-lp-action-popup .ant-drawer-close {
            right: 20px;
            top: 20px;
            width: 20px;
            height: 20px;
            padding: 0;
          }

          .staking-lp-action-body {
            width: 400px;
            height: 100%;
            display: flex;
            flex-direction: column;
            color: var(--r-neutral-title1);
          }

          .staking-lp-action-content {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            padding: 0 20px;
          }

          .staking-lp-action-content.is-loading {
            padding: 20px;
          }

          .staking-lp-action-footer {
            flex-shrink: 0;
            width: 400px;
            padding: 0 20px 20px;
            background: var(--r-neutral-card1);
          }

          .staking-lp-range-selector {
            width: 400px;
            margin: 0 -20px;
            padding: 0 20px 24px;
          }

          .staking-lp-range-title {
            margin-bottom: 12px;
            color: var(--r-neutral-black);
            font-size: 15px;
            line-height: 18px;
            font-weight: 700;
          }

          .staking-lp-range-options {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            width: 360px;
          }

          .staking-lp-range-options button {
            height: 32px;
            border: 0;
            border-radius: 4px;
            background: var(--r-neutral-bg2);
            color: var(--r-neutral-body);
            font-size: 13px;
            line-height: 16px;
            font-weight: 500;
          }

          .staking-lp-range-options button.is-active {
            background: var(--r-blue-light1);
            color: var(--r-blue-default);
            font-weight: 600;
          }

          .staking-lp-input-stack {
            display: flex;
            flex-direction: column;
            width: 400px;
            margin: 0 -20px;
          }

          .staking-lp-token-input {
            height: 106px;
            padding: 24px 20px;
            background: transparent;
          }

          .staking-lp-token-input.is-error .staking-lp-input.ant-input {
            color: var(--r-red-default);
          }

          .staking-lp-token-separator {
            position: relative;
            display: flex;
            width: 400px;
            height: 24px;
            align-items: center;
            justify-content: center;
            padding: 0 20px;
          }

          .staking-lp-token-separator-line {
            width: 360px;
            height: 1px;
            background: var(--r-neutral-line);
          }

          .staking-lp-token-separator span {
            position: absolute;
            left: 188px;
            top: 0;
            display: flex;
            width: 24px;
            height: 24px;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: var(--r-neutral-bg2);
            color: var(--r-neutral-body);
            font-size: 18px;
            line-height: 20px;
            font-weight: 500;
          }

          .staking-lp-input-label {
            margin-bottom: 8px;
            color: var(--r-neutral-foot);
            font-size: 12px;
            line-height: 14px;
          }

          .staking-lp-input-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .staking-lp-input-main {
            min-width: 0;
            flex: 1 1 0;
          }

          .staking-lp-input.ant-input {
            width: 100%;
            height: 32px;
            padding: 0;
            border: 0 !important;
            border-radius: 0;
            background: transparent !important;
            box-shadow: none !important;
            color: var(--r-neutral-title1);
            font-size: 32px;
            line-height: 38px;
            font-weight: 700;
          }

          .staking-lp-input-usd {
            margin-top: 4px;
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-lp-token-side {
            display: flex;
            flex-shrink: 0;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
          }

          .staking-lp-token-main {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 15px;
            line-height: 18px;
            font-weight: 600;
          }

          .staking-lp-balance-row {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-lp-balance-text {
            max-width: 96px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .staking-lp-max {
            height: 18px;
            padding: 1px 6px;
            border: 0;
            border-radius: 4px;
            background: var(--r-blue-light1);
            color: var(--r-blue-default);
            font-size: 12px;
            line-height: 14px;
            font-weight: 500;
          }

          .staking-lp-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 12px;
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-lp-info-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .staking-lp-info-row span:last-child {
            color: var(--r-neutral-title1);
            text-align: right;
          }

          .staking-lp-percent-box {
            padding: 16px 0 24px;
          }

          .staking-lp-percent-value {
            display: flex;
            align-items: baseline;
            gap: 8px;
            color: var(--r-neutral-title1);
            font-size: 32px;
            line-height: 38px;
            font-weight: 700;
          }

          .staking-lp-percent-value span:last-child {
            color: var(--r-neutral-foot);
          }

          .staking-lp-percent-slider.ant-slider {
            width: 360px;
            margin: 8px 0 0;
            padding: 14px 0;
          }

          .staking-lp-percent-slider.ant-slider .ant-slider-handle {
            width: 16px;
            height: 16px;
            margin-top: -6px;
          }

          .staking-lp-percent-slider.ant-slider .ant-slider-handle::after {
            width: 16px;
            height: 16px;
            box-shadow: 0 0 0 2px var(--r-blue-default);
          }

          .staking-lp-presets {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 8px;
          }

          .staking-lp-presets button {
            height: 32px;
            border: 0;
            border-radius: 4px;
            background: var(--r-neutral-bg2);
            color: var(--r-neutral-title1);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-lp-presets button.is-active {
            color: var(--r-blue-default);
            background: var(--r-blue-light1);
          }

          .staking-lp-preview {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .staking-lp-preview-title {
            color: var(--r-neutral-title1);
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
          }

          .staking-lp-preview-card {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-height: 56px;
            border: 0.5px solid #edf0ff;
            border-radius: 8px;
            padding: 16px;
            background: linear-gradient(112deg, rgba(237, 240, 255, 0.25) 0%, rgba(237, 240, 255, 0) 100%);
          }

          .staking-lp-preview-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-lp-preview-left {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 8px;
            color: var(--r-neutral-body);
          }

          .staking-lp-empty {
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 20px;
          }

          .staking-lp-footer-messages {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 4px;
          }

          .staking-lp-error {
            min-height: 16px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: center;
            color: var(--r-red-default);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-lp-price-inline {
            display: flex;
            min-height: 16px;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-lp-price-inline span {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .staking-lp-price-checkbox {
            position: relative;
            display: inline-flex;
            width: 16px;
            height: 16px;
            flex: 0 0 16px;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 1px solid var(--r-neutral-line);
            border-radius: 4px;
            background: transparent;
          }

          .staking-lp-price-checkbox.is-active {
            border-color: var(--r-blue-default);
            background: var(--r-blue-default);
          }

          .staking-lp-price-checkbox.is-active::after {
            content: '';
            width: 8px;
            height: 4px;
            border-left: 2px solid #fff;
            border-bottom: 2px solid #fff;
            transform: rotate(-45deg) translateY(-1px);
          }

          .staking-lp-submit {
            width: 360px;
            height: 48px;
            margin-top: 0;
            border-radius: 6px;
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
          }
        `}
      </style>
      <div className="staking-lp-action-body">
        {loading ? (
          <div className="staking-lp-action-content is-loading">
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          </div>
        ) : (
          <>
            <div className="staking-lp-action-content">
              {action === 'deposit' ? renderDeposit() : null}
              {action === 'withdraw' ? renderPercentAction() : null}
              {action === 'claim' ? renderClaim() : null}
            </div>
            <div className="staking-lp-action-footer">
              {showFooterMessages ? (
                <div className="staking-lp-footer-messages">
                  {footerError ? (
                    <div className="staking-lp-error" title={footerError}>
                      {footerError}
                    </div>
                  ) : null}
                  {needsPriceConfirm ? (
                    <div
                      className="staking-lp-price-inline"
                      title={priceWarningTitle}
                    >
                      <button
                        type="button"
                        aria-label="Confirm pool price difference"
                        aria-pressed={priceWarningAccepted}
                        className={clsx(
                          'staking-lp-price-checkbox',
                          priceWarningAccepted && 'is-active'
                        )}
                        onClick={() =>
                          setPriceWarningAccepted((accepted) => !accepted)
                        }
                      />
                      <span>
                        Pool price differs from market price by more than 5%.
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
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
