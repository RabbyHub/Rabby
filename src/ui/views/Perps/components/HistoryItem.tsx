import React, { useMemo } from 'react';
import { WsFill } from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValue, sinceTime, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconDeposit } from '@/ui/assets/perps/IconDeposit.svg';
import { ReactComponent as RcIconPending } from '@/ui/assets/perps/IconPending.svg';
import { ReactComponent as RcIconWithdraw } from '@/ui/assets/perps/IconWithdraw.svg';
import { AccountHistoryItem, MarketData } from '@/ui/models/perps';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useTranslation } from 'react-i18next';
import { TokenImg } from './TokenImg';

interface HistoryItemProps {
  fill: WsFill;
  marketData: Record<string, MarketData>;
  onClick?: (fill: WsFill) => void;
}

interface HistoryAccountItemProps {
  data: AccountHistoryItem;
}

const getPnlColor = (pnl: string | number) => {
  const pnlValue = Number(pnl);
  if (pnlValue >= 0) return 'text-r-green-default';
  if (pnlValue < 0) return 'text-r-red-default';
};

export const HistoryAccountItem: React.FC<HistoryAccountItemProps> = ({
  data,
}) => {
  const { time, type, status, usdValue } = data;
  const { t } = useTranslation();
  const ImgAvatar = useMemo(() => {
    if (status === 'pending') {
      return (
        <RcIconPending className="w-32 h-32 rounded-full mr-4 animate-spin" />
      );
    }

    if (type === 'deposit') {
      return (
        <ThemeIcon
          src={RcIconDeposit}
          className="w-32 h-32 rounded-full mr-4"
        />
      );
    } else {
      return (
        <ThemeIcon
          src={RcIconWithdraw}
          className="w-32 h-32 rounded-full mr-4"
        />
      );
    }
  }, [status, type]);

  return (
    <div
      className={clsx(
        'w-full bg-r-neutral-card1 rounded-[12px] px-16 py-12 flex items-center justify-between mb-8 h-[60px]'
      )}
    >
      <div className="flex items-center">
        {ImgAvatar}
        <div className="flex flex-col ml-12">
          <div className="text-13 text-r-neutral-title-1 font-medium">
            {type === 'deposit'
              ? t('page.perps.deposit')
              : t('page.perps.withdraw')}
          </div>
          {status === 'pending' ? (
            <div className="text-13 text-r-orange-default font-medium">
              {t('page.perps.pending')}
            </div>
          ) : (
            <div className="text-13 text-r-neutral-foot font-medium">
              {t('page.perps.completed')}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end">
        {status === 'success' ? (
          <>
            <div
              className={clsx(
                'text-14 font-medium',
                type === 'deposit'
                  ? 'text-r-green-default'
                  : 'text-r-red-default'
              )}
            >
              {type === 'deposit' ? '+' : '-'}
              {`$${usdValue}`}
            </div>
            <div className="text-13 text-r-neutral-foot">
              {sinceTime(time / 1000)}
            </div>
          </>
        ) : (
          <div
            className={clsx(
              'text-14 font-medium',
              type === 'deposit' ? 'text-r-green-default' : 'text-r-red-default'
            )}
          >
            {type === 'deposit' ? '+' : '-'}
            {`$${usdValue}`}
          </div>
        )}
      </div>
    </div>
  );
};

export const HistoryItem: React.FC<HistoryItemProps> = ({
  fill,
  marketData,
  onClick,
}) => {
  const { t } = useTranslation();
  const { coin, closedPnl: _closedPnl, dir, fee } = fill as WsFill;

  const titleString = useMemo(() => {
    const isLiquidation = Boolean(fill?.liquidation);
    if (fill?.dir === 'Close Long') {
      return isLiquidation
        ? t('page.perps.historyDetail.title.closeLongLiquidation')
        : t('page.perps.historyDetail.title.closeLong');
    }
    if (fill?.dir === 'Close Short') {
      return isLiquidation
        ? t('page.perps.historyDetail.title.closeShortLiquidation')
        : t('page.perps.historyDetail.title.closeShort');
    }
    if (fill?.dir === 'Open Long') {
      return t('page.perps.historyDetail.title.openLong');
    }
    if (fill?.dir === 'Open Short') {
      return t('page.perps.historyDetail.title.openShort');
    }
    return fill?.dir;
  }, [fill]);

  const itemData = marketData[coin.toUpperCase()];
  const logoUrl = itemData?.logoUrl;
  const isClose = (dir === 'Close Long' || dir === 'Close Short') && _closedPnl;
  const direction =
    dir === 'Close Long' || dir === 'Open Long' ? 'Long' : 'Short';
  const closedPnl = Number(_closedPnl) - Number(fee);
  const pnlValue = closedPnl ? closedPnl : 0;

  return (
    <div
      className={clsx(
        'w-full bg-r-neutral-card1 rounded-[12px] px-16 py-12 flex items-center justify-between mb-8 h-[60px]',
        'border border-transparent',
        'hover:border-rabby-blue-default cursor-pointer'
      )}
      onClick={() => onClick?.(fill)}
    >
      <div className="flex items-center">
        <TokenImg
          logoUrl={logoUrl}
          direction={direction}
          withDirection={true}
        />
        <div className="flex flex-col ml-12">
          <div className="text-13 text-r-neutral-title-1 font-medium">
            {titleString}
          </div>
          <div className="text-13 text-r-neutral-foot font-medium">
            {coin}-USD
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end">
        {isClose ? (
          <>
            <div className={clsx('text-14 font-medium', getPnlColor(pnlValue))}>
              {pnlValue > 0 ? '+' : '-'}$
              {splitNumberByStep(Math.abs(pnlValue).toFixed(2))}
            </div>
            <div className="text-13 text-r-neutral-foot">
              {sinceTime(fill.time / 1000)}
            </div>
          </>
        ) : (
          <div className="text-13 text-r-neutral-foot">
            {sinceTime(fill.time / 1000)}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryItem;
