import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { message, Modal, Input, Button } from 'antd';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { ReactComponent as RcIconEdit } from 'ui/assets/perps/IconEditCC.svg';
import { ReactComponent as RcIconDelete } from 'ui/assets/perps/IconTagCloseCC.svg';
import { ReactComponent as RcIconClose } from 'ui/assets/perps/icon-close-cc.svg';
import clsx from 'clsx';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useMemoizedFn } from 'ahooks';
import { formatTpOrSlPrice, validatePriceInput } from '../utils';
import { AssetPriceInfo } from './AssetPriceInfo';
import { MarketData } from '@/ui/models/perps';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { useThemeMode } from '@/ui/hooks/usePreference';
interface EditTpSlTagProps {
  coin: string;
  entryPrice?: number;
  markPrice: number;
  initTpOrSlPrice: string;
  direction: 'Long' | 'Short';
  size: number;
  margin: number;
  liqPrice: number;
  pxDecimals: number;
  szDecimals: number;
  actionType: 'tp' | 'sl';
  activeAssetCtx?: WsActiveAssetCtx['ctx'] | null;
  currentAssetCtx?: MarketData;
  type: 'openPosition' | 'hasPosition';
  handleSetAutoClose: (price: string) => Promise<void>;
  handleCancelAutoClose: () => Promise<void>;
}

