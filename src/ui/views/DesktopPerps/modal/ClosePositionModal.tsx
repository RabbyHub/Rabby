import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbyDispatch } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { ReactComponent as RcIconAlarmCC } from '@/ui/assets/perps/icon-alarm-cc.svg';
import { useTranslation } from 'react-i18next';
import { useSetState } from 'react-use';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { DesktopPerpsInput } from '../components/DesktopPerpsInput';
import { DesktopPerpsSlider } from '../components/DesktopPerpsSlider';
import { PerpsPositionCard } from '../components/PerpsPositionCard';
import { usePerpsProPosition } from '../hooks/usePerpsProPosition';
import { PositionFormatData } from '../components/UserInfoHistory/PositionsInfo';
import {
  calculateDistanceToLiquidation,
  calLiquidationPrice,
  formatPerpsPct,
  formatTpOrSlPrice,
  validatePriceInput,
} from '../../Perps/utils';
import { PositionSizeInputAndSlider } from '../components/TradingPanel/components/PositionSizeInputAndSlider';
import { PositionSize } from '../types';

export interface Props {
  visible: boolean;
  onCancel: () => void;
  position: PositionFormatData;
  marketData: MarketData;
  type: 'limit' | 'market' | 'reverse';
  onConfirm?: () => void;
}

