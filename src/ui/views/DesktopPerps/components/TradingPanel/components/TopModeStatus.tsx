import React from 'react';
import { Tooltip } from 'antd';
import { PerpsDropdown } from './PerpsDropdown';
import { useTranslation } from 'react-i18next';
import { MarginMode, OrderType } from '../../../types';
import { useRabbySelector } from '@/ui/store';
import { MarginModeModal } from './MarginModeModal';
import { LeverageModal } from './LeverageModal';
import { useMemoizedFn } from 'ahooks';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import clsx from 'clsx';
import { ReactComponent as RcIconArrowDownPerpsCC } from '@/ui/assets/perps/icon-arrow-down.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import perpsToast from '../../PerpsToast';

interface TopModeStatusProps {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
}

// Primary tabs always visible
const PRIMARY_TABS: { value: OrderType; label: string }[] = [
  { value: OrderType.LIMIT, label: 'Limit' },
  { value: OrderType.MARKET, label: 'Market' },
];

// Advanced types in dropdown
const ADVANCED_OPTIONS: { value: OrderType; label: string }[] = [
  { value: OrderType.STOP_LIMIT, label: 'Stop Limit' },
  { value: OrderType.STOP_MARKET, label: 'Stop Market' },
  { value: OrderType.TAKE_LIMIT, label: 'Take Limit' },
  { value: OrderType.TAKE_MARKET, label: 'Take Market' },
  { value: OrderType.SCALE, label: 'Scale' },
  { value: OrderType.TWAP, label: 'TWAP' },
];

const isPrimaryTab = (type: OrderType) =>
  PRIMARY_TABS.some((t) => t.value === type);

export const TopModeStatus: React.FC<TopModeStatusProps> = ({
  orderType,
  onOrderTypeChange,
}) => {
  const selectedCoin = useRabbySelector(
    (state) => state.perps.selectedCoin || 'BTC'
  );
  const marketDataMap = useRabbySelector((state) => state.perps.marketDataMap);
  const clearinghouseState = useRabbySelector(
    (state) => state.perps.clearinghouseState
  );
  const currentMarketData = marketDataMap?.[selectedCoin] || null;
  const maxLeverage = currentMarketData?.maxLeverage || 25;
  const wsActiveAssetData = useRabbySelector(
    (state) => state.perps.wsActiveAssetData
  );
  const leverage = wsActiveAssetData?.leverage.value || maxLeverage;
  const marginMode =
    wsActiveAssetData?.leverage.type === 'cross'
      ? MarginMode.CROSS
      : MarginMode.ISOLATED;

  const [showMarginModeModal, setShowMarginModeModal] = React.useState(false);
  const [showLeverageModal, setShowLeverageModal] = React.useState(false);
  const { t } = useTranslation();

  const { handleUpdateMarginModeLeverage } = usePerpsProPosition();

  const handleLeverageConfirm = useMemoizedFn(async (newLeverage: number) => {
    const res = await handleUpdateMarginModeLeverage(
      selectedCoin,
      newLeverage,
      marginMode,
      'leverage'
    );
    res &&
      perpsToast.success({
        title: t('page.perps.toast.success'),
        description: t('page.perps.toast.leverageChanged', {
          leverage: newLeverage,
        }),
      });
    setShowLeverageModal(false);
  });

  const handleLeverageClick = () => {
    setShowLeverageModal(true);
  };

  const hasPosition = clearinghouseState?.assetPositions.some(
    (p) => p.position.coin === selectedCoin && Number(p.position.szi) !== 0
  );

  const marginModeDisabledReason = currentMarketData?.onlyIsolated
    ? t('page.perpsPro.marginMode.onlyIsolatedSupported')
    : hasPosition
    ? t('page.perps.cannotChangeMarginModeWithOpenPositions')
    : null;

  const handleMarginModeClick = () => {
    if (marginModeDisabledReason) return;
    setShowMarginModeModal(true);
  };

  const handleMarginModeConfirm = useMemoizedFn(async (mode: MarginMode) => {
    const res = await handleUpdateMarginModeLeverage(
      selectedCoin,
      leverage,
      mode,
      'marginMode'
    );
    res &&
      perpsToast.success({
        title: t('page.perps.toast.success'),
        description: t('page.perps.toast.marginModeUpdated', {
          mode: mode === MarginMode.ISOLATED ? 'Isolated' : 'Cross',
        }),
      });
    setShowMarginModeModal(false);
  });

  // Label for the dropdown trigger: show selected advanced type name, or default "Stop Limit"
  const advancedLabel = isPrimaryTab(orderType)
    ? ADVANCED_OPTIONS[0].label
    : ADVANCED_OPTIONS.find((o) => o.value === orderType)?.label ||
      ADVANCED_OPTIONS[0].label;

  const isAdvancedSelected = !isPrimaryTab(orderType);

  return (
    <>
      {/* Row 1: Margin mode + Leverage — fill width */}
      <div className="flex items-center gap-[8px]">
        <Tooltip
          title={marginModeDisabledReason}
          placement="top"
          overlayClassName="rectangle w-[max-content]"
        >
          <div
            onClick={handleMarginModeClick}
            className={clsx(
              'h-[28px] flex-1 rounded-[6px] flex items-center justify-center text-[12px] font-medium border border-solid bg-rb-neutral-bg-5',
              marginModeDisabledReason
                ? 'text-rb-neutral-foot border-rb-neutral-line cursor-not-allowed opacity-60'
                : 'text-rb-neutral-title-1 border-rb-neutral-line cursor-pointer hover:border-rb-brand-default'
            )}
          >
            {marginMode === MarginMode.ISOLATED
              ? t('page.perpsPro.marginMode.isolated')
              : t('page.perpsPro.marginMode.cross')}
          </div>
        </Tooltip>

        <div
          onClick={handleLeverageClick}
          className="h-[28px] flex-1 flex items-center justify-center rounded-[6px] text-[12px] text-rb-neutral-title-1 border border-solid border-rb-neutral-line font-medium cursor-pointer hover:border-rb-brand-default bg-rb-neutral-bg-5"
        >
          {leverage}x
        </div>
      </div>

      {/* Row 2: Order type tabs */}
      <div className="flex items-center gap-[4px] border-b border-solid border-rb-neutral-line">
        {PRIMARY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onOrderTypeChange(tab.value)}
            className={clsx(
              'h-[28px] mr-24 text-[12px] font-medium transition-colors border-b-2 border-solid',
              orderType === tab.value
                ? 'text-rb-neutral-title-1 border-rb-brand-default'
                : 'text-rb-neutral-foot border-transparent hover:text-rb-neutral-title-1'
            )}
          >
            {tab.label}
          </button>
        ))}

        <PerpsDropdown
          options={ADVANCED_OPTIONS.map((o) => ({
            key: o.value,
            label: o.label,
          }))}
          onSelect={(key) => onOrderTypeChange(key as OrderType)}
        >
          <button
            type="button"
            className={clsx(
              'h-[28px] text-[12px] font-medium',
              'inline-flex items-center gap-[4px] transition-colors border-b-2 border-solid',
              isAdvancedSelected
                ? 'text-rb-neutral-title-1 border-rb-brand-default'
                : 'text-rb-neutral-body border-transparent hover:text-rb-neutral-title-1'
            )}
          >
            {advancedLabel}
            <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary" />
          </button>
        </PerpsDropdown>
        <Tooltip
          title={t('page.perpsPro.tradingPanel.orderTypeTooltip')}
          placement="top"
          overlayClassName="rectangle w-[max-content]"
        >
          <RcIconInfo className="text-rb-neutral-secondary ml-auto" />
        </Tooltip>
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