export const EditTpSlTag: React.FC<EditTpSlTagProps> = ({
  coin,
  entryPrice,
  markPrice,
  initTpOrSlPrice,
  direction,
  size,
  margin,
  liqPrice,
  pxDecimals,
  szDecimals,
  actionType,
  type,
  activeAssetCtx,
  currentAssetCtx,
  handleSetAutoClose,
  handleCancelAutoClose,
}) => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [autoClosePrice, setAutoClosePrice] = React.useState<string>('');
  const { isDarkTheme } = useThemeMode();
  const [inputFocused, setInputFocused] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<any>(null);

  const hasPrice = initTpOrSlPrice && Number(initTpOrSlPrice) > 0;
  const disableEdit = !size || !margin;

  const priceIsEmptyValue = useMemo(() => {
    return !autoClosePrice || !Number(autoClosePrice);
  }, [autoClosePrice]);

  const handlePriceChange = useMemoizedFn((price: string) => {
    let value = price.replace(',', '.');
    if (value.startsWith('$')) {
      value = value.slice(1);
    }
    if (
      (/^\d*\.?\d*$/.test(value) || value === '') &&
      validatePriceInput(value, szDecimals)
    ) {
      setAutoClosePrice(value);
    }
  });

  // Calculate gain percentage from price
  const calculatedPnl = React.useMemo(() => {
    if (!autoClosePrice) {
      return '';
    }
    const costPrice =
      type === 'openPosition' ? markPrice : entryPrice || markPrice;
    const pnlUsdValue =
      direction === 'Long'
        ? (Number(autoClosePrice) - costPrice) * size
        : (costPrice - Number(autoClosePrice)) * size;
    return pnlUsdValue;
  }, [autoClosePrice, markPrice, size, type, direction, entryPrice]);

  const gainOrLoss = useMemo(() => {
    return Number(calculatedPnl) >= 0 ? 'gain' : 'loss';
  }, [calculatedPnl]);

  const gainPct = useMemo(() => {
    return Number(calculatedPnl) / margin;
  }, [calculatedPnl, margin]);

  // 验证价格输入
  const priceValidation = React.useMemo(() => {
    const autoCloseValue = Number(autoClosePrice) || 0;
    const resObj = {
      isValid: true,
      error: '',
      errorMessage: '',
    };

    if (!autoCloseValue) {
      resObj.isValid = false;
      return resObj;
    }

    // 验证止盈价格
    if (actionType === 'tp') {
      if (direction === 'Long' && autoCloseValue <= markPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_tp_long';
        resObj.errorMessage = t(
          'page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsLong'
        );
      }
      if (direction === 'Short' && autoCloseValue >= markPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_tp_short';
        resObj.errorMessage = t(
          'page.perpsDetail.PerpsAutoCloseModal.takeProfitTipsShort'
        );
      }
    }

    // 验证止损价格
    if (actionType === 'sl') {
      if (direction === 'Long' && autoCloseValue >= markPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_long';
        resObj.errorMessage = t(
          'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsLong'
        );
      } else if (direction === 'Long' && autoCloseValue < liqPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_liquidation';
        resObj.errorMessage = t(
          'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsLongLiquidation',
          {
            price: `$${splitNumberByStep(liqPrice.toFixed(pxDecimals))}`,
          }
        );
      }
      if (direction === 'Short' && autoCloseValue <= markPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_short';
        resObj.errorMessage = t(
          'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsShort'
        );
      } else if (direction === 'Short' && autoCloseValue > liqPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_liquidation';
        resObj.errorMessage = t(
          'page.perpsDetail.PerpsAutoCloseModal.stopLossTipsShortLiquidation',
          {
            price: `$${splitNumberByStep(liqPrice.toFixed(pxDecimals))}`,
          }
        );
      }
    }

    return resObj;
  }, [
    autoClosePrice,
    direction,
    markPrice,
    t,
    liqPrice,
    pxDecimals,
    actionType,
  ]);

  const handleInitGainPct = useMemoizedFn(() => {
    // console.log('szDecimals', szDecimals);
    const pct = actionType === 'tp' ? 5.0 : 4.5;
    const pctValue = Number(pct) / 100;
    const costValue = margin;
    const pnlUsdValue = costValue * pctValue;
    const priceDifference = Number((pnlUsdValue / size).toFixed(pxDecimals));

    // make difference to mark price avoid error from hy validator
    const costPrice = markPrice;

    if (actionType === 'tp') {
      const newPrice =
        direction === 'Long'
          ? costPrice + priceDifference
          : costPrice - priceDifference;
      const newPriceStr = formatTpOrSlPrice(newPrice, szDecimals);
      handlePriceChange(newPriceStr);
    } else {
      const newPrice =
        direction === 'Long'
          ? costPrice - priceDifference
          : costPrice + priceDifference;
      const newPriceStr = formatTpOrSlPrice(newPrice, szDecimals);
      handlePriceChange(newPriceStr);
    }
  });

  const isValidPrice = priceValidation.isValid;
  useEffect(() => {
    if (modalVisible) {
      if (initTpOrSlPrice) {
        setAutoClosePrice(initTpOrSlPrice);
      } else {
        if (type === 'openPosition') {
          handleInitGainPct();
        }
      }
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAutoClosePrice('');
    }
  }, [modalVisible, initTpOrSlPrice, type]);

  const handleConfirm = useMemoizedFn(async () => {
    setLoading(true);
    try {
      await handleSetAutoClose(autoClosePrice);
      setModalVisible(false);
    } catch (error: any) {
      console.error('Failed to set auto close:', error);
      message.error(error.message || 'Failed to set auto close');
    } finally {
      setLoading(false);
    }
  });

  return (
    <>
      <div
        className={clsx(
          'inline-flex items-center gap-[5px] px-12 py-4 pr-6 rounded-[100px] cursor-pointer',
          'bg-r-blue-light1',
          disableEdit && 'opacity-50 cursor-not-allowed'
        )}
        onClick={async () => {
          if (hasPrice) {
            await handleCancelAutoClose();
            return;
          }

          if (disableEdit) {
            message.error({
              className: 'toast-message-2025-center',
              content: t('page.perpsDetail.PerpsAutoCloseModal.noPosition'),
            });
            return;
          }
          setModalVisible(true);
        }}
      >
        <span
          className={clsx(
            'text-14 font-bold leading-[18px]',
            disableEdit ? 'text-r-blue-disable' : 'text-r-blue-default'
          )}
        >
          {hasPrice ? `$${splitNumberByStep(initTpOrSlPrice)}` : '-'}
        </span>
        {hasPrice ? (
          <RcIconDelete className={clsx('w-16 h-16', 'text-r-neutral-foot')} />
        ) : (
          <RcIconEdit
            className={clsx(
              'w-16 h-16',
              disableEdit ? 'text-r-blue-disable' : 'text-r-blue-default'
            )}
          />
        )}
      </div>

      <Modal
        visible={modalVisible}
        onCancel={() => !loading && setModalVisible(false)}
        width={352}
        footer={null}
        className={clsx(
          'perps-bridge-swap-modal perps-edit-tp-sl-modal',
          isDarkTheme
            ? 'perps-bridge-swap-modal-dark'
            : 'perps-bridge-swap-modal-light'
        )}
        centered
        bodyStyle={{
          background: 'var(--r-neutral-card-2, #F5F6FA)',
        }}
        destroyOnClose
        closeIcon={
          <RcIconClose className="w-20 h-20 text-r-neutral-secondary" />
        }
      >
        <div className="flex flex-col items-center">
          {/* Header */}
          <div className="mb-20 text-center">
            <div className="text-20 font-medium text-r-neutral-title-1 mb-4">
              {direction} {coin}-USD
            </div>
            <div className={clsx('text-14 text-rb-neutral-secondary')}>
              {type === 'openPosition' ? (
                <AssetPriceInfo
                  coin={coin}
                  activeAssetCtx={activeAssetCtx}
                  currentAssetCtx={currentAssetCtx}
                />
              ) : (
                t('page.perpsDetail.PerpsAutoCloseModal.EntryAndCurrentPrice', {
                  entryPrice: splitNumberByStep(entryPrice || markPrice),
                  currentPrice: splitNumberByStep(markPrice),
                })
              )}
            </div>
          </div>

          <div className="w-full">
            <div className="text-15 font-medium px-4 text-rb-neutral-title-1 mb-8">
              {actionType === 'tp'
                ? direction === 'Long'
                  ? t(
                      'page.perpsDetail.PerpsAutoCloseModal.takeProfitWhenPriceAbove'
                    )
                  : t(
                      'page.perpsDetail.PerpsAutoCloseModal.takeProfitWhenPriceBelow'
                    )
                : direction === 'Long'
                ? t(
                    'page.perpsDetail.PerpsAutoCloseModal.stopLossWhenPriceBelow'
                  )
                : t(
                    'page.perpsDetail.PerpsAutoCloseModal.stopLossWhenPriceAbove'
                  )}
            </div>

            <div
              className={clsx(
                'bg-r-neutral-card1 rounded-[12px] p-12 border  border-transparent border-solid',
                inputFocused && 'border-rabby-blue-default'
              )}
            >
              {/* <div className="text-12 font-medium text-rb-neutral-secondary mb-4">
                {direction === 'Long'
                  ? actionType === 'tp'
                    ? t('page.perpsDetail.PerpsAutoCloseModal.priceAbove')
                    : t('page.perpsDetail.PerpsAutoCloseModal.priceBelow')
                  : actionType === 'tp'
                  ? t('page.perpsDetail.PerpsAutoCloseModal.priceBelow')
                  : t('page.perpsDetail.PerpsAutoCloseModal.priceAbove')}
              </div> */}
              <input
                ref={inputRef}
                type="text"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                value={autoClosePrice ? `$${autoClosePrice}` : ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="$0"
                className={clsx(
                  'text-24 text-rb-neutral-title-1 font-bold bg-transparent border-none p-0 w-full outline-none focus:outline-none',
                  priceValidation.error && 'text-r-red-default'
                )}
                style={{
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                }}
              />
            </div>

            {priceValidation.error && (
              <div
                className="text-14 font-medium text-rb-red-default mt-10"
                style={{ marginBottom: '-10px' }}
              >
                {priceValidation.errorMessage}
              </div>
            )}

            {/* PNL Card */}
            <div className="bg-r-neutral-card1 rounded-[8px] p-16 mt-20 gap-12 flex flex-col">
              <div className="flex justify-between items-center">
                <span className="text-14 font-medium text-r-neutral-body">
                  {gainOrLoss === 'gain'
                    ? t('page.perpsDetail.PerpsAutoCloseModal.youGain')
                    : t('page.perpsDetail.PerpsAutoCloseModal.youLoss')}
                  :
                </span>
                {priceValidation.error || priceIsEmptyValue ? (
                  <span className="text-17 font-bold text-r-neutral-info">
                    -
                  </span>
                ) : (
                  <span
                    className={clsx(
                      'text-17 font-bold',
                      gainOrLoss === 'gain'
                        ? 'text-r-green-default'
                        : 'text-r-red-default'
                    )}
                  >
                    {gainOrLoss === 'gain' ? '+' : '-'}
                    {new BigNumber(Math.abs(Number(gainPct)))
                      .times(100)
                      .toFixed(2)}
                    %
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-14 font-medium text-r-neutral-body">
                  {actionType === 'tp'
                    ? t(
                        'page.perpsDetail.PerpsAutoCloseModal.takeProfitExpectedPNL'
                      )
                    : t(
                        'page.perpsDetail.PerpsAutoCloseModal.stopLossExpectedPNL'
                      )}
                  :
                </span>
                {priceValidation.error || priceIsEmptyValue ? (
                  <span className="text-17 font-extrabold text-r-neutral-info leading-[22px]">
                    -
                  </span>
                ) : (
                  <span
                    className={clsx(
                      'text-17 font-bold',
                      gainOrLoss === 'gain'
                        ? 'text-r-green-default'
                        : 'text-r-red-default'
                    )}
                  >
                    {gainOrLoss === 'gain' ? '+' : '-'}
                    {formatUsdValue(Math.abs(Number(calculatedPnl)))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            block
            size="large"
            type="primary"
            className="h-[48px] mt-16 text-15 font-medium"
            disabled={!isValidPrice || loading}
            loading={loading}
            onClick={handleConfirm}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </Modal>
    </>
  );
};
