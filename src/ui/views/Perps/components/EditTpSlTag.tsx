import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { message, Modal, Input } from 'antd';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { ReactComponent as RcIconEdit } from 'ui/assets/perps/icon-edit-cc.svg';
import { ReactComponent as RcIconDelete } from 'ui/assets/perps/icon-tag-clear-cc.svg';
import { ReactComponent as RcIconClose } from 'ui/assets/perps/icon-close-cc.svg';
import clsx from 'clsx';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useMemoizedFn } from 'ahooks';
import { formatTpOrSlPrice } from '../utils';

const StyledModal = styled(Modal)`
  .ant-modal-content {
    background-color: var(--r-neutral-card1, #fff);
    border-radius: 24px;
    padding: 0;
  }
  .ant-modal-body {
    padding: 36px 20px;
  }
  .ant-modal-close {
    top: 20px;
    right: 20px;
  }
  .ant-modal-close-x {
    width: 20px;
    height: 20px;
    line-height: 20px;
  }
`;

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
  handleSetAutoClose,
  handleCancelAutoClose,
}) => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [autoClosePrice, setAutoClosePrice] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<any>(null);

  const hasPrice = initTpOrSlPrice && Number(initTpOrSlPrice) > 0;
  const disableEdit = !size || !margin;

  const priceIsEmptyValue = useMemo(() => {
    return !autoClosePrice || !Number(autoClosePrice);
  }, [autoClosePrice]);

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
          'page.perps.PerpsAutoCloseModal.takeProfitTipsLong'
        );
      }
      if (direction === 'Short' && autoCloseValue >= markPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_tp_short';
        resObj.errorMessage = t(
          'page.perps.PerpsAutoCloseModal.takeProfitTipsShort'
        );
      }
    }

    // 验证止损价格
    if (actionType === 'sl') {
      if (direction === 'Long' && autoCloseValue >= markPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_long';
        resObj.errorMessage = t(
          'page.perps.PerpsAutoCloseModal.stopLossTipsLong'
        );
      } else if (direction === 'Long' && autoCloseValue < liqPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_liquidation';
        resObj.errorMessage = t(
          'page.perps.PerpsAutoCloseModal.stopLossTipsLongLiquidation',
          {
            price: `$${splitNumberByStep(liqPrice.toFixed(pxDecimals))}`,
          }
        );
      }
      if (direction === 'Short' && autoCloseValue <= markPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_short';
        resObj.errorMessage = t(
          'page.perps.PerpsAutoCloseModal.stopLossTipsShort'
        );
      } else if (direction === 'Short' && autoCloseValue > liqPrice) {
        resObj.isValid = false;
        resObj.error = 'invalid_sl_liquidation';
        resObj.errorMessage = t(
          'page.perps.PerpsAutoCloseModal.stopLossTipsShortLiquidation',
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

  const isValidPrice = priceValidation.isValid;

  const handleInitGainPct = useMemoizedFn(() => {
    const pct = actionType === 'tp' ? 5.0 : 4.5;
    const pctValue = Number(pct) / 100;
    const costValue = margin;
    const pnlUsdValue = costValue * pctValue;
    const priceDifference = Number((pnlUsdValue / size).toFixed(pxDecimals));

    const costPrice = markPrice;

    if (actionType === 'tp') {
      const newPrice =
        direction === 'Long'
          ? costPrice + priceDifference
          : costPrice - priceDifference;
      const newPriceStr = formatTpOrSlPrice(newPrice, szDecimals);
      setAutoClosePrice(newPriceStr);
    } else {
      const newPrice =
        direction === 'Long'
          ? costPrice - priceDifference
          : costPrice + priceDifference;
      const newPriceStr = formatTpOrSlPrice(newPrice, szDecimals);
      setAutoClosePrice(newPriceStr);
    }
  });

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
  }, [modalVisible, initTpOrSlPrice, type, handleInitGainPct]);

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
            message.error(t('page.perps.PerpsAutoCloseModal.noPosition'));
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
          <RcIconDelete
            className={clsx(
              'w-16 h-16',
              disableEdit ? 'text-r-neutral-body' : 'text-r-neutral-secondary'
            )}
          />
        ) : (
          <RcIconEdit
            className={clsx(
              'w-16 h-16',
              disableEdit ? 'text-r-blue-disable' : 'text-r-blue-default'
            )}
          />
        )}
      </div>

      <StyledModal
        visible={modalVisible}
        onCancel={() => !loading && setModalVisible(false)}
        footer={null}
        width={380}
        centered
        closeIcon={
          <RcIconClose className="w-20 h-20 text-r-neutral-secondary" />
        }
      >
        <div className="flex flex-col items-center">
          {/* Header */}
          <div className="mb-16 text-center">
            <h3 className="text-20 font-black text-r-neutral-title-1 mb-8 leading-[24px]">
              {direction} {coin}-USD
            </h3>
            <p className="text-14 font-medium text-r-neutral-secondary leading-[18px]">
              {type === 'openPosition'
                ? t('page.perpsDetail.PerpsAutoCloseModal.currentPrice', {
                    price: splitNumberByStep(markPrice),
                  })
                : t(
                    'page.perpsDetail.PerpsAutoCloseModal.EntryAndCurrentPrice',
                    {
                      entryPrice: splitNumberByStep(entryPrice || markPrice),
                      currentPrice: splitNumberByStep(markPrice),
                    }
                  )}
            </p>
          </div>

          {/* Body */}
          <div className="w-full">
            <h4 className="text-17 font-bold text-r-neutral-title-1 mb-8 leading-[22px]">
              {actionType === 'tp'
                ? t('page.perpsDetail.PerpsAutoCloseModal.takeProfitWhen')
                : t('page.perpsDetail.PerpsAutoCloseModal.stopLossWhen')}
            </h4>

            <div className="bg-r-neutral-card2 rounded-[12px] p-12 mb-8">
              <div className="text-12 font-medium text-r-neutral-secondary mb-4 leading-[16px]">
                {direction === 'Long'
                  ? actionType === 'tp'
                    ? t('page.perpsDetail.PerpsAutoCloseModal.priceAbove')
                    : t('page.perpsDetail.PerpsAutoCloseModal.priceBelow')
                  : actionType === 'tp'
                  ? t('page.perpsDetail.PerpsAutoCloseModal.priceBelow')
                  : t('page.perpsDetail.PerpsAutoCloseModal.priceAbove')}
              </div>
              <Input
                ref={inputRef}
                type="text"
                value={autoClosePrice}
                onChange={(e) => setAutoClosePrice(e.target.value)}
                placeholder="$0"
                className={clsx(
                  'text-16 font-bold leading-[20px] border-none p-0',
                  priceValidation.error && 'text-r-red-default'
                )}
                style={{
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                }}
              />
            </div>

            {priceValidation.error && (
              <div className="text-14 font-medium text-r-red-default mb-12 leading-[18px]">
                {priceValidation.errorMessage}
              </div>
            )}

            {/* PNL Card */}
            <div className="bg-r-neutral-card2 rounded-[16px] p-16 mt-12">
              <div className="flex justify-between items-center mb-16">
                <span className="text-14 font-medium text-r-neutral-foot leading-[18px]">
                  {gainOrLoss === 'gain'
                    ? t('page.perpsDetail.PerpsAutoCloseModal.youGain')
                    : t('page.perpsDetail.PerpsAutoCloseModal.youLoss')}
                  :
                </span>
                {priceValidation.error || priceIsEmptyValue ? (
                  <span className="text-17 font-extrabold text-r-neutral-info leading-[22px]">
                    -
                  </span>
                ) : (
                  <span
                    className={clsx(
                      'text-17 font-extrabold leading-[22px]',
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
                <span className="text-14 font-medium text-r-neutral-foot leading-[18px]">
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
                      'text-17 font-extrabold leading-[22px]',
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

          {/* Footer */}
          <button
            className={clsx(
              'w-full h-48 mt-20 rounded-[8px] text-16 font-bold',
              'bg-r-blue-default text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              loading && 'opacity-50 cursor-wait'
            )}
            disabled={!isValidPrice || loading}
            onClick={handleConfirm}
          >
            {loading ? t('global.confirming') : t('global.confirm')}
          </button>
        </div>
      </StyledModal>
    </>
  );
};
