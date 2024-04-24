import { CEX } from '@/constant';
import { formatAmount, formatUsdValue } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem, CEXQuote } from '@rabby-wallet/rabby-api/dist/types';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import clsx from 'clsx';
import React, { useMemo, useCallback, useState } from 'react';
import { useDebounce } from 'react-use';
import styled from 'styled-components';
import { QuoteLogo } from './QuoteLogo';
import BigNumber from 'bignumber.js';
import ImgLock from '@/ui/assets/swap/lock.svg';
import ImgGas from '@/ui/assets/swap/gas.svg';
import ImgWarning from '@/ui/assets/swap/warn.svg';
import ImgVerified from '@/ui/assets/swap/verified.svg';
import ImgWhiteWarning from '@/ui/assets/swap/warning-white.svg';

import {
  QuotePreExecResultInfo,
  QuoteProvider,
  isSwapWrapToken,
} from '../hooks/quote';
import {
  useSetQuoteVisible,
  useSetSettingVisible,
  useSwapSettings,
  useVerifySdk,
} from '../hooks';
import { useRabbySelector } from '@/ui/store';
import { getTokenSymbol } from '@/ui/utils/token';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ItemWrapper = styled.div`
  position: relative;
  height: 60px;
  font-size: 12px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  /* color: var(--r-neutral-title-1, #192945); */
  background: var(--r-neutral-card-1, #fff);

  border-radius: 6px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;

  .disabled-trade {
    position: absolute;
    left: 0;
    top: 0;
    transform: translateY(-20px);
    opacity: 0;
    width: 100%;
    height: 0;
    padding-left: 16px;
    background: #000000;
    border-radius: 6px;
    display: flex;
    align-items: center;
    font-size: 12px;
    gap: 8px;
    font-weight: 400;
    font-size: 12px;
    color: #ffffff;
    pointer-events: none;
    &.active {
      pointer-events: auto;
      height: 100%;
      transform: translateY(0);
      opacity: 1;
      /* transition: opacity 0.35s, transform 0.35s; */
    }
  }

  &:hover:not(.disabled, .inSufficient) {
    background: var(--r-blue-light-1, #eef1ff);
    border: 1px solid var(--r-blue-default, #7084ff);
  }
  &.active {
    outline: 2px solid var(--r-blue-default, #7084ff);
  }
  &.disabled {
    height: 56px;
    border-color: transparent;
    box-shadow: none;
    background-color: transparent;
    border-radius: 6px;
    cursor: not-allowed;
  }
  &.error {
  }
  &:not(.cex).inSufficient,
  &:not(.cex).disabled {
    height: 60px;
    border: 1px solid var(--r-neutral-line, #d3d8e0);
    border-radius: 6px;
    box-shadow: none;
  }

  &.cex {
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-title-1, #192945);
    height: 48px;
    background-color: transparent;
    border: none;
    outline: none;
  }

  .price {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--r-neutral-foot, #6a7587);
    .receiveNum {
      font-size: 15px;
      max-width: 130px;
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
      color: var(--r-neutral-foot, #6a7587);
      .toToken {
        color: var(--r-neutral-title-1, #192945);
      }
    }
  }
  .no-price {
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

  .diff {
    margin-left: auto;
  }
`;

export interface QuoteItemProps {
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
  active: boolean;
  userAddress: string;
  slippage: string;
  fee: string;
  isLoading?: boolean;
  quoteProviderInfo: { name: string; logo: string };
  inSufficient: boolean;
  setActiveProvider: React.Dispatch<
    React.SetStateAction<QuoteProvider | undefined>
  >;
}

