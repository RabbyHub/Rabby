import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { OrderBook } from './components/OrderBook';
import { Trades } from './components/Trades';
import { useRabbySelector } from '@/ui/store';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
export interface Trade {
  time: number;
  price: string;
  size: string;
  side: 'buy' | 'sell';
}

export const OrderBookTrades: React.FC = () => {
  const { t } = useTranslation();
  const { selectedCoin } = useRabbySelector((state) => state.perps);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>(
    'orderbook'
  );

  const [trades, setTrades] = useState<Trade[]>([]);

  // Subscribe to trades via WebSocket
  useEffect(() => {
    if (!selectedCoin) return;

    const sdk = getPerpsSDK();

    // Subscribe to trades updates
    const { unsubscribe } = sdk.ws.subscribeToTrades(selectedCoin, (data) => {
      if (data && Array.isArray(data)) {
        const newTrades: Trade[] = data.reverse().map((trade: any) => ({
          time: trade.time as number,
          price: trade.px as string,
          size: trade.sz as string,
          side: (trade.side === 'B' ? 'buy' : 'sell') as 'buy' | 'sell',
        }));

        setTrades((prevTrades) => {
          // Add new trades to the beginning and keep only the latest 300
          const combined = [...newTrades, ...prevTrades];
          return combined.slice(0, 300);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedCoin]);

  const latestTradePrice = useMemo(() => {
    return trades[0]?.price;
  }, [trades]);

  return (
    <div className="h-full w-full bg-rb-neutral-bg-1 flex flex-col overflow-hidden border-r border-solid border-rb-neutral-line">
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
        {activeTab === 'orderbook' ? (
          <OrderBook latestTradePrice={latestTradePrice} />
        ) : (
          <Trades trades={trades} selectedCoin={selectedCoin} />
        )}
      </div>
    </div>
  );
};
