import React, { useMemo } from 'react';
import { Input, Button, Slider, Switch, Tooltip, message } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { LeverageSelectionPopup } from './LeverageSelectionPopup';
import { formatPercent } from './SingleCoin';
import { useMemoizedFn } from 'ahooks';
import { calLiquidationPrice } from '../utils';
import { AutoClosePositionPopup } from './AutoClosePositionPopup';

interface OpenPositionPopupProps extends Omit<PopupProps, 'onCancel'> {
  direction: 'Long' | 'Short';
  providerFee: number;
  coin: string;
  markPrice: number;
  leverageRang: [number, number]; // [min, max]
  pxDecimals: number;
  szDecimals: number;
  availableBalance: number;
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
  leverageRang,
  pxDecimals,
  szDecimals,
  availableBalance,
  onCancel,
  onConfirm,
  handleOpenPosition,
  ...rest
}) => {
  const { t } = useTranslation();
  const [leveragePopupVisible, setLeveragePopupVisible] = React.useState(false);
  const [isReviewMode, setIsReviewMode] = React.useState(false);

  const openLeveragePopup = () => {
    setLeveragePopupVisible(true);
  };
  const [autoCloseVisible, setAutoCloseVisible] = React.useState(false);
  const [margin, setMargin] = React.useState<string>('');
  const [leverage, setLeverage] = React.useState<number>(5);
  const [autoClose, setAutoClose] = React.useState({
    isOpen: false,
    tpTriggerPx: '',
    slTriggerPx: '',
  });
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
  // 计算交易金额
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
    const maxLeverage = leverageRang[1];
    return calLiquidationPrice(
      markPrice,
      Number(margin),
      direction,
      Number(tradeSize),
      leverage,
      maxLeverage
    ).toFixed(pxDecimals);
  }, [markPrice, leverage, leverageRang, margin, tradeSize]);

  const bothFee = React.useMemo(() => {
    return providerFee + 0.0005;
  }, [providerFee]);

  // 验证 margin 输入
  const marginValidation = React.useMemo(() => {
    const marginValue = Number(margin) || 0;
    const usdValue = marginValue * leverage;
    const maxNtlValue = 10000000;

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

    if (usdValue < 10) {
      // 最小订单限制 $10
      return {
        isValid: false,
        error: 'minimum_limit',
        errorMessage: t('page.perps.minimumOrderSize'),
      };
    }

    if (usdValue > maxNtlValue) {
      return {
        isValid: false,
        error: 'maximum_limit',
        errorMessage: t('page.perps.maximumOrderSize', {
          amount: `$${maxNtlValue}`,
        }),
      };
    }

    return { isValid: true, error: null };
  }, [margin, availableBalance, t, leverage]);

  React.useEffect(() => {
    if (!visible) {
      setMargin('');
      setLeverage(5);
      setAutoClose({
        isOpen: false,
        tpTriggerPx: '',
        slTriggerPx: '',
      });
      setLeveragePopupVisible(false);
      setIsReviewMode(false);
    }
  }, [visible]);

  const handleReview = () => {
    setIsReviewMode(true);
  };

  const handleBackToEdit = () => {
    setIsReviewMode(false);
  };

  const isValidAmount = marginValidation.isValid;

  const handleLeverageConfirm = (selectedLeverage: number) => {
    setLeverage(selectedLeverage);
    setLeveragePopupVisible(false);
  };

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
      tpTriggerPx:
        autoClose.isOpen && autoClose.tpTriggerPx
          ? autoClose.tpTriggerPx
          : undefined,
      slTriggerPx:
        autoClose.isOpen && autoClose.slTriggerPx
          ? autoClose.slTriggerPx
          : undefined,
    });
    setLoading(false);
    onConfirm();
    return res;
  });

  const handleAutoCloseSwitch = useMemoizedFn((e: boolean) => {
    if (e) {
      setAutoCloseVisible(true);
    } else {
      setAutoClose({
        isOpen: false,
        tpTriggerPx: '',
        slTriggerPx: '',
      });
    }
  });

  const AutoCloseInfo = useMemo(() => {
    if (autoClose.isOpen) {
      if (autoClose.tpTriggerPx && autoClose.slTriggerPx) {
        const Line = (
          <span className="text-r-neutral-line text-13 mr-4 ml-4">|</span>
        );
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${splitNumberByStep(autoClose.tpTriggerPx)}{' '}
            {t('page.perps.takeProfit')} {Line}$
            {splitNumberByStep(autoClose.slTriggerPx)}{' '}
            {t('page.perps.stopLoss')}
          </div>
        );
      } else if (autoClose.tpTriggerPx) {
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${splitNumberByStep(autoClose.tpTriggerPx)}{' '}
            {t('page.perps.takeProfit')}
          </div>
        );
      } else if (autoClose.slTriggerPx) {
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${splitNumberByStep(autoClose.slTriggerPx)}{' '}
            {t('page.perps.stopLoss')}
          </div>
        );
      } else {
        return null;
      }
    }
  }, [autoClose.isOpen, autoClose.tpTriggerPx, autoClose.slTriggerPx]);

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
          <div className="text-13 text-r-neutral-body text-center">
            {t('page.perps.availableBalance', {
              balance: formatUsdValue(availableBalance, BigNumber.ROUND_DOWN),
            })}
          </div>
          {marginValidation.error && (
            <div className="text-13 text-r-red-default text-center mt-8">
              {marginValidation.errorMessage}
            </div>
          )}
        </div>

        <div className="mb-20 bg-r-neutral-card1 rounded-[8px] flex items-center flex-col px-16">
          <div
            className="flex w-full py-16 justify-between items-center cursor-pointer"
            onClick={() => {
              openLeveragePopup();
            }}
          >
            <div className="text-13 text-r-neutral-title-1">
              {t('page.perps.leverage')}
            </div>
            <div className="text-13 text-r-neutral-title-1 font-medium text-center flex items-center">
              {leverage}x
              <ThemeIcon
                className="icon icon-arrow-right ml-4"
                src={RcIconArrowRight}
              />
            </div>
          </div>
          <div className="flex w-full py-16 justify-between items-center">
            <div className="text-13 text-r-neutral-title-1 mb-8">
              {t('page.perps.size')}
            </div>
            <div className="text-13 text-r-neutral-title-1 font-medium">
              {formatUsdValue(Number(tradeAmount))} = {tradeSize} {coin}
            </div>
          </div>
          <div
            className="flex w-full py-16 items-center justify-between cursor-pointer"
            onClick={() => {
              handleAutoCloseSwitch(!autoClose.isOpen);
            }}
          >
            <div className="text-13 text-r-neutral-title-1">
              {t('page.perps.autoClose')}
              {AutoCloseInfo}
            </div>
            <Switch
              checked={autoClose.isOpen}
              // onChange={handleAutoCloseSwitch}
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
                {t('page.perps.margin')}
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
                <Tooltip
                  overlayClassName={clsx('rectangle')}
                  placement="topRight"
                  title={t('page.perps.sizeTips')}
                  align={{ targetOffset: [0, 0] }}
                >
                  <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                </Tooltip>
              </div>
              <div className="text-13 text-r-neutral-title-1 font-medium">
                {formatUsdValue(Number(tradeAmount))} = {tradeSize} {coin}
              </div>
            </div>
            {autoClose.isOpen && (
              <div className="flex justify-between items-center">
                <div className="text-13 text-r-neutral-body">
                  {t('page.perps.autoClose')}
                </div>
                {AutoCloseInfo}
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
                        {t('page.perps.rabbyFeeTips')}
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

      {/* Leverage Selection Popup */}
      <LeverageSelectionPopup
        visible={leveragePopupVisible}
        currentLeverage={leverage}
        leverageRange={leverageRang}
        onCancel={() => setLeveragePopupVisible(false)}
        onConfirm={handleLeverageConfirm}
      />

      <AutoClosePositionPopup
        visible={autoCloseVisible}
        coin={coin}
        type="openPosition"
        price={markPrice}
        liqPrice={Number(estimatedLiquidationPrice)}
        direction={direction}
        size={Number(tradeSize)}
        pxDecimals={szDecimals}
        onClose={() => setAutoCloseVisible(false)}
        handleSetAutoClose={async (params: {
          tpPrice: string;
          slPrice: string;
        }) => {
          setAutoClose({
            isOpen: true,
            tpTriggerPx: params.tpPrice,
            slTriggerPx: params.slPrice,
          });
        }}
      />
    </>
  );
};

export default PerpsOpenPositionPopup;
