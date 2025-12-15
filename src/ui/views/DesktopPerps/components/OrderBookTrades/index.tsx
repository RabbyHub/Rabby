import React, { useState } from 'react';
import clsx from 'clsx';

export const OrderBookTrades: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>(
    'orderbook'
  );

  return (
    <div className="h-full w-full bg-rb-neutral-bg-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-solid border-rb-neutral-line flex-shrink-0">
        <button
          className={clsx(
            'flex-1 px-[16px] py-[12px] text-[14px] font-medium',
            activeTab === 'orderbook'
              ? 'text-r-blue-default border-b-2 border-r-blue-default'
              : 'text-r-neutral-foot'
          )}
          onClick={() => setActiveTab('orderbook')}
        >
          Order Book
        </button>
        <button
          className={clsx(
            'flex-1 px-[16px] py-[12px] text-[14px] font-medium',
            activeTab === 'trades'
              ? 'text-r-blue-default border-b-2 border-r-blue-default'
              : 'text-r-neutral-foot'
          )}
          onClick={() => setActiveTab('trades')}
        >
          Trades
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto p-[12px]">
        <div className="text-r-neutral-foot text-[12px]">
          {activeTab === 'orderbook' ? 'OrderBook Content' : 'Trades Content'}
        </div>
      </div>
    </div>
  );
};
