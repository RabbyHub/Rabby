import React, { useState } from 'react';
import clsx from 'clsx';
import { PositionsInfo } from '../PositionsInfo';
import { OrderHistory } from '../OrderHistory';
import { TradeHistory } from '../TradeHistory';

export const UserInfoHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'positions' | 'orders' | 'history'
  >('history');

  return (
    <div className="flex-1 h-full border-r border-solid border-rb-neutral-line bg-rb-neutral-bg-1 flex flex-col min-w-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-solid border-rb-neutral-line flex-shrink-0">
        <button
          className={clsx(
            'px-[16px] py-[12px] text-[14px] font-medium',
            activeTab === 'positions'
              ? 'text-r-blue-default border-b-2 border-r-blue-default'
              : 'text-r-neutral-foot'
          )}
          onClick={() => setActiveTab('positions')}
        >
          Positions
        </button>
        <button
          className={clsx(
            'px-[16px] py-[12px] text-[14px] font-medium',
            activeTab === 'orders'
              ? 'text-r-blue-default border-b-2 border-r-blue-default'
              : 'text-r-neutral-foot'
          )}
          onClick={() => setActiveTab('orders')}
        >
          Open Orders
        </button>
        <button
          className={clsx(
            'px-[16px] py-[12px] text-[14px] font-medium',
            activeTab === 'history'
              ? 'text-r-blue-default border-b-2 border-r-blue-default'
              : 'text-r-neutral-foot'
          )}
          onClick={() => setActiveTab('history')}
        >
          Trade History
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="text-r-neutral-foot text-[12px]">
          {activeTab === 'positions' && <PositionsInfo />}
          {activeTab === 'orders' && 'Open Orders Content'}
          {activeTab === 'history' && <TradeHistory />}
        </div>
      </div>
    </div>
  );
};
