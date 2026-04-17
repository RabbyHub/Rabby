import { Popup } from '@/ui/component';
import React, { useMemo, useState } from 'react';
import { QuoteListLoading, QuoteLoading } from './loading';
import { IconRefresh } from './IconRefresh';
import { DexQuoteItem, QuoteItemProps } from './QuoteItem';
import { TDexQuoteData, isSwapWrapToken, useSetRefreshId } from '../hooks';
import BigNumber from 'bignumber.js';
import { DEX_WITH_WRAP } from '@/constant';
import { SvgIconCross } from 'ui/assets';
import { useTranslation } from 'react-i18next';
import { getTokenSymbol } from '@/ui/utils/token';
import { ReactComponent as RcIconHiddenArrow } from '@/ui/assets/swap/hidden-quote-arrow.svg';
import clsx from 'clsx';
import { useRabbySelector } from '@/ui/store';
import { DrawerProps } from 'antd';

interface QuotesProps
  extends Omit<
    QuoteItemProps,
    | 'bestQuoteAmount'
    | 'bestQuoteGasUsd'
    | 'name'
    | 'quote'
    | 'active'
    | 'isBestQuote'
    | 'quoteProviderInfo'
  > {
  list?: TDexQuoteData[];
  activeName?: string;
  visible: boolean;
  onClose: () => void;
  getContainer?: DrawerProps['getContainer'];
}

export const Quotes = ({
  list,
  activeName,
  inSufficient,
  getContainer,
  ...other
}: QuotesProps) => {
  const { t } = useTranslation();

  const sortedList = useMemo(
    () => [
      ...(list?.sort((a, b) => {
        const getNumber = (quote: typeof a) => {
          const price = other.receiveToken.price ? other.receiveToken.price : 0;
          if (inSufficient) {
            return new BigNumber(quote.data?.toTokenAmount || 0)
              .div(
                10 **
                  (quote.data?.toTokenDecimals || other.receiveToken.decimals)
              )
              .times(price);
          }
          if (!quote.preExecResult) {
            return new BigNumber(Number.MIN_SAFE_INTEGER);
          }
          const receiveTokenAmount = new BigNumber(
            quote?.data?.toTokenAmount || 0
          )
            .div(
              10 **
                (quote?.data?.toTokenDecimals || other.receiveToken.decimals)
            )
            .toString();
          return new BigNumber(receiveTokenAmount)
            .times(price)
            .minus(quote?.preExecResult?.gasUsdValue || 0);
        };
        return getNumber(b).minus(getNumber(a)).toNumber();
      }) || []),
    ],
    [inSufficient, list, other.receiveToken]
  );

  const [bestQuoteAmount, bestQuoteGasUsd] = useMemo(() => {
    const bestQuote = sortedList?.[0];
    const receiveTokenAmount =
      new BigNumber(bestQuote?.data?.toTokenAmount || 0)
        .div(
          10 **
            (bestQuote?.data?.toTokenDecimals || other.receiveToken.decimals)
        )
        .toString() || '0';

    return [
      inSufficient
        ? new BigNumber(bestQuote.data?.toTokenAmount || 0)
            .div(
              10 **
                (bestQuote?.data?.toTokenDecimals ||
                  other.receiveToken.decimals ||
                  1)
            )
            .toString(10)
        : receiveTokenAmount,
      bestQuote?.isDex ? bestQuote.preExecResult?.gasUsdValue || '0' : '0',
    ];
  }, [inSufficient, other?.receiveToken, sortedList]);

  const fetchedList = useMemo(() => list?.map((e) => e.name) || [], [list]);
  const [hiddenError, setHiddenError] = useState(true);
  const [errorQuoteDEXs, setErrorQuoteDEXs] = useState<string[]>([]);

  const dexListLength = useRabbySelector((s) => s.swap.supportedDEXList.length);

  if (isSwapWrapToken(other.payToken.id, other.receiveToken.id, other.chain)) {
    const dex = sortedList.find((e) => e.isDex) as TDexQuoteData | undefined;

    return (
      <div className="flex flex-col gap-8 px-20">
        {dex ? (
          <DexQuoteItem
            inSufficient={inSufficient}
            preExecResult={dex?.preExecResult}
            quote={dex?.data}
            name={dex?.name}
            isBestQuote
            bestQuoteAmount={`${
              new BigNumber(dex?.data?.toTokenAmount || 0)
                .div(
                  10 **
                    (dex?.data?.toTokenDecimals || other.receiveToken.decimals)
                )
                .toString() || '0'
            }`}
            bestQuoteGasUsd={bestQuoteGasUsd}
            isLoading={dex.loading}
            quoteProviderInfo={{
              name: t('page.swap.wrap-contract'),
              logo: other?.receiveToken?.logo_url,
            }}
            {...other}
          />
        ) : (
          <QuoteLoading
            name={t('page.swap.wrap-contract')}
            logo={other?.receiveToken?.logo_url}
          />
        )}

        <div className="text-13 text-r-neutral-foot">
          {t('page.swap.directlySwap', {
            symbol: getTokenSymbol(other.payToken),
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col flex-1 w-full overflow-auto pb-12 px-20">
      <div className="flex flex-col gap-12">
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;
          if (!isDex) return null;
          return (
            <DexQuoteItem
              onErrQuote={setErrorQuoteDEXs}
              key={name}
              inSufficient={inSufficient}
              preExecResult={params.preExecResult}
              quote={(data as unknown) as any}
              name={name}
              isBestQuote={idx === 0}
              bestQuoteAmount={`${bestQuoteAmount}`}
              bestQuoteGasUsd={bestQuoteGasUsd}
              isLoading={params.loading}
              quoteProviderInfo={
                DEX_WITH_WRAP[name as keyof typeof DEX_WITH_WRAP]
              }
              {...other}
            />
          );
        })}

        <QuoteListLoading fetchedList={fetchedList} />
      </div>
      <div
        className={clsx(
          'flex items-center justify-center my-8 mt-24 cursor-pointer gap-4',
          errorQuoteDEXs.length === 0 ||
            errorQuoteDEXs?.length === dexListLength
            ? 'hidden'
            : 'mb-12'
        )}
        onClick={() => setHiddenError((e) => !e)}
      >
        <span className="text-13 text-rabby-neutral-foot gap-4 ">
          {t('page.swap.hidden-no-quote-rates', {
            count: errorQuoteDEXs.length,
          })}
        </span>
        <RcIconHiddenArrow
          viewBox="0 0 14 14"
          className={clsx('w-14 h-14', !hiddenError && '-rotate-180')}
        />
      </div>
      <div
        className={clsx(
          'flex flex-col gap-8 transition overflow-hidden',
          hiddenError &&
            errorQuoteDEXs?.length !== dexListLength &&
            'max-h-0 h-0',
          errorQuoteDEXs.length === 0 && 'hidden'
        )}
      >
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;

          if (!isDex) return null;
          return (
            <DexQuoteItem
              onErrQuote={setErrorQuoteDEXs}
              onlyShowErrorQuote
              key={name}
              inSufficient={inSufficient}
              preExecResult={params.preExecResult}
              quote={(data as unknown) as any}
              name={name}
              isBestQuote={idx === 0}
              bestQuoteAmount={`${bestQuoteAmount}`}
              bestQuoteGasUsd={bestQuoteGasUsd}
              isLoading={params.loading}
              quoteProviderInfo={
                DEX_WITH_WRAP[name as keyof typeof DEX_WITH_WRAP]
              }
              {...other}
            />
          );
        })}
      </div>
    </div>
  );
};

