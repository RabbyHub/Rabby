import React from 'react';
import { message, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { MarginMode, OrderType } from '../../../types';
import { useRabbySelector } from '@/ui/store';
import { MarginModeModal } from './MarginModeModal';
import { LeverageModal } from './LeverageModal';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { useMemoizedFn } from 'ahooks';

interface TopModeStatusProps {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
}

const ORDER_TYPE_OPTIONS = [
  { value: OrderType.MARKET, label: 'Market' },
  { value: OrderType.LIMIT, label: 'Limit' },
  { value: OrderType.STOP_MARKET, label: 'Stop Market' },
  { value: OrderType.STOP_LIMIT, label: 'Stop Limit' },
  { value: OrderType.SCALE, label: 'Scale' },
  { value: OrderType.TWAP, label: 'TWAP' },
];

export const TopModeStatus: React.FC<TopModeStatusProps> = ({
  orderType,
  onOrderTypeChange,
}) => {
  const selectedCoin = useRabbySelector(
    (state) => state.perps.selectedCoin || 'BTC'
  );
  const marketDataMap = useRabbySelector((state) => state.perps.marketDataMap);
  const currentMarketData = marketDataMap?.[selectedCoin] || null;
  const maxLeverage = currentMarketData?.maxLeverage || 25;
  const wsActiveAssetData = useRabbySelector(
    (state) => state.perps.wsActiveAssetData
  );
  const leverage = wsActiveAssetData?.leverage.value || 0;
  const marginMode =
    wsActiveAssetData?.leverage.type === 'cross'
      ? MarginMode.CROSS
      : MarginMode.ISOLATED;

  const [showMarginModeModal, setShowMarginModeModal] = React.useState(false);
  const [showLeverageModal, setShowLeverageModal] = React.useState(false);
  const { t } = useTranslation();

  const handleLeverageConfirm = useMemoizedFn(async (newLeverage: number) => {
    const sdk = getPerpsSDK();
    await sdk.exchange?.updateLeverage({
      coin: selectedCoin,
      leverage: newLeverage,
      isCross: marginMode === MarginMode.CROSS,
    });
    message.success('Leverage changed to: ' + newLeverage);
    setShowLeverageModal(false);
  });

  const handleLeverageClick = () => {
    setShowLeverageModal(true);
  };

  // Handlers for top controls
  const handleMarginModeClick = () => {
    setShowMarginModeModal(true);
  };

  const handleMarginModeConfirm = useMemoizedFn(async (mode: MarginMode) => {
    const sdk = getPerpsSDK();
    await sdk.exchange?.updateLeverage({
      coin: selectedCoin,
      leverage: leverage,
      isCross: mode === MarginMode.CROSS,
    });
    message.success('Margin mode changed to: ' + mode);
    setShowMarginModeModal(false);
  });

  return (
    <>
      <div className="flex items-center gap-[8px]">
        <div
          onClick={handleMarginModeClick}
          className="h-[32px] w-[80px] rounded-[6px] flex items-center justify-center text-[13px] text-rb-neutral-title-1 border border-solid border-rb-neutral-line font-medium cursor-pointer"
        >
          {marginMode === MarginMode.ISOLATED
            ? t('page.perpsPro.tradingPanel.marginIsolated')
            : t('page.perpsPro.tradingPanel.marginCross')}
        </div>

        <div
          onClick={handleLeverageClick}
          className="h-[32px] w-[60px] flex items-center justify-center rounded-[6px] text-[13px] text-rb-neutral-title-1 border border-solid border-rb-neutral-line font-medium cursor-pointer"
        >
          {leverage}x
        </div>

        <Select
          value={orderType}
          onChange={onOrderTypeChange}
          className="text-[13px] flex-1 h-[32px]"
          listItemHeight={32}
          optionLabelProp="label"
        >
          {ORDER_TYPE_OPTIONS.map((option) => (
            <Select.Option
              key={option.value}
              value={option.value}
              label={
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-rb-neutral-foot font-medium">
                    {t('page.perpsPro.tradingPanel.type')}{' '}
                  </span>
                  <span className="text-rb-neutral-title-1 font-medium">
                    {option.label}
                  </span>
                </div>
              }
            >
              {option.label}
            </Select.Option>
          ))}
        </Select>
      </div>
      {/* Margin Mode Modal */}
      <MarginModeModal
        visible={showMarginModeModal}
        currentMode={marginMode}
        coinSymbol={selectedCoin}
        onConfirm={handleMarginModeConfirm}
        onCancel={() => setShowMarginModeModal(false)}
      />

      {/* Leverage Modal */}
      <LeverageModal
        visible={showLeverageModal}
        currentLeverage={leverage}
        maxLeverage={maxLeverage}
        coinSymbol={selectedCoin}
        onConfirm={handleLeverageConfirm}
        onCancel={() => setShowLeverageModal(false)}
      />
    </>
  );
};
