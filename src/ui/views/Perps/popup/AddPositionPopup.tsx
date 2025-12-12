import Popup from '@/ui/component/Popup';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { MarketData } from '@/ui/models/perps';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { useRequest } from 'ahooks';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { AssetPriceInfo } from '../components/AssetPriceInfo';
import { DistanceToLiquidationTag } from '../components/DistanceToLiquidationTag';
import { MarginInput } from '../components/MarginInput';
import { TokenImg } from '../components/TokenImg';
import { PERPS_MAX_NTL_VALUE, PERPS_MINI_USD_VALUE } from '../constants';
import { calLiquidationPrice } from '../utils';

export interface AddPositionPopupProps {
  visible?: boolean;
  coin: string;
  activeAssetCtx: WsActiveAssetCtx['ctx'] | null;
  currentAssetCtx: MarketData | null;
  availableBalance: number;
  direction: 'Long' | 'Short';
  positionSize: number;
  marginUsed: number;
  liquidationPx: number;
  handlePressRiskTag: () => void;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  markPrice: number;
  leverageRange: [number, number]; // [min, max]
  onCancel: () => void;
  onConfirm: (tradeSize: string) => Promise<void>;
}

export const AddPositionPopup: React.FC<AddPositionPopupProps> = ({
  visible,
  coin,
  activeAssetCtx,
  currentAssetCtx,
  availableBalance,
  leverage,
  direction,
  positionSize,
  marginUsed,
  liquidationPx,
  handlePressRiskTag,
  pnl,
  onCancel,
  onConfirm,
  leverageRange,
}) => {
  const pxDecimals = currentAssetCtx?.pxDecimals || 2;
  const szDecimals = currentAssetCtx?.szDecimals || 0;
  const leverageMax = currentAssetCtx?.maxLeverage || 5;
  const { t } = useTranslation();
  const [margin, setMargin] = React.useState('');
  const markPrice = useMemo(() => {
    return Number(activeAssetCtx?.markPx || currentAssetCtx?.markPx || 0);
  }, [activeAssetCtx]);

  const addMargin = useMemo(() => {
    return Number(margin) || 0;
  }, [margin]);

  // 计算交易金额
  const tradeAmount = React.useMemo(() => {
    return addMargin * leverage;
  }, [addMargin, leverage]);

  // 计算交易数量
  const tradeSize = React.useMemo(() => {
    if (!markPrice || !tradeAmount) {
      return '0';
    }
    return Number(tradeAmount / markPrice).toFixed(szDecimals);
  }, [markPrice, tradeAmount, szDecimals]);

  const totalSize = React.useMemo(() => {
    return (Number(tradeSize) + Number(positionSize)).toFixed(szDecimals);
  }, [tradeSize, positionSize, szDecimals]);

  // 验证 margin 输入
  const marginValidation = React.useMemo(() => {
    const marginValue = addMargin;
    const usdValue = marginValue * leverage;
    const sizeValue = Number(tradeSize) * markPrice;
    const maxValue = PERPS_MAX_NTL_VALUE;

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

    if (marginValue > availableBalance) {
      return {
        isValid: false,
        error: 'insufficient_balance',
        errorMessage: t(
          'page.perpsDetail.PerpsOpenPositionPopup.insufficientBalance'
        ),
      };
    }

    if (sizeValue < PERPS_MINI_USD_VALUE) {
      // 最小订单限制 $10
      return {
        isValid: false,
        error: 'minimum_limit',
        errorMessage: t(
          'page.perpsDetail.PerpsOpenPositionPopup.minimumOrderSize'
        ),
      };
    }

    if (usdValue > maxValue) {
      return {
        isValid: false,
        error: 'maximum_limit',
        errorMessage: t(
          'page.perpsDetail.PerpsOpenPositionPopup.maximumOrderSize',
          {
            amount: `$${maxValue}`,
          }
        ),
      };
    }

    return { isValid: true, error: null };
  }, [addMargin, leverage, tradeSize, markPrice, availableBalance, t]);

  // const marginNormalized = useMemo(() => {
  //   const newMargin = margin.startsWith('$') ? margin.slice(1) : margin;
  //   return Number(newMargin);
  // }, [margin]);

  useEffect(() => {
    if (!visible) {
      setMargin('');
    }
  }, [visible, setMargin]);

  // 计算预估清算价格
  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!markPrice || !leverage) {
      return 0;
    }
    const maxLeverage = leverageRange[1];
    return calLiquidationPrice(
      markPrice,
      Number(addMargin + marginUsed),
      direction,
      Number(tradeSize) + Number(positionSize),
      Number(tradeAmount) + Number(positionSize) * Number(markPrice),
      maxLeverage
    ).toFixed(pxDecimals);
  }, [
    markPrice,
    leverage,
    leverageRange,
    addMargin,
    direction,
    tradeSize,
    pxDecimals,
    tradeAmount,
    positionSize,
    marginUsed,
  ]);

  const { runAsync: handleConfirm, loading } = useRequest(
    async () => {
      await onConfirm(tradeSize);
    },
    {
      manual: true,
    }
  );

  return (
    <Popup
      placement="bottom"
      height={544}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onCancel}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px] overflow-auto pb-[80px]">
        <div className="text-center text-20 font-medium text-r-neutral-title-1 mt-16 mb-2">
          {direction === 'Long'
            ? t('page.perpsDetail.PerpsAddPositionPopup.addToLong')
            : t('page.perpsDetail.PerpsAddPositionPopup.addToShort')}{' '}
          {coin}-USD
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

          <MarginInput
            title={t('page.perpsDetail.PerpsEditMarginPopup.margin')}
            availableAmount={availableBalance}
            margin={margin}
            onMarginChange={setMargin}
            sliderDisabled={availableBalance < 0.1}
            errorMessage={
              marginValidation.error ? marginValidation.errorMessage : null
            }
          />

          <div className="rounded-[8px] bg-r-neutral-card-1">
            <div className="flex items-center justify-between px-[16px] py-[12px] min-[48px]">
              <span className="text-r-neutral-body text-[13px] leading-[16px]">
                {t('page.perpsDetail.PerpsAddPositionPopup.addSize')}
              </span>
              <div className="text-r-neutral-title-1 font-medium text-[13px] leading-[16px]">
                {formatUsdValue(
                  Number(tradeSize) * markPrice,
                  BigNumber.ROUND_DOWN
                )}{' '}
                = {tradeSize} {coin}
              </div>
            </div>
            <div className="flex items-center justify-between px-[16px] py-[12px] min-[48px]">
              <span className="text-r-neutral-body text-[13px] leading-[16px] flex items-center gap-4">
                {t('page.perpsDetail.PerpsAddPositionPopup.totalSize')}
                <TooltipWithMagnetArrow
                  overlayClassName="rectangle w-[max-content]"
                  placement="top"
                  title={t('page.perpsDetail.PerpsAddPositionPopup.sizeTips')}
                >
                  <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                </TooltipWithMagnetArrow>
              </span>
              <div className="text-r-neutral-title-1 font-medium text-[13px] leading-[16px]">
                {formatUsdValue(
                  Number(totalSize) * markPrice,
                  BigNumber.ROUND_DOWN
                )}{' '}
                = {totalSize} {coin}
              </div>
            </div>
            <div className="flex items-center justify-between px-[16px] py-[12px] min-[48px]">
              <span className="text-r-neutral-body text-[13px] leading-[16px] flex items-center gap-4">
                {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
                <TooltipWithMagnetArrow
                  overlayClassName="rectangle w-[max-content]"
                  placement="top"
                  title={t(
                    'page.perpsDetail.PerpsAddPositionPopup.liquidationPriceTips'
                  )}
                >
                  <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                </TooltipWithMagnetArrow>
              </span>
              <div className="text-r-neutral-title-1 font-medium text-[13px] leading-[16px]">
                ${splitNumberByStep(Number(estimatedLiquidationPrice))}
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
            disabled={!marginValidation.isValid}
            onClick={handleConfirm}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};
