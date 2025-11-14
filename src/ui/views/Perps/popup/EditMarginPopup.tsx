import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import {
  calLiquidationPrice,
  calTransferMarginRequired,
  formatPercent,
} from '../utils';
import { DistanceToLiquidationTag } from '../components/DistanceToLiquidationTag';
import { TokenImg } from '../components/TokenImg';
import Popup from '@/ui/component/Popup';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { AssetPriceInfo } from '../components/AssetPriceInfo';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { MarginInput } from '../components/MarginInput';
import { MarketData } from '@/ui/models/perps';

export interface EditMarginPopupProps {
  visible: boolean;
  direction: 'Long' | 'Short';
  coin: string;
  activeAssetCtx: WsActiveAssetCtx['ctx'] | null;
  currentAssetCtx: MarketData;
  entryPrice: number;
  leverage: number;
  availableBalance: number;
  liquidationPx: number;
  positionSize: number;
  marginUsed: number;
  pnlPercent: number;
  pnl: number;
  handlePressRiskTag: () => void;
  onCancel: () => void;
  onConfirm: (action: 'add' | 'reduce', margin: number) => Promise<void>;
}

export const EditMarginPopup: React.FC<EditMarginPopupProps> = ({
  visible,
  direction,
  coin,
  leverage,
  entryPrice,
  availableBalance,
  onCancel,
  onConfirm,
  liquidationPx,
  positionSize,
  marginUsed,
  pnlPercent,
  pnl,
  activeAssetCtx,
  currentAssetCtx,
  handlePressRiskTag,
}) => {
  const pxDecimals = currentAssetCtx?.pxDecimals || 2;
  const leverageMax = currentAssetCtx?.maxLeverage || 5;
  const { t } = useTranslation();
  const [action, setAction] = React.useState<'add' | 'reduce'>('add');
  const [margin, setMargin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const markPrice = useMemo(() => {
    return Number(activeAssetCtx?.markPx || currentAssetCtx?.markPx || 0);
  }, [activeAssetCtx]);

  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!margin || margin === '0') {
      return '';
    }
    const marginValue = Number(margin);
    const newMargin =
      action === 'add'
        ? Number(marginUsed) + marginValue
        : Number(marginUsed) - marginValue;
    const nationalValue = positionSize * markPrice;
    return calLiquidationPrice(
      markPrice,
      newMargin,
      direction,
      Number(positionSize),
      nationalValue,
      leverageMax
    ).toFixed(pxDecimals);
  }, [
    marginUsed,
    markPrice,
    action,
    leverage,
    leverageMax,
    margin,
    direction,
    positionSize,
    pxDecimals,
  ]);

  const availableToReduce = useMemo(() => {
    const transferMarginRequired = calTransferMarginRequired(
      entryPrice,
      markPrice,
      positionSize,
      leverage
    );
    return Math.max(marginUsed - transferMarginRequired, 0);
  }, [entryPrice, markPrice, positionSize, leverage, marginUsed]);

  // 验证 margin 输入
  const marginValidation = React.useMemo(() => {
    const marginValue = Number(margin) || 0;
    const available = action === 'add' ? availableBalance : availableToReduce;

    if (marginValue === 0) {
      return { isValid: false, error: null };
    }

    if (Number.isNaN(marginValue)) {
      return {
        isValid: false,
        error: 'invalid_number',
        errorMessage: t(
          'page.perpsDetail.PerpsOpenPositionPopup.invalidNumber'
        ),
      };
    }

    if (marginValue > available) {
      return {
        isValid: false,
        error: 'insufficient_balance',
        errorMessage: t(
          'page.perpsDetail.PerpsOpenPositionPopup.insufficientBalance'
        ),
      };
    }

    return { isValid: true, error: null };
  }, [margin, availableBalance, t, action, availableToReduce]);

  React.useEffect(() => {
    if (!visible) {
      setMargin('');
      setAction('add');
    }
  }, [visible]);

  const canReduce = useMemo(() => {
    return availableToReduce > 0.01;
  }, [availableToReduce]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(action, Number(margin));
    } catch (error) {
      console.error('Failed to update margin:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popup
      placement="bottom"
      height={480}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onCancel}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-center text-20 font-medium text-r-neutral-title-1 mt-16 mb-2">
          {t('page.perpsDetail.PerpsEditMarginPopup.title') || 'Adjust margin'}
        </div>

        <AssetPriceInfo
          coin={coin}
          currentAssetCtx={currentAssetCtx}
          activeAssetCtx={activeAssetCtx}
        />

        <div className="flex-1 px-20 overflow-y-auto pb-24">
          <div className="flex mb-16 bg-r-neutral-card1 rounded-[8px] p-4 h-[42px]">
            <div
              className={clsx(
                'flex-1 h-[34px] rounded-[4px] text-16 cursor-pointer flex items-center justify-center',
                action === 'add'
                  ? 'bg-r-blue-light-1 text-r-blue-default font-bold'
                  : 'text-rb-neutral-secondary font-medium'
              )}
              onClick={() => {
                setAction('add');
                setMargin('');
              }}
            >
              {t('page.perpsDetail.PerpsEditMarginPopup.addMargin')}
            </div>
            <div
              className={clsx(
                'flex-1 h-[34px] rounded-[4px] text-16 cursor-pointer flex items-center justify-center',
                action === 'reduce'
                  ? 'bg-r-blue-light-1 text-r-blue-default font-bold'
                  : 'text-rb-neutral-secondary font-medium'
              )}
              onClick={() => {
                setAction('reduce');
                setMargin('');
              }}
            >
              {t('page.perpsDetail.PerpsEditMarginPopup.reduceMargin')}
            </div>
          </div>

          <div className="flex items-center justify-between p-12 border border-rabby-neutral-line mb-12 h-[78px] bg-r-neutral-card1 rounded-[8px]">
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-6">
                <TokenImg logoUrl={currentAssetCtx?.logoUrl} size={28} />
                <span className="text-[16px] font-medium text-r-neutral-title-1">
                  {coin}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={clsx(
                    'px-4 h-[18px] rounded-[4px] text-12 font-medium flex items-center justify-center',
                    direction === 'Long'
                      ? 'bg-rb-green-light-4 text-rb-green-default'
                      : 'bg-rb-red-light-1 text-rb-red-default'
                  )}
                >
                  {direction} {leverage}x
                </div>
                <DistanceToLiquidationTag
                  liquidationPrice={liquidationPx}
                  markPrice={markPrice}
                  onPress={handlePressRiskTag}
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-5">
              <span className="text-[16px] font-bold text-r-neutral-title-1">
                {formatUsdValue(marginUsed)}
              </span>
              <span
                className={clsx(
                  'text-[16px] font-medium',
                  pnl >= 0 ? 'text-rb-green-default' : 'text-rb-red-default'
                )}
              >
                {pnl >= 0 ? '+' : '-'}$
                {splitNumberByStep(Math.abs(pnl || 0).toFixed(2))} (
                {pnl >= 0 ? '+' : '-'}
                {Math.abs(pnlPercent).toFixed(2)}%)
              </span>
            </div>
          </div>

          <MarginInput
            title={t('page.perpsDetail.PerpsEditMarginPopup.margin')}
            availableAmount={
              action === 'add' ? availableBalance : availableToReduce
            }
            sliderDisabled={!canReduce && action === 'reduce'}
            margin={margin}
            customAvailableText={
              action === 'add'
                ? t('page.perpsDetail.PerpsEditMarginPopup.perpsBalance')
                : ''
            }
            onMarginChange={setMargin}
            errorMessage={
              marginValidation.error ? marginValidation.errorMessage : null
            }
          />

          <div className="flex items-center gap-6 text-16">
            <span className="text-rb-neutral-secondary font-medium">
              {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
            </span>
            <span className="text-r-neutral-title-1 font-bold">
              ${splitNumberByStep(Number(liquidationPx).toFixed(pxDecimals))}
            </span>
            {margin && estimatedLiquidationPrice && (
              <span className="text-r-neutral-title-1 font-bold">
                → $
                {splitNumberByStep(
                  Number(estimatedLiquidationPrice).toFixed(pxDecimals)
                )}
              </span>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
          {!canReduce && action === 'reduce' ? (
            <TooltipWithMagnetArrow
              title={t(
                'page.perpsDetail.PerpsEditMarginPopup.reduceMarginTooltip'
              )}
            >
              <Button
                block
                size="large"
                type="primary"
                className="h-[48px] text-15 font-medium"
                disabled
                onClick={handleConfirm}
              >
                {t('page.perpsDetail.PerpsEditMarginPopup.reduceMargin')}
              </Button>
            </TooltipWithMagnetArrow>
          ) : (
            <Button
              block
              size="large"
              type="primary"
              loading={loading}
              className="h-[48px] text-15 font-medium"
              disabled={!marginValidation.isValid || loading}
              onClick={handleConfirm}
            >
              {action === 'add'
                ? t('page.perpsDetail.PerpsEditMarginPopup.addMargin')
                : t('page.perpsDetail.PerpsEditMarginPopup.reduceMargin')}
            </Button>
          )}
        </div>
      </div>
    </Popup>
  );
};

export default EditMarginPopup;
