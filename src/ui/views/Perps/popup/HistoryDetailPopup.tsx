import React, { useMemo, useState } from 'react';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation, Trans } from 'react-i18next';
import { WsFill } from '@rabby-wallet/hyperliquid-sdk';
import {
  formatNumber,
  formatUsdValue,
  sinceTime,
  splitNumberByStep,
} from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { TokenImg } from '../components/TokenImg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import IconHyperliquid from 'ui/assets/perps/IconHyperLogo.svg';
import IconRabby from 'ui/assets/rabby-logo-circle.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatPerpsCoin } from '../../DesktopPerps/utils';
import { PerpsDisplayCoinName } from '../components/PerpsDisplayCoinName';
import { SPOT_STABLE_COIN_NAME, PerpsQuoteAsset } from '../constants';
import { useRabbySelector } from '@/ui/store';
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

interface HistoryDetailPopupProps extends Omit<PopupProps, 'onCancel'> {
  fill: (WsFill & { logoUrl: string }) | null;
  orderTpOrSl?: 'tp' | 'sl';
  onCancel: () => void;
}

export const HistoryDetailPopup: React.FC<HistoryDetailPopupProps> = ({
  visible,
  fill,
  onCancel,
  orderTpOrSl,
}) => {
  const { t } = useTranslation();
  const [feeDetailVisible, setFeeDetailVisible] = useState(false);
  const { coin, side, sz, px, closedPnl, time, fee, dir } = fill || {};
  const tradeValue = Number(sz) * Number(px);
  const pnlValue = Number(closedPnl) - Number(fee);
  const isClose = (dir === 'Close Long' || dir === 'Close Short') && closedPnl;
  const logoUrl = fill?.logoUrl;
  const marketDataMap = useRabbySelector((s) => s.perps.marketDataMap);
  const currentAssetCtx = coin ? marketDataMap[coin] : undefined;

  // Stablecoin swap detection (e.g. @166 = USDT, @150 = USDE, @230 = USDH)
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
  }, [fill, orderTpOrSl]);

  return (
    <>
      <Popup
        placement="bottom"
        height={460}
        isSupportDarkMode
        bodyStyle={{ padding: 0 }}
        destroyOnClose
        push={true}
        closable
        visible={visible}
        onCancel={onCancel}
      >
        <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
          {/* Header */}
          <div className="text-18 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
            {titleString}
          </div>

          {/* Content */}
          <div className="flex-1 px-20 pb-20 mt-4">
            <div className="rounded-[8px] px-16 bg-r-neutral-card-1">
              {/* Perps */}
              <div className="flex justify-between items-center py-16">
                <span className="text-13 text-r-neutral-body">
                  {t('page.perps.title')}
                </span>
                <div className="flex items-center space-x-8">
                  {stableCoinSwap ? (
                    <>
                      {(() => {
                        const Icon = STABLECOIN_SVG[stableCoinSwap.symbol];
                        return <Icon className="w-20 h-20" />;
                      })()}
                      <span className="text-13 text-r-neutral-title-1 font-medium">
                        {t(
                          stableCoinSwap.isBuy
                            ? 'page.perps.PerpsSpotSwap.buyAsset'
                            : 'page.perps.PerpsSpotSwap.sellAsset',
                          { asset: stableCoinSwap.symbol }
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <TokenImg logoUrl={logoUrl} size={20} />
                      <PerpsDisplayCoinName
                        item={currentAssetCtx}
                        baseClassName="text-r-neutral-title-1 font-medium"
                        quoteClassName="text-r-neutral-title-1 font-medium"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Date */}
              {time && (
                <div className="flex justify-between items-center py-16">
                  <span className="text-13 text-r-neutral-body">
                    {t('page.perps.historyDetail.date')}
                  </span>
                  <span className="text-13 text-r-neutral-title-1 font-medium">
                    {sinceTime(time / 1000)}
                  </span>
                </div>
              )}

              {Boolean(isClose) && (
                <div className="flex justify-between items-center py-16">
                  <span className="text-13 text-r-neutral-body">
                    {t('page.perps.historyDetail.closedPnl')}
                  </span>
                  <span
                    className={`text-13 ${
                      pnlValue >= 0
                        ? 'text-r-green-default'
                        : 'text-r-red-default'
                    } font-medium`}
                  >
                    {pnlValue > 0 ? '+' : '-'}$
                    {splitNumberByStep(Math.abs(pnlValue).toFixed(2))}
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex justify-between items-center py-16">
                <span className="text-13 text-r-neutral-body">
                  {t('page.perps.price')}
                </span>
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(px || 0)}
                </span>
              </div>

              {/* Size */}
              <div className="flex justify-between items-center py-16">
                <div className="text-13 text-r-neutral-body flex items-center gap-4 relative">
                  {t('page.perps.size')}
                  <TooltipWithMagnetArrow
                    overlayClassName="rectangle w-[max-content]"
                    placement="top"
                    title={t('page.perps.sizeTips')}
                  >
                    <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                  </TooltipWithMagnetArrow>
                </div>
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(tradeValue.toFixed(2))} = {sz}{' '}
                  {formatPerpsCoin(coin || '')}
                </span>
              </div>

              {/* Trade Value */}
              {/* <div className="flex justify-between items-center py-16">
              <span className="text-13 text-r-neutral-body">
                {t('page.perps.historyDetail.tradeValue')}
              </span>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                ${splitNumberByStep(tradeValue.toFixed(2))}
              </span>
            </div> */}

              {/* Fee */}
              {fee && (
                <div className="flex justify-between items-center py-16">
                  <div
                    className="text-13 text-r-neutral-body flex items-center gap-4 cursor-pointer hover:text-r-blue-default"
                    onClick={() => setFeeDetailVisible(true)}
                  >
                    {t('page.perps.fee')}
                    <RcIconInfo className="text-rb-neutral-foot hover:text-r-blue-default w-14 h-14" />
                  </div>
                  <span className="text-13 text-r-neutral-title-1 font-medium">
                    ${splitNumberByStep(Number(fee).toFixed(4))}
                  </span>
                </div>
              )}

              {/* Provider */}
              <div className="flex justify-between items-center py-16">
                <span className="text-13 text-r-neutral-body">
                  {t('page.perps.historyDetail.provider')}
                </span>
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  Hyperliquid
                </span>
              </div>
            </div>
          </div>
        </div>
      </Popup>

      {/* Fee Detail Popup — sibling to avoid push */}
      <Popup
        placement="bottom"
        height={240}
        isSupportDarkMode
        bodyStyle={{ padding: 0 }}
        destroyOnClose
        push={true}
        closable
        visible={feeDetailVisible}
        onCancel={() => setFeeDetailVisible(false)}
        contentWrapperStyle={{
          boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
          borderRadius: '16px 16px 0px 0',
          overflow: 'hidden',
        }}
      >
        <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px] px-20 pt-16 pb-20">
          <div className="text-18 font-medium text-r-neutral-title-1 text-center mb-12">
            {t('page.perps.fee')}
          </div>
          <div className="text-15 text-r-neutral-body text-center mb-16 whitespace-pre-line">
            <Trans
              i18nKey="page.perps.historyDetail.feeDesc"
              components={{
                1: <span className="font-bold text-r-neutral-title-1" />,
                2: <span className="font-bold text-r-neutral-title-1" />,
              }}
            />
          </div>
          <div className="bg-r-neutral-card1 rounded-[8px]">
            <div className="flex justify-between items-center px-16 py-16 border-b border-rb-neutral-line">
              <div className="flex items-center gap-8">
                <img src={IconHyperliquid} className="w-20 h-20 rounded-full" />
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  Hyperliquid
                </span>
              </div>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                0.045%
              </span>
            </div>
            <div className="flex justify-between items-center px-16 py-16">
              <div className="flex items-center gap-8">
                <img src={IconRabby} className="w-20 h-20 rounded-full" />
                <span className="text-13 text-r-neutral-title-1 font-medium">
                  Rabby Wallet
                </span>
              </div>
              <span className="text-13 text-r-neutral-title-1 font-medium">
                0.02%
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </>
  );
};

export default HistoryDetailPopup;
