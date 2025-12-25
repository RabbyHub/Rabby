import { Button, Input, Modal } from 'antd';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// import {
//   calculateDistanceToLiquidation,
//   calLiquidationPrice,
//   calTransferMarginRequired,
//   formatPercent,
//   formatPerpsPct,
// } from '../utils';
// import { DistanceToLiquidationTag } from '../components/DistanceToLiquidationTag';
// import { TokenImg } from '../components/TokenImg';
// import Popup from '@/ui/component/Popup';
// import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
// import { AssetPriceInfo } from '../components/AssetPriceInfo';
// import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
// import { MarginInput } from '../components/MarginInput';
// import { MarketData } from '@/ui/models/perps';
// import { PERPS_MARGIN_SIGNIFICANT_DIGITS } from '../constants';
// import { MarginEditInput } from '../components/MarginEditInput';
import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { PerpsPositionCard } from '../components/PerpsPositionCard';
import { useMemoizedFn } from 'ahooks';
import { validatePriceInput } from '../../Perps/utils';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';

export interface EditMarginPopupProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (action: 'add' | 'reduce', margin: number) => Promise<void>;

  position: PositionAndOpenOrder['position'];
  marketData: MarketData;
}

const calculatePnl = ({
  position,
  extPrice,
}: {
  position: PositionAndOpenOrder['position'];
  extPrice: number;
}) => {
  const pnl =
    (Number(extPrice) - Number(position.entryPx)) * Number(position.szi);
  const percent = (pnl / Number(position.marginUsed)) * 100;
  return { pnl, percent };
};

