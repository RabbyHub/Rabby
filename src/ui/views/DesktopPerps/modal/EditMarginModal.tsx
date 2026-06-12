import React, { useMemo } from 'react';
import { Modal, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { ReactComponent as RcIconManageMarginAlarmCC } from '@/ui/assets/perps/icon-alarm-manage-margin-cc.svg';
import { useRequest } from 'ahooks';
import { MarketData } from '@/ui/models/perps';
import {
  calculateDistanceToLiquidation,
  calLiquidationPrice,
  calTransferMarginRequired,
  formatPerpsPct,
} from '../../Perps/utils';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { PerpsDisplayCoinName } from '../../Perps/components/PerpsDisplayCoinName';
import { DesktopPerpsSliderV2 } from '../components/DesktopPerpsSliderV2';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';

export interface EditMarginPopupProps {
  visible: boolean;
  direction: 'Long' | 'Short';
  coin: string;
  currentAssetCtx: MarketData;
  entryPrice: number;
  leverage: number;
  availableBalance: number;
  liquidationPx: number;
  positionSize: number;
  marginUsed: number;
  pnl: number;
  onCancel: () => void;
  onConfirm: (action: 'add' | 'reduce', margin: number) => Promise<void>;
}

export const EditMarginModal: React.FC<EditMarginPopupProps> = ({
  visible,
  direction,
  leverage,
  availableBalance,
  onCancel,
  onConfirm,
  liquidationPx,
  positionSize,
  marginUsed,
  currentAssetCtx,
}) => {
  const pxDecimals = currentAssetCtx?.pxDecimals || 2;
  const leverageMax = currentAssetCtx?.maxLeverage || 5;
  const { t } = useTranslation();
  const [margin, setMargin] = React.useState('');
  const markPrice = useMemo(() => {
    return Number(currentAssetCtx?.markPx || 0);
  }, [currentAssetCtx?.markPx]);

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
    marginNormalized,
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
    return Math.max(
      new BigNumber(max).decimalPlaces(2, BigNumber.ROUND_DOWN).toNumber(),
      minMargin
    );
  }, [availableBalance, marginUsed, minMargin]);

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
  const hasMarginError = Boolean(marginValidation.error);

  React.useEffect(() => {
    if (visible) {
      setMargin(marginUsed.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const currentDistanceToLiquidationPercent = useMemo(() => {
    const percent = formatPerpsPct(
      calculateDistanceToLiquidation(liquidationPx, markPrice)
    );
    return percent;
  }, [liquidationPx, markPrice]);

  const estimatedDistanceToLiquidationPercent = useMemo(() => {
    if (!margin || !estimatedLiquidationPrice) {
      return '';
    }

    return formatPerpsPct(
      calculateDistanceToLiquidation(estimatedLiquidationPrice, markPrice)
    );
  }, [estimatedLiquidationPrice, margin, markPrice]);

  const handleMarginInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (value.startsWith('$')) {
        value = value.slice(1);
      }
      if (/^\d*\.?\d*$/.test(value) || value === '') {
        setMargin(value);
      }
    },
    []
  );

  const sliderValue = useMemo(() => {
    if (!marginNormalized) return minMargin;
    return Math.min(Math.max(marginNormalized, minMargin), maxMargin);
  }, [marginNormalized, minMargin, maxMargin]);

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
    <Modal
      bodyStyle={{ padding: 0, maxHeight: 'unset' }}
      centered
      destroyOnClose
      closable
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      className="modal-support-darkmode desktop-perps-modal-surface desktop-perps-manage-margin-modal"
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-rb-neutral-body" />
      }
    >
      <div className="flex flex-col min-h-[540px] bg-rb-neutral-bg-1">
        <div className="relative flex h-[56px] flex-shrink-0 items-center justify-center px-[56px] text-center text-20 font-medium text-r-neutral-title-1">
          {t('page.perpsPro.editMargin.title')}
        </div>

        <div className="flex-1 px-[20px] overflow-y-auto pb-24">
          <section className="flex items-center justify-between pt-[10px]">
            <div className="flex flex-col gap-[3px]">
              <PerpsDisplayCoinName
                item={currentAssetCtx}
                separator="-"
                className="text-[16px] leading-[20px] font-medium text-r-neutral-title-1"
              />
              <div
                className={clsx(
                  'flex h-[16px] w-max items-center rounded-[3px] px-[4px]',
                  'text-[10px] leading-[16px] font-medium',
                  direction === 'Long'
                    ? 'bg-rb-green-light-2 text-rb-green-default'
                    : 'bg-rb-red-light-2 text-rb-red-default'
                )}
              >
                {direction.toLowerCase()} {leverage}x
              </div>
            </div>
            <div className="flex flex-col items-end gap-[3px] text-[12px] font-medium">
              <span className="leading-[20px] text-rb-neutral-secondary">
                {t('page.perpsPro.editMargin.currentPrice')}
              </span>
              <span className="text-r-neutral-title-1">
                {splitNumberByStep(markPrice.toFixed(pxDecimals))}
              </span>
            </div>
          </section>

          <div className="my-[24px] h-0 border-t border-solid border-rb-neutral-line" />

          <section>
            <div className="mb-[12px] text-[14px] leading-[20px] font-semibold text-r-neutral-title-1">
              {t('page.perpsPro.editMargin.configureMargin')}
            </div>
            <div
              className={clsx(
                'relative overflow-hidden rounded-[8px] bg-rb-neutral-bg-2',
                hasMarginError ? 'h-[172px]' : 'h-[124px]'
              )}
            >
              <button
                type="button"
                className="absolute left-[16px] top-[29px] flex h-[26px] cursor-pointer items-center rounded-[8px] border-0 bg-rb-brand-light-1 px-[8px] text-[14px] font-bold leading-[18px] text-rb-brand-default"
                onClick={() => setMargin(minMargin.toString())}
              >
                Min
              </button>
              <input
                className={clsx(
                  'absolute left-1/2 top-[21px] h-[42px] w-[184px] -translate-x-1/2 bg-transparent border-0 px-[12px] text-center outline-none',
                  'text-[36px] leading-[42px] font-extrabold',
                  marginValidation.error
                    ? 'text-rb-red-default'
                    : 'text-r-neutral-title-1'
                )}
                value={margin ? `$${margin}` : ''}
                placeholder={`$${marginUsed.toFixed(2)}`}
                onChange={handleMarginInputChange}
              />
              <button
                type="button"
                className="absolute right-[16px] top-[29px] flex h-[26px] cursor-pointer items-center rounded-[8px] border-0 bg-rb-brand-light-1 px-[8px] text-[14px] font-bold leading-[18px] text-rb-brand-default"
                onClick={() => setMargin(maxMargin.toString())}
              >
                MAX
              </button>
              <div className="absolute left-[16px] right-[16px] top-[61px] flex h-[16px] items-center justify-between px-[9px] text-[12px] leading-[16px] font-medium text-rb-neutral-secondary">
                <span>{formatUsdValue(minMargin)}</span>
                <span>{formatUsdValue(maxMargin)}</span>
              </div>
              <div
                className={clsx(
                  'absolute left-[16px] right-[16px]',
                  hasMarginError ? 'top-[85px] h-[42px]' : 'top-[92px] h-[16px]'
                )}
              >
                <DesktopPerpsSliderV2
                  className="desktop-perps-manage-margin-slider"
                  disabled={maxMargin <= minMargin}
                  min={minMargin}
                  max={maxMargin}
                  step={0.01}
                  value={sliderValue}
                  onChange={(value) => {
                    if (typeof value === 'number') {
                      setMargin(value.toFixed(2));
                    }
                  }}
                />
              </div>
              {hasMarginError ? (
                <div className="absolute left-[16px] right-[16px] top-[124px] flex h-[32px] items-center gap-[4px] rounded-[8px] bg-rb-orange-light-1 px-[12px] text-[12px] leading-[14px] text-rb-orange-default">
                  <RcIconInfoCC className="h-[16px] w-[16px] flex-shrink-0" />
                  <span className="truncate">
                    {marginValidation.errorMessage}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-[12px] space-y-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-rb-neutral-foot text-[13px] leading-[16px]">
                {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
              </span>
              <div>
                <span className="text-rb-neutral-body font-normal text-[13px] leading-[16px]">
                  $
                  {splitNumberByStep(Number(liquidationPx).toFixed(pxDecimals))}
                </span>
                {margin && estimatedLiquidationPrice && (
                  <span className="text-rb-neutral-body font-normal text-[13px] leading-[16px]">
                    {' '}
                    → $
                    {splitNumberByStep(
                      Number(estimatedLiquidationPrice).toFixed(pxDecimals)
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-rb-neutral-foot text-[13px] leading-[16px]">
                {t('page.perpsDetail.PerpsEditMarginPopup.liqDistance')}
              </span>
              <div className="flex items-center gap-[6px]">
                <RcIconManageMarginAlarmCC className="desktop-perps-manage-margin-distance-icon" />
                <span className="text-rb-neutral-body font-normal text-[13px] leading-[16px]">
                  {currentDistanceToLiquidationPercent}
                  {estimatedDistanceToLiquidationPercent
                    ? ` → ${estimatedDistanceToLiquidationPercent}`
                    : ''}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-rb-neutral-bg-1">
          <div className="flex items-center">
            <Button
              block
              size="large"
              type="primary"
              loading={loading}
              className="h-[48px] text-15 font-medium rounded-[6px]"
              disabled={!marginValidation.isValid || noChangeMargin}
              onClick={handleConfirm}
            >
              {t('global.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
