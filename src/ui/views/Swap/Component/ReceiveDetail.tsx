import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import {
  InsHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ImgVerified from '@/ui/assets/swap/verified.svg';
import ImgWarning from '@/ui/assets/swap/warn.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';

import { ReactComponent as IconQuoteSwitchCC } from '@/ui/assets/swap/switch-cc.svg';

import clsx from 'clsx';
import React from 'react';
import { formatAmount, formatUsdValue } from '@/ui/utils';
import { isSwapWrapToken, QuoteProvider } from '../hooks';
import { CHAINS_ENUM, DEX_WITH_WRAP } from '@/constant';
import { getTokenSymbol } from '@/ui/utils/token';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconEmptyCC } from '@/ui/assets/empty-cc.svg';
import { DexQuoteItem } from './QuoteItem';
import { QuoteReceiveWrapper } from './ReceiveWrapper';

const getQuoteLessWarning = ([receive, diff]: [string, string]) =>
  i18n.t('page.swap.QuoteLessWarning', { receive, diff });

export const WarningOrChecked = ({
  quoteWarning,
}: {
  quoteWarning?: [string, string];
}) => {
  const { t } = useTranslation();
  return (
    <Tooltip
      align={{
        offset: [10, 0],
      }}
      placement={'topRight'}
      overlayClassName={clsx('rectangle', 'max-w-[360px]')}
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
    </Tooltip>
  );
};

interface ReceiveDetailsProps {
  payAmount: string;
  receiveRawAmount: string | number;
  payToken: TokenItem;
  receiveToken: TokenItem;
  receiveTokenDecimals?: number;
  quoteWarning?: [string, string];
  loading?: boolean;
  activeProvider?: QuoteProvider;
  isWrapToken?: boolean;
  bestQuoteDex: string;
  chain: CHAINS_ENUM;
  openQuotesList: () => void;
}

