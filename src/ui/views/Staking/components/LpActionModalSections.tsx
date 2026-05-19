import React from 'react';
import { Input } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUnits } from 'ethers/lib/utils';
import type { TokenItem } from 'background/service/openapi';

import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { TokenWithChain } from '@/ui/component';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { SwapSlider } from '@/ui/views/Swap/Component/Slider';
import { formatUsdValue } from '@/ui/utils';

import type { StakingPool, StakingToken } from '../types';
import type { StakingPositionItem } from '../hooks/useStakingPositionSummary';
import { formatStakingAmount, formatStakingUsd } from '../utils/format';

export type LpActionModalTokenBalanceInfo = {
  token: StakingToken;
  tokenItem: TokenItem;
  balance: string;
  decimals: number;
  price?: number | null;
};

export type LpTokenInputSide = 'token0' | 'token1';
export type LpV3RangeOption = '1%' | '10%' | '20%' | '40%';

export type LpV3RangeSelectorOption = {
  label: LpV3RangeOption;
  bps: number;
};

type LpUnusedQuote = {
  amount0Unused: bigint;
  amount1Unused: bigint;
};

const getTokenUsdText = (amount: string, price?: number | null) => {
  const value = new BigNumber(amount || 0).multipliedBy(price || 0);
  return value.isFinite() ? formatUsdValue(value.toString()) : '$0.00';
};

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

