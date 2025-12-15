import React, { useState } from 'react';
import clsx from 'clsx';

export const UserInfoHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'positions' | 'orders' | 'history'
  >('positions');

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
      <div className="flex-1 overflow-auto p-[12px]">
        <div className="text-r-neutral-foot text-[12px]">
          {activeTab === 'positions' && 'Positions Content'}
          {activeTab === 'orders' && 'Open Orders Content'}
          {activeTab === 'history' && 'Trade History Content'}
        </div>
      </div>
    </div>
  );
};
