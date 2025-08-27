import React from 'react';
import { Button, message, Switch } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { useMemoizedFn } from 'ahooks';

interface AutoClosePositionPopupProps extends Omit<PopupProps, 'onCancel'> {
  coin: string;
  price: number;
  direction: 'Long' | 'Short';
  size: number;
  liqPrice: number;
  pxDecimals: number;
  onClose: () => void;
  type: 'openPosition' | 'hasPosition';
  handleSetAutoClose: (params: {
    tpPrice: string;
    slPrice: string;
  }) => Promise<void>;
}

export const AutoClosePositionPopup: React.FC<AutoClosePositionPopupProps> = ({
  visible,
  coin,
  price,
  direction,
  size,
  liqPrice,
  pxDecimals,
  onClose,
  type,
  handleSetAutoClose,
  ...rest
}) => {
  const { t } = useTranslation();
  const [tpPrice, setTpPrice] = React.useState<string>('');
  const [slPrice, setSlPrice] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const { tpProfit, slLoss } = React.useMemo(() => {
    const tp = Number(tpPrice) - price;
    const sl = Number(slPrice) - price;

    const tpProfitValue = direction === 'Long' ? tp * size : -tp * size;
    const slLossValue = direction === 'Long' ? sl * size : -sl * size;

    return {
      tpProfit: tpPrice ? tpProfitValue : 0,
      slLoss: slPrice ? slLossValue : 0,
    };
  }, [tpPrice, slPrice, price, direction, size]);

  // 验证价格输入
  const priceValidation = React.useMemo(() => {
    const tpValue = Number(tpPrice) || 0;
    const slValue = Number(slPrice) || 0;
    const resObj = {
      tp: {
        isValid: true,
        errorMessage: '',
        error: '',
      },
      sl: {
        isValid: true,
        error: '',
        errorMessage: '',
      },
    } as Record<
      string,
      {
        isValid: boolean;
        error: string;
        errorMessage: string;
        isWarning?: boolean;
      }
    >;

    if (!tpPrice && !slPrice) {
      resObj.tp.isValid = false;
      resObj.sl.isValid = false;
      return resObj;
    }

    // 验证止盈价格
    if (tpPrice) {
      if (direction === 'Long' && tpValue <= price) {
        resObj.tp.isValid = false;
        resObj.tp.error = 'invalid_tp_long';
        resObj.tp.errorMessage = t('page.perps.takeProfitTipsLong');
      }
      if (direction === 'Short' && tpValue >= price) {
        resObj.tp.isValid = false;
        resObj.tp.error = 'invalid_tp_short';
        resObj.tp.errorMessage = t('page.perps.takeProfitTipsShort');
      }
    }

    // 验证止损价格
    if (slPrice) {
      if (direction === 'Long' && slValue >= price) {
        resObj.sl.isValid = false;
        resObj.sl.error = 'invalid_sl_long';
        resObj.sl.errorMessage = t('page.perps.stopLossTipsLong');
      } else if (direction === 'Long' && slValue < liqPrice) {
        // warning
        resObj.sl.isValid = true;
        resObj.sl.isWarning = true;
        resObj.sl.error = '';
        resObj.sl.errorMessage = t('page.perps.stopLossTipsLongLiquidation', {
          price: `$${liqPrice}`,
        });
      }
      if (direction === 'Short' && slValue <= price) {
        resObj.sl.isValid = false;
        resObj.sl.error = 'invalid_sl_short';
        resObj.sl.errorMessage = t('page.perps.stopLossTipsShort');
      } else if (direction === 'Short' && slValue > liqPrice) {
        // warning
        resObj.sl.isValid = true;
        resObj.sl.isWarning = true;
        resObj.sl.error = '';
        resObj.sl.errorMessage = t('page.perps.stopLossTipsShortLiquidation', {
          price: `$${liqPrice}`,
        });
      }
    }

    return resObj;
  }, [tpPrice, slPrice, price, direction, liqPrice]);

  React.useEffect(() => {
    if (!visible) {
      setTpPrice('');
      setSlPrice('');
    }
  }, [visible]);

  const isValidPrice = priceValidation.tp.isValid && priceValidation.sl.isValid;

  // 获取错误状态下的文字颜色
  const getMarginTextColor = (type: 'tp' | 'sl') => {
    if (priceValidation[type].error) {
      return 'text-r-red-default';
    }
    if (priceValidation[type].isWarning) {
      return 'text-r-orange-default';
    }
    return 'text-r-neutral-title-1';
  };

  const handleConfirm = useMemoizedFn(async () => {
    setLoading(true);
    try {
      await handleSetAutoClose({
        tpPrice,
        slPrice,
      });
      onClose();
    } catch (error) {
      console.error('Failed to set auto close:', error);
      message.error(error.message || 'Failed to set auto close');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Popup
      placement="bottom"
      height={540}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onClose={onClose}
      {...rest}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-20">
          {direction} {coin}-USD
        </div>
        {type === 'openPosition' ? (
          <div className="text-15 text-r-neutral-title-1 text-center mt-16 mb-16">
            {coin}-USD {t('page.perps.price')}: ${price}
          </div>
        ) : (
          <div className="text-15 text-r-neutral-title-1 text-center mt-16 mb-16">
            {t('page.perps.entryPrice')}: ${price}
          </div>
        )}

        <div className="flex-1 px-20">
          {/* Take Profit */}
          <div className="mb-24 bg-r-neutral-bg1 rounded-[8px] py-20">
            <div className="text-13 text-r-neutral-title-1 text-center">
              {t('page.perps.takeProfitWhen')}
            </div>
            <input
              className={`text-[48px] font-medium bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none ${getMarginTextColor(
                'tp'
              )}`}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
              placeholder="$0"
              value={tpPrice}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*\.?\d*$/.test(value)) {
                  setTpPrice(value);
                }
              }}
            />
            <div className="h-[20px]">
              {priceValidation.tp.error ? (
                <div className="text-13 text-r-red-default text-center">
                  {priceValidation.tp.errorMessage}
                </div>
              ) : (
                tpPrice && (
                  <div className="text-13 text-r-green-default text-center">
                    {t('page.perps.takeProfit')}{' '}
                    {formatUsdValue(Math.abs(tpProfit), BigNumber.ROUND_DOWN)}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Stop Loss */}
          <div className="mb-32 bg-r-neutral-bg1 rounded-[8px] py-20">
            <div className="text-13 text-r-neutral-title-1 text-center">
              {t('page.perps.stopLossWhen')}
            </div>
            <input
              className={`text-[48px] font-medium bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none ${getMarginTextColor(
                'sl'
              )}`}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
              placeholder="$0"
              value={slPrice}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*\.?\d*$/.test(value)) {
                  setSlPrice(value);
                }
              }}
            />
            <div className="h-[20px]">
              {priceValidation.sl.error ? (
                <div className="text-13 text-r-red-default text-center">
                  {priceValidation.sl.errorMessage}
                </div>
              ) : priceValidation.sl.isWarning ? (
                <div className="text-13 text-r-orange-default text-center">
                  {priceValidation.sl.errorMessage}
                </div>
              ) : (
                slPrice && (
                  <div className="text-13 text-r-red-default text-center">
                    {t('page.perps.stopLoss')}{' '}
                    {formatUsdValue(Math.abs(slLoss), BigNumber.ROUND_DOWN)}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
            <Button
              block
              disabled={!isValidPrice}
              size="large"
              type="primary"
              className="h-[48px] text-15 font-medium"
              onClick={handleConfirm}
              loading={loading}
            >
              {t('page.perps.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default AutoClosePositionPopup;
