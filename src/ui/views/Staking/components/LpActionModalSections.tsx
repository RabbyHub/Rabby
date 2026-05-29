import React from 'react';
import { Input } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUnits } from 'ethers/lib/utils';
import { useTranslation } from 'react-i18next';
import type { TokenItem } from 'background/service/openapi';

import { TokenWithChain } from '@/ui/component';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { SwapSlider } from '@/ui/views/Swap/Component/Slider';
import { formatUsdValue } from '@/ui/utils';

import type { StakingPool, StakingToken } from '../types';
import type { StakingPositionItem } from '../hooks/useStakingPositionSummary';
import {
  formatStakingAmount,
  formatStakingUsd,
  normalizeStakingAmountInput,
} from '../utils/format';

export type LpActionModalTokenBalanceInfo = {
  token: StakingToken;
  tokenItem: TokenItem;
  balance: string;
  decimals: number;
  price?: number | null;
  debankPrice?: number | null;
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
  maxDisabled,
}: {
  label?: string;
  value: string;
  tokenInfo?: LpActionModalTokenBalanceInfo;
  onChange: (value: string) => void;
  onMax?: () => void;
  error?: boolean;
  disabled?: boolean;
  maxDisabled?: boolean;
}) => (
  <LpAmountInputBlockInner
    label={label}
    value={value}
    tokenInfo={tokenInfo}
    onChange={onChange}
    onMax={onMax}
    error={error}
    disabled={disabled}
    maxDisabled={maxDisabled}
  />
);

