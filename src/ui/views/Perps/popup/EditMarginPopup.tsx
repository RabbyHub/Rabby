import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { calLiquidationPrice, calTransferMarginRequired } from '../utils';
import { DistanceToLiquidationTag } from '../components/DistanceToLiquidationTag';
import { TokenImg } from '../components/TokenImg';
import { PerpsSlider } from '../components/PerpsSlider';
import styled from 'styled-components';

const StyledModal = styled(Modal)`
  .ant-modal-content {
    background-color: var(--r-neutral-card1, #fff);
    border-radius: 16px;
  }
  .ant-modal-header {
    background-color: transparent;
    border-bottom: none;
    padding: 20px 20px 12px;
  }
  .ant-modal-body {
    padding: 0 20px 20px;
  }
  .ant-modal-footer {
    border-top: none;
    padding: 16px 20px 20px;
  }
`;

export interface EditMarginPopupProps {
  visible: boolean;
  direction: 'Long' | 'Short';
  coin: string;
  coinLogo?: string;
  markPrice: number;
  entryPrice: number;
  leverage: number;
  leverageMax: number;
  pxDecimals: number;
  szDecimals: number;
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
  coinLogo,
  markPrice,
  leverage,
  leverageMax,
  pxDecimals,
  entryPrice,
  availableBalance,
  onCancel,
  onConfirm,
  liquidationPx,
  positionSize,
  marginUsed,
  pnlPercent,
  pnl,
  handlePressRiskTag,
}) => {
  const { t } = useTranslation();
  const [action, setAction] = React.useState<'add' | 'reduce'>('add');
  const [margin, setMargin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const inputRef = useRef<any>(null);

  // 计算预估清算价格
  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!margin || margin === '0') {
      return '';
    }
    const marginValue = Number(margin);
    const newMargin =
      action === 'add'
        ? Number(marginUsed) + marginValue
        : Number(marginUsed) - marginValue;
    return calLiquidationPrice(
      markPrice,
      newMargin,
      direction,
      Number(positionSize),
      leverage,
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

  // Calculate slider percentage
  const sliderPercentage = React.useMemo(() => {
    const marginValue = Number(margin) || 0;
    const available = action === 'add' ? availableBalance : availableToReduce;
    if (marginValue === 0 || available === 0) {
      return 0;
    }
    return Math.min((marginValue / available) * 100, 100);
  }, [margin, availableBalance, action, availableToReduce]);

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

  // Handle slider change
  const handleSliderChange = (value: number) => {
    const available = action === 'add' ? availableBalance : availableToReduce;
    const newMargin = (available * value) / 100;
    setMargin(
      new BigNumber(newMargin).decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed()
    );
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(action, Number(margin));
      onCancel();
    } catch (error) {
      console.error('Failed to update margin:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledModal
      title={
        <div className="text-center text-20 font-bold text-r-neutral-title-1">
          {t('page.perpsDetail.PerpsEditMarginPopup.title')}
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      width={420}
      centered
      footer={
        <div className="flex justify-center">
          {!canReduce && action === 'reduce' ? (
            <button
              className="w-full h-48 rounded-8 bg-r-neutral-line text-r-neutral-foot font-medium text-15 cursor-not-allowed"
              disabled
            >
              {t('page.perpsDetail.PerpsEditMarginPopup.reduceMargin')}
            </button>
          ) : (
            <button
              className={clsx(
                'w-full h-48 rounded-8 font-medium text-15',
                marginValidation.isValid
                  ? 'bg-r-blue-default text-white hover:bg-r-blue-light-1 cursor-pointer'
                  : 'bg-r-neutral-line text-r-neutral-foot cursor-not-allowed'
              )}
              disabled={!marginValidation.isValid || loading}
              onClick={handleConfirm}
            >
              {loading
                ? t('global.loading')
                : action === 'add'
                ? t('page.perpsDetail.PerpsEditMarginPopup.addMargin')
                : t('page.perpsDetail.PerpsEditMarginPopup.reduceMargin')}
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col">
        <div className="text-center text-14 text-r-neutral-body mb-16">
          {t('page.perpsDetail.PerpsEditMarginPopup.currentPrice')}:{' '}
          <span className="font-medium">
            ${splitNumberByStep(Number(markPrice))}
          </span>
        </div>

        {/* Direction Toggle */}
        <div className="flex gap-8 mb-16 bg-r-neutral-bg2 rounded-8 p-4">
          <button
            className={clsx(
              'flex-1 h-36 rounded-6 text-15 font-medium transition-all',
              action === 'add'
                ? 'bg-r-blue-light-1 text-r-blue-default'
                : 'text-r-neutral-body hover:bg-r-neutral-line'
            )}
            onClick={() => {
              setAction('add');
              setMargin('');
            }}
          >
            {t('page.perpsDetail.PerpsEditMarginPopup.addMargin')}
          </button>
          <button
            className={clsx(
              'flex-1 h-36 rounded-6 text-15 font-medium transition-all',
              action === 'reduce'
                ? 'bg-r-blue-light-1 text-r-blue-default'
                : 'text-r-neutral-body hover:bg-r-neutral-line'
            )}
            onClick={() => {
              setAction('reduce');
              setMargin('');
            }}
          >
            {t('page.perpsDetail.PerpsEditMarginPopup.reduceMargin')}
          </button>
        </div>

        {/* Coin Info Card */}
        <div className="flex items-center justify-between p-12 border border-rabby-neutral-line rounded-16 mb-16">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6">
              <TokenImg logoUrl={coinLogo} size={28} />
              <span className="text-16 font-bold text-r-neutral-title-1">
                {coin}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={clsx(
                  'px-4 py-1 rounded-4 text-12 font-medium',
                  direction === 'Long'
                    ? 'bg-green-light text-r-green-default'
                    : 'bg-red-light text-r-red-default'
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
          <div className="flex flex-col items-end gap-4">
            <span className="text-16 font-bold text-r-neutral-title-1">
              {formatUsdValue(Number(marginUsed))}
            </span>
            <span
              className={clsx(
                'text-14 font-medium',
                pnl >= 0 ? 'text-r-green-default' : 'text-r-red-default'
              )}
            >
              {pnl >= 0 ? '+' : '-'}${Math.abs(pnl || 0).toFixed(2)} (
              {pnl >= 0 ? '+' : ''}
              {pnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Margin Input Section */}
        <div className="bg-r-neutral-bg2 rounded-16 p-16 mb-16">
          <div className="text-17 font-bold text-r-neutral-title-1 text-center mb-4">
            {action === 'add'
              ? t('page.perpsDetail.PerpsEditMarginPopup.amountToAdd')
              : t('page.perpsDetail.PerpsEditMarginPopup.amountToReduce')}
          </div>
          <Input
            ref={inputRef}
            type="number"
            className="text-center text-40 font-black h-60 border-none bg-transparent"
            placeholder="$0"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            style={{
              fontSize: 40,
              fontWeight: 900,
              textAlign: 'center',
            }}
          />
          {marginValidation.error ? (
            <div className="text-center text-16 text-r-red-default font-medium mt-8">
              {marginValidation.errorMessage}
            </div>
          ) : (
            <div className="text-center text-16 text-r-neutral-body font-medium mt-8">
              {action === 'add'
                ? t('page.perpsDetail.PerpsEditMarginPopup.perpsBalance')
                : t('page.perpsDetail.PerpsEditMarginPopup.available')}
              {': '}
              {formatUsdValue(
                action === 'add' ? availableBalance : availableToReduce,
                BigNumber.ROUND_DOWN
              )}
            </div>
          )}

          {/* Slider */}
          <div className="mt-16">
            <PerpsSlider
              disabled={!canReduce && action === 'reduce'}
              value={sliderPercentage}
              onValueChange={handleSliderChange}
              showPercentage={true}
            />
          </div>
        </div>

        {/* Liquidation Price Info */}
        <div className="flex items-center justify-center gap-4 text-14">
          <span className="text-r-neutral-body font-medium">
            {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
          </span>
          <span className="text-r-neutral-title-1 font-bold">
            ${splitNumberByStep(Number(liquidationPx))}
          </span>
          {margin && estimatedLiquidationPrice && (
            <span className="text-r-neutral-title-1 font-bold">
              → ${splitNumberByStep(Number(estimatedLiquidationPrice))}
            </span>
          )}
        </div>
      </div>
    </StyledModal>
  );
};

export default EditMarginPopup;
