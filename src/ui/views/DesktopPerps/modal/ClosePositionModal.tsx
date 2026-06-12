import { MarketData } from '@/ui/models/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { DesktopPerpsInput } from '../components/DesktopPerpsInput';
import { PerpsPositionCard } from '../components/PerpsPositionCard';
import { usePerpsProPosition } from '../hooks/usePerpsProPosition';
import { PositionFormatData } from '../components/UserInfoHistory/PositionsInfo';
import { formatTpOrSlPrice, validatePriceInput } from '../../Perps/utils';
import { PositionSizeInputAndSlider } from '../components/TradingPanel/components/PositionSizeInputAndSlider';
import { PositionSize } from '../types';
import stats from '@/stats';
import { formatPerpsCoin, getStatsReportSide } from '../utils';
import { PerpsDisplayCoinName } from '../../Perps/components/PerpsDisplayCoinName';
import { ReactComponent as RcIconReverseArrowDown } from '@/ui/assets/perps/icon-reverse-arrow-down.svg';

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

  const currentPerpsAccount = useRabbySelector(
    (store) => store.perps.currentPerpsAccount
  );
  const sizeDisplayUnit = useRabbySelector(
    (store) => store.perps.sizeDisplayUnit
  );
  const marketPrice = marketData.markPx;
  const szDecimals = marketData.szDecimals;
  const [positionSize, setPositionSize] = React.useState<PositionSize>({
    amount: '',
    notionalValue: '',
  });
  const [percentage, setPercentage] = React.useState(0);
  const [limitPrice, setLimitPrice] = React.useState(
    formatTpOrSlPrice(Number(marketData.midPx || 0), szDecimals)
  );

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
    if (type === 'limit') {
      const pnl = new BigNumber(limitPrice || 0)
        .minus(new BigNumber(position.entryPx || 0))
        .times(position.size)
        .toFixed(2);
      return new BigNumber(position.marginUsed || 0).plus(pnl);
    }

    const marginUsed = new BigNumber(position.marginUsed || 0);
    const percentageValue = new BigNumber(percentage || 0);
    return marginUsed.times(percentageValue).div(100);
  }, [
    position.marginUsed,
    percentage,
    limitPrice,
    position.entryPx,
    position.size,
    position.leverage,
  ]);

  const closedPnl = useMemo(() => {
    const size = new BigNumber(positionSize.amount || 0);
    const entryPrice = new BigNumber(position.entryPx || 0);
    const exitPrice =
      type === 'limit'
        ? new BigNumber(limitPrice || 0)
        : new BigNumber(marketPrice);
    const isLong = position.direction === 'Long';
    return isLong
      ? exitPrice.minus(entryPrice).times(size)
      : entryPrice.minus(exitPrice).times(size);
  }, [
    positionSize.amount,
    limitPrice,
    marketPrice,
    position.direction,
    position.entryPx,
    position.size,
    type,
  ]);

  const {
    handleOpenLimitOrder,
    handleCloseWithMarketOrder,
  } = usePerpsProPosition();

  const { loading, runAsync: runSubmit } = useRequest(
    async () => {
      const isBuy = position.direction === 'Short';
      const size = new BigNumber(positionSize.amount).toFixed(
        marketData.szDecimals
      );
      if (type === 'limit') {
        const price = new BigNumber(limitPrice).toFixed(marketData.pxDecimals);
        await handleOpenLimitOrder({
          coin: position.coin,
          dex: marketData.dexId ?? '',
          isBuy,
          size,
          limitPx: price,
          reduceOnly: true,
        });
        stats.report('perpsTradeHistory', {
          created_at: new Date().getTime(),
          user_addr: currentPerpsAccount?.address || '',
          trade_type: 'close limit',
          leverage: position.leverage.toString(),
          trade_side: getStatsReportSide(isBuy, true),
          margin_mode: position.type === 'cross' ? 'cross' : 'isolated',
          coin: position.coin,
          size,
          price,
          trade_usd_value: new BigNumber(price).times(size).toFixed(2),
          service_provider: 'hyperliquid',
          app_version: process.env.release || '0',
          address_type: currentPerpsAccount?.type || '',
        });
      } else if (type === 'market') {
        const res = await handleCloseWithMarketOrder({
          coin: position.coin,
          dex: marketData.dexId ?? '',
          isBuy,
          size: new BigNumber(positionSize.amount).toFixed(
            marketData.szDecimals
          ),
          midPx: marketPrice,
          reduceOnly: true,
        });
        if (res) {
          const { totalSz, avgPx } = res;
          stats.report('perpsTradeHistory', {
            created_at: new Date().getTime(),
            user_addr: currentPerpsAccount?.address || '',
            trade_type: 'close market',
            leverage: position.leverage.toString(),
            trade_side: getStatsReportSide(isBuy, true),
            margin_mode: position.type === 'cross' ? 'cross' : 'isolated',
            coin: position.coin,
            size: totalSz,
            price: avgPx,
            trade_usd_value: new BigNumber(avgPx).times(totalSz).toFixed(2),
            service_provider: 'hyperliquid',
            app_version: process.env.release || '0',
            address_type: currentPerpsAccount?.type || '',
          });
        }
      } else if (type === 'reverse') {
        const res = await handleCloseWithMarketOrder({
          coin: position.coin,
          dex: marketData.dexId ?? '',
          isBuy,
          size: new BigNumber(position.size || 0)
            .times(2)
            .toFixed(marketData.szDecimals),
          midPx: marketPrice,
          reduceOnly: false,
        });
        if (res) {
          const { totalSz, avgPx } = res;
          stats.report('perpsTradeHistory', {
            created_at: new Date().getTime(),
            user_addr: currentPerpsAccount?.address || '',
            trade_type: 'reverse market',
            leverage: position.leverage.toString(),
            trade_side: getStatsReportSide(isBuy, false),
            margin_mode: position.type === 'cross' ? 'cross' : 'isolated',
            coin: position.coin,
            size: totalSz,
            price: avgPx,
            trade_usd_value: new BigNumber(avgPx).times(totalSz).toFixed(2),
            service_provider: 'hyperliquid',
            app_version: process.env.release || '0',
            address_type: currentPerpsAccount?.type || '',
          });
        }
      }
    },
    {
      manual: true,
      onSuccess: () => {
        // ClearinghouseState is refreshed inside the handlers (single-dex path).
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

  const validation = React.useMemo(() => {
    if (type === 'reverse') {
      return {
        isValid: true,
        error: '',
      };
    }
    let error: string = '';
    const notionalNum = Number(positionSize.notionalValue) || 0;
    const tradeSize = Number(positionSize.amount) || 0;

    if (notionalNum === 0) {
      return {
        isValid: false,
        error: '',
      };
    }

    // // Check minimum order size ($10)
    // if (notionalNum < 10) {
    //   error = t('page.perpsPro.tradingPanel.minimumOrderSize');
    //   return { isValid: false, error };
    // }

    const maxTradeSize = Number(position.size) || 0;
    if (maxTradeSize && tradeSize > maxTradeSize) {
      error = t('page.perpsPro.tradingPanel.insufficientBalance');
      return { isValid: false, error };
    }

    return {
      isValid: error === '',
      error,
    };
  }, [
    type,
    positionSize.notionalValue,
    limitPrice,
    position.size,
    positionSize.amount,
    marketData.maxUsdValueSize,
    t,
  ]);

  useEffect(() => {
    handleMidClick();
  }, []);

  const baseAsset = formatPerpsCoin(position.coin);
  const quoteAsset = marketData.quoteAsset || 'USDC';
  const reverseDexTag = useMemo(() => {
    const marketName = marketData.name || '';
    if (!marketName.includes(':')) return '';

    return marketName.split(':')[0]?.toUpperCase() || '';
  }, [marketData.name]);

  const reverseMarginModeLabel =
    position.type === 'cross' ? 'Cross' : 'Isolated';

  const formattedPositionSize = useMemo(() => {
    if (sizeDisplayUnit === 'usd') {
      return `${splitNumberByStep(
        new BigNumber(position.size || 0).times(marketPrice || 0).toFixed(2)
      )} ${quoteAsset}`;
    }

    return `${splitNumberByStep(position.size || 0)} ${baseAsset}`;
  }, [baseAsset, marketPrice, position.size, quoteAsset, sizeDisplayUnit]);

  const reverseOrderSize = useMemo(
    () =>
      new BigNumber(position.size || 0).times(2).toFixed(marketData.szDecimals),
    [marketData.szDecimals, position.size]
  );

  const reverseActionDisplay = useMemo(() => {
    if (sizeDisplayUnit === 'usd') {
      return {
        size: new BigNumber(reverseOrderSize || 0)
          .times(marketPrice || 0)
          .toFixed(2),
        coin: quoteAsset,
      };
    }

    return {
      size: reverseOrderSize,
      coin: baseAsset,
    };
  }, [baseAsset, marketPrice, quoteAsset, reverseOrderSize, sizeDisplayUnit]);

  const reverseActionSide =
    position.direction === 'Long'
      ? t('page.perpsPro.userInfo.positionInfo.sell')
      : t('page.perpsPro.userInfo.positionInfo.buy');

  const reverseDirection =
    position.direction === 'Long' ? ('Short' as const) : ('Long' as const);

  const renderReverseTag = (
    children: React.ReactNode,
    variant: 'brand' | 'neutral' | 'long' | 'short'
  ) => {
    return (
      <span
        className={clsx(
          'flex h-[16px] shrink-0 items-center rounded-[4px] px-[4px] text-[10px] leading-[16px] font-medium',
          variant === 'brand' && 'bg-rb-brand-light-2 text-rb-brand-default',
          variant === 'neutral' && 'bg-rb-neutral-bg-4 text-rb-neutral-foot',
          variant === 'long' && 'bg-rb-green-light-2 text-rb-green-default',
          variant === 'short' && 'bg-rb-red-light-2 text-rb-red-default'
        )}
      >
        {children}
      </span>
    );
  };

  const renderReverseMarketName = () => {
    return (
      <PerpsDisplayCoinName
        item={marketData}
        separator="-"
        className="text-[16px] leading-[20px]"
        baseClassName="font-medium text-r-neutral-title-1"
        quoteClassName="font-normal text-r-neutral-title-1"
      />
    );
  };

  const renderReversePositionCard = (direction: 'Long' | 'Short') => {
    const isLong = direction === 'Long';
    return (
      <div className="rounded-[6px] border border-solid border-rb-neutral-line p-[12px]">
        <div className="mb-[18px] flex h-[20px] items-center gap-[4px]">
          {renderReverseMarketName()}
          {renderReverseTag(reverseMarginModeLabel, 'neutral')}
          {renderReverseTag(
            `${direction.toLowerCase()} ${position.leverage}x`,
            isLong ? 'long' : 'short'
          )}
        </div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-[3px]">
            <span className="text-[12px] leading-[14px] text-rb-neutral-secondary">
              {t('page.perpsPro.userInfo.positionInfo.positionSize')}
            </span>
            <span className="text-[12px] leading-[16px] font-semibold text-r-neutral-title-1">
              {formattedPositionSize}
            </span>
          </div>
          <div className="flex flex-col items-end gap-[3px]">
            <span className="text-[12px] leading-[14px] text-rb-neutral-secondary">
              {t('page.perpsPro.userInfo.positionInfo.orderPrice')}
            </span>
            <span className="text-[12px] leading-[16px] font-semibold text-r-neutral-title-1">
              {t('page.perpsPro.userInfo.positionInfo.marketPrice')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (type === 'reverse') {
    return (
      <div className="flex min-h-[540px] flex-col bg-rb-neutral-bg-1">
        <div className="relative flex h-[56px] flex-shrink-0 items-center justify-center px-[56px] text-center text-20 font-medium text-r-neutral-title-1">
          {t('page.perpsPro.userInfo.positionInfo.reversePosition')}
        </div>

        <div className="flex-1 px-[20px] overflow-y-auto pb-24">
          <section className="flex items-center justify-between pt-[10px]">
            <div className="flex flex-col gap-[3px]">
              {renderReverseMarketName()}
              <div className="flex items-center gap-[3px]">
                {reverseDexTag
                  ? renderReverseTag(reverseDexTag, 'brand')
                  : null}
                {renderReverseTag(
                  position.direction === 'Long'
                    ? t('page.perpsPro.userInfo.positionInfo.buyToSell')
                    : t('page.perpsPro.userInfo.positionInfo.sellToBuy'),
                  'neutral'
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-[3px] text-[12px] font-medium">
              <span className="leading-[20px] text-rb-neutral-secondary">
                {t('page.perpsPro.editMargin.currentPrice')}
              </span>
              <span className="text-r-neutral-title-1">
                {splitNumberByStep(
                  Number(marketPrice || 0).toFixed(marketData.pxDecimals || 2)
                )}
              </span>
            </div>
          </section>

          <section className="mt-[24px] flex flex-col gap-[12px]">
            {renderReversePositionCard(position.direction)}

            <div className="flex items-center gap-[3px]">
              <div className="h-0 flex-1 border-t border-solid border-rb-neutral-line" />
              <div className="flex items-center gap-[4px] rounded-[3px] bg-rb-neutral-bg-4 px-[12px] py-[3px] text-[12px] leading-[16px] text-rb-neutral-foot">
                <RcIconReverseArrowDown className="h-[16px] w-[16px]" />
                {t('page.perpsPro.userInfo.positionInfo.reverseAction', {
                  side: reverseActionSide,
                  size: splitNumberByStep(reverseActionDisplay.size),
                  coin: reverseActionDisplay.coin,
                })}
              </div>
              <div className="h-0 flex-1 border-t border-solid border-rb-neutral-line" />
            </div>

            {renderReversePositionCard(reverseDirection)}
          </section>
        </div>

        <div className="bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-rb-neutral-bg-1">
          <Button
            block
            size="large"
            type="primary"
            className="h-[48px] text-15 font-medium rounded-[6px]"
            loading={loading}
            disabled={!validation.isValid}
            onClick={runSubmit}
          >
            {btnText}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[520px] bg-r-neutral-bg2">
      <div className="text-center text-20 font-medium text-r-neutral-title-1 mt-16 mb-12">
        {t('page.perpsPro.userInfo.positionInfo.closePosition')}
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
                    'text-center text-[13px] leading-[16px] font-medium text-rb-neutral-title-1 hover:border-rb-brand-default border border-solid border-transparent'
                  )}
                  onClick={handleMidClick}
                >
                  {t('page.perpsPro.userInfo.positionInfo.mid')}
                </div>
              </div>
            ) : null}
            <div className="space-y-[16px]">
              <PositionSizeInputAndSlider
                defaultMax={true}
                price={type === 'limit' ? limitPrice : marketPrice}
                maxTradeSize={position.size}
                positionSize={positionSize}
                setPositionSize={setPositionSize}
                percentage={percentage}
                setPercentage={setPercentage}
                baseAsset={position.coin}
                quoteAsset="USD"
                szDecimals={marketData.szDecimals}
                priceChangeUsdValue={true}
                pinToAmount={true}
              />
            </div>
          </div>
        </section>
        <section className="space-y-[8px]">
          {(type === 'market' || type === 'limit') && (
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                {t('page.perpsPro.userInfo.positionInfo.receive')}
              </div>
              {validation.isValid ? (
                <div
                  className={clsx(
                    'font-medium text-r-neutral-title-1 text-[12px] leading-[14px]'
                  )}
                >
                  {formatUsdValue(receiveAmount.toNumber())}
                </div>
              ) : (
                <div
                  className={clsx(
                    'font-medium text-r-neutral-title-1  text-[12px] leading-[14px]'
                  )}
                >
                  -
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
              {t('page.perpsPro.userInfo.positionInfo.closedPnl')}
            </div>
            {validation.isValid ? (
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
            ) : (
              <div
                className={clsx(
                  'font-medium text-r-neutral-title-1 text-[12px] leading-[14px]'
                )}
              >
                -
              </div>
            )}
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
          {/* <Tooltip
            title={validation.error}
            placement="top"
            overlayClassName={clsx('rectangle')}
          > */}
          <Button
            block
            size="large"
            type="primary"
            className="h-[44px] text-15 font-medium"
            disabled={!validation.isValid}
            loading={loading}
            onClick={runSubmit}
          >
            {validation.error ? validation.error : btnText}
          </Button>
          {/* </Tooltip> */}
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
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      className={clsx(
        'modal-support-darkmode',
        type === 'reverse' && 'desktop-perps-modal-surface'
      )}
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-rb-neutral-body" />
      }
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