const LpAmountInputBlockInner = ({
  label,
  value,
  tokenInfo,
  onChange,
  onMax,
  error,
  disabled,
  maxDisabled,
}: {
  label?: string;
  value: string;
  tokenInfo?: LpActionModalTokenBalanceInfo;
  onChange: (value: string) => void;
  onMax?: () => void;
  error?: boolean;
  disabled?: boolean;
  maxDisabled?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        'staking-lp-token-input',
        error && 'is-error',
        disabled && 'is-disabled'
      )}
    >
      {label ? <div className="staking-lp-input-label">{label}</div> : null}
      <div className="staking-lp-input-row">
        <div className="staking-lp-input-main">
          <Input
            className="staking-lp-input ant-input"
            placeholder="0"
            value={value}
            disabled={disabled}
            onChange={(event) => {
              const next = normalizeStakingAmountInput(
                event.target.value,
                tokenInfo?.decimals
              );
              if (next !== null) {
                onChange(next);
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
              <button
                type="button"
                className="staking-lp-max"
                disabled={maxDisabled}
                onClick={onMax}
              >
                {t('page.staking.actions.max')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

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
      <LpRangeSelectorTitle />
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

const LpRangeSelectorTitle = () => {
  const { t } = useTranslation();
  return (
    <div className="staking-lp-range-title">
      {t('page.staking.actionModal.setPriceRange')}
    </div>
  );
};

const LpTokenSeparator = () => (
  <div className="staking-lp-token-separator">
    <div className="staking-lp-token-separator-line" />
    <span>+</span>
  </div>
);

const SingleAssetDepositTip = ({ visible }: { visible?: boolean }) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <div className="staking-lp-single-asset-tip">
      <RcIconWarningCC className="staking-lp-single-asset-tip-icon" />
      <span>{t('page.staking.actionModal.singleAssetDepositOnly')}</span>
    </div>
  );
};

const UnusedInfoRow = ({
  quote,
  token0Info,
  token1Info,
}: {
  quote?: LpUnusedQuote | null;
  token0Info?: LpActionModalTokenBalanceInfo;
  token1Info?: LpActionModalTokenBalanceInfo;
}) => {
  const { t } = useTranslation();

  if (!quote || (quote.amount0Unused <= 0n && quote.amount1Unused <= 0n)) {
    return null;
  }

  return (
    <div className="staking-lp-info-row">
      <span>{t('page.staking.actionModal.unused')}</span>
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
  token0Disabled,
  token1Disabled,
  token0MaxDisabled,
  token1MaxDisabled,
  rangeText,
  v2AddQuote,
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
  token0Disabled?: boolean;
  token1Disabled?: boolean;
  token0MaxDisabled?: boolean;
  token1MaxDisabled?: boolean;
  rangeText?: string;
  v2AddQuote?: LpUnusedQuote | null;
}) => (
  <LpDepositContentInner
    isV3={isV3}
    isPositionAction={isPositionAction}
    rangeOptions={rangeOptions}
    rangePreset={rangePreset}
    onRangePresetChange={onRangePresetChange}
    amount0={amount0}
    amount1={amount1}
    token0Info={token0Info}
    token1Info={token1Info}
    onAmount0Change={onAmount0Change}
    onAmount1Change={onAmount1Change}
    onMax0={onMax0}
    onMax1={onMax1}
    token0Insufficient={token0Insufficient}
    token1Insufficient={token1Insufficient}
    token0Disabled={token0Disabled}
    token1Disabled={token1Disabled}
    token0MaxDisabled={token0MaxDisabled}
    token1MaxDisabled={token1MaxDisabled}
    rangeText={rangeText}
    v2AddQuote={v2AddQuote}
  />
);

const LpDepositContentInner = ({
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
  token0Disabled,
  token1Disabled,
  token0MaxDisabled,
  token1MaxDisabled,
  rangeText,
  v2AddQuote,
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
  token0Disabled?: boolean;
  token1Disabled?: boolean;
  token0MaxDisabled?: boolean;
  token1MaxDisabled?: boolean;
  rangeText?: string;
  v2AddQuote?: LpUnusedQuote | null;
}) => {
  const { t } = useTranslation();
  const showSingleAssetTip =
    isV3 && isPositionAction && (token0Disabled || token1Disabled);

  return (
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
          disabled={token0Disabled}
          maxDisabled={token0MaxDisabled}
        />
        <LpTokenSeparator />
        <LpAmountInputBlock
          value={amount1}
          tokenInfo={token1Info}
          onChange={onAmount1Change}
          onMax={onMax1}
          error={token1Insufficient}
          disabled={token1Disabled}
          maxDisabled={token1MaxDisabled}
        />
      </div>
      <SingleAssetDepositTip visible={showSingleAssetTip} />
      <div className="staking-lp-info">
        {isV3 && !isPositionAction && rangeText ? (
          <div className="staking-lp-info-row">
            <span>{t('page.staking.actionModal.range')}</span>
            <span>{rangeText}</span>
          </div>
        ) : null}
        <UnusedInfoRow
          quote={v2AddQuote}
          token0Info={token0Info}
          token1Info={token1Info}
        />
      </div>
    </>
  );
};

export const LpPercentActionContent = ({
  percent,
  onPercentChange,
  selectedPresetPercent,
  onPresetPercentChange,
  receive0,
  receive1,
  previewToken0,
  previewToken1,
  pool,
}: {
  percent: number;
  onPercentChange: (value: number) => void;
  selectedPresetPercent?: number | null;
  onPresetPercentChange: (value: number) => void;
  receive0: bigint;
  receive1: bigint;
  previewToken0?: StakingToken;
  previewToken1?: StakingToken;
  pool: StakingPool;
}) => (
  <LpPercentActionContentInner
    percent={percent}
    onPercentChange={onPercentChange}
    selectedPresetPercent={selectedPresetPercent}
    onPresetPercentChange={onPresetPercentChange}
    receive0={receive0}
    receive1={receive1}
    previewToken0={previewToken0}
    previewToken1={previewToken1}
    pool={pool}
  />
);

const LpPercentActionContentInner = ({
  percent,
  onPercentChange,
  selectedPresetPercent,
  onPresetPercentChange,
  receive0,
  receive1,
  previewToken0,
  previewToken1,
  pool,
}: {
  percent: number;
  onPercentChange: (value: number) => void;
  selectedPresetPercent?: number | null;
  onPresetPercentChange: (value: number) => void;
  receive0: bigint;
  receive1: bigint;
  previewToken0?: StakingToken;
  previewToken1?: StakingToken;
  pool: StakingPool;
}) => {
  const { t } = useTranslation();

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
          onChange={(value) => onPercentChange(Number(value))}
        />
        <div className="staking-lp-presets">
          {[25, 50, 75, 100].map((item) => (
            <button
              type="button"
              key={item}
              className={clsx(selectedPresetPercent === item && 'is-active')}
              onClick={() => onPresetPercentChange(item)}
            >
              {item}%
            </button>
          ))}
        </div>
      </div>
      <div className="staking-lp-preview">
        <div className="staking-lp-preview-title">
          {t('page.staking.actionModal.receive')}
        </div>
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
};

export const LpClaimContent = ({
  claimTargets,
  pool,
}: {
  claimTargets: StakingPositionItem[];
  pool: StakingPool;
}) => {
  const { t } = useTranslation();
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
        {claimTargets.length > 1
          ? t('page.staking.portfolio.rewardsWithCount', {
              count: claimTargets.length,
            })
          : t('page.staking.portfolio.rewards')}
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
          <div className="staking-lp-empty">
            {t('page.staking.actionModal.noClaimableRewards')}
          </div>
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
  const { t } = useTranslation();

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
            aria-label={t(
              'page.staking.actionModal.confirmPoolPriceDifference'
            )}
            aria-pressed={priceWarningAccepted}
            className={clsx(
              'staking-lp-price-checkbox',
              priceWarningAccepted && 'is-active'
            )}
            onClick={onPriceWarningAcceptedChange}
          />
          <span>{t('page.staking.actionModal.poolPriceWarning')}</span>
        </div>
      ) : null}
    </div>
  );
};
