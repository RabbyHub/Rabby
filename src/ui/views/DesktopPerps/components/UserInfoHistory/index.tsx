import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { PositionsInfo } from './PositionsInfo';
import { OrderHistory } from './OrderHistory';
import { TradeHistory } from './TradeHistory';
import { OpenOrders } from './OpenOrders';
import { FundingHistory } from './FundingHistory';

const tabs = [
  { key: 'positions', label: 'Positions', content: PositionsInfo },
  { key: 'openOrders', label: 'Open Orders', content: OpenOrders },
  { key: 'tradeHistory', label: 'Trade History', content: TradeHistory },
  { key: 'orderHistory', label: 'Order History', content: OrderHistory },
  { key: 'fundingHistory', label: 'Funding History', content: FundingHistory },
] as const;

export const UserInfoHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['key']>(
    'positions'
  );

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
                'px-[16px] py-[12px] text-[14px] font-medium border-b-2',
                activeTab === tab.key
                  ? 'text-r-blue-default border-rabby-blue-default'
                  : 'text-r-neutral-foot border-transparent'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
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
