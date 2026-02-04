import IconHyperliquid from '@/ui/assets/perps/icon-hyperliquid.svg';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { MarketData } from '@/ui/models/perps';
import {
  formatUsdValue,
  splitNumberByStep,
  useCommonPopupView,
  useWallet,
} from '@/ui/utils';
import { AssetPosition, OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import clsx from 'clsx';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import DistanceToLiquidationTag from '../../Perps/components/DistanceToLiquidationTag';
import { TokenImg } from '../../Perps/components/TokenImg';
import { usePerpsClearHouseState } from '../../Perps/hooks/usePerpsClearingHouseState';
import RiskLevelPopup from '../../Perps/popup/RiskLevelPopup';
import { getPerpsSDK } from '../../Perps/sdkManager';
import { DistanceRiskTag } from '../../DesktopPerps/components/UserInfoHistory/PositionsInfo/DistanceRiskTag';
import {
  calculateDistanceToLiquidation,
  formatPerpsPct,
} from '../../Perps/utils';
import { UI_TYPE } from '@/constant/ui';
import { formatPerpsCoin } from '../../DesktopPerps/utils';

const isDesktop = UI_TYPE.isDesktop;

export const HomePerpsPositionList: React.FC = () => {
  const currentAccount = useCurrentAccount();

  const { data } = usePerpsClearHouseState({
    address: currentAccount?.address,
  });
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const { closePopup } = useCommonPopupView();
  const history = useHistory();

  const hasPositions = useMemo(() => {
    return (data?.assetPositions?.length || 0) > 0;
  }, [data]);

  useEffect(() => {
    if (hasPositions) {
      dispatch.perps.fetchMarketData(undefined);
    }
  }, [hasPositions]);

  if (!hasPositions) {
    return null;
  }

  return (
    <div
      className={
        !isDesktop
          ? 'mb-[6px] flex flex-col gap-[6px]'
          : 'grid grid-cols-3 gap-[16px] px-20 mt-24'
      }
    >
      {data?.assetPositions?.map((assetPosition) => {
        return (
          <PositionItem
            key={assetPosition.position.coin}
            position={assetPosition.position}
            handleNavigate={() => {
              if (isDesktop) {
                dispatch.perps.resetProAccountInfo();
                dispatch.perps.setCurrentPerpsAccount(currentAccount);
                dispatch.perps.setSelectedCoin(assetPosition.position.coin);
                wallet.setPerpsCurrentAccount(currentAccount);
                history.push('/desktop/perps');
              } else {
                const sdk = getPerpsSDK();
                if (currentAccount) {
                  dispatch.perps.setCurrentPerpsAccount(currentAccount);
                  sdk.initAccount(currentAccount.address);
                  dispatch.perps.subscribeToUserData({
                    address: currentAccount.address,
                    isPro: false,
                  });
                }
                closePopup();
                history.push('/perps');
              }
            }}
          />
        );
      })}
    </div>
  );
};

const PositionItem: React.FC<{
  position: AssetPosition['position'];
  marketData?: MarketData;
  openOrders?: OpenOrder[];
  handleNavigate: () => void;
}> = ({ position, handleNavigate }) => {
  const { t } = useTranslation();
  const {
    coin,
    szi,
    leverage,
    marginUsed,
    unrealizedPnl,
    returnOnEquity,
    liquidationPx,
  } = position;

  const marketData = useRabbySelector(
    (store) => store.perps.marketDataMap?.[position.coin?.toUpperCase() || '']
  );

  const isUp = Number(unrealizedPnl) >= 0;
  const isLong = Number(szi) > 0;
  const side = isLong ? 'Long' : 'Short';
  const leverageType = leverage.type; // 'cross' | 'isolated'

  const absPnlUsd = Math.abs(Number(unrealizedPnl));
  const absPnlPct = Math.abs(Number(returnOnEquity));
  const pnlText = `${isUp ? '+' : '-'}$${splitNumberByStep(
    absPnlUsd.toFixed(2)
  )}`;

  const logoUrl = marketData?.logoUrl || '';
  const leverageText = `${leverage.value}x`;
  const markPrice = marketData?.markPx || '0';

  return (
    <div
      className={clsx(
        'w-full rounded-[8px] flex flex-col cursor-pointer',
        'border-[1px]',
        !isDesktop ? 'bg-r-neutral-card1' : 'bg-rb-neutral-bg-3',
        'border-solid border-transparent',
        'hover:bg-r-blue-light1 hover:border-rabby-blue-default'
      )}
      onClick={handleNavigate}
    >
      <div className={clsx('flex items-center justify-between px-16 py-12')}>
        <div className="flex items-center gap-[8px] flex-1">
          <TokenImg
            logoUrl={logoUrl}
            direction={side}
            withDirection={false}
            size={32}
          />
          <div className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-[4px]">
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-title-1">
                {formatPerpsCoin(coin)}
              </span>
              <span className="text-[11px] leading-[14px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px] bg-rb-blue-light-1 text-rb-blue-default">
                {leverageType === 'cross'
                  ? t('page.perps.cross')
                  : t('page.perps.isolated')}
              </span>
            </div>
            <div className="flex items-center gap-[6px]">
              <span
                className={clsx(
                  'text-[11px] leading-[14px] font-medium px-[4px] h-[18px] flex items-center justify-center rounded-[4px]',
                  isLong
                    ? 'text-rb-green-default bg-rb-green-light-1'
                    : 'text-rb-red-default bg-rb-red-light-1'
                )}
              >
                {side} {leverageText}
              </span>
              <DistanceRiskTag
                isLong={isLong}
                percent={formatPerpsPct(
                  calculateDistanceToLiquidation(liquidationPx, markPrice)
                )}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-[8px]">
          <div className="text-[13px] leading-[16px] font-medium text-rb-neutral-title-1">
            {formatUsdValue(Number(marginUsed))}
          </div>
          <div
            className={clsx(
              'text-[12px] leading-[17px] font-medium',
              isUp ? 'text-rb-green-default' : 'text-rb-red-default'
            )}
          >
            {pnlText}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-[12px] py-[8px] relative">
        <div className="absolute top-0 left-[12px] right-[12px] h-[0.5px] bg-r-neutral-line"></div>
        <div className="flex items-center gap-[4px]">
          <img src={IconHyperliquid} className="w-[12px] h-[12px]" alt="" />
          <div className="text-[11px] leading-[13px] text-r-neutral-foot">
            Hyperliquid Position
          </div>
        </div>
        <div
          className={clsx(
            'cursor-pointer text-r-blue-default font-medium text-[12px] text-center',
            'px-[12px]',
            'h-[24px] leading-[24px]',
            'border-[0.5px] border-r-blue-default rounded-[6px]',
            'hover:bg-r-blue-light1'
          )}
        >
          {t('component.DappActions.manage')}
        </div>
      </div>
    </div>
  );
};
