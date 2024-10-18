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
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';

import {
  QuotePreExecResultInfo,
  QuoteProvider,
  isSwapWrapToken,
} from '../hooks/quote';
import { useSetQuoteVisible, useSetRabbyFee, verifySdk } from '../hooks';
import { getTokenSymbol } from '@/ui/utils/token';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useTranslation } from 'react-i18next';
import { TokenWithChain } from '@/ui/component';
import { Tooltip } from 'antd';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';

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

  &:hover:not(.disabled, .inSufficient) {
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
    color: #27c193;
    &.red {
      color: #ec5151;
    }
  }
`;

export interface QuoteItemProps {
  onlyShowErrorQuote?: boolean;
  quote: QuoteResult | null;
  name: string;
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
  } = props;

  const { t } = useTranslation();

  const openSwapQuote = useSetQuoteVisible();

  const setRabbyFeeVisible = useSetRabbyFee();

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
    const balanceChangeReceiveTokenAmount = preExecResult
      ? preExecResult.swapPreExecTx.balance_change.receive_token_list.find(
          (item) => isSameAddress(item.id, receiveToken.id)
        )?.amount || '0'
      : '0';
    const actualReceiveAmount = inSufficient
      ? new BigNumber(quote?.toTokenAmount || 0)
          .div(10 ** (quote?.toTokenDecimals || receiveToken.decimals))
          .toString()
      : balanceChangeReceiveTokenAmount;
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

  const CheckIcon = useCallback(() => {
    if (disabled || loading || !quote?.tx || !preExecResult?.swapPreExecTx) {
      return null;
    }
    return <CheckedIcon />;
  }, [disabled, loading, quote?.tx, preExecResult?.swapPreExecTx]);

  const gasFeeTooHight = useMemo(() => {
    return (
      new BigNumber(preExecResult?.swapPreExecTx?.gas?.gas_used || 0).gte(
        GAS_USE_AMOUNT_LIMIT
      ) && chain === CHAINS_ENUM.ETH
    );
  }, [preExecResult, chain]);

  const handleClick = useCallback(() => {
    if (gasFeeTooHight) {
      return;
    }

    if (inSufficient) {
      return;
    }
    if (disabled) return;
    const actualReceiveAmount =
      preExecResult?.swapPreExecTx.balance_change.receive_token_list.find(
        (item) => isSameAddress(item.id, receiveToken.id)
      )?.amount || 0;
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
  }, [
    disabled,
    inSufficient,
    setActiveProvider,
    dexId,
    quote,
    preExecResult,
    gasFeeTooHight,
    receiveToken,
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
    if (gasFeeTooHight || (inSufficient && !disabled)) {
      return undefined;
    }
    return false;
  }, [onlyShow, gasFeeTooHight, inSufficient, disabled]);

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
        gasFeeTooHight
          ? t('page.swap.Gas-fee-too-high')
          : t('page.swap.insufficient-balance')
      }
      trigger={['click']}
      visible={tooltipVisible}
      align={{ offset: [0, 30] }}
      arrowPointAtCenter
    >
      <ItemWrapper
        onClick={onlyShow ? undefined : handleClick}
        className={clsx(
          'dex',
          disabled && 'disabled',
          isErrorQuote && 'error',
          inSufficient && !disabled && 'disabled inSufficient',
          gasFeeTooHight && 'disabled gasFeeTooHight',
          onlyShow &&
            'bg-transparent shadow-none p-0 h-auto hover:border-transparent hover:after:hidden'
        )}
      >
        <div className="flex-1 flex flex-col gap-12">
          <div className="flex items-center justify-between">
            {/* dex logo */}
            <div className="flex items-center gap-8 relative">
              <QuoteLogo
                loaded
                logo={quoteProviderInfo.logo}
                isLoading={props.onlyShow ? false : props.isLoading}
              />
              <span className="text-[16px] font-medium text-r-neutral-title-1">
                {quoteProviderInfo.name}
              </span>
              {!!preExecResult?.shouldApproveToken && (
                <TooltipWithMagnetArrow
                  arrowPointAtCenter
                  overlayClassName="rectangle w-[max-content]"
                  title={t('page.swap.need-to-approve-token-before-swap')}
                >
                  <img src={ImgLock} className="w-16 h16" />
                </TooltipWithMagnetArrow>
              )}
            </div>
            {/* receive token */}
            {receiveOrErrorContent !== null && (
              <div className="flex items-center justify-end relative">
                {!isErrorQuote && (
                  <TokenWithChain
                    token={props.receiveToken}
                    width="20px"
                    height="20px"
                    hideChainIcon
                    hideConer
                  />
                )}
                <div className="ml-6 mr-4 flex items-center">
                  {receiveOrErrorContent}
                </div>
                <CheckIcon />
              </div>
            )}
          </div>
          {!isErrorQuote && (
            <div className="flex items-center justify-between">
              <div className={clsx('flex items-center')}>
                <div
                  className={clsx(
                    'inline-flex items-center gap-4 px-4',
                    gasFeeTooHight && 'bg-r-red-light'
                  )}
                >
                  <RcIconGasCC
                    className={clsx(
                      'text-r-neutral-foot w-16 h-16',
                      gasFeeTooHight
                        ? 'text-rabby-red-default'
                        : 'text-r-neutral-foot'
                    )}
                    viewBox="0 0 16 16"
                  />
                  <span
                    className={clsx(
                      'text-13',
                      gasFeeTooHight
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
                  'text-13 font-medium',
                  'relative',
                  !isWrapToken && 'cursor-pointer'
                )}
                onClick={
                  isWrapToken
                    ? undefined
                    : (e) => {
                        e.stopPropagation();
                        setRabbyFeeVisible({
                          visible: true,
                          dexName: dexId,
                          feeDexDesc: quote?.dexFeeDesc || undefined,
                        });
                      }
                }
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
                    <TooltipWithMagnetArrow
                      arrowPointAtCenter
                      overlayClassName={clsx('rectangle', 'w-[max-content]')}
                      title={t('page.swap.no-fees-for-wrap')}
                      visible={isWrapToken ? undefined : false}
                    >
                      <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                    </TooltipWithMagnetArrow>
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
              'absolute top-[-1px] left-[-1px] ',
              'px-6 py-[1px] rounded-tl-[4px] rounded-br-[4px]',
              props.isBestQuote ? 'bg-r-green-light' : 'bg-r-red-light',
              'text-r-red-default'
            )}
          >
            {bestQuotePercent}
          </span>
        )}
      </ItemWrapper>
    </Tooltip>
  );
};

function CheckedIcon() {
  const { t } = useTranslation();
  return (
    <TooltipWithMagnetArrow
      arrowPointAtCenter
      overlayClassName={clsx('rectangle', 'w-[max-content]')}
      title={t('page.swap.by-transaction-simulation-the-quote-is-valid')}
    >
      <img src={ImgVerified} className="w-[16px] h-[16px]" />
    </TooltipWithMagnetArrow>
  );
}