export const LpAmountInputBlock = ({
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
  tokenInfo?: LpActionModalTokenBalanceInfo;
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

export const LpAssetPreviewRow = ({
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

const LpRangeSelector = ({
  visible,
  options,
  selected,
  onSelect,
}: {
  visible: boolean;
  options: LpV3RangeSelectorOption[];
  selected: LpV3RangeOption;
  onSelect: (value: LpV3RangeOption) => void;
}) =>
  visible ? (
    <div className="staking-lp-range-selector">
      <div className="staking-lp-range-title">Set Price Range</div>
      <div className="staking-lp-range-options">
        {options.map((item) => (
          <button
            type="button"
            key={item.label}
            className={clsx(selected === item.label && 'is-active')}
            onClick={() => onSelect(item.label)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  ) : null;

const LpTokenSeparator = () => (
  <div className="staking-lp-token-separator">
    <div className="staking-lp-token-separator-line" />
    <span>+</span>
  </div>
);

const UnusedInfoRow = ({
  quote,
  token0Info,
  token1Info,
}: {
  quote?: LpUnusedQuote | null;
  token0Info?: LpActionModalTokenBalanceInfo;
  token1Info?: LpActionModalTokenBalanceInfo;
}) => {
  if (!quote || (quote.amount0Unused <= 0n && quote.amount1Unused <= 0n)) {
    return null;
  }

  return (
    <div className="staking-lp-info-row">
      <span>Unused</span>
      <span>
        {formatUnits(
          quote.amount0Unused.toString(),
          token0Info?.decimals || 18
        )}{' '}
        {token0Info?.token.symbol || ''}
        {' / '}
        {formatUnits(
          quote.amount1Unused.toString(),
          token1Info?.decimals || 18
        )}{' '}
        {token1Info?.token.symbol || ''}
      </span>
    </div>
  );
};

export const LpDepositContent = ({
  isV3,
  isPositionAction,
  rangeOptions,
  rangePreset,
  onRangePresetChange,
  amount0,
  amount1,
  token0Info,
  token1Info,
  onAmount0Change,
  onAmount1Change,
  onMax0,
  onMax1,
  token0Insufficient,
  token1Insufficient,
  rangeText,
  v2AddQuote,
  v3DepositQuote,
}: {
  isV3: boolean;
  isPositionAction: boolean;
  rangeOptions: LpV3RangeSelectorOption[];
  rangePreset: LpV3RangeOption;
  onRangePresetChange: (value: LpV3RangeOption) => void;
  amount0: string;
  amount1: string;
  token0Info?: LpActionModalTokenBalanceInfo;
  token1Info?: LpActionModalTokenBalanceInfo;
  onAmount0Change: (value: string) => void;
  onAmount1Change: (value: string) => void;
  onMax0: () => void;
  onMax1: () => void;
  token0Insufficient: boolean;
  token1Insufficient: boolean;
  rangeText: string;
  v2AddQuote?: LpUnusedQuote | null;
  v3DepositQuote?: LpUnusedQuote | null;
}) => (
  <>
    <LpRangeSelector
      visible={isV3 && !isPositionAction}
      options={rangeOptions}
      selected={rangePreset}
      onSelect={onRangePresetChange}
    />
    <div className="staking-lp-input-stack">
      <LpAmountInputBlock
        value={amount0}
        tokenInfo={token0Info}
        onChange={onAmount0Change}
        onMax={onMax0}
        error={token0Insufficient}
      />
      <LpTokenSeparator />
      <LpAmountInputBlock
        value={amount1}
        tokenInfo={token1Info}
        onChange={onAmount1Change}
        onMax={onMax1}
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
      <UnusedInfoRow
        quote={v2AddQuote}
        token0Info={token0Info}
        token1Info={token1Info}
      />
      <UnusedInfoRow
        quote={v3DepositQuote}
        token0Info={token0Info}
        token1Info={token1Info}
      />
    </div>
  </>
);

export const LpPercentActionContent = ({
  percent,
  onPercentChange,
  receive0,
  receive1,
  previewToken0,
  previewToken1,
  pool,
}: {
  percent: number;
  onPercentChange: (value: number) => void;
  receive0: bigint;
  receive1: bigint;
  previewToken0?: StakingToken;
  previewToken1?: StakingToken;
  pool: StakingPool;
}) => (
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
        onChange={(value) => onPercentChange(Number(value))}
      />
      <div className="staking-lp-presets">
        {[25, 50, 75, 100].map((item) => (
          <button
            type="button"
            key={item}
            className={clsx(percent === item && 'is-active')}
            onClick={() => onPercentChange(item)}
          >
            {item}%
          </button>
        ))}
      </div>
    </div>
    <div className="staking-lp-preview">
      <div className="staking-lp-preview-title">Receive</div>
      <div className="staking-lp-preview-card">
        <LpAssetPreviewRow
          token={previewToken0}
          rawAmount={receive0}
          pool={pool}
        />
        <LpAssetPreviewRow
          token={previewToken1}
          rawAmount={receive1}
          pool={pool}
        />
      </div>
    </div>
  </>
);

export const LpClaimContent = ({
  claimTargets,
  pool,
}: {
  claimTargets: StakingPositionItem[];
  pool: StakingPool;
}) => {
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
            <LpAssetPreviewRow
              key={`${asset.token.chain_id || pool.chain_id}-${asset.token.id}`}
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

export const LpFooterMessages = ({
  footerError,
  needsPriceConfirm,
  priceWarningTitle,
  priceWarningAccepted,
  onPriceWarningAcceptedChange,
}: {
  footerError?: string;
  needsPriceConfirm: boolean;
  priceWarningTitle: string;
  priceWarningAccepted: boolean;
  onPriceWarningAcceptedChange: () => void;
}) => {
  if (!footerError && !needsPriceConfirm) {
    return null;
  }

  return (
    <div className="staking-lp-footer-messages">
      {footerError ? (
        <div className="staking-lp-error" title={footerError}>
          {footerError}
        </div>
      ) : null}
      {needsPriceConfirm ? (
        <div className="staking-lp-price-inline" title={priceWarningTitle}>
          <button
            type="button"
            aria-label="Confirm pool price difference"
            aria-pressed={priceWarningAccepted}
            className={clsx(
              'staking-lp-price-checkbox',
              priceWarningAccepted && 'is-active'
            )}
            onClick={onPriceWarningAcceptedChange}
          />
          <span>Pool price differs from market price by more than 5%.</span>
        </div>
      ) : null}
    </div>
  );
};
