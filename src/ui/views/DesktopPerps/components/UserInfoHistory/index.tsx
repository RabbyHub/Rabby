import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { PositionsInfo } from './PositionsInfo';
import { OrderHistory } from './OrderHistory';
import { TradeHistory } from './TradeHistory';
import { OpenOrders } from './OpenOrders';
import { FundingHistory } from './FundingHistory';
import { Twap } from './Twap';
import { useRabbySelector } from '@/ui/store';

interface Tab {
  key: string;
  label: string;
  content: React.FC;
  number?: number;
}

export const UserInfoHistory: React.FC = () => {
  const { clearinghouseState, openOrders, twapStates } = useRabbySelector(
    (store) => store.perps
  );
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['key']>(
    'positions'
  );

  const tabs: Tab[] = useMemo(() => {
    const assetPositionNum = clearinghouseState?.assetPositions.length || 0;
    const openOrdersNum = openOrders.length;
    const twapNum = twapStates.length;

    return [
      {
        key: 'positions',
        label: 'Positions',
        content: PositionsInfo,
        number: assetPositionNum,
      },
      {
        key: 'openOrders',
        label: 'Open Orders',
        content: OpenOrders,
        number: openOrdersNum,
      },
      { key: 'twap', label: 'TWAP', content: Twap, number: twapNum },
      { key: 'tradeHistory', label: 'Trade History', content: TradeHistory },
      {
        key: 'fundingHistory',
        label: 'Funding History',
        content: FundingHistory,
      },
      { key: 'orderHistory', label: 'Order History', content: OrderHistory },
    ];
  }, [clearinghouseState, openOrders, twapStates, activeTab]);

  const ActiveComponent = useMemo(
    () => tabs.find((tab) => tab.key === activeTab)?.content,
    [activeTab]
  );

  return (
    <div className="flex-1 h-full border-r border-solid border-rb-neutral-line bg-rb-neutral-bg-1 flex flex-col min-w-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-solid border-rb-neutral-line flex-shrink-0">
        {tabs.map((tab) => {
          return (
            <button
              key={tab.key}
              className={clsx(
                'px-[16px] py-[12px] text-[14px] font-medium border-b-2 flex items-center gap-[4px]',
                activeTab === tab.key
                  ? 'text-r-blue-default border-rabby-blue-default'
                  : 'text-r-neutral-foot border-transparent'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.number ? (
                <div className="h-[16px] px-6 text-[12px] font-medium text-rb-brand-default bg-rb-brand-light-1 rounded-[4px] flex items-center justify-center">
                  {tab.number}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="text-r-neutral-foot text-[12px]">
          {ActiveComponent ? <ActiveComponent /> : null}
        </div>
      </div>
    </div>
  );
};
