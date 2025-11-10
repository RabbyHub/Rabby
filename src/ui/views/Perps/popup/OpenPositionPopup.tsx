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
import { PERPS_MAX_NTL_VALUE } from '../constants';
import { EditTpSlTag } from '../components/EditTpSlTag';

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
  direction,
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
  ...rest
}) => {
  const { t } = useTranslation();
  const [isReviewMode, setIsReviewMode] = React.useState(false);

  const [margin, setMargin] = React.useState<string>('');
  const [leverage, setLeverage] = React.useState<number>(5);
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
      leverage,
      maxLeverage
    ).toFixed(pxDecimals);
  }, [markPrice, leverage, leverageRange, margin, tradeSize]);

  const bothFee = React.useMemo(() => {
    return providerFee;
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

    if (usdValue < 10 || sizeValue < 10) {
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

  React.useEffect(() => {
    if (!visible) {
      setMargin('');
      setLeverage(Math.min(leverageRange[1], 5));
      setTpTriggerPx('');
      setSlTriggerPx('');
      setIsReviewMode(false);
    }
  }, [visible, leverageRange]);

  const handleReview = () => {
    setIsReviewMode(true);
  };

  const handleBackToEdit = () => {
    setIsReviewMode(false);
  };

  const isValidAmount = marginValidation.isValid;

  // 获取错误状态下的文字颜色
  const getMarginTextColor = () => {
    if (marginValidation.error) {
      return 'text-r-red-default';
    }
    return 'text-r-neutral-title-1';
  };

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

  // 渲染编辑模式UI
  const renderEditMode = useMemoizedFn(() => (
    <>
      <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
        {direction} {coin}-USD
      </div>

      <div className="flex-1 px-20">
        <div className="bg-r-neutral-card1 rounded-[8px] p-16 h-[168px] mb-12 items-center">
          <div className="text-13 text-r-neutral-body text-center">
            {t('page.perps.margin')}
          </div>
          <input
            className={`text-[40px] bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none ${getMarginTextColor()}`}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
            }}
            ref={inputRef}
            autoFocus
            placeholder="$0"
            value={margin ? `$${margin}` : ''}
            onChange={(e) => {
              let value = e.target.value;
              if (value.startsWith('$')) {
                value = value.slice(1);
              }
              // 只允许数字和小数点
              if (/^\d*\.?\d*$/.test(value) || value === '') {
                setMargin(value);
              }
            }}
          />
          <div className="text-13 text-r-neutral-body text-center flex items-center justify-center gap-6">
            {t('page.perps.availableBalance', {
              balance: formatUsdValue(availableBalance, BigNumber.ROUND_DOWN),
            })}
            <div
              className={clsx(
                'text-r-blue-default bg-r-blue-light1 rounded-[4px] px-6 py-2 cursor-pointer'
              )}
              onClick={() => {
                setMargin(
                  new BigNumber(availableBalance)
                    .decimalPlaces(2, BigNumber.ROUND_DOWN)
                    .toFixed()
                );
              }}
            >
              Max
            </div>
          </div>
          {marginValidation.error && (
            <div className="text-13 text-r-red-default text-center mt-8">
              {marginValidation.errorMessage}
            </div>
          )}
        </div>

        <div className="mb-20 bg-r-neutral-card1 rounded-[8px] flex items-center flex-col px-16">
          <div className="flex w-full py-16 justify-between items-center">
            <div className="text-13 text-r-neutral-title-1">
              {t('page.perps.leverage')}{' '}
              <span className="text-r-neutral-foot">
                ({leverageRange[0]} - {leverageRange[1]}x)
              </span>
            </div>
            <div className="text-13 text-r-neutral-title-1 font-medium text-center flex items-center gap-6">
              <div
                className={clsx(
                  'text-r-neutral-title-1 bg-r-neutral-card2 rounded-[4px] px-6 py-4',
                  leverageRange[0] === leverage
                    ? 'opacity-50'
                    : 'hover:bg-r-blue-light-1 hover:text-r-blue-default cursor-pointer'
                )}
                onClick={() => {
                  setLeverage((v) => Math.max(v - 1, leverageRange[0]));
                }}
              >
                <RcIconPerpsLeverageMinus />
              </div>
              <input
                className="text-15 text-r-neutral-title-1 font-medium text-center w-[68px] h-[28px] bg-transparent border-[0.5px] border-solid border-rabby-neutral-line rounded-[4px] outline-none focus:border-blue"
                value={leverage}
                onBlur={() => {
                  if (leverage < leverageRange[0]) {
                    setLeverage(leverageRange[0]);
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    const num = value === '' ? 0 : parseInt(value);
                    if (num >= leverageRange[1]) {
                      setLeverage(leverageRange[1]);
                    } else {
                      setLeverage(num);
                    }
                  }
                }}
              />
              <div
                className={clsx(
                  'text-r-neutral-title-1 bg-r-neutral-card2 rounded-[4px] px-6 py-4',
                  leverageRange[1] === leverage
                    ? 'opacity-50'
                    : 'hover:bg-r-blue-light-1 hover:text-r-blue-default cursor-pointer'
                )}
                onClick={() => {
                  setLeverage((v) => Math.min(v + 1, leverageRange[1]));
                }}
              >
                <RcIconPerpsLeveragePlus />
              </div>
            </div>
          </div>
          <div className="flex w-full py-16 justify-between items-center">
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
              {formatUsdValue(
                Number(tradeSize) * markPrice,
                BigNumber.ROUND_DOWN
              )}{' '}
              = {tradeSize} {coin}
            </div>
          </div>
          {/* TP/SL Section */}
          <div className="flex w-full py-16 items-center justify-between">
            <div className="text-13 text-r-neutral-body">
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
          <div className="flex w-full py-16 items-center justify-between">
            <div className="text-13 text-r-neutral-body">
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

        <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
          <Button
            block
            disabled={!isValidAmount}
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

  // 渲染检查订单模式UI
  const renderReviewMode = useMemoizedFn(() => (
    <>
      <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
        {t('page.perps.reviewOrder')}
      </div>

      <div className="flex-1 px-20">
        {/* Order Details Section */}
        <div className="bg-r-neutral-card1 rounded-[8px] p-16 mb-12">
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
            {(tpTriggerPx || slTriggerPx) && (
              <div className="flex justify-between items-center">
                <div className="text-13 text-r-neutral-body">
                  {t('page.perps.autoClose')}
                </div>
                <div className="flex items-center gap-8">
                  {tpTriggerPx && (
                    <span className="text-13 text-r-neutral-title-1 font-medium">
                      TP: ${splitNumberByStep(tpTriggerPx)}
                    </span>
                  )}
                  {tpTriggerPx && slTriggerPx && (
                    <span className="text-r-neutral-line">|</span>
                  )}
                  {slTriggerPx && (
                    <span className="text-13 text-r-neutral-title-1 font-medium">
                      SL: ${splitNumberByStep(slTriggerPx)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price and Fee Section */}
        <div className="bg-r-neutral-card1 rounded-[8px] p-16 mb-20">
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
                $
                {splitNumberByStep(
                  Number(estimatedLiquidationPrice).toFixed(2)
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-13 text-r-neutral-body flex items-center gap-4">
                {t('page.perps.fee')}
                <Tooltip
                  overlayClassName={clsx('rectangle')}
                  placement="top"
                  title={
                    <div>
                      <div className="text-13 text-r-neutral-title-2">
                        {t('page.perps.rabbyFeeTipsZero')}
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
                  <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                </Tooltip>
              </div>
              <div className="text-13 text-r-neutral-title-1 font-medium">
                {formatPercent(bothFee, 4)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
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
    </>
  ));

  return (
    <>
      <Popup
        placement="bottom"
        height={540}
        isSupportDarkMode
        bodyStyle={{ padding: 0 }}
        destroyOnClose
        push={false}
        closable
        visible={visible}
        onCancel={onCancel}
        onClose={isReviewMode ? handleBackToEdit : onCancel}
        {...rest}
      >
        <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
          {isReviewMode ? renderReviewMode() : renderEditMode()}
        </div>
      </Popup>
    </>
  );
};

export default PerpsOpenPositionPopup;
