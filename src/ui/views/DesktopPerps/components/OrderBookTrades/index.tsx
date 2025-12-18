import React, { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { OrderBook } from './components/OrderBook';
import { Trades } from './components/Trades';

export const OrderBookTrades: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>(
    'orderbook'
  );

  return (
    <div className="h-full w-full bg-rb-neutral-bg-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-solid border-rb-neutral-line flex-shrink-0 h-40">
        <button
          className={clsx(
            'flex-1 px-[16px] items-center justify-center text-[12px] font-medium transition-colors',
            activeTab === 'orderbook'
              ? 'text-r-neutral-title-1 border-b-2 border-rb-brand-default'
              : 'text-r-neutral-foot hover:text-r-blue-default'
          )}
          onClick={() => setActiveTab('orderbook')}
        >
          {t('page.perpsPro.orderBook.title')}
        </button>
        <button
          className={clsx(
            'flex-1 px-[16px] items-center justify-center text-[12px] font-medium transition-colors',
            activeTab === 'trades'
              ? 'text-r-neutral-title-1 border-b-2 border-rb-brand-default'
              : 'text-r-neutral-foot hover:text-r-blue-default'
          )}
          onClick={() => setActiveTab('trades')}
        >
          {t('page.perpsPro.orderBook.trades')}
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'orderbook' ? <OrderBook /> : <Trades />}
      </div>
    </div>
  );
};
