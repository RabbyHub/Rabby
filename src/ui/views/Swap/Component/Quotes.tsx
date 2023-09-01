import { Popup } from '@/ui/component';
import React, { useMemo } from 'react';
import { QuoteListLoading, QuoteLoading } from './loading';
import styled from 'styled-components';
import { IconRefresh } from './IconRefresh';
import { CexQuoteItem, DexQuoteItem, QuoteItemProps } from './QuoteItem';
import {
  TCexQuoteData,
  TDexQuoteData,
  isSwapWrapToken,
  useSetRefreshId,
  useSetSettingVisible,
  useSwapSettings,
} from '../hooks';
import BigNumber from 'bignumber.js';
import { CEX, DEX, DEX_WITH_WRAP } from '@/constant';
import { SvgIconCross } from 'ui/assets';
import { useTranslation } from 'react-i18next';
import { getTokenSymbol } from '@/ui/utils/token';

const CexListWrapper = styled.div`
  border: 1px solid #e5e9ef;
  border-radius: 6px;
  &:empty {
    display: none;
  }

  & > div:not(:last-child) {
    position: relative;
    &:not(:last-child):before {
      content: '';
      position: absolute;
      width: 328px;
      height: 0;
      border-bottom: 1px solid #e5e9ef;
      left: 16px;
      bottom: 0;
    }
  }
`;

const exchangeCount = Object.keys(DEX).length + Object.keys(CEX).length;

interface QuotesProps
  extends Omit<
    QuoteItemProps,
    | 'bestAmount'
    | 'name'
    | 'quote'
    | 'active'
    | 'isBestQuote'
    | 'quoteProviderInfo'
  > {
  list?: (TCexQuoteData | TDexQuoteData)[];
  activeName?: string;
  visible: boolean;
  onClose: () => void;
}

export const Quotes = ({
  list,
  activeName,
  inSufficient,
  ...other
}: QuotesProps) => {
  const { t } = useTranslation();
  const { swapViewList, swapTradeList } = useSwapSettings();

  const viewCount = useMemo(() => {
    if (swapViewList) {
      return (
        exchangeCount -
        Object.values(swapViewList).filter((e) => e === false).length
      );
    }
    return exchangeCount;
  }, [swapViewList]);

  const tradeCount = useMemo(() => {
    if (swapTradeList) {
      return Object.values(swapTradeList).filter((e) => e === true).length;
    }
    return 0;
  }, [swapTradeList]);

  const setSettings = useSetSettingVisible();
  const openSettings = React.useCallback(() => {
    setSettings(true);
  }, []);
  const sortedList = useMemo(
    () =>
      list?.sort((a, b) => {
        const getNumber = (quote: typeof a) => {
          if (quote.isDex) {
            if (inSufficient) {
              return new BigNumber(quote.data?.toTokenAmount || 0).div(
                10 **
                  (quote.data?.toTokenDecimals || other.receiveToken.decimals)
              );
            }
            if (!quote.preExecResult) {
              return new BigNumber(0);
            }
            return new BigNumber(
              quote?.preExecResult.swapPreExecTx.balance_change
                .receive_token_list?.[0]?.amount || 0
            );
          }

          return new BigNumber(quote?.data?.receive_token?.amount || 0);
        };
        return getNumber(b).minus(getNumber(a)).toNumber();
      }) || [],
    [inSufficient, list, other.receiveToken.decimals]
  );

  const bestAmount = useMemo(() => {
    const bestQuote = sortedList?.[0];

    return (
      (bestQuote?.isDex
        ? inSufficient
          ? new BigNumber(bestQuote.data?.toTokenAmount || 0)
              .div(
                10 **
                  (bestQuote?.data?.toTokenDecimals ||
                    other.receiveToken.decimals ||
                    1)
              )
              .toString(10)
          : bestQuote?.preExecResult?.swapPreExecTx.balance_change
              .receive_token_list[0]?.amount
        : new BigNumber(bestQuote?.data?.receive_token.amount || '0').toString(
            10
          )) || '0'
    );
  }, [inSufficient, other?.receiveToken?.decimals, sortedList]);

  const fetchedList = useMemo(() => list?.map((e) => e.name) || [], [list]);

  const noCex = useMemo(() => {
    return Object.keys(CEX).every((e) => swapViewList?.[e] === false);
  }, [swapViewList]);
  if (isSwapWrapToken(other.payToken.id, other.receiveToken.id, other.chain)) {
    const dex = sortedList.find((e) => e.isDex) as TDexQuoteData | undefined;

    return (
      <div className="flex flex-col gap-8">
        {dex ? (
          <DexQuoteItem
            inSufficient={inSufficient}
            preExecResult={dex?.preExecResult}
            quote={dex?.data}
            name={dex?.name}
            isBestQuote
            bestAmount={`${
              dex?.preExecResult?.swapPreExecTx.balance_change
                .receive_token_list[0]?.amount || '0'
            }`}
            active={activeName === dex?.name}
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

        <div className="text-13 text-gray-content">
          {t('page.swap.directlySwap', {
            symbol: getTokenSymbol(other.payToken),
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col gap-8">
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;
          if (!isDex) return null;
          return (
            <DexQuoteItem
              inSufficient={inSufficient}
              preExecResult={params.preExecResult}
              quote={(data as unknown) as any}
              name={name}
              isBestQuote={idx === 0}
              bestAmount={`${bestAmount}`}
              active={activeName === name}
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
      {!noCex && (
        <div className="text-gray-light text-12 mt-20 mb-8">
          {t('page.swap.rates-from-cex')}
        </div>
      )}
      <CexListWrapper>
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;
          if (isDex) return null;
          return (
            <CexQuoteItem
              name={name}
              data={(data as unknown) as any}
              bestAmount={`${bestAmount}`}
              isBestQuote={idx === 0}
              isLoading={params.loading}
              inSufficient={inSufficient}
            />
          );
        })}
        <QuoteListLoading fetchedList={fetchedList} isCex />
      </CexListWrapper>
      <div className="pt-[40px]" />
      <div className="flex items-center justify-center fixed left-0 bottom-0 h-32 text-13 w-full  bg-gray-bg2  text-gray-light ">
        {t('page.swap.tradingSettingTips', { viewCount, tradeCount })}
        <span
          onClick={openSettings}
          className="cursor-pointer pl-4 text-blue-light underline underline-blue-light"
        >
          {t('page.swap.edit')}
        </span>
      </div>
    </div>
  );
};

const bodyStyle = {
  paddingTop: 0,
  paddingBottom: 0,
};

export const QuoteList = (props: QuotesProps) => {
  const { visible, onClose } = props;
  const refresh = useSetRefreshId();

  const refreshQuote = React.useCallback(() => {
    refresh((e) => e + 1);
  }, [refresh]);

  const { t } = useTranslation();

  return (
    <Popup
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-gray-content pt-[2px]" />
      }
      visible={visible}
      title={
        <div className="mb-[-2px] pb-10 flex items-center gap-8 text-left text-gray-title text-[16px] font-medium ">
          <div>{t('page.swap.the-following-swap-rates-are-found')}</div>
          <div className="w-20 h-20 relative overflow-hidden">
            <div className="w-[36px] h-[36px] absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
              <IconRefresh onClick={refreshQuote} />
            </div>
          </div>
        </div>
      }
      height={544}
      onClose={onClose}
      closable
      destroyOnClose
      className="isConnectView z-[999]"
      bodyStyle={bodyStyle}
    >
      <Quotes {...props} />
    </Popup>
  );
};
