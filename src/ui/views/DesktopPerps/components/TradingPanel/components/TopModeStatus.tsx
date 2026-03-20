import React, { useLayoutEffect, useRef, useState } from 'react';
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

  const LAST_ADVANCED_KEY = 'perps_last_advanced_order_type';

  // Remember last selected advanced type in localStorage
  const [lastAdvancedType, setLastAdvancedType] = React.useState<OrderType>(
    () => {
      const cached = localStorage.getItem(LAST_ADVANCED_KEY);
      if (
        cached &&
        ADVANCED_OPTIONS.some((o) => o.value === (cached as OrderType))
      ) {
        return cached as OrderType;
      }
      return ADVANCED_OPTIONS[0].value;
    }
  );

  // Update cache when an advanced type is selected
  React.useEffect(() => {
    if (!isPrimaryTab(orderType)) {
      setLastAdvancedType(orderType);
      localStorage.setItem(LAST_ADVANCED_KEY, orderType);
    }
  }, [orderType]);

  // Label: show current advanced type if selected, otherwise show last cached one
  const advancedLabel = isPrimaryTab(orderType)
    ? ADVANCED_OPTIONS.find((o) => o.value === lastAdvancedType)?.label ||
      ADVANCED_OPTIONS[0].label
    : ADVANCED_OPTIONS.find((o) => o.value === orderType)?.label ||
      ADVANCED_OPTIONS[0].label;

  const isAdvancedSelected = !isPrimaryTab(orderType);

  // Sliding underline indicator
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // The active tab key for indicator: either a primary tab value or 'advanced'
  const activeTabKey = isPrimaryTab(orderType) ? orderType : 'advanced';

  useLayoutEffect(() => {
    const el = tabRefs.current[activeTabKey];
    const container = tabsContainerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: elRect.left - containerRect.left,
        width: elRect.width,
      });
    }
  }, [activeTabKey, advancedLabel]);

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
                ? 'text-rb-neutral-foot border-transparent cursor-not-allowed opacity-60'
                : 'text-rb-neutral-title-1 border-transparent cursor-pointer hover:border-rb-brand-default'
            )}
          >
            {marginMode === MarginMode.ISOLATED
              ? t('page.perpsPro.marginMode.isolated')
              : t('page.perpsPro.marginMode.cross')}
          </div>
        </Tooltip>

        <div
          onClick={handleLeverageClick}
          className="h-[28px] flex-1 flex items-center justify-center rounded-[6px] text-[12px] text-rb-neutral-title-1 border border-solid border-transparent font-medium cursor-pointer hover:border-rb-brand-default bg-rb-neutral-bg-5"
        >
          {leverage}x
        </div>
      </div>

      {/* Row 2: Order type tabs */}
      <div
        ref={tabsContainerRef}
        className="relative flex items-center gap-[4px] border-b border-solid border-rb-neutral-line"
      >
        {PRIMARY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            ref={(el) => {
              tabRefs.current[tab.value] = el;
            }}
            onClick={() => onOrderTypeChange(tab.value)}
            className={clsx(
              'h-[28px] mr-24 text-15 font-medium transition-colors',
              orderType === tab.value
                ? 'text-rb-neutral-title-1'
                : 'text-rb-neutral-foot hover:text-rb-neutral-title-1'
            )}
          >
            {tab.label}
          </button>
        ))}

        <div
          className={clsx(
            'h-[28px] text-15 font-medium',
            'inline-flex items-center transition-colors',
            isAdvancedSelected
              ? 'text-rb-neutral-title-1'
              : 'text-rb-neutral-body hover:text-rb-neutral-title-1'
          )}
        >
          <span
            ref={(el) => {
              tabRefs.current['advanced'] = el;
            }}
            className="cursor-pointer h-[28px] inline-flex items-center"
            onClick={() => onOrderTypeChange(lastAdvancedType)}
          >
            {advancedLabel}
          </span>
          <PerpsDropdown
            placement="bottomRight"
            options={ADVANCED_OPTIONS.map((o) => ({
              key: o.value,
              label: o.label,
            }))}
            onSelect={(key) => onOrderTypeChange(key as OrderType)}
          >
            <span className="inline-flex items-center cursor-pointer pl-[4px] h-[28px]">
              <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary" />
            </span>
          </PerpsDropdown>
        </div>
        {/* Sliding indicator */}
        <div
          className="absolute bottom-0 h-[2px] bg-rb-brand-default transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
        <Tooltip
          title={t('page.perpsPro.tradingPanel.orderTypeTooltip')}
          placement="topRight"
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
