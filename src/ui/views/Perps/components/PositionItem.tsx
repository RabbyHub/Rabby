import React, { useState } from 'react';
import clsx from 'clsx';
import { AssetPosition } from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { MarketData } from '@/ui/models/perps';
import { TokenImg } from './TokenImg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { PerpsBlueBorderedButton } from './BlueBorderedButton';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export const PositionItem: React.FC<{
  position: AssetPosition['position'];
  marketData?: MarketData;
  handleClosePosition: (position: AssetPosition['position']) => void;
  handleNavigate: () => void;
}> = ({ position, handleClosePosition, handleNavigate, marketData }) => {
  const { t } = useTranslation();
  const {
    coin,
    szi,
    leverage,
    positionValue,
    marginUsed,
    unrealizedPnl,
    returnOnEquity,
    liquidationPx,
    entryPx,
  } = position;

  const isUp = Number(unrealizedPnl) >= 0;
  const isLong = Number(szi) > 0;
  const side = isLong ? 'Long' : 'Short';
  const leverageType = leverage.type; // 'cross' | 'isolated'

  const absPnlUsd = Math.abs(Number(unrealizedPnl));
  const absPnlPct = Math.abs(Number(returnOnEquity));
  const pnlText = `${isUp ? '+' : '-'}$${splitNumberByStep(
    absPnlUsd.toFixed(2)
  )} (${isUp ? '+' : '-'}${formatPct(absPnlPct)})`;

  const logoUrl = marketData?.logoUrl || '';
  const leverageText = `${leverage.value}x`;
  const markPrice = marketData?.markPx || '0';

  // 持仓大小
  const positionSize = Math.abs(Number(szi));

  return (
    <div
      className={clsx(
        'w-full bg-r-neutral-card1 rounded-[6px] pb-16 flex flex-col'
        // 'border border-transparent',
        // 'hover:bg-r-blue-light1',
        // 'hover:border-rabby-blue-default cursor-pointer'
      )}
    >
      <div
        className={clsx(
          'flex items-center justify-between px-16 py-12',
          'rounded-[2px]',
          'cursor-pointer'
        )}
        onClick={handleNavigate}
      >
        <div className="flex items-center gap-6">
          <TokenImg
            logoUrl={logoUrl}
            direction={side}
            withDirection={false}
            size={20}
          />
          <div className="flex items-center gap-8">
            <span className="text-15 font-medium text-r-neutral-title-1">
              {coin} - USD
            </span>
            <span
              className={clsx(
                'text-[12px] font-medium px-6 py-2 rounded-[2px]',
                isLong
                  ? 'text-r-green-default bg-r-green-light'
                  : 'text-r-red-default bg-r-red-light'
              )}
            >
              {side} {leverageText}
            </span>
            <span className="text-[12px] font-medium px-6 py-2 rounded-[2px] bg-r-neutral-card2 text-r-neutral-foot">
              {leverageType === 'isolated' ? 'Isolated' : 'Cross'}
            </span>
          </div>
        </div>
        <div className="w-16 h-16 cursor-pointer">
          <ThemeIcon className="icon icon-arrow-right" src={RcIconArrowRight} />
        </div>
      </div>

      <div className="gap-x-12 gap-y-8 text-13 border-t-[0.5px] py-8 border-rabby-neutral-line px-16">
        <div className="flex w-full flex-row">
          <div className="flex flex-col w-[140px]">
            <span className="text-[12px] text-r-neutral-foot">
              {t('page.perps.home.pnl')}
            </span>
            <span
              className={clsx(
                'text-13 font-medium',
                isUp ? 'text-r-green-default' : 'text-r-red-default'
              )}
            >
              {pnlText}
            </span>
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-r-neutral-foot mb-4 text-[12px]">
              {t('page.perps.home.size')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              ${splitNumberByStep(Number(positionValue).toFixed(2))}
            </span>
          </div>

          <div className="flex flex-col text-right flex-1">
            <span className="text-r-neutral-foot mb-4 text-[12px]">
              {t('page.perps.home.margin')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              ${splitNumberByStep(Number(marginUsed).toFixed(2))}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-row">
          <div className="flex flex-col w-[140px]">
            <span className="text-r-neutral-foot mb-4 text-[12px]">
              {t('page.perps.home.entryPrice')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              {splitNumberByStep(
                Number(entryPx).toFixed(marketData?.pxDecimals || 2)
              )}
            </span>
          </div>

          <div className="flex flex-col flex-1">
            <span className="text-r-neutral-foot mb-4 text-[12px]">
              {t('page.perps.home.markPrice')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              {splitNumberByStep(
                Number(markPrice).toFixed(marketData?.pxDecimals || 2)
              )}
            </span>
          </div>

          <div className="flex flex-col text-right flex-1">
            <span className="text-r-neutral-foot mb-4 text-[12px]">
              {t('page.perps.home.liquidationPrice')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              {splitNumberByStep(
                Number(liquidationPx).toFixed(marketData?.pxDecimals || 2)
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="px-16 mt-8">
        <PerpsBlueBorderedButton
          block
          onClick={() => {
            handleClosePosition(position);
          }}
        >
          {side === 'Long'
            ? t('page.perps.closeLong')
            : t('page.perps.closeShort')}
        </PerpsBlueBorderedButton>
      </div>
    </div>
  );
};

export default PositionItem;
