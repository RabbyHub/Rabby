import { Checkbox, Popup } from '@/ui/component';
import React, { useEffect, useMemo, useState } from 'react';
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
}

export const Quotes = ({
  list,
  activeName,
  inSufficient,
  sortIncludeGasFee,
  ...other
}: QuotesProps) => {
  const { t } = useTranslation();

  const sortedList = useMemo(
    () => [
      ...(list?.sort((a, b) => {
        const getNumber = (quote: typeof a) => {
          const price = other.receiveToken.price ? other.receiveToken.price : 1;
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
      inSufficient
        ? new BigNumber(bestQuote.data?.toTokenAmount || 0)
            .div(
              10 **
                (bestQuote?.data?.toTokenDecimals ||
                  other.receiveToken.decimals ||
                  1)
            )
            .toString(10)
        : bestQuote?.preExecResult?.swapPreExecTx.balance_change
            .receive_token_list[0]?.amount,
      bestQuote?.isDex ? bestQuote.preExecResult?.gasUsdValue || '0' : '0',
    ];
  }, [inSufficient, other?.receiveToken?.decimals, sortedList]);

  const fetchedList = useMemo(() => list?.map((e) => e.name) || [], [list]);
  const [hiddenError, setHiddenError] = useState(true);
  const [errorQuoteDEXs, setErrorQuoteDEXs] = useState<string[]>([]);

  const dexListLength = useRabbySelector((s) => s.swap.supportedDEXList.length);

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
            isLoading={dex.loading}
            quoteProviderInfo={{
              name: t('page.swap.wrap-contract'),
              logo: other?.receiveToken?.logo_url,
            }}
            sortIncludeGasFee={sortIncludeGasFee}
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
              sortIncludeGasFee={sortIncludeGasFee}
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
              sortIncludeGasFee={sortIncludeGasFee}
              {...other}
            />
          );
        })}
      </div>
    </div>
  );
};

const bodyStyle = {
  paddingTop: 0,
  paddingBottom: 0,
};

export const QuoteList = (props: Omit<QuotesProps, 'sortIncludeGasFee'>) => {
  const { visible, onClose } = props;
  const refresh = useSetRefreshId();

  const refreshQuote = React.useCallback(() => {
    refresh((e) => e + 1);
  }, [refresh]);

  const { t } = useTranslation();

  const [sortIncludeGasFee, setSortIncludeGasFee] = useState(true);

  const dexList = useRabbySelector((s) => s.swap.supportedDEXList);

  const height = useMemo(() => {
    const min = 333;
    const max = 540;

    const h = 45 + 24 + dexList.length * 100;

    if (h < min) {
      return min;
    }
    if (h > max) {
      return max;
    }
    return h;
  }, [dexList.length]);

  useEffect(() => {
    if (!visible) {
      setSortIncludeGasFee(true);
    }
  }, [visible]);

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
            onChange={setSortIncludeGasFee}
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
      height={height}
      onClose={onClose}
      closable={false}
      destroyOnClose
      className="isConnectView z-[999]"
      bodyStyle={bodyStyle}
      isSupportDarkMode
    >
      <Quotes {...props} sortIncludeGasFee={sortIncludeGasFee} />
    </Popup>
  );
};
