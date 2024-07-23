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
import styled from 'styled-components';
import ImgVerified from '@/ui/assets/swap/verified.svg';
import ImgWarning from '@/ui/assets/swap/warn.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';

import { ReactComponent as IconQuoteSwitchCC } from '@/ui/assets/swap/switch-cc.svg';

import clsx from 'clsx';
import React from 'react';
import { formatAmount } from '@/ui/utils';
import { QuoteProvider, useSetQuoteVisible } from '../hooks';
import { CHAINS_ENUM, DEX, DEX_WITH_WRAP } from '@/constant';
import { getTokenSymbol } from '@/ui/utils/token';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconEmptyCC } from '@/ui/assets/empty-cc.svg';
import { DexQuoteItem } from './QuoteItem';

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

const ReceiveWrapper = styled.div`
  position: relative;
  margin-top: 18px;
  border: 0.5px solid var(--r-blue-default, #7084ff);
  border-radius: 4px;
  cursor: pointer;
  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;
  height: 92px;
  padding: 12px 16px;
  padding-top: 24px;

  &.bestQuote {
    border: 0.5px solid var(--r-green-default, #2abb7f);
  }

  .quote-select {
    position: absolute;
    top: -12px;
    left: 12px;
    height: 20px;
    padding: 4px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 13px;
    cursor: pointer;

    color: var(--r-blue-default, #d3d8e0);
    background: var(--r-blue-light-2);
    border-radius: 4px;
    border: 0.5px solid var(--r-blue-default, #7084ff);
    /* &:hover {
      border: 1px solid var(--r-neutral-line, #d3d8e0);
    } */

    &.best {
      border: 0.5px solid var(--r-green-default, #2abb7f);
      color: var(--r-green-default, #2abb7f);
      background: var(--r-green-light, #d8f2e7);
    }
  }
`;

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

  const isBestQuote = useMemo(() => activeProvider?.name === bestQuoteDex, [
    bestQuoteDex,
    activeProvider?.name,
  ]);

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
  } = useMemo(() => {
    const pay = new BigNumber(payAmount).times(payToken.price || 0);
    const receiveAll = new BigNumber(receiveAmount);
    const receive = receiveAll.times(receiveToken.price || 0);
    const cut = receive.minus(pay).div(pay).times(100);
    const rateBn = new BigNumber(reverse ? payAmount : receiveAll).div(
      reverse ? receiveAll : payAmount
    );

    return {
      receiveNum: formatAmount(receiveAll.toString(10)),
      payUsd: formatAmount(pay.toString(10)),
      receiveUsd: formatAmount(receive.toString(10)),
      rate: rateBn.lt(0.0001)
        ? new BigNumber(rateBn.toPrecision(1, 0)).toString(10)
        : formatAmount(rateBn.toString(10)),
      sign: cut.eq(0) ? '' : cut.lt(0) ? '-' : '+',
      diff: cut.abs().toFixed(2),
      showLoss: cut.lte(-5),
    };
  }, [payAmount, payToken.price, receiveAmount, receiveToken.price, reverse]);

  const payTokenSymbol = getTokenSymbol(payToken);
  const receiveTokenSymbol = getTokenSymbol(receiveToken);
  if (!activeProvider) {
    return (
      <ReceiveWrapper
        {...other}
        className={clsx(
          other.className,
          isBestQuote && 'bestQuote',
          'p-0 justify-center items-center'
        )}
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

        <div
          className={clsx('quote-select', isBestQuote && 'best')}
          onClick={openQuotesList}
        >
          {isBestQuote ? <span>{t('page.swap.best')}</span> : null}
          <IconQuoteSwitchCC
            viewBox="0 0 14 14"
            className={clsx('w-14 h-14')}
          />
        </div>
      </ReceiveWrapper>
    );
  }

  return (
    <>
      <ReceiveWrapper
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
          quoteProviderInfo={DEX_WITH_WRAP[activeProvider.name]}
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
      </ReceiveWrapper>
      {showLoss && (
        <div className="px-12  leading-4 mt-16 text-13 text-r-neutral-body">
          <div className="flex justify-between">
            <span>{t('page.swap.price-impact')}</span>
            <span
              className={clsx(
                'font-medium  inline-flex items-center',
                sign === '-' ? 'text-r-red-default' : 'text-r-green-default'
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
                      {payTokenSymbol} ≈ ${payUsd}
                    </div>
                    <div>
                      {t('page.swap.est-receiving')} {receiveNum}
                      {receiveTokenSymbol} ≈ ${receiveUsd}
                    </div>
                    <div>
                      {t('page.swap.est-difference')} {sign}
                      {diff}%
                    </div>
                  </div>
                }
              >
                <RcIconInfo className="ml-4 text-rabby-neutral-foot w-14 h-14 " />
              </Tooltip>
            </span>
          </div>
          <div className="mt-[8px] rounded-[4px] bg-r-orange-light p-8 text-12 font-normal text-r-orange-default">
            {t(
              'page.swap.selected-offer-differs-greatly-from-current-rate-may-cause-big-losses'
            )}
          </div>
        </div>
      )}
    </>
  );
};
