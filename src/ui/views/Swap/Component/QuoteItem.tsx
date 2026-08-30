import { formatAmount, formatUsdValue, isSameAddress } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import clsx from 'clsx';
import React, { useMemo, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { QuoteLogo } from './QuoteLogo';
import BigNumber from 'bignumber.js';
import ImgLock from '@/ui/assets/swap/lock.svg';
import { ReactComponent as RcIconGasCC } from '@/ui/assets/swap/gas-cc.svg';
import ImgVerified from '@/ui/assets/swap/verified.svg';

import {
  QuotePreExecResultInfo,
  QuoteProvider,
  isSwapWrapToken,
} from '../hooks/quote';
import { useSetQuoteVisible } from '../hooks';
import { getTokenSymbol } from '@/ui/utils/token';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useTranslation } from 'react-i18next';
import { TokenWithChain } from '@/ui/component';
import { Tooltip } from 'antd';

const GAS_USE_AMOUNT_LIMIT = 2_000_000;

const ItemWrapper = styled.div`
  --quote--border-width: 1px;
  position: relative;
  height: 60px;
  font-size: 13px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  background: var(--r-neutral-card-1, #fff);

  border-radius: 6px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  border: var(--quote--border-width) solid transparent;
  cursor: pointer;

  &:hover:not(.disabled, .inSufficient, .active) {
    &::after {
      position: absolute;
      content: '';
      inset: calc(0px - var(--quote--border-width));
      border: var(--quote--border-width) solid var(--r-blue-default, #7084ff);
      background: transparent;
      border-radius: 6px;
      z-index: 2;
      pointer-events: none;
    }
  }

  &.active:not(.disabled, .inSufficient) {
    background: var(--r-blue-light-1, #eef1ff);
    &::after {
      position: absolute;
      content: '';
      inset: calc(0px - var(--quote--border-width));
      border: var(--quote--border-width) solid var(--r-blue-default, #7084ff);
      background: transparent;
      border-radius: 6px;
      z-index: 2;
      pointer-events: none;
    }
  }

  &.disabled {
    border-color: transparent;
    box-shadow: none;
    background-color: transparent;
    cursor: not-allowed;
  }

  &:not(.cex).inSufficient,
  &:not(.cex).disabled {
    border: var(--quote--border-width) solid var(--r-neutral-line, #d3d8e0);
    box-shadow: none;
  }

  &.dex {
    justify-content: space-between;
    height: 88px;
    align-items: flex-start;
    padding-top: 20px;
    padding-bottom: 16px;

    &.error {
      height: auto;
      padding: 14px 16px;
    }
  }

  &.combined {
    height: 76px;
    border-radius: 8px;
    border: none;
    box-shadow: none;

    &::after {
      border-radius: 8px !important;
    }

    &:hover:not(.disabled, .inSufficient, .active)::after {
      inset: calc(0px - var(--quote--border-width)) 0;
    }

    .percent {
      font-size: 12px;
    }

    .quote-tag .percent {
      color: inherit !important;
      font-size: 12px;
      font-weight: 500;
    }

    .receiveNum {
      max-width: 110px;
      font-size: 13px;
    }
  }

  &.combined.active {
    height: 78px;
    border: var(--quote--border-width) solid transparent;
  }

  .receiveNum {
    font-size: 16px;
    max-width: 130px;
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
    color: var(--r-neutral-title-1, #192945);
  }

  .percent {
    font-weight: 500;
    font-size: 13px;
    font-weight: 500;
    color: var(--r-blue-default, #7084ff);
    &.red {
      color: var(--r-red-default, #e34935);
    }
  }
`;

export interface QuoteItemProps {
  onlyShowErrorQuote?: boolean;
  quote: QuoteResult | null;
  name: string;
  active?: boolean;
  loading?: boolean;
  payToken: TokenItem;
  receiveToken: TokenItem;
  payAmount: string;
  chain: CHAINS_ENUM;
  isBestQuote: boolean;
  bestQuoteGasUsd: string;
  bestQuoteAmount: string;
  userAddress: string;
  slippage: string;
  fee: string;
  isLoading?: boolean;
  quoteProviderInfo: { name: string; logo: string };
  inSufficient: boolean;
  setActiveProvider?: React.Dispatch<
    React.SetStateAction<QuoteProvider | undefined>
  >;
  sortIncludeGasFee: boolean;
  onSelect?: () => void;
  combined?: boolean;
}

