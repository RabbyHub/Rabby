import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import {
  calculateDistanceToLiquidation,
  calLiquidationPrice,
  calTransferMarginRequired,
  formatPercent,
  formatPerpsPct,
} from '../utils';
import { DistanceToLiquidationTag } from '../components/DistanceToLiquidationTag';
import { TokenImg } from '../components/TokenImg';
import Popup from '@/ui/component/Popup';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { AssetPriceInfo } from '../components/AssetPriceInfo';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { MarginInput } from '../components/MarginInput';
import { MarketData } from '@/ui/models/perps';
import { PERPS_MARGIN_SIGNIFICANT_DIGITS } from '../constants';
import { MarginEditInput } from '../components/MarginEditInput';
import { ReactComponent as RcIconAlarmCC } from '@/ui/assets/perps/icon-alarm-cc.svg';
import { useRequest } from 'ahooks';

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
  const [margin, setMargin] = React.useState('');
  const markPrice = useMemo(() => {
    return Number(activeAssetCtx?.markPx || currentAssetCtx?.markPx || 0);
  }, [activeAssetCtx]);

  const marginNormalized = useMemo(() => {
    const newMargin = margin.startsWith('$') ? margin.slice(1) : margin;
    return Number(newMargin);
  }, [margin]);

  const noChangeMargin = useMemo(() => {
    return marginNormalized.toFixed(2) === marginUsed.toFixed(2);
  }, [marginNormalized, marginUsed]);

  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!margin || margin === '0' || noChangeMargin) {
      return '';
    }
    const newMargin = Number(marginNormalized);
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
    leverage,
    leverageMax,
    margin,
    direction,
    positionSize,
    pxDecimals,
    noChangeMargin,
  ]);

  const minMargin = useMemo(() => {
    const requiredMargin = calTransferMarginRequired(
      markPrice,
      positionSize,
      leverage
    );
    return new BigNumber(Math.min(requiredMargin + 0.1, marginUsed))
      .decimalPlaces(2, BigNumber.ROUND_UP)
      .toNumber();
  }, [markPrice, positionSize, leverage, marginUsed]);

  const maxMargin = useMemo(() => {
    const noHaveBalance = availableBalance < 0.01;
    const max = noHaveBalance ? marginUsed : availableBalance + marginUsed;
    return new BigNumber(max).decimalPlaces(2, BigNumber.ROUND_DOWN).toNumber();
  }, [availableBalance, marginUsed]);

  const availableToReduce = useMemo(() => {
    const transferMarginRequired = calTransferMarginRequired(
      markPrice,
      positionSize,
      leverage
    );
    return Number(
      Math.max(marginUsed - transferMarginRequired, 0).toFixed(
        PERPS_MARGIN_SIGNIFICANT_DIGITS
      )
    );
  }, [markPrice, positionSize, leverage, marginUsed]);

  // 验证 margin 输入
  const marginValidation = React.useMemo(() => {
    const marginValue = Number(margin) || 0;

    if (marginValue === 0) {
      return { isValid: false, error: null };
    }

    if (Number.isNaN(+marginValue)) {
      return {
        isValid: false,
        error: 'invalid_number',
        errorMessage: t(
          'page.perpsDetail.PerpsOpenPositionPopup.invalidNumber'
        ),
      };
    }

    if (marginValue < minMargin) {
      return {
        isValid: false,
        error: 'invalid_margin',
        errorMessage: t('page.perpsDetail.PerpsOpenPositionPopup.minMargin', {
          amount: `$${minMargin}`,
        }),
      };
    }

    if (marginValue > maxMargin) {
      return {
        isValid: false,
        error: 'invalid_margin',
        errorMessage: t('page.perpsDetail.PerpsOpenPositionPopup.maxMargin', {
          amount: `$${maxMargin}`,
        }),
      };
    }

    return { isValid: true, error: null };
  }, [margin, t, minMargin, maxMargin]);

  React.useEffect(() => {
    if (visible) {
      setMargin(marginUsed.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const canReduce = useMemo(() => {
    return availableToReduce > 0.01;
  }, [availableToReduce]);

  const { runAsync: handleConfirm, loading } = useRequest(
    async () => {
      const action = Number(margin) > marginUsed ? 'add' : 'reduce';
      const marginDiff = Math.abs(Number(margin) - marginUsed);
      await onConfirm(action, marginDiff);
    },
    {
      manual: true,
    }
  );

  return (
    <Popup
      placement="bottom"
      height={564}
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

        <div className="flex-1 mt-12 px-20 overflow-y-auto pb-24">
          <div className="flex items-center justify-between p-12 mb-12 h-[78px] bg-r-neutral-card1 rounded-[8px]">
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
                      ? 'bg-r-green-light text-r-green-default'
                      : 'bg-r-red-light text-r-red-default'
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
              <span className="text-[15px] leading-[20px] font-bold text-r-neutral-title-1">
                {formatUsdValue(marginUsed)}
              </span>
              <span
                className={clsx(
                  'text-[13px] leading-[18px] font-medium',
                  pnl >= 0 ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {pnl >= 0 ? '+' : '-'}$
                {splitNumberByStep(Math.abs(pnl || 0).toFixed(2))}
              </span>
            </div>
          </div>

          <MarginEditInput
            title={t('page.perpsDetail.PerpsEditMarginPopup.margin')}
            placeholder={`$${marginUsed.toFixed(2)}`}
            minMargin={minMargin}
            maxMargin={maxMargin}
            sliderDisabled={maxMargin <= minMargin}
            margin={margin}
            onMarginChange={setMargin}
            errorMessage={
              marginValidation.error ? marginValidation.errorMessage : null
            }
          />

          <div className="rounded-[8px] bg-r-neutral-card-1">
            <div className="flex items-center justify-between px-[16px] py-[12px] min-[48px]">
              <span className="text-r-neutral-body text-[13px] leading-[16px]">
                {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
              </span>
              <div>
                <span className="text-r-neutral-title-1 font-medium text-[13px] leading-[16px]">
                  $
                  {splitNumberByStep(Number(liquidationPx).toFixed(pxDecimals))}
                </span>
                {margin && estimatedLiquidationPrice && (
                  <span className="text-r-neutral-title-1 font-medium text-[13px] leading-[16px]">
                    {' '}
                    → $
                    {splitNumberByStep(
                      Number(estimatedLiquidationPrice).toFixed(pxDecimals)
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-[16px] py-[12px] min-[48px]">
              <span className="text-r-neutral-body text-[13px] leading-[16px]">
                {t('page.perpsDetail.PerpsEditMarginPopup.liqDistance')}
              </span>
              <div className="flex items-center">
                <div className="flex items-center">
                  <RcIconAlarmCC className="text-rb-neutral-info" />
                  <span className="text-r-neutral-title-1 font-medium text-[13px] leading-[16px]">
                    {formatPerpsPct(
                      calculateDistanceToLiquidation(liquidationPx, markPrice)
                    )}
                  </span>
                </div>
                {margin && estimatedLiquidationPrice && (
                  <span className="text-r-neutral-title-1 font-medium text-[13px] leading-[16px]">
                    {' '}
                    →{' '}
                    {formatPerpsPct(
                      calculateDistanceToLiquidation(
                        estimatedLiquidationPrice,
                        markPrice
                      )
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
          <Button
            block
            size="large"
            type="primary"
            loading={loading}
            className="h-[48px] text-15 font-medium"
            disabled={!marginValidation.isValid || noChangeMargin}
            onClick={handleConfirm}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default EditMarginPopup;