const bodyStyle = {
  padding: 0,
};

export const QuoteList = (props: Omit<QuotesProps, 'sortIncludeGasFee'>) => {
  const { visible, onClose, getContainer } = props;
  const refresh = useSetRefreshId();

  const refreshQuote = React.useCallback(() => {
    refresh((e) => e + 1);
  }, [refresh]);

  const { t } = useTranslation();

  const dexList = useRabbySelector((s) => s.swap.supportedDEXList);

  const height = useMemo(() => {
    const min = 333;
    const max = 548;

    const h = 45 + 24 + dexList.length * 100;

    if (h < min) {
      return min;
    }
    if (h > max) {
      return max;
    }
    return h;
  }, [dexList.length]);

  return (
    <Popup
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-r-neutral-foot pt-[2px]" />
      }
      headerStyle={{
        paddingTop: 16,
      }}
      visible={visible}
      title={
        <div className="mb-[-2px] pb-10">
          <div className="relative pr-24 text-left text-r-neutral-title-1 text-[16px] font-medium">
            <div>{t('page.swap.the-following-swap-rates-are-found')}</div>
            <div className="absolute right-0 top-1/2 translate-y-[-50%] flex items-center gap-2 text-r-blue-default">
              <div className="w-14 h-14 relative overflow-hidden">
                <div className="w-[14px] h-[14px] absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
                  <IconRefresh
                    spinning={props.loading}
                    onClick={refreshQuote}
                  />
                </div>
              </div>
              <span
                className="text-[16px] font-medium cursor-pointer"
                onClick={refreshQuote}
              >
                {t('global.refresh')}
              </span>
            </div>
          </div>
          <div className="mt-8 text-12 leading-[18px] text-r-neutral-foot text-left">
            {t('page.swap.best-subtitle')}
          </div>
        </div>
      }
      height={height}
      onClose={onClose}
      closable={false}
      destroyOnClose
      className="isConnectView z-[999]"
      bodyStyle={bodyStyle}
      isSupportDarkMode
      getContainer={getContainer}
    >
      <Quotes {...props} sortIncludeGasFee />
    </Popup>
  );
};
