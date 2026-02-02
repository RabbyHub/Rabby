import React from 'react';
import { Dropdown, Menu, message, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { MarginMode, OrderType } from '../../../types';
import { useRabbySelector } from '@/ui/store';
import { MarginModeModal } from './MarginModeModal';
import { LeverageModal } from './LeverageModal';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { useMemoizedFn } from 'ahooks';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import clsx from 'clsx';
import { RcIconArrowDownPerpsCC } from '@/ui/assets/desktop/common';
import perpsToast from '../../PerpsToast';
import { isScreenSmall } from '../../../utils';

interface TopModeStatusProps {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
}

const ORDER_TYPE_OPTIONS = [
  { value: OrderType.MARKET, label: 'Market' },
  { value: OrderType.LIMIT, label: 'Limit' },
  { value: OrderType.STOP_MARKET, label: 'Stop Market' },
  { value: OrderType.STOP_LIMIT, label: 'Stop Limit' },
  { value: OrderType.TAKE_MARKET, label: 'Take Market' },
  { value: OrderType.TAKE_LIMIT, label: 'Take Limit' },
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

  // Handlers for top controls
  const handleMarginModeClick = () => {
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

  return (
    <>
      <div className="flex items-center gap-[8px]">
        <div
          onClick={handleMarginModeClick}
          className="h-[32px] w-[80px] rounded-[6px] flex items-center justify-center text-[13px] text-rb-neutral-title-1 border border-solid border-rb-neutral-line font-medium cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
        >
          {marginMode === MarginMode.ISOLATED
            ? t('page.perpsPro.marginMode.isolated')
            : t('page.perpsPro.marginMode.cross')}
        </div>

        <div
          onClick={handleLeverageClick}
          className="h-[32px] w-[60px] flex items-center justify-center rounded-[6px] text-[13px] text-rb-neutral-title-1 border border-solid border-rb-neutral-line font-medium cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
        >
          {leverage}x
        </div>
        <Dropdown
          forceRender={true}
          transitionName=""
          overlay={
            <Menu
              className="bg-r-neutral-bg1"
              onClick={(info) => {
                onOrderTypeChange(info.key as OrderType);
              }}
            >
              {ORDER_TYPE_OPTIONS.map((option) => (
                <Menu.Item
                  className="text-r-neutral-title1 hover:bg-r-blue-light1"
                  key={option.value}
                >
                  {option.label}
                </Menu.Item>
              ))}
            </Menu>
          }
        >
          <button
            type="button"
            className={clsx(
              'inline-flex items-center justify-between',
              'px-[8px] py-[8px] flex-1',
              'border border-rb-neutral-line rounded-[6px]',
              'hover:border-rb-brand-default border border-solid border-transparent',
              isScreenSmall() ? 'justify-center' : '',
              'text-[12px] leading-[14px] text-rb-neutral-secondary'
            )}
          >
            {isScreenSmall() ? null : t('page.perpsPro.tradingPanel.type')}
            <span
              className={clsx(
                'text-rb-neutral-title-1 font-medium flex items-center gap-[4px]',
                isScreenSmall() ? 'justify-between w-full' : ''
              )}
            >
              {
                ORDER_TYPE_OPTIONS.find((option) => option.value === orderType)
                  ?.label
              }
              <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary" />
            </span>
          </button>
        </Dropdown>
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