export const EditTpSlModal: React.FC<EditMarginPopupProps> = ({
  visible,
  onCancel,
  position,
  marketData,
}) => {
  const { t } = useTranslation();

  const [tpPrice, setTpPrice] = React.useState<string>('');
  const [slPrice, setSlPrice] = React.useState<string>('');
  const [gainPct, setGainPct] = React.useState<string>('');
  const [lossPct, setLossPct] = React.useState<string>('');

  const handlePriceChange = useMemoizedFn(
    (price: string, type: 'tp' | 'sl') => {
      let value = price.replace(',', '.');
      if (value.startsWith('$')) {
        value = value.slice(1);
      }
      if (
        (/^\d*\.?\d*$/.test(value) || value === '') &&
        validatePriceInput(value, marketData.szDecimals)
      ) {
        if (type === 'tp') {
          setTpPrice(value);
          const { pnl, percent } = calculatePnl({
            position,
            extPrice: Number(value),
          });
          setGainPct(percent ? percent.toFixed(2) : '');
        } else {
          setSlPrice(value);
          const { pnl, percent } = calculatePnl({
            position,
            extPrice: Number(value),
          });
          setLossPct(percent ? (percent * -1).toFixed(2) : '');
        }
      } else {
        if (type === 'tp') {
          setTpPrice('');
        } else {
          setSlPrice('');
        }
      }
    }
  );

  const tpPnl = useMemo(() => {
    if (!tpPrice) {
      return '';
    }

    return calculatePnl({
      position,
      extPrice: Number(tpPrice),
    }).pnl.toFixed(2);
  }, [tpPrice, position]);

  const slPnl = useMemo(() => {
    if (!slPrice) {
      return '';
    }

    return calculatePnl({
      position,
      extPrice: Number(slPrice),
    }).pnl.toFixed(2);
  }, [slPrice, position]);

  // const calculatedPnl = React.useMemo(() => {
  //   if (!autoClosePrice) {
  //     return '';
  //   }
  //   const costPrice =
  //     type === 'openPosition' ? markPrice : entryPrice || markPrice;
  //   const pnlUsdValue =
  //     direction === 'Long'
  //       ? (Number(autoClosePrice) - costPrice) * size
  //       : (costPrice - Number(autoClosePrice)) * size;
  //   return pnlUsdValue;
  // }, [autoClosePrice, markPrice, size, type, direction, entryPrice]);

  // const gainOrLoss = useMemo(() => {
  //   return Number(calculatedPnl) >= 0 ? 'gain' : 'loss';
  // }, [calculatedPnl]);

  // const gainPct = useMemo(() => {
  //   return Number(calculatedPnl) / margin;
  // }, [calculatedPnl, margin]);

  // 验证价格输入
  // const priceValidation = React.useMemo(() => {
  //   const autoCloseValue = Number(autoClosePrice) || 0;
  //   const resObj = {
  //     isValid: true,
  //     error: '',
  //     errorMessage: '',
  //   };

  //   if (!autoCloseValue) {
  //     resObj.isValid = false;
  //     return resObj;
  //   }

  //   // 验证止盈价格
  //   if (actionType === 'tp') {
  //     if (direction === 'Long' && autoCloseValue <= markPrice) {
  //       resObj.isValid = false;
  //       resObj.error = 'invalid_tp_long';
  //       resObj.errorMessage = t(
  //         'page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsLong'
  //       );
  //     }
  //     if (direction === 'Short' && autoCloseValue >= markPrice) {
  //       resObj.isValid = false;
  //       resObj.error = 'invalid_tp_short';
  //       resObj.errorMessage = t(
  //         'page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsShort'
  //       );
  //     }
  //   }

  //   // 验证止损价格
  //   if (actionType === 'sl') {
  //     if (direction === 'Long' && autoCloseValue >= markPrice) {
  //       resObj.isValid = false;
  //       resObj.error = 'invalid_sl_long';
  //       resObj.errorMessage = t(
  //         'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsLong'
  //       );
  //     } else if (direction === 'Long' && autoCloseValue < liqPrice) {
  //       resObj.isValid = false;
  //       resObj.error = 'invalid_sl_liquidation';
  //       resObj.errorMessage = t(
  //         'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsLongLiquidation',
  //         {
  //           price: `$${splitNumberByStep(liqPrice.toFixed(pxDecimals))}`,
  //         }
  //       );
  //     }
  //     if (direction === 'Short' && autoCloseValue <= markPrice) {
  //       resObj.isValid = false;
  //       resObj.error = 'invalid_sl_short';
  //       resObj.errorMessage = t(
  //         'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsShort'
  //       );
  //     } else if (direction === 'Short' && autoCloseValue > liqPrice) {
  //       resObj.isValid = false;
  //       resObj.error = 'invalid_sl_liquidation';
  //       resObj.errorMessage = t(
  //         'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsShortLiquidation',
  //         {
  //           price: `$${splitNumberByStep(liqPrice.toFixed(pxDecimals))}`,
  //         }
  //       );
  //     }
  //   }

  //   return resObj;
  // }, [
  //   autoClosePrice,
  //   direction,
  //   markPrice,
  //   t,
  //   liqPrice,
  //   pxDecimals,
  //   actionType,
  // ]);

  return (
    <Modal
      bodyStyle={{ padding: 0, maxHeight: 'unset' }}
      centered
      destroyOnClose
      closable
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      className="modal-support-darkmode"
      closeIcon={<RcIconCloseCC className="w-[20px] h-[20px]" />}
    >
      <div className="flex flex-col min-h-[520px] bg-r-neutral-bg2">
        <div className="text-center text-20 font-medium text-r-neutral-title-1 mt-16 mb-2">
          Configure TP/SL
        </div>

        <div className="flex-1 px-20 overflow-y-auto pb-24">
          <section className="mb-[12px]">
            <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
              Current position
            </div>
            <PerpsPositionCard position={position} marketData={marketData} />
          </section>

          <section className="mb-[8px]">
            <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
              Configure TP/SL
            </div>
            <div className="space-y-[8px]">
              <div className="flex items-center gap-[8px]">
                <Input
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      TP
                    </span>
                  }
                  value={tpPrice}
                  onChange={(e) => {
                    handlePriceChange(e.target.value, 'tp');
                  }}
                  className="text-right"
                />
                <Input
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      Gain
                    </span>
                  }
                  className="text-right"
                  value={gainPct}
                  onChange={(e) => {
                    const percent = e.target.value;
                    // handlePriceChange
                  }}
                  suffix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      %
                    </span>
                  }
                />
              </div>
              <div className="flex items-center gap-[8px]">
                <Input
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      SL
                    </span>
                  }
                  value={slPrice}
                  onChange={(e) => {
                    handlePriceChange(e.target.value, 'sl');
                  }}
                  className="text-right"
                />
                <Input
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      Loss
                    </span>
                  }
                  className="text-right"
                  suffix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      %
                    </span>
                  }
                  value={lossPct}
                  onChange={(e) => {
                    const percent = e.target.value;
                    // handlePriceChange
                  }}
                />
              </div>
            </div>
          </section>

          <section className="space-y-[8px]">
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                Take profit expected PnL
              </div>
              <div
                className={clsx(
                  'font-medium text-[12px] leading-[14px]',
                  tpPnl && Number(tpPnl) < 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {tpPnl ? formatUsdValue(tpPnl ? Number(tpPnl) : 0) : '-'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                Stop loss expected PnL
              </div>
              <div
                className={clsx(
                  'font-medium text-[12px] leading-[14px]',
                  slPnl && Number(slPnl) < 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {slPnl ? formatUsdValue(slPnl ? Number(slPnl) : 0) : '-'}
              </div>
            </div>
          </section>
        </div>

        <div className="bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
          <div className="flex items-center gap-[16px]">
            <Button
              block
              size="large"
              type="ghost"
              onClick={onCancel}
              className={clsx(
                'h-[44px]',
                'text-blue-light',
                'border-blue-light',
                'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
                'before:content-none'
              )}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              block
              size="large"
              type="primary"
              className="h-[44px] text-15 font-medium"
            >
              {t('global.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