const ClosePositionModalContent: React.FC<Omit<Props, 'visible'>> = ({
  onCancel,
  position,
  marketData,
  type,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  const marketPrice = marketData.markPx;
  const [positionSize, setPositionSize] = React.useState<PositionSize>({
    amount: '',
    notionalValue: '',
  });
  const [percentage, setPercentage] = React.useState(0);
  const [limitPrice, setLimitPrice] = React.useState('');

  const { desc, btnText } = useMemo(() => {
    switch (type) {
      case 'limit':
        return {
          desc: t('page.perpsPro.userInfo.positionInfo.closePositionTips'),
          btnText: t('page.perpsPro.userInfo.positionInfo.limitClose'),
        };
      case 'market':
        return {
          desc: t(
            'page.perpsPro.userInfo.positionInfo.closePositionMarketTips'
          ),
          btnText: t('page.perpsPro.userInfo.positionInfo.closePosition'),
        };
      case 'reverse':
        return {
          desc: t(
            'page.perpsPro.userInfo.positionInfo.closePositionReverseTips'
          ),
          btnText: t('page.perpsPro.userInfo.positionInfo.confirm'),
        };
    }
  }, [type, t]);

  // todo valid formValues

  const handleLimitPriceChange = useMemoizedFn((value: string) => {
    if (validatePriceInput(value, marketData.szDecimals)) {
      setLimitPrice(value);
    }
  });

  const receiveAmount = useMemo(() => {
    const size = new BigNumber(positionSize.amount || 0);
    const price =
      type === 'limit'
        ? new BigNumber(limitPrice || 0)
        : new BigNumber(marketPrice);
    return size.times(price);
  }, [positionSize.amount, limitPrice, marketPrice, type]);

  const closedPnl = useMemo(() => {
    const size = new BigNumber(positionSize.amount || 0);
    const entryPrice = new BigNumber(position.entryPx || 0);
    const exitPrice =
      type === 'limit'
        ? new BigNumber(limitPrice || 0)
        : new BigNumber(marketPrice);
    return exitPrice.minus(entryPrice).times(size);
  }, [
    positionSize.amount,
    limitPrice,
    marketPrice,
    position.entryPx,
    position.size,
    type,
  ]);

  const newPosition = useMemo(() => {
    if (type !== 'reverse') {
      return null;
    }
    const szi = new BigNumber(position.size || 0).times(-1);
    return {
      ...position,
      szi: szi.toFixed(),
    };
  }, [position.size, positionSize.amount]);

  const {
    handleOpenLimitOrder,
    handleCloseWithMarketOrder,
  } = usePerpsProPosition();

  const { loading, runAsync: runSubmit } = useRequest(
    async () => {
      if (type === 'limit') {
        await handleOpenLimitOrder({
          coin: position.coin,
          isBuy: new BigNumber(position.size || 0).isLessThan(0) ? true : false,
          size: new BigNumber(positionSize.amount).toFixed(
            marketData.szDecimals
          ),
          limitPx: new BigNumber(limitPrice).toFixed(marketData.pxDecimals),
          reduceOnly: true,
        });
      } else if (type === 'market') {
        await handleCloseWithMarketOrder({
          coin: position.coin,
          isBuy: new BigNumber(position.size || 0).isLessThan(0) ? true : false,
          size: new BigNumber(positionSize.amount).toFixed(
            marketData.szDecimals
          ),
          midPx: marketPrice,
          reduceOnly: true,
        });
      } else if (type === 'reverse') {
        await handleCloseWithMarketOrder({
          coin: position.coin,
          isBuy: new BigNumber(position.size || 0).isLessThan(0) ? true : false,
          size: new BigNumber(position.size || 0)
            .times(2)
            .toFixed(marketData.szDecimals),
          midPx: marketPrice,
          reduceOnly: false,
        });
      }
    },
    {
      manual: true,
      onSuccess: () => {
        dispatch.perps.fetchClearinghouseState();
        dispatch.perps.fetchUserHistoricalOrders();
        onConfirm?.();
      },
    }
  );

  const handleMidClick = () => {
    setLimitPrice(
      formatTpOrSlPrice(
        Number(marketData?.midPx || marketData?.markPx || 0),
        marketData.szDecimals
      )
    );
  };

  const reverseEstimatedLiquidationPrice = useMemo(() => {
    const markPrice = Number(marketData.markPx);
    if (!markPrice) return 0;
    const maxLeverage = marketData.maxLeverage;
    return calLiquidationPrice(
      markPrice,
      Number(position.marginUsed),
      position.direction === 'Long' ? 'Short' : 'Long',
      Number(position.size),
      Number(position.size) * markPrice,
      maxLeverage
    ).toFixed(marketData.pxDecimals);
  }, [
    marketData.pxDecimals,
    marketData.markPx,
    position.marginUsed,
    position.size,
    position.direction,
    marketData.maxLeverage,
  ]);

  const liquidationDistance = useMemo(
    () =>
      calculateDistanceToLiquidation(
        reverseEstimatedLiquidationPrice,
        marketData.markPx
      ),
    [reverseEstimatedLiquidationPrice, marketData.markPx]
  );

  return (
    <div className="flex flex-col min-h-[520px] bg-r-neutral-bg2">
      <div className="text-center text-20 font-medium text-r-neutral-title-1 mt-16 mb-12">
        {type === 'reverse'
          ? t('page.perpsPro.userInfo.positionInfo.reversePosition')
          : t('page.perpsPro.userInfo.positionInfo.closePosition')}
      </div>

      <div className="flex-1 px-20 overflow-y-auto pb-24">
        <div className="text-[13px] leading-[16px] font-medium text-rb-neutral-body text-center mb-[16px]">
          {desc}
        </div>
        <section className="mb-[12px]">
          <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
            {t('page.perpsPro.userInfo.positionInfo.currentPosition')}
          </div>
          <PerpsPositionCard position={position} marketData={marketData} />
        </section>
        {type !== 'reverse' ? (
          <>
            <section className="mb-[12px]">
              <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
                {t('page.perpsPro.userInfo.positionInfo.configure')}
              </div>
              <div>
                {type === 'limit' ? (
                  <div className="flex items-center gap-[12px] mb-[12px]">
                    <DesktopPerpsInput
                      className="flex-1 text-right"
                      prefix={
                        <span className="text-[13px] leading-[16px] text-r-neutral-foot font-medium">
                          {t('page.perpsPro.userInfo.positionInfo.limitPrice')}
                        </span>
                      }
                      value={limitPrice}
                      onChange={(e) => {
                        handleLimitPriceChange(e.target.value);
                      }}
                      suffix={
                        <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-title-1">
                          USD
                        </span>
                      }
                    />

                    <div
                      className={clsx(
                        'cursor-pointer w-[88px] py-[12px]',
                        'rounded-[8px] bg-rb-neutral-bg-1',
                        'text-center text-[13px] leading-[16px] font-medium text-rb-neutral-title-1'
                      )}
                      onClick={handleMidClick}
                    >
                      {t('page.perpsPro.userInfo.positionInfo.mid')}
                    </div>
                  </div>
                ) : null}
                {/* <div className="flex items-center gap-[12px] mb-[16px]">
                  <DesktopPerpsInput
                    className="flex-1"
                    value={formValues.size}
                    onChange={(e) => {
                      handleSizeChange({
                        key: 'size',
                        value: e.target.value,
                      });
                    }}
                    suffix={
                      <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                        {position.coin}
                      </span>
                    }
                  />

                  <DesktopPerpsInput
                    className="flex-1"
                    value={formValues.sizeUsd}
                    onChange={(e) => {
                      handleSizeChange({
                        key: 'sizeUsd',
                        value: e.target.value,
                      });
                    }}
                    suffix={
                      <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                        USD
                      </span>
                    }
                  />
                </div>
                <div className="flex items-center gap-[16px]">
                  <DesktopPerpsSlider
                    className="flex-1"
                    min={0}
                    max={100}
                    step={1}
                    marks={{
                      25: '',
                      50: '',
                      75: '',
                      100: '',
                    }}
                    tooltipVisible={false}
                    value={formValues.percentage}
                    onChange={(v) => {
                      handleSizeChange({ key: 'percentage', value: v });
                    }}
                  />
                  <DesktopPerpsInput
                    suffix={
                      <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                        %
                      </span>
                    }
                    type="number"
                    className="w-[60px] p-[8px]"
                    min={0}
                    max={100}
                    value={formValues.percentage}
                    onChange={(e) => {
                      const val = e.target.value;
                      let num = Number(val);
                      if (isNaN(num)) {
                        num = 0;
                      }
                      if (num < 0) {
                        num = 0;
                      }
                      if (num > 100) {
                        num = 100;
                      }
                      handleSizeChange({ key: 'percentage', value: num });
                    }}
                  />
                </div> */}

                <div className="space-y-[16px]">
                  <PositionSizeInputAndSlider
                    price={marketPrice}
                    maxTradeSize={position.size}
                    positionSize={positionSize}
                    setPositionSize={setPositionSize}
                    percentage={percentage}
                    setPercentage={setPercentage}
                    baseAsset={position.coin}
                    quoteAsset="USDC"
                    precision={{
                      amount: marketData.szDecimals,
                      price: marketData.pxDecimals,
                    }}
                  />
                </div>
              </div>
            </section>
            <section className="space-y-[8px]">
              <div className="flex items-center justify-between">
                <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                  {t('page.perpsPro.userInfo.positionInfo.receive')}
                </div>
                <div className={clsx('font-medium text-[12px] leading-[14px]')}>
                  +$
                  {splitNumberByStep(receiveAmount.toFixed(2))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                  {t('page.perpsPro.userInfo.positionInfo.closedPnl')}
                </div>
                <div
                  className={clsx(
                    'font-medium text-[12px] leading-[14px]',
                    closedPnl.isLessThan(0)
                      ? 'text-r-red-default'
                      : 'text-r-green-default'
                  )}
                >
                  {closedPnl.isGreaterThanOrEqualTo(0) ? '+' : '-'}$
                  {splitNumberByStep(closedPnl.abs().toFixed(2))}
                </div>
              </div>
            </section>
          </>
        ) : newPosition ? (
          <>
            <section className="mb-[12px]">
              <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
                {t('page.perpsPro.userInfo.positionInfo.newPosition')}
              </div>
              <PerpsPositionCard
                position={newPosition}
                marketData={marketData}
                isShowPnl={false}
              />
            </section>
            <section className="space-y-[8px]">
              <div className="flex items-center justify-between">
                <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                  {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
                </div>
                <div
                  className={clsx(
                    'font-medium text-rb-neutral-title-1 text-[12px] leading-[14px]'
                  )}
                >
                  ${splitNumberByStep(reverseEstimatedLiquidationPrice)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                  {t('page.perpsDetail.PerpsEditMarginPopup.liqDistance')}
                </div>
                <div
                  className={clsx(
                    'font-medium flex items-center flex-row text-[12px] leading-[14px] gap-4',
                    'text-rb-neutral-title-1'
                  )}
                >
                  <RcIconAlarmCC className="text-rb-neutral-info" />
                  {formatPerpsPct(liquidationDistance)}
                </div>
              </div>
            </section>
          </>
        ) : null}
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
            // todo
            // disabled={!isValidForm}
            loading={loading}
            onClick={runSubmit}
          >
            {btnText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ClosePositionModal: React.FC<Props> = ({
  visible,
  onCancel,
  position,
  marketData,
  type,
  onConfirm,
}) => {
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
      <ClosePositionModalContent
        onCancel={onCancel}
        position={position}
        marketData={marketData}
        type={type}
        onConfirm={onConfirm}
      />
    </Modal>
  );
};
