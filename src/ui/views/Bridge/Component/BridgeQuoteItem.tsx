import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QuoteLogo } from './QuoteLogo';
import ImgLock from '@/ui/assets/swap/lock.svg';
import { TokenWithChain } from '@/ui/component';
import ImgGas from '@/ui/assets/swap/gas.svg';
import { ReactComponent as RCIconDuration } from '@/ui/assets/bridge/duration.svg';
import clsx from 'clsx';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { TokenItem } from '@/background/service/openapi';
import { formatTokenAmount } from '@debank/common';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import {
  SelectedBridgeQuote,
  useSetQuoteVisible,
  useSetSettingVisible,
} from '../hooks';
import { Tooltip } from 'antd';
import { useRabbySelector } from '@/ui/store';
import ImgWhiteWarning from '@/ui/assets/swap/warning-white.svg';
import styled from 'styled-components';

const ItemWrapper = styled.div`
  position: relative;

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
  }
  &.enabledAggregator:hover .disabled-trade {
    cursor: pointer;
    pointer-events: auto;
    height: 100%;
    transform: translateY(0);
    opacity: 1;
  }
`;

interface QuoteItemProps extends SelectedBridgeQuote {
  payAmount: string;
  payToken: TokenItem;
  receiveToken: TokenItem;
  isBestQuote?: boolean;
  bestQuoteUsd: string;
  sortIncludeGasFee: boolean;
  setSelectedBridgeQuote?: React.Dispatch<
    React.SetStateAction<SelectedBridgeQuote | undefined>
  >;
  onlyShow?: boolean;
  loading?: boolean;
  inSufficient?: boolean;
}

export const bridgeQuoteEstimatedValueBn = (
  quote: SelectedBridgeQuote,
  receiveToken: TokenItem,
  sortIncludeGasFee: boolean
) => {
  return new BigNumber(quote.to_token_amount)
    .times(receiveToken.price || 1)
    .minus(sortIncludeGasFee ? quote.gas_fee.usd_value : 0);
};

export const BridgeQuoteItem = (props: QuoteItemProps) => {
  const { t } = useTranslation();
  const [disabledTipsOpen, setDisabledTipsOpen] = useState(false);

  const openSwapQuote = useSetQuoteVisible();

  const openSettings = useSetSettingVisible();

  const aggregatorsList = useRabbySelector(
    (s) => s.bridge.aggregatorsList || []
  );
  const selectedAggregators = useRabbySelector(
    (s) => s.bridge.selectedAggregators || []
  );

  const availableSelectedAggregators = useMemo(() => {
    return selectedAggregators?.filter((e) =>
      aggregatorsList.some((item) => item.id === e)
    );
  }, [selectedAggregators, aggregatorsList]);

  const enabledAggregator = useMemo(() => {
    return availableSelectedAggregators.includes(props?.aggregator?.id);
  }, [props?.aggregator?.id, availableSelectedAggregators]);

  const diffPercent = React.useMemo(() => {
    if (props.onlyShow || props.isBestQuote) {
      return '';
    }

    const percent = bridgeQuoteEstimatedValueBn(
      props,
      props.receiveToken,
      props.sortIncludeGasFee
    )
      .minus(props.bestQuoteUsd)
      .div(props.bestQuoteUsd)
      .abs()
      .times(100)
      .toFixed(2, 1)
      .toString();
    return `-${percent}%`;
  }, [props]);

  const handleClick = async () => {
    if (props.inSufficient) {
      return;
    }
    if (!enabledAggregator) {
      return;
    }
    props?.setSelectedBridgeQuote?.(props);
    openSwapQuote(false);
  };
  return (
    <Tooltip
      overlayClassName="rectangle w-[max-content]"
      placement="top"
      title={'Insufficient balance'}
      trigger={['click']}
      visible={props.inSufficient && !props.onlyShow ? undefined : false}
      align={{ offset: [0, 30] }}
      arrowPointAtCenter
    >
      <ItemWrapper
        className={clsx(
          ' flex flex-col gap-10  justify-center rounded-md',
          !props.inSufficient && !enabledAggregator && 'enabledAggregator',
          props.onlyShow
            ? 'bg-transparent h-auto'
            : props.inSufficient || !enabledAggregator
            ? 'h-80 px-16 bg-transparent border-[0.5px] border-solid border-rabby-neutral-line'
            : 'h-80 px-16 cursor-pointer bg-r-neutral-card1 border-[0.5px] border-solid border-transparent hover:bg-rabby-blue-light1  hover:border-rabby-blue-default'
        )}
        style={
          props.onlyShow || props.inSufficient || !enabledAggregator
            ? {}
            : {
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
              }
        }
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-6  items-center relative">
            <QuoteLogo
              logo={props.aggregator.logo_url}
              bridgeLogo={props.bridge.logo_url}
              isLoading={props.loading}
            />
            <span className="text-[16px] font-medium text-r-neutral-title1">
              {props.aggregator.name}
            </span>
            <span className="text-13 text-r-neutral-foot">
              {t('page.bridge.via-bridge', {
                bridge: props.bridge.name,
              })}
            </span>
            {/* {props.shouldApproveToken &&  */}
            {props.shouldApproveToken && (
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                title={t('page.bridge.need-to-approve-token-before-bridge')}
                arrowPointAtCenter
                placement="top"
              >
                <img src={ImgLock} className="w-16 h16" />
              </TooltipWithMagnetArrow>
            )}
          </div>

          <div className="flex items-center gap-8 flex-1 overflow-hidden justify-end">
            <TokenWithChain
              token={props.payToken}
              width="20px"
              height="20px"
              hideChainIcon
              hideConer
            />
            <span className="text-[16px] font-medium text-rabby-neutral-title1 overflow-hidden overflow-ellipsis whitespace-nowrap">
              {formatTokenAmount(props.to_token_amount)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex  items-center text-13 text-r-neutral-foot">
            <img src={ImgGas} className="w-16 h16 mr-4" />
            <span>{formatUsdValue(props.gas_fee.usd_value)}</span>
            <RCIconDuration
              viewBox="0 0 16 16"
              className="w-16 h16 ml-8 mr-4"
            />
            <span>
              {t('page.bridge.duration', {
                duration: Math.round(props.duration / 60),
              })}
            </span>
          </div>
          <div className="flex items-center gap-6 text-13 text-r-neutral-foot">
            <span>
              {t('page.bridge.estimated-value', {
                value: formatUsdValue(
                  new BigNumber(props.to_token_amount)
                    .times(props.receiveToken.price)
                    .toString()
                ),
              })}
            </span>
            {!props.onlyShow && (
              <span
                className={clsx(
                  props.isBestQuote
                    ? 'text-r-green-default'
                    : 'text-r-red-default'
                )}
              >
                {props.isBestQuote ? t('page.bridge.best') : diffPercent}
              </span>
            )}
          </div>
        </div>

        {!props.inSufficient && !enabledAggregator && (
          <div
            className={clsx('disabled-trade')}
            onClick={(e) => {
              e.stopPropagation();
              openSettings(true);
            }}
          >
            <img
              src={ImgWhiteWarning}
              className="w-12 h-12 relative top-[-10px]"
            />
            <span>
              {t('page.bridge.aggregator-not-enabled')}
              <br />
              <span className="underline-transparent underline cursor-pointer ml-4">
                {t('page.bridge.enable-it')}
              </span>
            </span>
          </div>
        )}
      </ItemWrapper>
    </Tooltip>
  );
};
