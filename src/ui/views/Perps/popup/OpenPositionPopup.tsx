import React, { useMemo } from 'react';
import { Input, Button, Slider, Switch, Tooltip, message } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { ReactComponent as RcIconPerpsLeveragePlus } from 'ui/assets/perps/ImgLeveragePlus.svg';
import { ReactComponent as RcIconPerpsLeverageMinus } from 'ui/assets/perps/ImgLeverageMinus.svg';
import { useMemoizedFn } from 'ahooks';
import { calLiquidationPrice, formatPercent } from '../utils';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { PERPS_EXCHANGE_FEE_NUMBER, PERPS_MAX_NTL_VALUE } from '../constants';
import { EditTpSlTag } from '../components/EditTpSlTag';
import { AssetPriceInfo } from '../components/AssetPriceInfo';
import { MarketData } from '@/ui/models/perps';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { MarginInput } from '../components/MarginInput';
import { LeverageInput } from '../components/LeverageInput';

interface OpenPositionPopupProps extends Omit<PopupProps, 'onCancel'> {
  direction: 'Long' | 'Short';
  providerFee: number;
  coin: string;
  markPrice: number;
  leverageRange: [number, number]; // [min, max]
  pxDecimals: number;
  szDecimals: number;
  availableBalance: number;
  maxNtlValue: number;
  currentAssetCtx: MarketData;
  activeAssetCtx: WsActiveAssetCtx['ctx'] | null;
  onCancel: () => void;
  onConfirm: () => void;
  handleOpenPosition: (params: {
    coin: string;
    size: string;
    leverage: number;
    direction: 'Long' | 'Short';
    midPx: string;
    tpTriggerPx?: string;
    slTriggerPx?: string;
  }) => Promise<
    | {
        oid: number;
        avgPx: string;
        totalSz: string;
      }
    | undefined
  >;
}

