import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { formatUsdValue, sleep, splitNumberByStep } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, message, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { noop } from 'lodash';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { usePerpsPosition } from '../../Perps/hooks/usePerpsPosition';
import { formatTpOrSlPrice, validatePriceInput } from '../../Perps/utils';
import { DesktopPerpsInput } from '../components/DesktopPerpsInput';
import { PerpsPositionCard } from '../components/PerpsPositionCard';
import { PositionFormatData } from '../components/UserInfoHistory/PositionsInfo';
import { usePerpsProPosition } from '../hooks/usePerpsProPosition';
import perpsToast from '../components/PerpsToast';

export interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm?: () => void;

  position: PositionFormatData;
  marketData: MarketData;
}

const calculatePnl = ({
  position,
  extPrice,
}: {
  position: PositionFormatData;
  extPrice: number;
}) => {
  const withSize = position.direction === 'Long' ? 1 : -1;
  const pnl =
    (Number(extPrice) - Number(position.entryPx)) *
    Number(position.size) *
    withSize;
  const costValue =
    (Number(position.size) * Number(position.entryPx)) / position.leverage;
  const percent = (pnl / costValue) * 100;
  return { pnl, percent };
};

export const EditTpSlModal: React.FC<Props> = ({
  visible,
  onCancel,
  position,
  marketData,
  onConfirm,
}) => {
  const { t } = useTranslation();

  // todo tp sl from props
  const [tpPrice, setTpPrice] = React.useState<string>('');
  const [slPrice, setSlPrice] = React.useState<string>('');
  const [gainPct, setGainPct] = React.useState<string>('');
  const [lossPct, setLossPct] = React.useState<string>('');
  const resetForm = useMemoizedFn(() => {
    setTpPrice('');
    setSlPrice('');
    setGainPct('');
    setLossPct('');
  });

  const szDecimals = marketData.szDecimals;

  const ensurePriceFormat = useMemoizedFn((price: string) => {
    if (!validatePriceInput(price, szDecimals)) {
      return formatTpOrSlPrice(Number(price), szDecimals);
    } else {
      return price;
    }
  });

  useEffect(() => {
    if (visible) {
      // Initialize with existing prices if available
      const existingTpPrice = position.tpItem?.triggerPx || '';
      const existingSlPrice = position.slItem?.triggerPx || '';

      if (existingTpPrice && Number(existingTpPrice) > 0) {
        handlePriceChange(ensurePriceFormat(existingTpPrice), 'tp');
      }
      if (existingSlPrice && Number(existingSlPrice) > 0) {
        handlePriceChange(ensurePriceFormat(existingSlPrice), 'sl');
      }
    } else {
      resetForm();
    }
  }, [visible]);

  const handlePriceChange = useMemoizedFn(
    (price: string, type: 'tp' | 'sl') => {
      let value = price.replace(',', '.');
      if (value.startsWith('$')) {
        value = value.slice(1);
      }
      if (
        (/^\d*\.?\d*$/.test(value) || value === '') &&
        validatePriceInput(value, szDecimals)
      ) {
        if (type === 'tp') {
          setTpPrice(value);
          if (value && Number(value) > 0) {
            const { pnl, percent } = calculatePnl({
              position,
              extPrice: Number(value),
            });
            // Gain %: positive = profit, negative = loss
            setGainPct(percent ? percent.toFixed(2) : '');
          } else {
            setGainPct('');
          }
        } else {
          setSlPrice(value);
          if (value && Number(value) > 0) {
            const { pnl, percent } = calculatePnl({
              position,
              extPrice: Number(value),
            });
            // Loss %: positive = loss, negative = profit (invert the sign)
            setLossPct(percent ? (-percent).toFixed(2) : '');
          } else {
            setLossPct('');
          }
        }
      }
    }
  );

  const handlePercentChange = useMemoizedFn(
    (percent: string, type: 'tp' | 'sl') => {
      // Allow numbers, decimal point, and negative sign
      if (/^-?\d*\.?\d*$/.test(percent) || percent === '' || percent === '-') {
        if (type === 'tp') {
          setGainPct(percent);
        } else {
          setLossPct(percent);
        }

        // Calculate price from percentage
        if (percent && percent !== '-' && Number(percent) !== 0) {
          let pctValue = Number(percent) / 100;

          // For Loss %: positive means loss, negative means profit
          // So we need to invert the sign for calculation
          if (type === 'sl') {
            pctValue = -pctValue;
          }

          const costValue =
            (Number(position.size) * Number(position.entryPx)) /
            position.leverage;
          const pnlUsdValue = costValue * pctValue;
          const size = Number(position.size);
          const priceDifference = pnlUsdValue / size;
          const entryPrice = Number(position.entryPx);

          let newPrice: number;
          // Calculate based on the actual pnl direction
          if (position.direction === 'Long') {
            // Long: higher price = profit, lower price = loss
            newPrice = entryPrice + priceDifference;
          } else {
            // Short: lower price = profit, higher price = loss
            newPrice = entryPrice - priceDifference;
          }

          const newPriceStr = formatTpOrSlPrice(newPrice, szDecimals);
          if (type === 'tp') {
            setTpPrice(newPriceStr);
          } else {
            setSlPrice(newPriceStr);
          }
        } else {
          // Clear price if percent is empty or just '-'
          if (type === 'tp') {
            setTpPrice('');
          } else {
            setSlPrice('');
          }
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

  // Validate TP price
  const tpValidation = useMemo(() => {
    const resObj = {
      isValid: true,
      error: '',
      errorMessage: '',
    };

    if (!tpPrice || Number(tpPrice) === 0) {
      return resObj;
    }

    const tpValue = Number(tpPrice);
    const markPrice = Number(position.markPx);

    if (position.direction === 'Long' && tpValue <= markPrice) {
      resObj.isValid = false;
      resObj.error = 'invalid_tp_long';
      resObj.errorMessage = t(
        'page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsLong'
      );
    }
    if (position.direction === 'Short' && tpValue >= markPrice) {
      resObj.isValid = false;
      resObj.error = 'invalid_tp_short';
      resObj.errorMessage = t(
        'page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsShort'
      );
    }

    return resObj;
  }, [tpPrice, position, t]);

  // Validate SL price
  const slValidation = useMemo(() => {
    const resObj = {
      isValid: true,
      error: '',
      errorMessage: '',
    };

    if (!slPrice || Number(slPrice) === 0) {
      return resObj;
    }

    const slValue = Number(slPrice);
    const markPrice = Number(position.markPx);

    if (position.direction === 'Long' && slValue >= markPrice) {
      resObj.isValid = false;
      resObj.error = 'invalid_sl_long';
      resObj.errorMessage = t(
        'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsLong'
      );
    }

    if (position.direction === 'Short' && slValue <= markPrice) {
      resObj.isValid = false;
      resObj.error = 'invalid_sl_short';
      resObj.errorMessage = t(
        'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsShort'
      );
    }

    return resObj;
  }, [slPrice, position, t]);

  const canSubmit = useMemo(() => {
    // At least one price should be set
    if (!tpPrice && !slPrice) {
      return false;
    }
    // If TP is set, it must be valid
    if (tpPrice && !tpValidation.isValid) {
      return false;
    }
    // If SL is set, it must be valid
    if (slPrice && !slValidation.isValid) {
      return false;
    }
    return true;
  }, [tpPrice, slPrice, tpValidation.isValid, slValidation.isValid]);

  const {
    handleSetAutoClose,
    handleModifyTpSlOrders,
    handleCancelOrder,
  } = usePerpsProPosition();

  const { loading, runAsync: runSubmit } = useRequest(
    async () => {
      const direction = position.direction;
      if (position.tpItem && position.slItem) {
        // both have tp and sl
        await handleModifyTpSlOrders({
          coin: position.coin,
          direction,
          tp: {
            triggerPx: Number(tpPrice).toString(),
            oid: position.tpItem.oid,
          },
          sl: {
            triggerPx: Number(slPrice).toString(),
            oid: position.slItem.oid,
          },
        });
        perpsToast.success({
          title: t('page.perps.toast.setAutoCloseSuccess'),
        });
      } else if (!position.tpItem && !position.slItem) {
        // both not have tp and sl
        await handleSetAutoClose({
          coin: position.coin,
          tpTriggerPx: new BigNumber(tpPrice).isNaN() ? '' : tpPrice,
          slTriggerPx: new BigNumber(slPrice).isNaN() ? '' : slPrice,
          direction,
        });
      } else {
        // only have tp
        if (position.tpItem) {
          await handleModifyTpSlOrders({
            coin: position.coin,
            direction,
            tp: {
              triggerPx: Number(tpPrice).toString(),
              oid: position.tpItem.oid,
            },
          });
          if (!new BigNumber(slPrice).isNaN()) {
            await sleep(10);
            await handleSetAutoClose({
              coin: position.coin,
              tpTriggerPx: '',
              slTriggerPx: slPrice,
              direction,
            });
          }
        } else if (position.slItem) {
          // only have sl
          await handleModifyTpSlOrders({
            coin: position.coin,
            direction,
            sl: {
              triggerPx: Number(slPrice).toString(),
              oid: position.slItem.oid,
            },
          });
          if (!new BigNumber(tpPrice).isNaN()) {
            await sleep(10);
            await handleSetAutoClose({
              coin: position.coin,
              tpTriggerPx: tpPrice,
              slTriggerPx: '',
              direction,
            });
          }
        }
      }
    },
    {
      manual: true,
      onSuccess: () => {
        onConfirm?.();
      },
    }
  );

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
          {t('page.perpsPro.editTpSl.title')}
        </div>

        <div className="flex-1 px-20 overflow-y-auto pb-24">
          <section className="mb-[12px] mt-4">
            <div className="text-[12px] leading-[16px] text-rb-neutral-foot font-medium flex items-center justify-center">
              <span>{t('page.perpsPro.editTpSl.entryPrice')}</span>
              <span className="text-r-neutral-title-1 ml-4 mr-8">
                ${splitNumberByStep(position.entryPx)}
              </span>
              <span>{t('page.perpsPro.editTpSl.markPrice')}</span>
              <span className="text-r-neutral-title-1 ml-4">
                ${splitNumberByStep(position.markPx)}
              </span>
            </div>
          </section>
          <section className="mb-[12px]">
            <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
              {t('page.perpsPro.editTpSl.currentPosition')}
            </div>
            <PerpsPositionCard position={position} marketData={marketData} />
          </section>

          <section className="mb-[8px]">
            <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
              {t('page.perpsPro.editTpSl.title')}
            </div>
            <div className="space-y-[8px]">
              <div className="flex items-center gap-[8px]">
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      {t('page.perpsPro.editTpSl.tp')}
                    </span>
                  }
                  value={tpPrice}
                  onChange={(e) => {
                    handlePriceChange(e.target.value, 'tp');
                  }}
                  className={clsx(
                    'text-right',
                    tpValidation.error && 'border-r-red-default'
                  )}
                />
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      {t('page.perpsPro.editTpSl.gain')}
                    </span>
                  }
                  className="text-right"
                  value={gainPct}
                  onChange={(e) => {
                    handlePercentChange(e.target.value, 'tp');
                  }}
                  suffix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      %
                    </span>
                  }
                />
              </div>
              {position.tpItem && (
                <div className="flex items-center justify-end">
                  <div
                    className="text-rb-brand-default cursor-pointer bg-rb-brand-light-1 rounded-[4px] text-right px-4 py-2 text-[12px] leading-[14px] flex items-center justify-center"
                    onClick={() => {
                      handleCancelOrder([
                        {
                          coin: position.coin,
                          oid: position.tpItem!.oid,
                        },
                      ]);
                      onCancel();
                    }}
                  >
                    {t('page.perpsPro.editTpSl.cancelTp')}
                  </div>
                </div>
              )}
              {tpValidation.error && (
                <div className="text-[12px] text-r-red-default font-medium">
                  {tpValidation.errorMessage}
                </div>
              )}
              <div className="flex items-center gap-[8px]">
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      {t('page.perpsPro.editTpSl.sl')}
                    </span>
                  }
                  value={slPrice}
                  onChange={(e) => {
                    handlePriceChange(e.target.value, 'sl');
                  }}
                  className={clsx(
                    'text-right',
                    slValidation.error && 'border-r-red-default'
                  )}
                />
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      {t('page.perpsPro.editTpSl.loss')}
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
                    handlePercentChange(e.target.value, 'sl');
                  }}
                />
              </div>
              {position.slItem && (
                <div className="flex items-center justify-end">
                  <div
                    className="text-rb-brand-default cursor-pointer bg-rb-brand-light-1 rounded-[4px] text-right px-4 py-2 text-[12px] leading-[14px] flex items-center justify-center"
                    onClick={() => {
                      handleCancelOrder([
                        {
                          coin: position.coin,
                          oid: position.slItem!.oid,
                        },
                      ]);
                      onCancel();
                    }}
                  >
                    {t('page.perpsPro.editTpSl.cancelSl')}
                  </div>
                </div>
              )}
              {slValidation.error && (
                <div className="text-[12px] text-r-red-default font-medium">
                  {slValidation.errorMessage}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-[8px]">
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                {t('page.perpsPro.editTpSl.takeProfitExpectedPnl')}
              </div>
              <div
                className={clsx(
                  'font-medium text-[12px] leading-[14px]',
                  tpPnl && Number(tpPnl) < 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {tpPnl
                  ? `${Number(tpPnl) >= 0 ? '+' : ''}${formatUsdValue(
                      Number(tpPnl)
                    )}`
                  : '-'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                {t('page.perpsPro.editTpSl.stopLossExpectedPnl')}
              </div>
              <div
                className={clsx(
                  'font-medium text-[12px] leading-[14px]',
                  slPnl && Number(slPnl) < 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {slPnl
                  ? `${Number(slPnl) >= 0 ? '+' : ''}${formatUsdValue(
                      Number(slPnl)
                    )}`
                  : '-'}
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
              loading={loading}
              disabled={!canSubmit || loading}
              onClick={async () => {
                await runSubmit();
              }}
            >
              {t('global.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
