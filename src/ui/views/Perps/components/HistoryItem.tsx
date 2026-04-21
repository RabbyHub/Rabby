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
import { formatPerpsCoin } from '../../DesktopPerps/utils';
import { PerpsDisplayCoinName } from './PerpsDisplayCoinName';
import { SPOT_STABLE_COIN_NAME, PerpsQuoteAsset } from '../constants';
import { ReactComponent as RcIconUSDT } from '@/ui/assets/perps/IconUSDT.svg';
import { ReactComponent as RcIconUSDE } from '@/ui/assets/perps/IconUSDE.svg';
import { ReactComponent as RcIconUSDH } from '@/ui/assets/perps/IconUSDH.svg';

const STABLECOIN_SVG: Record<
  Exclude<PerpsQuoteAsset, 'USDC'>,
  React.FC<any>
> = {
  USDT: RcIconUSDT,
  USDE: RcIconUSDE,
  USDH: RcIconUSDH,
};

interface HistoryItemProps {
  fill: WsFill;
  marketData: Record<string, MarketData>;
  onClick?: (fill: WsFill) => void;
  orderTpOrSl?: 'tp' | 'sl';
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
  const isRealDeposit = useMemo(
    () => type === 'deposit' || type === 'receive',
    [type]
  );
  const ImgAvatar = useMemo(() => {
    if (status === 'pending') {
      return (
        <RcIconPending className="w-32 h-32 rounded-full mr-4 animate-spin" />
      );
    }

    if (isRealDeposit) {
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
  }, [status, isRealDeposit]);

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
            {isRealDeposit ? t('page.perps.deposit') : t('page.perps.withdraw')}
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
                isRealDeposit ? 'text-r-green-default' : 'text-r-red-default'
              )}
            >
              {isRealDeposit ? '+' : '-'}
              {`${formatUsdValue(usdValue, BigNumber.ROUND_DOWN)}`}
            </div>
            <div className="text-13 text-r-neutral-foot">
              {sinceTime(time / 1000)}
            </div>
          </>
        ) : (
          <div
            className={clsx(
              'text-14 font-medium',
              isRealDeposit ? 'text-r-green-default' : 'text-r-red-default'
            )}
          >
            {isRealDeposit ? '+' : '-'}
            {`${formatUsdValue(usdValue, BigNumber.ROUND_DOWN)}`}
          </div>
        )}
      </div>
    </div>
  );
};

export const HistoryItem: React.FC<HistoryItemProps> = ({
  fill,
  orderTpOrSl,
  marketData,
  onClick,
}) => {
  const { t } = useTranslation();
  const { coin, closedPnl: _closedPnl, dir, fee, side } = fill as WsFill;

  // Detect stablecoin swap fills (coin === '@150' | '@166' | '@230')
  const stableCoinSwap = useMemo((): null | {
    symbol: Exclude<PerpsQuoteAsset, 'USDC'>;
    isBuy: boolean;
  } => {
    if (!coin) return null;
    const entry = (Object.entries(SPOT_STABLE_COIN_NAME) as Array<
      [Exclude<PerpsQuoteAsset, 'USDC'>, string]
    >).find(([, v]) => v === coin);
    if (!entry) return null;
    return { symbol: entry[0], isBuy: side === 'B' };
  }, [coin, side]);

  const titleString = useMemo(() => {
    if (stableCoinSwap) {
      return t(
        stableCoinSwap.isBuy
          ? 'page.perps.PerpsSpotSwap.buyAsset'
          : 'page.perps.PerpsSpotSwap.sellAsset',
        { asset: stableCoinSwap.symbol }
      );
    }
    const isLiquidation = Boolean(fill?.liquidation);
    if (fill?.dir === 'Close Long') {
      if (orderTpOrSl === 'tp') {
        return t('page.perps.historyDetail.title.closeLongTp');
      }
      if (orderTpOrSl === 'sl') {
        return t('page.perps.historyDetail.title.closeLongSl');
      }

      return isLiquidation
        ? t('page.perps.historyDetail.title.closeLongLiquidation')
        : t('page.perps.historyDetail.title.closeLong');
    }
    if (fill?.dir === 'Close Short') {
      if (orderTpOrSl === 'tp') {
        return t('page.perps.historyDetail.title.closeShortTp');
      }
      if (orderTpOrSl === 'sl') {
        return t('page.perps.historyDetail.title.closeShortSl');
      }

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
  }, [fill, orderTpOrSl, stableCoinSwap]);

  const itemData = marketData[coin];
  const logoUrl = itemData?.logoUrl;
  const pxDecimals = itemData?.pxDecimals;
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
        'hover:bg-r-blue-light1',
        'hover:border-rabby-blue-default cursor-pointer'
      )}
      onClick={() => onClick?.(fill)}
    >
      <div className="flex items-center">
        {stableCoinSwap ? (
          (() => {
            const Icon = STABLECOIN_SVG[stableCoinSwap.symbol];
            return <Icon className="w-[32px] h-[32px]" />;
          })()
        ) : (
          <TokenImg
            logoUrl={logoUrl}
            direction={direction}
            withDirection={true}
          />
        )}
        <div className="flex flex-col ml-12">
          <div className="text-13 text-r-neutral-title-1 font-medium">
            {titleString}
          </div>
          <div className="text-13 text-r-neutral-foot font-medium">
            {stableCoinSwap ? (
              t('page.swap.Completed')
            ) : (
              <PerpsDisplayCoinName
                item={itemData}
                baseClassName="text-r-neutral-foot"
                quoteClassName="text-r-neutral-foot"
              />
            )}
            {!stableCoinSwap && fill.px ? (
              <span className="ml-4">
                @$
                {splitNumberByStep(new BigNumber(fill.px).toFixed(pxDecimals))}
              </span>
            ) : null}
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
