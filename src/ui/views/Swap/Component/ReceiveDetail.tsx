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
import ImgInfo from '@/ui/assets/swap/info-outline.svg';
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

const getQuoteLessWarning = ([receive, diff]: [string, string]) =>
  `The receiving amount is estimated from Rabby transaction simulation. The offer provided by dex is ${receive}. You'll receive ${diff}  less than the expected offer.`;

export const WarningOrChecked = ({
  quoteWarning,
}: {
  quoteWarning?: [string, string];
}) => {
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
          : 'By transaction simulation, the quote is valid'
      }
    >
      <img
        src={quoteWarning ? ImgWarning : ImgVerified}
        className="w-[14px] h-[14px]"
      />
    </Tooltip>
  );
};

const ReceiveWrapper = styled.div`
  position: relative;
  margin-top: 24px;
  border: 1px solid #e5e9ef;
  border-radius: 4px;
  padding: 12px;

  color: #4b4d59;
  font-size: 13px;
  .receive-token {
    font-size: 15px;
    color: #13141a;
  }

  .diffPercent {
    &.negative {
      color: #ff7878;
    }
    &.positive {
      color: #27c193;
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
    font-size: 12px;
    color: #ffb020;
    position: relative;
    background: rgba(255, 176, 32, 0.1);
    border-radius: 4px;
  }

  .footer {
    position: relative;
    border-top: 0.5px solid #e5e9ef;
    padding-top: 8px;
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

    color: #13141a;

    background: #e4e8ff;
    border-radius: 4px;
    border: 1px solid transparent;
    &:hover {
      background: #d4daff;
      border: 1px solid rgba(134, 151, 255, 0.5);
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
      <div className="column receive-token pb-8">
        <div className="flex items-center gap-8">
          <div>
            <img
              className={clsx('rounded-full w-24 h-24 min-w-[24px]')}
              src={
                isWrapToken
                  ? receiveToken?.logo_url
                  : DEX?.[activeProvider?.name]?.logo
              }
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 w-[108px] text-13 font-medium text-gray-title h-18">
              <span>
                {isWrapToken
                  ? 'Wrap Contract'
                  : DEX?.[activeProvider?.name]?.name}
              </span>
              {!!activeProvider.shouldApproveToken && (
                <TooltipWithMagnetArrow
                  overlayClassName="rectangle w-[max-content]"
                  title="Need to approve token before swap"
                >
                  <img src={ImgLock} className="w-14 h-14" />
                </TooltipWithMagnetArrow>
              )}
            </div>
            {!!activeProvider?.gasUsd && (
              <div className="flex items-center gap-2 text-12 text-gray-content font-normal">
                <img src={ImgGas} className="w-14 h-14 relative top-[-1px] " />
                <span>{activeProvider?.gasUsd}</span>
              </div>
            )}
          </div>
        </div>
        <div className="right relative flex flex-col">
          <div className="flex items-center gap-2 text-15 font-medium text-gray-title h-18 ml-auto">
            <SkeletonChildren
              loading={loading}
              style={{ maxWidth: 144, height: 20, opacity: 0.5 }}
            >
              <span
                title={`${receiveNum} ${receiveTokenSymbol}`}
                className="ellipsis"
              >
                {receiveNum}{' '}
                <span className="text-gray-content">{receiveTokenSymbol}</span>
              </span>
              <WarningOrChecked quoteWarning={quoteWarning} />
            </SkeletonChildren>
          </div>

          <div
            className={clsx(
              'flex justify-end items-center gap-2 text-[13px] relative text-12 font-normal text-gray-content ml-auto',
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
                    Est. Payment: {payAmount}
                    {payTokenSymbol} ≈ ${payUsd}
                  </div>
                  <div>
                    Est. Receiving: {receiveNum}
                    {receiveTokenSymbol} ≈ ${receiveUsd}
                  </div>
                  <div>
                    Est. Difference: {sign}
                    {diff}%
                  </div>
                </div>
              }
            >
              <img src={ImgInfo} />
            </Tooltip>
          </div>
        </div>
      </div>
      {!loading && quoteWarning && (
        <div className="warning">{getQuoteLessWarning(quoteWarning)}</div>
      )}

      {!loading && showLoss && (
        <div className="warning rate">
          Selected offer differs greatly from current rate, may cause big losses
        </div>
      )}
      <div className="column footer">
        <span className="rate">Rate</span>
        <div className="right">
          <SkeletonChildren
            loading={loading}
            style={{ maxWidth: 182, height: 20, opacity: 0.5 }}
          >
            <span
              className="cursor-pointer ellipsis max-w-[260px]"
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
      {DEX[activeProvider.name] && receiveToken ? (
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
