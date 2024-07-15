import { formatAmount, formatUsdValue } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import clsx from 'clsx';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useDebounce } from 'react-use';
import styled from 'styled-components';
import { QuoteLogo } from './QuoteLogo';
import BigNumber from 'bignumber.js';
import ImgLock from '@/ui/assets/swap/lock.svg';
import { ReactComponent as RcIconGasCC } from '@/ui/assets/swap/gas-cc.svg';
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
import { TokenWithChain } from '@/ui/component';
import { Tooltip } from 'antd';

const GAS_USE_AMOUNT_LIMIT = 2_000_000;

const ItemWrapper = styled.div`
  position: relative;
  height: 60px;
  font-size: 13px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  /* color: var(--r-neutral-title-1, #192945); */
  background: var(--r-neutral-card-1, #fff);

  border-radius: 6px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  border: 0.5px solid transparent;
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
    gap: 8px;
    font-weight: 400;
    font-size: 13px;
    color: #ffffff;
    pointer-events: none;
    &.active {
      cursor: pointer;
      pointer-events: auto;
      height: 100%;
      transform: translateY(0);
      opacity: 1;
      /* transition: opacity 0.35s, transform 0.35s; */
    }
  }

  &:hover:not(.disabled, .inSufficient) {
    background: var(--r-blue-light-1, #eef1ff);
    border: 0.5px solid var(--r-blue-default, #7084ff);
  }
  &.active {
    outline: 2px solid var(--r-blue-default, #7084ff);
  }
  &.disabled {
    border-color: transparent;
    box-shadow: none;
    background-color: transparent;
    border-radius: 6px;
    cursor: not-allowed;
  }

  &:not(.cex).inSufficient,
  &:not(.cex).disabled {
    border: 0.5px solid var(--r-neutral-line, #d3d8e0);
    border-radius: 6px;
    box-shadow: none;
  }

  &.dex {
    justify-content: space-between;
    height: auto;
    height: 80px;

    &.error {
      height: 52px;
    }
  }

  &.cex {
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-title-1, #192945);
    height: 44px;
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
    onErrQuote?: React.Dispatch<React.SetStateAction<string[]>>;
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
    onErrQuote,
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
    let center: React.ReactNode = null;
    let right: React.ReactNode = null;
    let disable = false;
    let receivedUsd: React.ReactNode = null;
    let diffUsd: React.ReactNode = null;

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
          {s}
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
      center = null;
      disable = true;
    }

    if (quote?.toTokenAmount) {
      if (!preExecResult && !inSufficient) {
        center = null;
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
      center = null;
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
    gasFeeTooHight,
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

  const isErrorQuote = useMemo(
    () =>
      !isSdkDataPass ||
      !quote?.toTokenAmount ||
      !!(quote?.toTokenAmount && !preExecResult && !inSufficient),
    [isSdkDataPass, quote, preExecResult, inSufficient]
  );

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
      visible={
        gasFeeTooHight || (inSufficient && !disabled) ? undefined : false
      }
      align={{ offset: [0, 30] }}
      arrowPointAtCenter
    >
      <ItemWrapper
        onMouseEnter={() => {
          if (
            isSdkDataPass &&
            !gasFeeTooHight &&
            disabledTrade &&
            !inSufficient &&
            quote &&
            preExecResult
          ) {
            setDisabledTradeTipsOpen(true);
          }
        }}
        onMouseLeave={() => {
          setDisabledTradeTipsOpen(false);
        }}
        onClick={handleClick}
        className={clsx(
          'dex',
          active && 'active',
          (disabledTrade || disabled) && 'disabled',
          isErrorQuote && 'error',

          inSufficient && !disabled && 'disabled inSufficient',
          gasFeeTooHight && 'disabled gasFeeTooHight'
        )}
      >
        <DEXItem
          logo={quoteProviderInfo.logo}
          name={quoteProviderInfo.name}
          isLoading={isLoading}
          shouldApproveToken={preExecResult?.shouldApproveToken}
          disable={disabled}
          gasUsd={preExecResult?.gasUsd}
          receiveToken={receiveToken}
          middleContent={middleContent}
          statusIcon={<CheckIcon />}
          receivedTokenUsd={receivedTokenUsd}
          diffContent={rightContent}
          gasFeeTooHight={gasFeeTooHight}
          isSdkDataPass={isSdkDataPass}
        />

        <div
          className={clsx('disabled-trade', disabledTradeTipsOpen && 'active')}
          onClick={(e) => {
            e.stopPropagation();
            openSwapSettings(true);
            setDisabledTradeTipsOpen(false);
          }}
        >
          <img
            src={ImgWhiteWarning}
            className="w-12 h-12 relative top-[-10px]"
          />
          <span>
            {t('page.swap.this-exchange-is-not-enabled-to-trade-by-you')}
            <br />
            <span className="underline-transparent underline cursor-pointer ml-4">
              {t('page.swap.enable-it')}
            </span>
          </span>
        </div>
      </ItemWrapper>
    </Tooltip>
  );
};

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
      arrowPointAtCenter
      overlayClassName={clsx('rectangle', 'w-[max-content]')}
      title={
        quoteWarning
          ? getQuoteLessWarning(quoteWarning)
          : t('page.swap.by-transaction-simulation-the-quote-is-valid')
      }
    >
      <img
        src={quoteWarning ? ImgWarning : ImgVerified}
        className="w-[16px] h-[16px]"
      />
    </TooltipWithMagnetArrow>
  );
}

function DEXItem(props: {
  logo: string;
  isLoading?: boolean;
  name: string;
  shouldApproveToken?: boolean;
  disable?: boolean;
  gasUsd?: string;
  receiveToken: TokenItem;
  middleContent: React.ReactNode;
  statusIcon?: React.ReactNode;
  receivedTokenUsd?: React.ReactNode;
  diffContent?: React.ReactNode;
  gasFeeTooHight?: boolean;
  isSdkDataPass?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      {/* left */}
      <div className="flex flex-col gap-10">
        <div className="flex items-center gap-8 relative">
          <QuoteLogo loaded logo={props.logo} isLoading={props.isLoading} />
          <span className="text-[16px] font-medium text-r-neutral-title-1">
            {props.name}
          </span>
          {!!props.shouldApproveToken && (
            <TooltipWithMagnetArrow
              arrowPointAtCenter
              overlayClassName="rectangle w-[max-content]"
              title={t('page.swap.need-to-approve-token-before-swap')}
            >
              <img src={ImgLock} className="w-16 h16" />
            </TooltipWithMagnetArrow>
          )}
        </div>

        {!!props?.gasUsd && props.isSdkDataPass && (
          <div className={clsx('flex items-center')}>
            <div
              className={clsx(
                'inline-flex items-center gap-4 px-4',
                props.gasFeeTooHight && 'bg-r-red-light'
              )}
            >
              <RcIconGasCC
                className={clsx(
                  'text-r-neutral-foot w-16 h-16',
                  props.gasFeeTooHight
                    ? 'text-rabby-red-default'
                    : 'text-r-neutral-foot'
                )}
                viewBox="0 0 16 16"
              />
              <span
                className={clsx(
                  'text-13',
                  props.gasFeeTooHight
                    ? 'text-rabby-red-default'
                    : 'text-r-neutral-foot'
                )}
              >
                {props?.gasUsd}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* right */}
      <div className="flex flex-col gap-12">
        {props.middleContent !== null && (
          <div className="flex items-center justify-end relative">
            <TokenWithChain
              token={props.receiveToken}
              width="20px"
              height="20px"
              hideChainIcon
              hideConer
            />
            <div className="ml-6 mr-4 flex items-center">
              {props.middleContent}
            </div>
            {props.statusIcon}
          </div>
        )}
        <div className="flex items-center gap-6 justify-end text-13 font-medium">
          {!props.disable && (
            <span className="text-r-neutral-foot font-normal">
              ≈{props.receivedTokenUsd}
            </span>
          )}

          <span className="text-r-red-default">{props.diffContent}</span>
        </div>
      </div>
    </>
  );
}
