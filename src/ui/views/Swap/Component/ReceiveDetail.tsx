import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Skeleton, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import {
  InsHTMLAttributes,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styled from 'styled-components';
import ImgVerified from '@/ui/assets/swap/verified.svg';
import ImgWarning from '@/ui/assets/swap/warn.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';

import ImgSwitch from '@/ui/assets/swap/switch.svg';
import ImgGas from '@/ui/assets/swap/gas.svg';
import ImgLock from '@/ui/assets/swap/lock.svg';

import clsx from 'clsx';
import { SkeletonInputProps } from 'antd/lib/skeleton/Input';
import React from 'react';
import { formatAmount } from '@/ui/utils';
import { QuoteProvider, useSetQuoteVisible } from '../hooks';
import { DEX } from '@/constant';
import { getTokenSymbol } from '@/ui/utils/token';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { TokenWithChain } from '@/ui/component';

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
  border: 0.5px solid var(--r-neutral-line, #d3d8e0);
  border-radius: 4px;
  padding: 12px;
  padding-top: 16px;
  padding-bottom: 8px;

  color: var(--r-neutral-title-1, #192945);
  font-size: 13px;
  .receive-token {
    font-size: 15px;
    color: #13141a;
  }

  .diffPercent {
    &.negative {
      color: var(--r-red-default, #e34935);
    }
    &.positive {
      color: var(--r-green-default, #2abb7f);
    }
  }
  .column {
    display: flex;
    justify-content: space-between;

    .right {
      font-weight: medium;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      .ellipsis {
        max-width: 170px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      img {
        width: 14px;
        height: 14px;
      }
    }
  }

  .warning {
    margin-bottom: 8px;
    padding: 8px;
    font-weight: 400;
    font-size: 13px;
    color: #ffb020;
    position: relative;
    background: rgba(255, 176, 32, 0.1);
    border-radius: 4px;
  }

  .footer {
    position: relative;
    border-top: 0.5px solid var(--r-neutral-line, #d3d8e0);
    padding-top: 8px;

    .rate {
      color: var(--r-neutral-body, #d3d8e0) !important;
    }
  }
  .quote-provider {
    position: absolute;
    top: -12px;
    left: 12px;
    height: 20px;
    padding: 4px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    cursor: pointer;

    color: var(--r-neutral-body, #d3d8e0);
    background: var(--r-blue-light-2);
    border-radius: 4px;
    border: 1px solid transparent;
    &:hover {
      /* background: var(--r-neutral-bg-1, #fff); */
      border: 1px solid var(--r-neutral-line, #d3d8e0);
    }
  }
`;

const SkeletonChildren = (
  props: PropsWithChildren<SkeletonInputProps & { loading?: boolean }>
) => {
  const { loading = true, children, ...other } = props;
  if (loading) {
    return <Skeleton.Input active {...other} />;
  }
  return <>{children}</>;
};

interface ReceiveDetailsProps {
  payAmount: string | number;
  receiveRawAmount: string | number;
  payToken: TokenItem;
  receiveToken: TokenItem;
  receiveTokenDecimals?: number;
  quoteWarning?: [string, string];
  loading?: boolean;
  activeProvider: QuoteProvider;
  isWrapToken?: boolean;
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

  const openQuote = useSetQuoteVisible();
  const payTokenSymbol = getTokenSymbol(payToken);
  const receiveTokenSymbol = getTokenSymbol(receiveToken);

  return (
    <ReceiveWrapper {...other}>
      <div className="column receive-token pb-[13px]">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-8">
            <div
              className={clsx(
                'flex items-center gap-8  text-15 font-medium text-r-neutral-title-1 h-18',
                isWrapToken ? 'w-[130px]' : 'w-[108px]'
              )}
            >
              <div className="flex items-center gap-6">
                <img
                  className={clsx('rounded-full w-20 h-20 min-w-[20px]')}
                  src={
                    isWrapToken
                      ? receiveToken?.logo_url
                      : DEX?.[activeProvider?.name]?.logo
                  }
                />
                <span>
                  {isWrapToken
                    ? t('page.swap.wrap-contract')
                    : DEX?.[activeProvider?.name]?.name}
                </span>
              </div>
              {!!activeProvider.shouldApproveToken && (
                <TooltipWithMagnetArrow
                  overlayClassName="rectangle w-[max-content]"
                  title={t('page.swap.need-to-approve-token-before-swap')}
                >
                  <img src={ImgLock} className="w-14 h-14" />
                </TooltipWithMagnetArrow>
              )}
            </div>
            {!!activeProvider?.gasUsd && (
              <div className="flex items-center gap-4 text-13 text-r-neutral-foot font-normal">
                <img src={ImgGas} className="w-16 h-16 relative" />
                <span>{activeProvider?.gasUsd}</span>
              </div>
            )}
          </div>
        </div>
        <div className="right relative flex flex-col gap-8">
          <div className="flex items-center gap-2 text-15 font-medium text-r-neutral-title-1 h-18 ml-auto">
            <SkeletonChildren
              loading={loading}
              style={{ maxWidth: 144, height: 20, opacity: 0.5 }}
            >
              <TokenWithChain
                token={props.receiveToken}
                width="16px"
                height="16px"
                hideChainIcon
                hideConer
              />
              <span
                title={`${receiveNum} ${receiveTokenSymbol}`}
                className="ellipsis mx-6"
              >
                {receiveNum}
              </span>
              <WarningOrChecked quoteWarning={quoteWarning} />
            </SkeletonChildren>
          </div>

          <div
            className={clsx(
              'flex justify-end items-center gap-2 text-[13px] relative  font-normal text-r-neutral-foot ml-auto',
              loading && 'opacity-0'
            )}
          >
            <span className="ellipsis">
              ≈ ${receiveUsd} (
              <span
                className={clsx(
                  'diffPercent',
                  sign === '+' && 'positive',
                  sign === '-' && 'negative'
                )}
              >
                {sign}
                {diff}%
              </span>
              )
            </span>
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
              <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
            </Tooltip>
          </div>
        </div>
      </div>
      {!loading && quoteWarning && (
        <div className="warning">{getQuoteLessWarning(quoteWarning)}</div>
      )}

      {!loading && showLoss && (
        <div className="warning rate">
          {t(
            'page.swap.selected-offer-differs-greatly-from-current-rate-may-cause-big-losses'
          )}
        </div>
      )}
      <div className="column footer">
        <span className="rate">{t('page.swap.rate')}</span>
        <div className="right">
          <SkeletonChildren
            loading={loading}
            style={{ maxWidth: 182, height: 20, opacity: 0.5 }}
          >
            <span
              className="cursor-pointer ellipsis max-w-[260px] text-13 text-r-neutral-body"
              onClick={reverseRate}
            >
              <span
                title={`${1} ${reverse ? receiveTokenSymbol : payTokenSymbol}`}
              >
                1 {reverse ? receiveTokenSymbol : payTokenSymbol}{' '}
              </span>
              ={' '}
              <span
                title={`${rate} ${
                  reverse ? payTokenSymbol : receiveTokenSymbol
                }`}
              >
                {rate} {reverse ? payTokenSymbol : receiveTokenSymbol}
              </span>
            </span>
          </SkeletonChildren>
        </div>
      </div>
      {activeProvider.name && receiveToken ? (
        <div
          className="quote-provider"
          onClick={() => {
            openQuote(true);
          }}
        >
          <img src={ImgSwitch} className="w-12 h-12" />
        </div>
      ) : null}
    </ReceiveWrapper>
  );
};
