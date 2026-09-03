import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { QuoteLogo } from './QuoteLogo';
import ImgLock from '@/ui/assets/swap/lock.svg';
import { TokenWithChain } from '@/ui/component';
import { ReactComponent as RcIconGasCC } from '@/ui/assets/swap/gas-cc.svg';
import { ReactComponent as RCIconDurationCC } from '@/ui/assets/bridge/durationCC.svg';
import clsx from 'clsx';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { TokenItem } from '@/background/service/openapi';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { SelectedBridgeQuote, useSetQuoteVisible } from '../hooks';
import { Tooltip } from 'antd';
import { useRabbySelector } from '@/ui/store';
import styled from 'styled-components';

const ItemWrapper = styled.div`
  --quote-border-width: 1px;
  position: relative;

  &.bridge-quote-compact {
    border: none;
    border-radius: 8px;
    background: var(--r-neutral-card-1, #fff);
    box-shadow: none;

    &::after {
      border-radius: 8px;
    }

    &:hover:not(.active)::after,
    &.active::after {
      position: absolute;
      z-index: 2;
      content: '';
      border: var(--quote-border-width) solid var(--r-blue-default, #7084ff);
      pointer-events: none;
    }

    &:hover:not(.active)::after {
      inset: calc(0px - var(--quote-border-width)) 0;
    }

    &.active {
      border: var(--quote-border-width) solid transparent;
      background: var(--r-blue-light-1, #eef1ff);

      &::after {
        inset: calc(0px - var(--quote-border-width));
      }
    }
  }
`;

interface QuoteItemProps extends SelectedBridgeQuote {
  payAmount: string;
  payToken: TokenItem;
  receiveToken: TokenItem;
  active?: boolean;
  isBestQuote?: boolean;
  isTopAmount?: boolean;
  bestQuoteUsd: string;
  setSelectedBridgeQuote?: (quote: SelectedBridgeQuote) => void;
  onlyShow?: boolean;
  loading?: boolean;
  inSufficient?: boolean;
}

export const bridgeQuoteEstimatedValueBn = (
  quote: SelectedBridgeQuote,
  receiveToken: TokenItem
) => {
  return new BigNumber(quote.to_token_amount)
    .times(receiveToken.price || 1)
    .minus(quote.gas_fee.usd_value);
};

const PER_MINUTE_TIME_COST = 20000;
const SECONDS_PER_MINUTE = 60;

export const bridgeQuoteScore = (
  quote: SelectedBridgeQuote,
  receiveToken: TokenItem
) => {
  const amountUsd = new BigNumber(quote.to_token_amount).times(
    receiveToken.price || 1
  );
  const gasFeeUsd = new BigNumber(quote.gas_fee.usd_value);
  const timeCostUsd = BigNumber.min(
    amountUsd
      .div(PER_MINUTE_TIME_COST)
      .times(quote.duration)
      .div(SECONDS_PER_MINUTE),
    1
  );

  const score = amountUsd.minus(timeCostUsd);

  if (!receiveToken.price) {
    return score;
  }

  return score.minus(gasFeeUsd);
};