export const PerpsOpenPositionPopup: React.FC<OpenPositionPopupProps> = ({
  visible,
  direction: _direction,
  providerFee,
  coin,
  markPrice,
  leverageRange,
  pxDecimals,
  szDecimals,
  availableBalance,
  onCancel,
  onConfirm,
  maxNtlValue,
  handleOpenPosition,
  currentAssetCtx,
  activeAssetCtx,
}) => {
  const { t } = useTranslation();
  const [isReviewMode, setIsReviewMode] = React.useState(false);

  const [direction, setDirection] = React.useState<'Long' | 'Short'>(
    _direction
  );
  const [margin, setMargin] = React.useState<string>('');
  const [selectedLeverage, setLeverage] = React.useState<number | undefined>(
    leverageRange[1]
  );
  const leverage = selectedLeverage || 1;
  const [tpTriggerPx, setTpTriggerPx] = React.useState<string>('');
  const [slTriggerPx, setSlTriggerPx] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (visible && inputRef.current) {
      // 使用 setTimeout 确保弹窗完全渲染后再聚焦
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const tradeAmount = React.useMemo(() => {
    const marginValue = Number(margin) || 0;
    return marginValue * leverage;
  }, [margin, leverage]);

  // 计算交易数量
  const tradeSize = React.useMemo(() => {
    if (!markPrice || !tradeAmount) return '0';
    return Number(tradeAmount / markPrice).toFixed(szDecimals);
  }, [tradeAmount, markPrice]);

  // 计算预估清算价格
  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!markPrice || !leverage) return 0;
    const maxLeverage = leverageRange[1];
    return calLiquidationPrice(
      markPrice,
      Number(margin),
      direction,
      Number(tradeSize),
      Number(tradeSize) * markPrice,
      maxLeverage
    ).toFixed(pxDecimals);
  }, [markPrice, leverage, leverageRange, margin, tradeSize]);

  const bothFee = React.useMemo(() => {
    return providerFee + PERPS_EXCHANGE_FEE_NUMBER;
  }, [providerFee]);

  // 验证 margin 输入
  const marginValidation = React.useMemo(() => {
    const marginValue = Number(margin) || 0;
    const usdValue = marginValue * leverage;
    const sizeValue = Number(tradeSize) * markPrice;
    const maxValue = maxNtlValue || PERPS_MAX_NTL_VALUE;

    if (marginValue === 0) {
      return { isValid: false, error: null };
    }

    if (marginValue > availableBalance) {
      return {
        isValid: false,
        error: 'insufficient_balance',
        errorMessage: t('page.perps.insufficientBalance'),
      };
    }

    if (sizeValue < 10) {
      // 最小订单限制 $10
      return {
        isValid: false,
        error: 'minimum_limit',
        errorMessage: t('page.perps.minimumOrderSize'),
      };
    }

    if (usdValue > maxValue) {
      return {
        isValid: false,
        error: 'maximum_limit',
        errorMessage: t('page.perps.maximumOrderSize', {
          amount: `$${maxValue}`,
        }),
      };
    }

    return { isValid: true, error: null };
  }, [margin, availableBalance, t, leverage, maxNtlValue]);

  const leverageRangeValidation = React.useMemo(() => {
    if (selectedLeverage == null || Number.isNaN(+selectedLeverage)) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMinError', {
          min: leverageRange[0],
        }),
      };
    }
    if (selectedLeverage > leverageRange[1]) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMaxError', {
          max: leverageRange[1],
        }),
      };
    }

    if (selectedLeverage < leverageRange[0]) {
      return {
        error: true,
        errorMessage: t('page.perps.leverageRangeMinError', {
          min: leverageRange[0],
        }),
      };
    }
    return { error: false, errorMessage: '' };
  }, [selectedLeverage, leverageRange, t]);

  const resetInitValues = useMemoizedFn(() => {
    setTpTriggerPx('');
    setSlTriggerPx('');
  });

  React.useEffect(() => {
    if (visible) {
      availableBalance > 2
        ? setMargin(Math.round(availableBalance / 2).toString())
        : setMargin('');
      setLeverage(leverageRange[1]);
      resetInitValues();
      setIsReviewMode(false);
    }
  }, [visible]);

  React.useEffect(() => {
    setDirection(_direction);
  }, [_direction]);

  const handleReview = () => {
    setIsReviewMode(true);
  };

  const handleBackToEdit = () => {
    setIsReviewMode(false);
  };

  const dayDelta = useMemo(() => {
    const prevDayPx = Number(
      activeAssetCtx?.prevDayPx || currentAssetCtx?.prevDayPx || 0
    );
    return markPrice - prevDayPx;
  }, [activeAssetCtx, markPrice, currentAssetCtx]);

  const isPositiveChange = useMemo(() => {
    return dayDelta >= 0;
  }, [dayDelta]);

  const openPosition = useMemoizedFn(async () => {
    setLoading(true);
    const res = await handleOpenPosition({
      coin,
      size: tradeSize,
      leverage,
      direction,
      midPx: markPrice.toString(),
      tpTriggerPx: tpTriggerPx ? tpTriggerPx : undefined,
      slTriggerPx: slTriggerPx ? slTriggerPx : undefined,
    });
    setLoading(false);
    onConfirm();
    return res;
  });

  const renderEditMode = useMemoizedFn(() => (
    <>
      <div className="flex-1 px-20">
        <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-12 pb-4">
          {t('page.perpsDetail.PerpsOpenPositionPopup.newPosition')}
        </div>
        <AssetPriceInfo
          coin={coin}
          currentAssetCtx={currentAssetCtx}
          activeAssetCtx={activeAssetCtx}
        />

        <div className="flex mt-12 mb-12 bg-r-neutral-card1 rounded-[8px] p-4 h-[42px]">
          <div
            className={clsx(
              'flex-1 h-[34px] rounded-[4px] text-16 cursor-pointer flex items-center justify-center',
              direction === 'Long'
                ? 'bg-r-green-light text-r-green-default font-bold'
                : 'text-r-neutral-foot font-medium'
            )}
            onClick={() => {
              setDirection('Long');
              resetInitValues();
            }}
          >
            {t('page.perpsDetail.PerpsOpenPositionPopup.long')}
          </div>
          <div
            className={clsx(
              'flex-1 h-[34px] rounded-[4px] text-16 cursor-pointer flex items-center justify-center',
              direction === 'Short'
                ? 'bg-r-red-light text-r-red-default font-bold'
                : 'text-r-neutral-foot font-medium'
            )}
            onClick={() => {
              setDirection('Short');
              resetInitValues();
            }}
          >
            {t('page.perpsDetail.PerpsOpenPositionPopup.short')}
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

        <LeverageInput
          value={selectedLeverage}
          onChange={setLeverage}
          min={leverageRange[0]}
          max={leverageRange[1]}
          step={1}
          title={t('page.perps.leverage')}
          errorMessage={
            leverageRangeValidation.error &&
            leverageRangeValidation.errorMessage
              ? leverageRangeValidation.errorMessage
              : undefined
          }
        />

        <div className="mb-20 bg-r-neutral-card1 rounded-[8px] flex items-center flex-col px-16">
          <div className="flex w-full py-12 justify-between items-center">
            <div className="text-14 text-r-neutral-foot flex items-center gap-4 relative">
              {t('page.perps.size')}
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                placement="top"
                title={t('page.perps.sizeTips')}
              >
                <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
              </TooltipWithMagnetArrow>
            </div>
            <div className="text-14 text-r-neutral-title-1 font-medium">
              {formatUsdValue(
                Number(tradeSize) * markPrice,
                BigNumber.ROUND_DOWN
              )}{' '}
              = {tradeSize} {coin}
            </div>
          </div>
          {/* TP/SL Section */}
          <div className="flex w-full py-12 items-center justify-between">
            <div className="text-14 text-r-neutral-foot">
              {direction === 'Long'
                ? t(
                    'page.perpsDetail.PerpsOpenPositionPopup.takeProfitWhenPriceAbove'
                  )
                : t(
                    'page.perpsDetail.PerpsOpenPositionPopup.takeProfitWhenPriceBelow'
                  )}
            </div>
            <EditTpSlTag
              coin={coin}
              activeAssetCtx={activeAssetCtx}
              currentAssetCtx={currentAssetCtx}
              markPrice={markPrice}
              initTpOrSlPrice={tpTriggerPx}
              direction={direction}
              size={Number(tradeSize)}
              margin={Number(margin)}
              liqPrice={Number(estimatedLiquidationPrice)}
              pxDecimals={pxDecimals}
              szDecimals={szDecimals}
              actionType="tp"
              type="openPosition"
              handleSetAutoClose={async (price: string) => {
                setTpTriggerPx(price);
              }}
              handleCancelAutoClose={async () => {
                setTpTriggerPx('');
              }}
            />
          </div>
          <div className="flex w-full py-12 items-center justify-between">
            <div className="text-14 text-r-neutral-foot">
              {direction === 'Long'
                ? t(
                    'page.perpsDetail.PerpsOpenPositionPopup.stopLossWhenPriceBelow'
                  )
                : t(
                    'page.perpsDetail.PerpsOpenPositionPopup.stopLossWhenPriceAbove'
                  )}
            </div>
            <EditTpSlTag
              coin={coin}
              activeAssetCtx={activeAssetCtx}
              currentAssetCtx={currentAssetCtx}
              markPrice={markPrice}
              initTpOrSlPrice={slTriggerPx}
              direction={direction}
              size={Number(tradeSize)}
              margin={Number(margin)}
              liqPrice={Number(estimatedLiquidationPrice)}
              pxDecimals={pxDecimals}
              szDecimals={szDecimals}
              actionType="sl"
              type="openPosition"
              handleSetAutoClose={async (price: string) => {
                setSlTriggerPx(price);
              }}
              handleCancelAutoClose={async () => {
                setSlTriggerPx('');
              }}
            />
          </div>
        </div>

        <div
          className={clsx(
            'fixed bottom-0 left-0 right-0 ',
            'border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16',
            'bg-r-neutral-card-2'
          )}
        >
          <Button
            block
            disabled={
              !marginValidation.isValid || leverageRangeValidation.error
            }
            size="large"
            type="primary"
            className="h-[48px] text-15 font-medium"
            onClick={handleReview}
          >
            {t('page.perps.review')}
          </Button>
        </div>
      </div>
    </>
  ));

  const renderReviewMode = useMemoizedFn(() => (
    <>
      <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
        {t('page.perps.reviewOrder')}
      </div>

      <div className="flex-1 px-20">
        {/* Order Details Section */}
        <div className="bg-r-neutral-card1 rounded-[8px] py-12 px-16 mb-12">
          <div className="space-y-16">
            <div className="flex justify-between items-center">
              <div className="text-13 text-r-neutral-body">
                {t('page.perps.title')}
              </div>
              <div className="text-13 text-r-neutral-title-1 flex items-center font-medium">
                {coin} - USD
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-13 text-r-neutral-body">
                {t('page.perps.marginIsolated')}
              </div>
              <div className="text-13 text-r-neutral-title-1 font-medium">
                {formatUsdValue(Number(margin))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-13 text-r-neutral-body">
                {t('page.perps.direction')}
              </div>
              <div className="text-13 text-r-neutral-title-1 font-medium">
                {direction} {leverage}x
              </div>
            </div>
            <div className="flex justify-between items-center">
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
              <div className="text-13 text-r-neutral-title-1 font-medium">
                {formatUsdValue(Number(tradeAmount))} = {tradeSize} {coin}
              </div>
            </div>
            {Boolean(tpTriggerPx) && (
              <div className="flex justify-between items-center">
                <div className="text-13 text-r-neutral-body">
                  {direction === 'Long'
                    ? t(
                        'page.perpsDetail.PerpsOpenPositionPopup.takeProfitWhenPriceAbove'
                      )
                    : t(
                        'page.perpsDetail.PerpsOpenPositionPopup.takeProfitWhenPriceBelow'
                      )}
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-13 text-r-neutral-title-1 font-medium">
                    ${splitNumberByStep(tpTriggerPx)}
                  </span>
                </div>
              </div>
            )}
            {Boolean(slTriggerPx) && (
              <div className="flex justify-between items-center">
                <div className="text-13 text-r-neutral-body">
                  {direction === 'Long'
                    ? t(
                        'page.perpsDetail.PerpsOpenPositionPopup.stopLossWhenPriceBelow'
                      )
                    : t(
                        'page.perpsDetail.PerpsOpenPositionPopup.stopLossWhenPriceAbove'
                      )}
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-13 text-r-neutral-title-1 font-medium">
                    ${splitNumberByStep(slTriggerPx)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price and Fee Section */}
        <div className="bg-r-neutral-card1 rounded-[8px] py-12 px-16 mb-20">
          <div className="space-y-16">
            <div className="flex justify-between items-center">
              <div className="text-13 text-r-neutral-body">
                {coin}-USD {t('page.perps.price')}
              </div>
              <div className="text-13 text-r-neutral-title-1 font-medium">
                ${splitNumberByStep(markPrice)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-13 text-r-neutral-body flex items-center gap-4">
                {t('page.perps.estimatedLiquidationPrice')}
                <Tooltip
                  overlayClassName={clsx('rectangle')}
                  placement="top"
                  title={t('page.perps.liquidationPriceTips')}
                  align={{ targetOffset: [0, 0] }}
                >
                  <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                </Tooltip>
              </div>
              <div className="text-13 text-r-neutral-title-1 font-medium">
                ${splitNumberByStep(Number(estimatedLiquidationPrice))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0">
          <div className="flex items-center justify-center gap-4 text-13 text-r-neutral-foot mb-12">
            <span>
              {t('page.perpsDetail.PerpsClosePositionPopup.fee')}{' '}
              {formatPercent(bothFee, 4)}
            </span>
            <Tooltip
              overlayClassName={clsx('rectangle')}
              placement="top"
              title={
                <div>
                  <div className="text-13 text-r-neutral-title-2">
                    {t('page.perps.rabbyFeeTipsV2')}
                  </div>
                  <div className="text-13 text-r-neutral-title-2">
                    {t('page.perps.providerFeeTips', {
                      fee: formatPercent(providerFee, 4),
                    })}
                  </div>
                </div>
              }
              align={{ targetOffset: [0, 0] }}
            >
              <RcIconInfo className="text-rb-neutral-info w-15 h-15" />
            </Tooltip>
          </div>
          <div className="border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
            <Button
              block
              size="large"
              type="primary"
              className="h-[48px] text-15 font-medium flex-1"
              onClick={openPosition}
              loading={loading}
            >
              {direction === 'Long'
                ? t('page.perps.openLong')
                : t('page.perps.openShort')}
            </Button>
          </div>
        </div>
      </div>
    </>
  ));

  return (
    <>
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
        onClose={isReviewMode ? handleBackToEdit : onCancel}
      >
        <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px] overflow-auto pb-[80px]">
          {isReviewMode ? renderReviewMode() : renderEditMode()}
        </div>
      </Popup>
    </>
  );
};

export default PerpsOpenPositionPopup;
