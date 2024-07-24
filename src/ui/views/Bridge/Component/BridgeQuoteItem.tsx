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
import styled from 'styled-components';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';

const ItemWrapper = styled.div`
  position: relative;
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

  const openSwapQuote = useSetQuoteVisible();

  const openFeePopup = useSetSettingVisible();

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

    props?.setSelectedBridgeQuote?.({ ...props, manualClick: true });
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
          ' flex flex-col gap-12  justify-center rounded-md',
          !props.inSufficient && 'enabledAggregator',
          props.onlyShow
            ? 'bg-transparent h-auto'
            : props.inSufficient
            ? 'h-[88px] p-16 pt-[20px] bg-transparent border-[1px] border-solid border-rabby-neutral-line'
            : clsx(
                'h-[88px] p-16 pt-[20px] cursor-pointer',
                'bg-r-neutral-card1 border-[1px] border-solid border-transparent hover:bg-rabby-blue-light1',
                ' hover:after:absolute hover:after:inset-[-1px] hover:after:border hover:after:border-rabby-blue-default'
              )
        )}
        style={
          props.onlyShow || props.inSufficient
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
              isLoading={props.onlyShow ? false : props.loading}
            />
            <span className="text-[16px] font-medium text-r-neutral-title1">
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
                  'text-13 text-r-neutral-foot',
                  props.onlyShow &&
                    'max-w-[66px] overflow-hidden overflow-ellipsis whitespace-nowrap'
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
            <RcIconInfo
              className="text-rabby-neutral-foot w-14 h-14"
              onClick={(e) => {
                e.stopPropagation();
                openFeePopup(true);
              }}
            />
          </div>
        </div>

        {!props.onlyShow && (
          <div
            className={clsx(
              'absolute top-[-1px] left-[-1px]',
              'rounded-tl-[4px] rounded-br-[4px] px-[6px] py-[1px]',
              'text-12 font-medium',
              props.isBestQuote
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