export const BridgeQuoteItem = (props: QuoteItemProps) => {
  const { t } = useTranslation();

  const openSwapQuote = useSetQuoteVisible();

  const aggregatorsList = useRabbySelector(
    (s) => s.bridge.aggregatorsList || []
  );
  const selectedAggregators = useRabbySelector(
    (s) => s.bridge.selectedAggregators || []
  );

  const showMinDuration = useMemo(() => {
    return Math.max(Math.round(props.duration / 60), 1);
  }, [props.duration]);

  const durationText = useMemo(() => {
    if (props.duration < 60) {
      return t('page.bridge.duration-sec', {
        duration: Math.max(Math.round(props.duration), 1),
      });
    }
    return t('page.bridge.duration', {
      duration: showMinDuration,
    });
  }, [props.duration, showMinDuration, t]);

  const durationColor = useMemo(() => {
    if (showMinDuration > 10) {
      return 'text-r-red-default';
    }

    if (showMinDuration > 3) {
      return 'text-r-orange-default';
    }
    return 'text-r-neutral-foot';
  }, [showMinDuration]);

  const { isTopAmount, diffPercent } = React.useMemo(() => {
    if (props.onlyShow) {
      return {
        isTopAmount: false,
        diffPercent: '',
      };
    }

    if (props.isTopAmount) {
      return {
        isTopAmount: true,
        diffPercent: '0.00%',
      };
    }

    const bestUsd = new BigNumber(props.bestQuoteUsd);

    if (bestUsd.isZero()) {
      return {
        isTopAmount: true,
        diffPercent: '0.00%',
      };
    }

    const percent = bridgeQuoteEstimatedValueBn(props, props.receiveToken)
      .minus(bestUsd)
      .div(props.bestQuoteUsd)
      .abs()
      .times(100)
      .toFixed(2, 1)
      .toString();
    return {
      isTopAmount: false,
      diffPercent: `-${percent}%`,
    };
  }, [props]);

  const handleClick = async () => {
    if (props.inSufficient) {
      return;
    }

    props?.setSelectedBridgeQuote?.({ ...props, manualClick: true });
    openSwapQuote(false);
  };
  return (
    <Tooltip
      overlayClassName="rectangle w-[max-content]"
      placement="top"
      title={'Insufficient balance'}
      visible={props.inSufficient && !props.onlyShow ? undefined : false}
      align={{ offset: [0, 30] }}
      arrowPointAtCenter
    >
      <ItemWrapper
        className={clsx(
          props.onlyShow
            ? 'flex h-auto flex-col gap-12 bg-transparent'
            : props.inSufficient
            ? 'flex h-[78px] flex-col gap-8 rounded-lg border border-solid border-r-neutral-line bg-transparent px-16 pb-16 pt-20'
            : clsx(
                'bridge-quote-compact flex cursor-pointer flex-col gap-8 px-16 pb-16 pt-20',
                props.active ? 'active h-[78px]' : 'h-[76px]'
              )
        )}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between relative">
          <div
            className={clsx(
              'flex min-w-0 items-center overflow-hidden pr-8',
              props.onlyShow ? 'gap-6' : 'gap-4'
            )}
          >
            <QuoteLogo
              logo={props.aggregator.logo_url}
              bridgeLogo={props.bridge.logo_url}
              isLoading={props.onlyShow ? false : props.loading}
              size={props.onlyShow ? 24 : 18}
              bridgeLogoSize={props.onlyShow ? 14 : 10}
            />
            <span
              className={clsx(
                'shrink-0 font-medium text-r-neutral-title-1',
                props.onlyShow ? 'text-[16px]' : 'text-13'
              )}
            >
              {props.aggregator.name}
            </span>
            <TooltipWithMagnetArrow
              title={t('page.bridge.via-bridge', {
                bridge: props.bridge.name,
              })}
              className="rectangle w-[max-content]"
              arrowPointAtCenter
              visible={props.onlyShow ? undefined : false}
            >
              <span
                className={clsx(
                  props.onlyShow ? 'text-13' : 'text-12',
                  'text-r-neutral-foot',
                  'overflow-hidden text-ellipsis whitespace-nowrap'
                )}
              >
                {t('page.bridge.via-bridge', {
                  bridge: props.bridge.name,
                })}
              </span>
            </TooltipWithMagnetArrow>
            {/* {props.shouldApproveToken &&  */}
            {props.shouldApproveToken && (
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                title={t('page.bridge.need-to-approve-token-before-bridge')}
                arrowPointAtCenter
                placement="top"
              >
                <img
                  src={ImgLock}
                  className={props.onlyShow ? 'h-16 w-16' : 'h-14 w-14'}
                />
              </TooltipWithMagnetArrow>
            )}
          </div>

          <div
            className={clsx(
              'flex flex-1 items-center justify-end',
              props.onlyShow ? 'gap-8' : 'gap-4'
            )}
          >
            <TokenWithChain
              token={props.receiveToken}
              width={props.onlyShow ? '20px' : '14px'}
              height={props.onlyShow ? '20px' : '14px'}
              hideChainIcon
              hideConer
            />
            <span
              className={clsx(
                'overflow-hidden text-ellipsis whitespace-nowrap font-medium text-r-neutral-title-1',
                props.onlyShow
                  ? 'max-w-[126px] text-[16px]'
                  : 'max-w-[110px] text-13'
              )}
              title={formatTokenAmount(props.to_token_amount)}
            >
              {formatTokenAmount(props.to_token_amount)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div
            className={clsx(
              'flex items-center text-r-neutral-foot',
              props.onlyShow ? 'text-13' : 'text-12'
            )}
          >
            <RcIconGasCC
              viewBox="0 0 16 16"
              className={clsx(
                'mr-4 text-r-neutral-foot',
                props.onlyShow ? 'h-16 w-16' : 'h-14 w-14'
              )}
            />
            <span>{formatUsdValue(props.gas_fee.usd_value)}</span>
            <RCIconDurationCC
              viewBox="0 0 16 16"
              className={clsx(
                'ml-8 mr-4',
                props.onlyShow ? 'h-16 w-16' : 'h-14 w-14',
                durationColor
              )}
            />
            <span className={durationColor}>{durationText}</span>
          </div>
          <div
            className={clsx(
              'flex items-center gap-2 text-r-neutral-foot',
              props.onlyShow ? 'text-13' : 'text-12'
            )}
          >
            <span>
              {t('page.bridge.estimated-value', {
                value: formatUsdValue(
                  new BigNumber(props.to_token_amount)
                    .times(props.receiveToken.price)
                    .toString()
                ),
              })}
            </span>
          </div>
        </div>

        {!props.onlyShow && (
          <div
            className={clsx(
              'absolute left-0 top-0 flex h-16 w-60 items-center justify-center px-8 py-1 text-12 font-medium leading-normal',
              props.isBestQuote
                ? 'rounded-br-[4px] rounded-tl-[4px]'
                : 'rounded-br-[8px] rounded-tl-[8px]',
              props.isBestQuote
                ? 'text-r-blue-default bg-r-blue-light2'
                : isTopAmount
                ? 'text-r-green-default bg-r-green-light'
                : 'text-r-red-default bg-r-red-light'
            )}
          >
            {props.isBestQuote ? t('page.bridge.best') : diffPercent}
          </div>
        )}
      </ItemWrapper>
    </Tooltip>
  );
};