export const DexQuoteItem = (
  props: QuoteItemProps & {
    preExecResult: QuotePreExecResultInfo;
  }
) => {
  const {
    isLoading,
    quote,
    name: dexId,
    loading,
    bestQuoteAmount,
    bestQuoteGasUsd,
    payToken,
    receiveToken,
    payAmount,
    chain,
    active,
    userAddress,
    isBestQuote,
    slippage,
    fee,
    inSufficient,
    preExecResult,
    quoteProviderInfo,
    setActiveProvider: updateActiveQuoteProvider,
  } = props;

  const { t } = useTranslation();

  const openSwapSettings = useSetSettingVisible();
  const openSwapQuote = useSetQuoteVisible();

  const { sortIncludeGasFee } = useSwapSettings();

  const tradeList = useRabbySelector((s) => s.swap.tradeList);
  const disabledTrade = useMemo(
    () =>
      !tradeList?.[dexId] &&
      !isSwapWrapToken(payToken.id, receiveToken.id, chain),
    [tradeList, dexId, payToken.id, receiveToken.id, chain]
  );

  const { isSdkDataPass } = useVerifySdk({
    chain,
    dexId: dexId as DEX_ENUM,
    slippage,
    data: {
      ...quote,
      fromToken: payToken.id,
      fromTokenAmount: new BigNumber(payAmount)
        .times(10 ** payToken.decimals)
        .toFixed(0, 1),
      toToken: receiveToken?.id,
    } as typeof quote,
    payToken,
    receiveToken,
  });

  const halfBetterRateString = '';

  const [
    middleContent,
    rightContent,
    disabled,
    receivedTokenUsd,
    diffReceivedTokenUsd,
  ] = useMemo(() => {
    let center: React.ReactNode = (
      <div className="text-15 text-r-neutral-title-1 font-medium">-</div>
    );
    let right: React.ReactNode = '';
    let disable = false;
    let receivedUsd = '0';
    let diffUsd = '0';

    const actualReceiveAmount = inSufficient
      ? new BigNumber(quote?.toTokenAmount || 0)
          .div(10 ** (quote?.toTokenDecimals || receiveToken.decimals))
          .toString()
      : preExecResult?.swapPreExecTx.balance_change.receive_token_list[0]
          ?.amount;
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

      receivedUsd = formatUsdValue(
        receivedTokeAmountBn.times(receiveToken.price || 0).toString(10)
      );

      diffUsd = formatUsdValue(
        receivedUsdBn.minus(bestQuoteUsdBn).toString(10)
      );

      const s = formatAmount(receivedTokeAmountBn.toString(10));
      const receiveTokenSymbol = getTokenSymbol(receiveToken);
      center = (
        <span className="receiveNum" title={`${s} ${receiveTokenSymbol}`}>
          <span className="toToken" title={s}>
            {s}
          </span>{' '}
          {receiveTokenSymbol}
        </span>
      );

      right = (
        <span className={clsx('percent', { red: !isBestQuote })}>
          {isBestQuote
            ? t('page.swap.best')
            : `-${percent.toFixed(2, BigNumber.ROUND_DOWN)}%`}
        </span>
      );
    }

    if (!quote?.toTokenAmount) {
      right = (
        <div className="text-r-neutral-foot text-[13px] font-normal">
          {t('page.swap.unable-to-fetch-the-price')}
        </div>
      );
      center = (
        <div className="text-15 text-r-neutral-title-1 font-medium">-</div>
      );
      disable = true;
    }

    if (quote?.toTokenAmount) {
      if (!preExecResult && !inSufficient) {
        center = (
          <div className="text-15 text-r-neutral-title-1 font-medium">-</div>
        );
        right = (
          <div className="text-r-neutral-foot text-[13px] font-normal">
            {t('page.swap.fail-to-simulate-transaction')}
          </div>
        );
        disable = true;
      }
    }

    if (!isSdkDataPass) {
      disable = true;
      center = (
        <div className="text-15 text-r-neutral-title-1 font-medium">-</div>
      );
      right = (
        <div className="text-r-neutral-foot text-[13px] font-normal">
          {t('page.swap.security-verification-failed')}
        </div>
      );
    }
    return [center, right, disable, receivedUsd, diffUsd];
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

  const quoteWarning = useMemo(() => {
    if (!quote?.toTokenAmount || !preExecResult) {
      return;
    }

    if (isSwapWrapToken(payToken.id, receiveToken.id, chain)) {
      return;
    }
    const receivedTokeAmountBn = new BigNumber(quote?.toTokenAmount || 0).div(
      10 ** (quote?.toTokenDecimals || receiveToken.decimals)
    );

    const diff = receivedTokeAmountBn
      .minus(
        preExecResult?.swapPreExecTx?.balance_change.receive_token_list[0]
          ?.amount || 0
      )
      .div(receivedTokeAmountBn);

    const diffPercent = diff.times(100);

    return diffPercent.gt(0.01)
      ? ([
          formatAmount(receivedTokeAmountBn.toString(10)) +
            getTokenSymbol(receiveToken),
          `${diffPercent.toPrecision(2)}% (${formatAmount(
            receivedTokeAmountBn
              .minus(
                preExecResult?.swapPreExecTx?.balance_change
                  .receive_token_list[0]?.amount || 0
              )
              .toString(10)
          )} ${getTokenSymbol(receiveToken)})`,
        ] as [string, string])
      : undefined;
  }, [
    chain,
    payToken.id,
    preExecResult,
    quote?.toTokenAmount,
    quote?.toTokenDecimals,
    receiveToken.decimals,
    receiveToken.id,
    receiveToken.symbol,
  ]);

  const CheckIcon = useCallback(() => {
    if (disabled || loading || !quote?.tx || !preExecResult?.swapPreExecTx) {
      return null;
    }
    return <WarningOrChecked quoteWarning={quoteWarning} />;
  }, [
    disabled,
    loading,
    quote?.tx,
    preExecResult?.swapPreExecTx,
    quoteWarning,
  ]);

  const [disabledTradeTipsOpen, setDisabledTradeTipsOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (disabledTrade) {
      // setDisabledTradeTipsOpen(true);
      return;
    }
    if (inSufficient) {
      // message.error('Insufficient balance to select the rate');
      return;
    }
    if (active || disabled || disabledTrade) return;
    updateActiveQuoteProvider({
      name: dexId,
      quote,
      gasPrice: preExecResult?.gasPrice,
      shouldApproveToken: !!preExecResult?.shouldApproveToken,
      shouldTwoStepApprove: !!preExecResult?.shouldTwoStepApprove,
      error: !preExecResult,
      halfBetterRate: halfBetterRateString,
      quoteWarning,
      actualReceiveAmount:
        preExecResult?.swapPreExecTx.balance_change.receive_token_list[0]
          ?.amount || '',
      gasUsd: preExecResult?.gasUsd,
    });

    openSwapQuote(false);
  }, [
    active,
    disabled,
    inSufficient,
    updateActiveQuoteProvider,
    dexId,
    quote,
    preExecResult,
    quoteWarning,
  ]);

  useDebounce(
    () => {
      if (active) {
        updateActiveQuoteProvider((e) => ({
          ...e,
          name: dexId,
          quote,
          gasPrice: preExecResult?.gasPrice,
          shouldApproveToken: !!preExecResult?.shouldApproveToken,
          shouldTwoStepApprove: !!preExecResult?.shouldTwoStepApprove,
          error: !preExecResult,
          halfBetterRate: halfBetterRateString,
          quoteWarning,
          actualReceiveAmount:
            preExecResult?.swapPreExecTx.balance_change.receive_token_list[0]
              ?.amount || '',
          gasUsed: preExecResult?.gasUsd,
        }));
      }
    },
    300,
    [
      quoteWarning,
      halfBetterRateString,
      active,
      dexId,
      updateActiveQuoteProvider,
      quote,
      preExecResult,
    ]
  );

  const isWrapTokensWap = useMemo(
    () => isSwapWrapToken(payToken.id, receiveToken.id, chain),
    [payToken, receiveToken, chain]
  );

  return (
    <ItemWrapper
      onMouseEnter={() => {
        if (disabledTrade && !inSufficient && quote && preExecResult) {
          setDisabledTradeTipsOpen(true);
        }
      }}
      onMouseLeave={() => {
        setDisabledTradeTipsOpen(false);
      }}
      onClick={handleClick}
      className={clsx(
        active && 'active',
        (disabledTrade || disabled) && 'disabled error',
        inSufficient && !disabled && 'disabled inSufficient'
      )}
    >
      <QuoteLogo loaded logo={quoteProviderInfo.logo} isLoading={isLoading} />

      <div className="flex flex-col justify-center ml-8 flex-1">
        <div className="flex items-center">
          <div
            className={clsx(
              'flex items-center gap-2 w-[108px] max-w-[108px] text-r-neutral-title-1 text-opacity-80 relative'
            )}
          >
            <span
              className={clsx(
                'text-13 font-medium text-r-neutral-title-1',
                inSufficient && !disabled && 'relative top-8'
              )}
            >
              {quoteProviderInfo.name}
            </span>
            {!!preExecResult?.shouldApproveToken && (
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                title={t('page.swap.need-to-approve-token-before-swap')}
              >
                <img src={ImgLock} className="w-14 h-14" />
              </TooltipWithMagnetArrow>
            )}
          </div>

          <div className="flex flex-col">
            <div className="price relative">
              {middleContent}
              <CheckIcon />
            </div>
          </div>
          {!isBestQuote && <div className="diff">{rightContent}</div>}
        </div>

        {!disabled && (
          <div className="flex items-center text-12 text-r-neutral-foot">
            <div className={clsx('flex items-center gap-2 w-[108px]')}>
              {!inSufficient && (
                <>
                  <img src={ImgGas} className="w-14 h-14 relative top-[-1px]" />
                  <span>{preExecResult?.gasUsd}</span>
                </>
              )}
            </div>

            <span>≈{receivedTokenUsd}</span>

            {!isBestQuote && (
              <span className="ml-auto text-right">{diffReceivedTokenUsd}</span>
            )}
          </div>
        )}
      </div>

      {isBestQuote && <div className="diff">{rightContent}</div>}

      <div
        className={clsx('disabled-trade', disabledTradeTipsOpen && 'active')}
      >
        <img src={ImgWhiteWarning} className="w-12 h-12" />
        <span>
          {t('page.swap.this-exchange-is-not-enabled-to-trade-by-you')}
          <span
            className="underline-transparent underline cursor-pointer ml-4"
            onClick={(e) => {
              e.stopPropagation();
              openSwapSettings(true);
              setDisabledTradeTipsOpen(false);
            }}
          >
            {t('page.swap.enable-it')}
          </span>
        </span>
      </div>
    </ItemWrapper>
  );
};