export const DexQuoteItem = (
  props: QuoteItemProps & {
    preExecResult: QuotePreExecResultInfo;
    onErrQuote?: React.Dispatch<React.SetStateAction<string[]>>;
    onlyShow?: boolean;
  }
) => {
  const {
    onlyShow,
    quote,
    name: dexId,
    active,
    loading,
    bestQuoteAmount,
    bestQuoteGasUsd,
    payToken,
    receiveToken,
    payAmount,
    chain,
    isBestQuote,
    inSufficient,
    preExecResult,
    quoteProviderInfo,
    setActiveProvider,
    sortIncludeGasFee,
    onSelect,
  } = props;

  const { t } = useTranslation();

  const openSwapQuote = useSetQuoteVisible();

  const isSdkDataPass = !!preExecResult?.isSdkPass;

  const halfBetterRateString = '';

  const [
    receiveOrErrorContent,
    bestQuotePercent,
    disabled,
    receivedTokenUsd,
    diffReceivedTokenUsd,
  ] = useMemo(() => {
    let receiveOrErrorContent: React.ReactNode = null;
    let bestQuotePercent: React.ReactNode = null;
    let disable = false;
    let receivedTokenUsd: React.ReactNode = null;
    let diffUsd: React.ReactNode = null;
    const actualReceiveAmount = new BigNumber(quote?.toTokenAmount || 0)
      .div(10 ** (quote?.toTokenDecimals || receiveToken.decimals))
      .toString();

    if (actualReceiveAmount || dexId === 'WrapToken') {
      const receiveAmount =
        actualReceiveAmount || (dexId === 'WrapToken' ? payAmount : 0);
      const bestQuoteAmountBn = new BigNumber(bestQuoteAmount);
      const receivedTokeAmountBn = new BigNumber(receiveAmount);

      const receivedUsdBn = receivedTokeAmountBn
        .times(receiveToken.price)
        .minus(sortIncludeGasFee ? preExecResult?.gasUsdValue || 0 : 0);

      const bestQuoteUsdBn = bestQuoteAmountBn
        .times(receiveToken.price)
        .minus(sortIncludeGasFee ? bestQuoteGasUsd : 0);

      let percent = receivedUsdBn
        .minus(bestQuoteUsdBn)
        .div(bestQuoteUsdBn)
        .abs()
        .times(100);

      if (!receiveToken.price) {
        percent = receivedTokeAmountBn
          .minus(bestQuoteAmountBn)
          .div(bestQuoteAmountBn)
          .abs()
          .times(100);
      }

      receivedTokenUsd = formatUsdValue(
        receivedTokeAmountBn.times(receiveToken.price || 0).toString(10)
      );

      diffUsd = formatUsdValue(
        receivedUsdBn.minus(bestQuoteUsdBn).toString(10)
      );

      const s = formatAmount(receivedTokeAmountBn.toString(10));
      const receiveTokenSymbol = getTokenSymbol(receiveToken);
      receiveOrErrorContent = (
        <span className="receiveNum" title={`${s} ${receiveTokenSymbol}`}>
          {s}
        </span>
      );

      bestQuotePercent = (
        <span className={clsx('percent', { red: !isBestQuote })}>
          {isBestQuote
            ? t('page.swap.best')
            : `-${percent.toFixed(2, BigNumber.ROUND_DOWN)}%`}
        </span>
      );
    }

    if (!quote?.toTokenAmount) {
      receiveOrErrorContent = (
        <div className="text-r-neutral-foot text-[13px] font-normal">
          {t('page.swap.unable-to-fetch-the-price')}
        </div>
      );
      bestQuotePercent = null;
      disable = true;
    }

    if (quote?.toTokenAmount) {
      if (!preExecResult && !inSufficient) {
        receiveOrErrorContent = (
          <div className="text-r-neutral-foot text-[13px] font-normal">
            {t('page.swap.fail-to-simulate-transaction')}
          </div>
        );
        bestQuotePercent = null;
        disable = true;
      }
    }

    if (!isSdkDataPass && !!preExecResult) {
      disable = true;
      receiveOrErrorContent = (
        <div className="text-r-neutral-foot text-[13px] font-normal">
          {t('page.swap.security-verification-failed')}
        </div>
      );
      bestQuotePercent = null;
    }
    return [
      receiveOrErrorContent,
      bestQuotePercent,
      disable,
      receivedTokenUsd,
      diffUsd,
      receiveToken,
    ];
  }, [
    quote?.toTokenAmount,
    quote?.toTokenDecimals,
    inSufficient,
    receiveToken.decimals,
    receiveToken.price,
    receiveToken.symbol,
    preExecResult,
    isSdkDataPass,
    bestQuoteAmount,
    bestQuoteGasUsd,
    isBestQuote,
    sortIncludeGasFee,
  ]);

  const gasFeeTooHigh = useMemo(() => {
    return (
      new BigNumber(preExecResult?.gasUsed || 0).gte(GAS_USE_AMOUNT_LIMIT) &&
      chain === CHAINS_ENUM.ETH
    );
  }, [preExecResult, chain]);

  const handleClick = useCallback(() => {
    if (gasFeeTooHigh) {
      return;
    }

    if (inSufficient) {
      return;
    }
    if (disabled) return;
    const actualReceiveAmount =
      new BigNumber(quote?.toTokenAmount || 0)
        .div(10 ** (quote?.toTokenDecimals || receiveToken.decimals))
        .toString() || 0;
    setActiveProvider?.({
      manualClick: true,
      name: dexId,
      quote,
      gasPrice: preExecResult?.gasPrice,
      shouldApproveToken: !!preExecResult?.shouldApproveToken,
      shouldTwoStepApprove: !!preExecResult?.shouldTwoStepApprove,
      error: !preExecResult,
      halfBetterRate: halfBetterRateString,
      quoteWarning: undefined,
      actualReceiveAmount,
      gasUsd: preExecResult?.gasUsd,
      preExecResult: preExecResult,
    });

    openSwapQuote(false);
    onSelect?.();
  }, [
    disabled,
    inSufficient,
    setActiveProvider,
    dexId,
    quote,
    preExecResult,
    gasFeeTooHigh,
    receiveToken,
    onSelect,
  ]);

  const isWrapToken = useMemo(
    () => isSwapWrapToken(payToken.id, receiveToken.id, chain),
    [payToken?.id, receiveToken?.id, chain]
  );

  const isErrorQuote = useMemo(
    () =>
      !isSdkDataPass ||
      !quote?.toTokenAmount ||
      !!(quote?.toTokenAmount && !preExecResult && !inSufficient),
    [isSdkDataPass, quote, preExecResult, inSufficient]
  );

  const tooltipVisible = useMemo(() => {
    if (onlyShow) {
      return false;
    }
    if (gasFeeTooHigh || (inSufficient && !disabled)) {
      return undefined;
    }
    return false;
  }, [onlyShow, gasFeeTooHigh, inSufficient, disabled]);

  useEffect(() => {
    if (isErrorQuote && props.onlyShowErrorQuote) {
      props?.onErrQuote?.((e) => {
        return e.includes(dexId) ? e : [...e, dexId];
      });
    }
    if (!props.onlyShowErrorQuote && !isErrorQuote) {
      props?.onErrQuote?.((e) =>
        e.includes(dexId) ? e.filter((e) => e !== dexId) : e
      );
    }
  }, [props.onlyShowErrorQuote, isErrorQuote, dexId, props?.onErrQuote]);

  if (!isErrorQuote && props.onlyShowErrorQuote) {
    return null;
  }

  if (!props.onlyShowErrorQuote && isErrorQuote) {
    return null;
  }

  return (
    <Tooltip
      overlayClassName="rectangle w-[max-content]"
      placement="top"
      title={
        gasFeeTooHigh
          ? t('page.swap.Gas-fee-too-high')
          : t('page.swap.insufficient-balance')
      }
      visible={tooltipVisible}
      align={{ offset: [0, 30] }}
      arrowPointAtCenter
    >
      <ItemWrapper
        onClick={onlyShow ? undefined : handleClick}
        className={clsx(
          'dex',
          active && 'active',
          props.combined && 'combined',
          disabled && 'disabled',
          isErrorQuote && 'error',
          inSufficient && !disabled && 'disabled inSufficient',
          gasFeeTooHigh && 'disabled gasFeeTooHight',
          onlyShow &&
            'bg-transparent shadow-none p-0 h-auto hover:border-transparent hover:after:hidden'
        )}
      >
        <div
          className={clsx(
            'flex flex-1 flex-col',
            props.combined ? 'gap-8' : 'gap-12'
          )}
        >
          <div className="flex items-center justify-between">
            {/* dex logo */}
            <div
              className={clsx(
                'relative flex items-center',
                props.combined ? 'gap-4' : 'gap-8'
              )}
            >
              <QuoteLogo
                loaded
                logo={quoteProviderInfo.logo}
                isLoading={props.onlyShow ? false : props.isLoading}
                size={props.combined ? 18 : undefined}
              />
              <span
                className={clsx(
                  'font-medium text-r-neutral-title-1',
                  props.combined ? 'text-13' : 'text-[16px]'
                )}
              >
                {quoteProviderInfo.name}
              </span>
              {!!preExecResult?.shouldApproveToken && (
                <TooltipWithMagnetArrow
                  arrowPointAtCenter
                  overlayClassName="rectangle w-[max-content]"
                  title={t('page.swap.need-to-approve-token-before-swap')}
                >
                  <img
                    src={ImgLock}
                    className={clsx(props.combined ? 'h-14 w-14' : 'h-16 w-16')}
                  />
                </TooltipWithMagnetArrow>
              )}
            </div>
            {/* receive token */}
            {receiveOrErrorContent !== null && (
              <div className="flex items-center justify-end relative">
                {!isErrorQuote && (
                  <TokenWithChain
                    token={props.receiveToken}
                    width={props.combined ? '14px' : '20px'}
                    height={props.combined ? '14px' : '20px'}
                    hideChainIcon
                    hideConer
                  />
                )}
                <div
                  className={clsx(
                    'flex items-center',
                    props.combined && 'gap-4',
                    props.combined ? 'ml-4' : 'ml-6'
                  )}
                >
                  {receiveOrErrorContent}
                  {props.combined && !isErrorQuote ? (
                    <CheckedIcon size={14} />
                  ) : null}
                </div>
              </div>
            )}
          </div>
          {!isErrorQuote && (
            <div className="flex items-center justify-between">
              <div className={clsx('flex items-center')}>
                <div
                  className={clsx(
                    'inline-flex items-center gap-4 px-4',
                    gasFeeTooHigh && 'bg-r-red-light',
                    inSufficient && 'hidden'
                  )}
                >
                  <RcIconGasCC
                    className={clsx(
                      props.combined ? 'h-14 w-14' : 'h-16 w-16',
                      gasFeeTooHigh
                        ? 'text-rabby-red-default'
                        : 'text-r-neutral-foot'
                    )}
                    viewBox="0 0 16 16"
                  />
                  <span
                    className={clsx(
                      props.combined ? 'text-12' : 'text-13',
                      gasFeeTooHigh
                        ? 'text-rabby-red-default'
                        : 'text-r-neutral-foot'
                    )}
                  >
                    {preExecResult?.gasUsd}
                  </span>
                </div>
              </div>

              <div
                className={clsx(
                  'flex items-center gap-6 justify-end',
                  props.combined ? 'text-12' : 'text-13',
                  'font-medium',
                  'relative'
                )}
              >
                {disabled ? (
                  <span className="text-r-red-default">{bestQuotePercent}</span>
                ) : (
                  <>
                    <span className="text-r-neutral-foot font-normal whitespace-nowrap">
                      {isWrapToken
                        ? `≈ ${receivedTokenUsd}`
                        : t('page.swap.usd-after-fees', {
                            usd: receivedTokenUsd,
                          })}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!disabled && !onlyShow && (
          <span
            style={{
              lineHeight: 'normal',
            }}
            className={clsx(
              'absolute',
              props.combined
                ? 'quote-tag left-0 top-0 flex h-16 w-60 items-center justify-center px-8 py-1 text-12 font-medium leading-normal'
                : 'left-[-1px] top-[-1px] px-6 py-[1px]',
              props.combined && !props.isBestQuote
                ? 'rounded-tl-[8px] rounded-br-[8px]'
                : 'rounded-tl-[4px] rounded-br-[4px]',
              props.isBestQuote
                ? 'bg-r-blue-light2 text-r-blue-default'
                : 'bg-r-red-light text-r-red-default'
            )}
          >
            {bestQuotePercent}
          </span>
        )}
      </ItemWrapper>
    </Tooltip>
  );
};

function CheckedIcon({ size = 16 }: { size?: number }) {
  const { t } = useTranslation();
  return (
    <TooltipWithMagnetArrow
      arrowPointAtCenter
      overlayClassName={clsx('rectangle', 'w-[max-content]')}
      title={t('page.swap.by-transaction-simulation-the-quote-is-valid')}
    >
      <img src={ImgVerified} style={{ width: size, height: size }} />
    </TooltipWithMagnetArrow>
  );
}