export const ReceiveDetails = (
  props: ReceiveDetailsProps & InsHTMLAttributes<HTMLDivElement>
) => {
  const { t } = useTranslation();
  const {
    receiveRawAmount: receiveAmount,
    payAmount,
    payToken,
    receiveToken,
    quoteWarning,
    loading = false,
    activeProvider,
    isWrapToken,
    bestQuoteDex,
    chain,
    openQuotesList,
    ...other
  } = props;

  const [reverse, setReverse] = useState(false);

  const reverseRate = useCallback(() => {
    setReverse((e) => !e);
  }, []);

  useEffect(() => {
    if (payToken && receiveToken) {
      setReverse(false);
    }
  }, [receiveToken, payToken]);

  const {
    receiveNum,
    payUsd,
    receiveUsd,
    rate,
    diff,
    sign,
    showLoss,
    lossUsd,
  } = useMemo(() => {
    const pay = new BigNumber(payAmount).times(payToken.price || 0);
    const receiveAll = new BigNumber(receiveAmount);
    const receive = receiveAll.times(receiveToken.price || 0);
    const cut = receive.minus(pay).div(pay).times(100);
    const rateBn = new BigNumber(reverse ? payAmount : receiveAll).div(
      reverse ? receiveAll : payAmount
    );
    const lossUsd = formatUsdValue(receive.minus(pay).abs().toString());

    return {
      receiveNum: formatAmount(receiveAll.toString(10)),
      payUsd: formatUsdValue(pay.toString(10)),
      receiveUsd: formatUsdValue(receive.toString(10)),
      rate: rateBn.lt(0.0001)
        ? new BigNumber(rateBn.toPrecision(1, 0)).toString(10)
        : formatAmount(rateBn.toString(10)),
      sign: cut.eq(0) ? '' : cut.lt(0) ? '-' : '+',
      diff: cut.abs().toFixed(2),
      showLoss: cut.lte(-5),
      lossUsd,
    };
  }, [payAmount, payToken.price, receiveAmount, receiveToken.price, reverse]);

  const isBestQuote = useMemo(
    () => !!bestQuoteDex && activeProvider?.name === bestQuoteDex,
    [bestQuoteDex, activeProvider?.name]
  );

  const payTokenSymbol = useMemo(() => getTokenSymbol(payToken), [payToken]);
  const receiveTokenSymbol = useMemo(() => getTokenSymbol(receiveToken), [
    receiveToken,
  ]);

  const isWrapTokens = useMemo(
    () => isSwapWrapToken(payToken.id, receiveToken.id, chain),
    [payToken, receiveToken, chain]
  );

  if (!activeProvider) {
    return (
      <QuoteReceiveWrapper
        {...other}
        className={clsx(other.className, 'empty-quote')}
        onClick={openQuotesList}
      >
        <div className="flex items-center justify-center gap-[8px]">
          <IconEmptyCC
            viewBox="0 0 40 40"
            className="w-[16px] h-[16px] text-r-neutral-foot"
          />
          <div className="text-13 font-normal text-r-neutral-foot">
            {t('page.swap.No-available-quote')}
          </div>
        </div>

        <div className={clsx('quote-select')} onClick={openQuotesList}>
          <IconQuoteSwitchCC
            viewBox="0 0 14 14"
            className={clsx('w-14 h-14')}
          />
        </div>
      </QuoteReceiveWrapper>
    );
  }

  return (
    <>
      <QuoteReceiveWrapper
        {...other}
        className={clsx(other.className, isBestQuote && 'bestQuote')}
        onClick={openQuotesList}
      >
        <DexQuoteItem
          onlyShow
          quote={activeProvider.quote}
          name={activeProvider.name}
          payToken={payToken}
          receiveToken={receiveToken}
          payAmount={payAmount}
          chain={chain}
          isBestQuote={false}
          bestQuoteGasUsd={'0'}
          bestQuoteAmount={'0'}
          userAddress={''}
          slippage={''}
          fee={''}
          quoteProviderInfo={
            isWrapTokens
              ? {
                  name: t('page.swap.wrap-contract'),
                  logo: receiveToken?.logo_url,
                }
              : DEX_WITH_WRAP[activeProvider.name]
          }
          inSufficient={false}
          sortIncludeGasFee={true}
          preExecResult={activeProvider.preExecResult}
        />

        {activeProvider.name && receiveToken ? (
          <div
            className={clsx(
              'quote-select',

              isBestQuote && 'best'
            )}
            onClick={openQuotesList}
          >
            {isBestQuote ? <span>{t('page.swap.best')}</span> : null}
            <IconQuoteSwitchCC
              viewBox="0 0 14 14"
              className={clsx('w-14 h-14')}
            />
          </div>
        ) : null}
      </QuoteReceiveWrapper>
      {showLoss && (
        <div className="px-12  leading-4 mt-14 text-13 text-r-neutral-body">
          <div className="flex justify-between">
            <span>{t('page.swap.price-impact')}</span>
            <span
              className={clsx(
                'font-medium  inline-flex items-center',
                'text-r-red-default'
              )}
            >
              {sign}
              {diff}%
              <Tooltip
                align={{
                  offset: [10, 0],
                }}
                placement={'topRight'}
                overlayClassName="rectangle max-w-[360px]"
                title={
                  <div className="flex flex-col gap-4 py-[5px] text-13">
                    <div>
                      {t('page.swap.est-payment')} {payAmount}
                      {payTokenSymbol} ≈ {payUsd}
                    </div>
                    <div>
                      {t('page.swap.est-receiving')} {receiveNum}
                      {receiveTokenSymbol} ≈ {receiveUsd}
                    </div>
                    <div>
                      {t('page.swap.est-difference')} -{lossUsd}
                    </div>
                  </div>
                }
              >
                <RcIconInfo className="ml-4 text-rabby-neutral-foot w-14 h-14 " />
              </Tooltip>
            </span>
          </div>
          <div className="mt-[8px] rounded-[4px] bg-r-red-light p-8 text-12 font-normal text-r-red-default">
            {t('page.swap.loss-tips', {
              usd: lossUsd,
            })}
          </div>
        </div>
      )}
    </>
  );
};
