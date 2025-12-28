import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbyDispatch } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSetState } from 'react-use';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { DesktopPerpsInput } from '../components/DesktopPerpsInput';
import { DesktopPerpsSlider } from '../components/DesktopPerpsSlider';
import { PerpsPositionCard } from '../components/PerpsPositionCard';
import { usePerpsProPosition } from '../hooks/usePerpsProPosition';

export interface Props {
  visible: boolean;
  onCancel: () => void;
  position: PositionAndOpenOrder['position'];
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

  const [formValues, setFormValues] = useSetState<{
    limitPrice: string;
    percentage: number;
    size: string;
    sizeUsd: string;
  }>({
    limitPrice: '',
    percentage: 0,
    size: '',
    sizeUsd: '',
  });

  const { desc, btnText } = useMemo(() => {
    switch (type) {
      case 'limit':
        return {
          desc: 'This will attempt to close at your chosen limit price.',
          btnText: 'Limit',
        };
      case 'market':
        return {
          desc: 'This will close immediately at the current market price',
          btnText: 'Close position',
        };
      case 'reverse':
        return {
          desc:
            'This will immediately close your position at the current market price and open a position of equal size in the opposite direction.',
          btnText: 'Confirm',
        };
    }
  }, [type, t]);

  // todo valid formValues

  const handleLimitPriceChange = useMemoizedFn((value: string) => {
    setFormValues({ limitPrice: value });
  });

  const handleSizeChange = useMemoizedFn(
    <T extends Exclude<keyof typeof formValues, 'limitPrice'>>({
      key,
      value,
    }: {
      key: T;
      value: typeof formValues[T];
    }) => {
      const price =
        type === 'limit' ? formValues.limitPrice || marketPrice : marketPrice;

      if (key === 'percentage') {
        const size = new BigNumber(position.szi || 0)
          .abs()
          .times(value)
          .div(100);
        setFormValues({
          percentage: +value,
          size: size.toFixed(),
          sizeUsd: size.times(price).toFixed(2),
        });
      } else if (key === 'size') {
        const percentage = new BigNumber(value)
          .div(new BigNumber(position.szi || 0).abs())
          .times(100);

        const sizeUsd = new BigNumber(value).times(price);

        setFormValues({
          size: value as string,
          percentage: percentage.toNumber(),
          sizeUsd: sizeUsd.isNaN() ? '' : sizeUsd.toFixed(2),
        });
      } else if (key === 'sizeUsd') {
        const size = new BigNumber(value).dividedBy(price);
        const percentage = size
          .div(new BigNumber(position.szi || 0).abs())
          .times(100);
        setFormValues({
          sizeUsd: value as string,
          size: size.isNaN() ? '' : size.toFixed(),
          percentage: percentage.toNumber(),
        });
      }
    }
  );

  const receiveAmount = useMemo(() => {
    const size = new BigNumber(formValues.size || 0);
    const price =
      type === 'limit'
        ? new BigNumber(formValues.limitPrice || 0)
        : new BigNumber(marketPrice);
    return size.times(price);
  }, [formValues.size, formValues.limitPrice, marketPrice, type]);

  const closedPnl = useMemo(() => {
    const size = new BigNumber(formValues.size || 0);
    const entryPrice = new BigNumber(position.entryPx || 0);
    const exitPrice =
      type === 'limit'
        ? new BigNumber(formValues.limitPrice || 0)
        : new BigNumber(marketPrice);
    return exitPrice.minus(entryPrice).times(size);
  }, [
    formValues.size,
    formValues.limitPrice,
    marketPrice,
    position.entryPx,
    position.szi,
    type,
  ]);

  const newPosition = useMemo(() => {
    if (type !== 'reverse') {
      return null;
    }
    const szi = new BigNumber(position.szi || 0).times(-1);
    return {
      ...position,
      szi: szi.toFixed(),
    };
  }, [position.szi, formValues.size]);

  const {
    handleCloseWithLimitOrder,
    handleCloseWithMarketOrder,
  } = usePerpsProPosition();

  const { loading, runAsync: runSubmit } = useRequest(
    async () => {
      if (type === 'limit') {
        await handleCloseWithLimitOrder({
          coin: position.coin,
          isBuy: new BigNumber(position.szi || 0).isLessThan(0) ? true : false,
          size: new BigNumber(formValues.size).toFixed(marketData.szDecimals),
          limitPx: new BigNumber(formValues.limitPrice).toFixed(
            marketData.pxDecimals
          ),
        });
      } else if (type === 'market') {
        await handleCloseWithMarketOrder({
          coin: position.coin,
          isBuy: new BigNumber(position.szi || 0).isLessThan(0) ? true : false,
          size: new BigNumber(formValues.size).toFixed(marketData.szDecimals),
          midPx: marketPrice,
        });
      } else if (type === 'reverse') {
        await handleCloseWithMarketOrder({
          coin: position.coin,
          isBuy: new BigNumber(position.szi || 0).isLessThan(0) ? true : false,
          size: new BigNumber(position.szi || 0)
            .times(-2)
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

  return (
    <div className="flex flex-col min-h-[520px] bg-r-neutral-bg2">
      <div className="text-center text-20 font-medium text-r-neutral-title-1 mt-16 mb-2">
        Close Position
      </div>

      <div className="flex-1 px-20 overflow-y-auto pb-24">
        <div className="text-[13px] leading-[16px] font-medium text-rb-neutral-body text-center mb-[16px]">
          {desc}
        </div>
        <section className="mb-[12px]">
          <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
            Current position
          </div>
          <PerpsPositionCard position={position} marketData={marketData} />
        </section>
        {type !== 'reverse' ? (
          <>
            <section className="mb-[12px]">
              <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
                Configure
              </div>
              <div>
                {type === 'limit' ? (
                  <div className="flex items-center gap-[12px] mb-[12px]">
                    <DesktopPerpsInput
                      className="flex-1 text-right"
                      prefix={
                        <span className="text-[13px] leading-[16px] text-r-neutral-foot font-medium">
                          Limit price
                        </span>
                      }
                      value={formValues.limitPrice}
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
                      onClick={() => {
                        handleLimitPriceChange(marketPrice);
                      }}
                    >
                      Mid
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center gap-[12px] mb-[16px]">
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
                </div>
              </div>
            </section>
            <section className="space-y-[8px]">
              <div className="flex items-center justify-between">
                <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                  Receive:
                </div>
                <div className={clsx('font-medium text-[12px] leading-[14px]')}>
                  +$
                  {splitNumberByStep(receiveAmount.toFixed(2))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                  Closed PNL:
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
                New position
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
                  Liq. Price: :
                </div>
                <div className={clsx('font-medium text-[12px] leading-[14px]')}>
                  // todo
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                  Liq. Distance:
                </div>
                <div className={clsx('font-medium text-[12px] leading-[14px]')}>
                  // todo
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