export const CexQuoteItem = (props: {
  name: string;
  data: CEXQuote | null;
  bestQuoteAmount: string;
  bestQuoteGasUsd: string;
  isBestQuote: boolean;
  isLoading?: boolean;
  inSufficient: boolean;
}) => {
  const {
    name,
    data,
    bestQuoteAmount,
    bestQuoteGasUsd,
    isBestQuote,
    isLoading,
    // inSufficient,
  } = props;
  const { t } = useTranslation();
  const dexInfo = useMemo(() => CEX[name as keyof typeof CEX], [name]);
  const { sortIncludeGasFee } = useSwapSettings();
  const [middleContent, rightContent] = useMemo(() => {
    let center: React.ReactNode = (
      <div className="text-15 text-r-neutral-title-1 font-medium">-</div>
    );
    let right: React.ReactNode = '';
    let disable = false;

    if (!data?.receive_token?.amount) {
      right = (
        <div className="text-r-neutral-foot text-[13px] font-normal">
          {t('page.swap.this-token-pair-is-not-supported')}
        </div>
      );
      disable = true;
    }

    if (data?.receive_token?.amount) {
      const receiveToken = data.receive_token;

      const bestQuoteUsdBn = new BigNumber(bestQuoteAmount)
        .times(receiveToken.price || 1)
        .minus(sortIncludeGasFee ? bestQuoteGasUsd : 0);
      const receiveUsdBn = new BigNumber(receiveToken.amount).times(
        receiveToken.price || 1
      );
      const percent = receiveUsdBn
        .minus(bestQuoteUsdBn)
        .div(bestQuoteUsdBn)
        .times(100);

      const s = formatAmount(receiveToken.amount.toString(10));
      const receiveTokenSymbol = getTokenSymbol(receiveToken);

      center = (
        <span className="receiveNum" title={`${s} ${receiveTokenSymbol}`}>
          <span className="toToken" title={s}>
            {s}
          </span>{' '}
          {receiveTokenSymbol}
        </span>
      );

      right = (
        <span className={clsx('percent', { red: !isBestQuote })}>
          {isBestQuote
            ? t('page.swap.best')
            : `${percent.toFixed(2, BigNumber.ROUND_DOWN)}%`}
        </span>
      );
    }

    return [center, right, disable];
  }, [
    data?.receive_token,
    bestQuoteAmount,
    bestQuoteGasUsd,
    isBestQuote,
    sortIncludeGasFee,
  ]);

  return (
    <ItemWrapper
      className={clsx('cex disabled', !data?.receive_token?.amount && 'error')}
    >
      <QuoteLogo isCex logo={dexInfo.logo} isLoading={!!isLoading} />

      <div className="flex flex-col justify-center ml-8 flex-1">
        <div className="flex items-center">
          <div className={clsx('flex items-center gap-4 w-[108px]')}>
            <span>{dexInfo.name}</span>
          </div>

          <div className="flex flex-col">
            <div className="price">{middleContent}</div>
          </div>
          <div className="diff">{rightContent}</div>
        </div>
      </div>
    </ItemWrapper>
  );
};

export const CexListWrapper = styled.div`
  border: 0.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  & > div:not(:last-child) {
    position: relative;
    &:not(:last-child):before {
      content: '';
      position: absolute;
      width: 440px;
      height: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      left: 20px;
      bottom: 0;
    }
  }
`;

const getQuoteLessWarning = ([receive, diff]: [string, string]) =>
  i18n.t('page.swap.QuoteLessWarning', { receive, diff });

export function WarningOrChecked({
  quoteWarning,
}: {
  quoteWarning?: [string, string];
}) {
  const { t } = useTranslation();
  return (
    <TooltipWithMagnetArrow
      overlayClassName={clsx('rectangle', 'w-[max-content]')}
      title={
        quoteWarning
          ? getQuoteLessWarning(quoteWarning)
          : t('page.swap.by-transaction-simulation-the-quote-is-valid')
      }
    >
      <img
        src={quoteWarning ? ImgWarning : ImgVerified}
        className="w-[14px] h-[14px]"
      />
    </TooltipWithMagnetArrow>
  );
}
