import { Checkbox, Popup } from '@/ui/component';
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
  border: 0.5px solid var(--r-neutral-line, #d3d8e0);
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
      border-bottom: 0.5px solid var(--r-neutral-line, #d3d8e0);
      left: 16px;
      bottom: 0;
    }
  }
`;

const exchangeCount = Object.keys(DEX).length + Object.keys(CEX).length;

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
  const { swapViewList, swapTradeList, sortIncludeGasFee } = useSwapSettings();

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
      const TradeDexList = Object.keys(DEX);
      return Object.entries(swapTradeList).filter(
        ([name, enable]) => enable === true && TradeDexList.includes(name)
      ).length;
    }
    return 0;
  }, [swapTradeList]);

  const setSettings = useSetSettingVisible();
  const openSettings = React.useCallback(() => {
    setSettings(true);
  }, []);
  const sortedList = useMemo(
    () => [
      ...(list?.sort((a, b) => {
        const getNumber = (quote: typeof a) => {
          const price = other.receiveToken.price ? other.receiveToken.price : 1;
          if (quote.isDex) {
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

            if (sortIncludeGasFee) {
              return new BigNumber(
                quote?.preExecResult.swapPreExecTx.balance_change
                  .receive_token_list?.[0]?.amount || 0
              )
                .times(price)
                .minus(quote?.preExecResult?.gasUsdValue || 0);
            }

            return new BigNumber(
              quote?.preExecResult.swapPreExecTx.balance_change
                .receive_token_list?.[0]?.amount || 0
            ).times(price);
          }

          return quote?.data?.receive_token
            ? new BigNumber(quote?.data?.receive_token?.amount).times(price)
            : new BigNumber(Number.MIN_SAFE_INTEGER);
        };
        return getNumber(b).minus(getNumber(a)).toNumber();
      }) || []),
    ],
    [
      inSufficient,
      list,
      other.receiveToken.decimals,
      other?.receiveToken?.price,
      sortIncludeGasFee,
    ]
  );

  const [bestQuoteAmount, bestQuoteGasUsd] = useMemo(() => {
    const bestQuote = sortedList?.[0];

    return [
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
          )) || '0',
      bestQuote?.isDex ? bestQuote.preExecResult?.gasUsdValue || '0' : '0',
    ];
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
            bestQuoteAmount={`${
              dex?.preExecResult?.swapPreExecTx.balance_change
                .receive_token_list[0]?.amount || '0'
            }`}
            bestQuoteGasUsd={bestQuoteGasUsd}
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

        <div className="text-13 text-r-neutral-foot">
          {t('page.swap.directlySwap', {
            symbol: getTokenSymbol(other.payToken),
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col flex-1 w-full overflow-auto">
      <div className="flex flex-col gap-12">
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;
          if (!isDex) return null;
          return (
            <DexQuoteItem
              key={name}
              inSufficient={inSufficient}
              preExecResult={params.preExecResult}
              quote={(data as unknown) as any}
              name={name}
              isBestQuote={idx === 0}
              bestQuoteAmount={`${bestQuoteAmount}`}
              bestQuoteGasUsd={bestQuoteGasUsd}
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
        <div className="text-gray-light text-12 mt-16 mb-8">
          {t('page.swap.rates-from-cex')}
        </div>
      )}
      <CexListWrapper>
        {sortedList.map((params, idx) => {
          const { name, data, isDex } = params;
          if (isDex) return null;
          return (
            <CexQuoteItem
              receiveToken={other.receiveToken}
              key={name}
              name={name}
              data={data}
              bestQuoteAmount={`${bestQuoteAmount}`}
              bestQuoteGasUsd={bestQuoteGasUsd}
              isBestQuote={idx === 0}
              isLoading={params.loading}
              inSufficient={inSufficient}
            />
          );
        })}
        <QuoteListLoading fetchedList={fetchedList} isCex />
      </CexListWrapper>
      <div className="h-32" />
      <div className="flex items-center justify-center fixed left-0 bottom-0 h-32 text-13 w-full bg-r-neutral-bg-2 text-r-neutral-foot pb-6">
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

  const { sortIncludeGasFee, setSwapSortIncludeGasFee } = useSwapSettings();

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
        <div className="flex items-center justify-between mb-[-2px] pb-10">
          <div className="flex items-center gap-6 text-left text-r-neutral-title-1 text-[16px] font-medium ">
            <div>{t('page.swap.the-following-swap-rates-are-found')}</div>
            <div className="w-14 h-14 relative overflow-hidden">
              <div className="w-[26px] h-[26px] absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
                <IconRefresh onClick={refreshQuote} />
              </div>
            </div>
          </div>

          <Checkbox
            checked={!!sortIncludeGasFee}
            onChange={setSwapSortIncludeGasFee}
            className="text-12 text-rabby-neutral-body"
            width="14px"
            height="14px"
            type="square"
            background="transparent"
            unCheckBackground="transparent"
            checkIcon={
              sortIncludeGasFee ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    fill={'var(--r-blue-default)'}
                    d="M12.103.875H1.898a1.02 1.02 0 0 0-1.02 1.02V12.1c0 .564.456 1.02 1.02 1.02h10.205a1.02 1.02 0 0 0 1.02-1.02V1.895a1.02 1.02 0 0 0-1.02-1.02Z"
                  />
                  <path
                    stroke="#fff"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.05}
                    d="m4.2 7.348 2.1 2.45 4.2-4.9"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="var(--r-neutral-foot)"
                    strokeLinejoin="round"
                    strokeWidth={0.75}
                    d="M12.103.875H1.898a1.02 1.02 0 0 0-1.02 1.02V12.1c0 .564.456 1.02 1.02 1.02h10.205a1.02 1.02 0 0 0 1.02-1.02V1.895a1.02 1.02 0 0 0-1.02-1.02Z"
                  />
                </svg>
              )
            }
          >
            <span className="ml-[-4px]">{t('page.swap.sort-with-gas')}</span>
          </Checkbox>
        </div>
      }
      height={516}
      onClose={onClose}
      closable={false}
      destroyOnClose
      className="isConnectView z-[999]"
      bodyStyle={bodyStyle}
      isSupportDarkMode
    >
      <Quotes {...props} />
    </Popup>
  );
};
