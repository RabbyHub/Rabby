import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const selectedCoin = useRabbySelector((state) => state.perps.selectedCoin);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>(
    'orderbook'
  );

  const [trades, setTrades] = useState<Trade[]>([]);
  // Buffer trades and flush once per frame: the WS snapshot burst fires this
  // callback (unbatched, outside React) many times in a row, and >50 sync
  // setStates trip React's max update-depth guard.
  const tradesBufferRef = useRef<Trade[]>([]);
  const flushRafRef = useRef<number | null>(null);

  useEffect(() => {
    tradesBufferRef.current = [];
    setTrades([]);
  }, [selectedCoin]);

  // Subscribe to trades via WebSocket
  useEffect(() => {
    if (!selectedCoin) return;

    const sdk = getPerpsSDK();

    // Subscribe to trades updates
    const { unsubscribe } = sdk.ws.subscribeToTrades(selectedCoin, (data) => {
      if (data && Array.isArray(data) && data[0]?.coin === selectedCoin) {
        const newTrades: Trade[] = data.reverse().map((trade) => ({
          time: trade.time as number,
          price: trade.px as string,
          size: trade.sz as string,
          side: (trade.side === 'B' ? 'buy' : 'sell') as 'buy' | 'sell',
        }));

        // Newest first, keep only the latest 300 — accumulate across burst calls.
        tradesBufferRef.current = [
          ...newTrades,
          ...tradesBufferRef.current,
        ].slice(0, 300);

        if (flushRafRef.current == null) {
          flushRafRef.current = requestAnimationFrame(() => {
            flushRafRef.current = null;
            setTrades(tradesBufferRef.current);
          });
        }
      }
    });

    return () => {
      unsubscribe();
      if (flushRafRef.current != null) {
        cancelAnimationFrame(flushRafRef.current);
        flushRafRef.current = null;
      }
    };
  }, [selectedCoin]);

  const latestTrade = useMemo(() => {
    return trades[0];
  }, [trades]);

  return (
    <div className="h-full w-full bg-rb-neutral-bg-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="relative flex border-b border-solid border-rb-neutral-line shrink-0 h-[38px]">
        <button
          className={clsx(
            'flex-1 px-[16px] items-center justify-center text-12 font-medium transition-colors',
            activeTab === 'orderbook'
              ? 'text-rb-neutral-title-1'
              : 'text-rb-neutral-secondary hover:text-rb-neutral-title-1'
          )}
          onClick={() => setActiveTab('orderbook')}
        >
          {t('page.perpsPro.orderBook.title')}
        </button>
        <button
          className={clsx(
            'flex-1 px-[16px] items-center justify-center text-12 font-medium transition-colors',
            activeTab === 'trades'
              ? 'text-rb-neutral-title-1'
              : 'text-rb-neutral-secondary hover:text-rb-neutral-title-1'
          )}
          onClick={() => setActiveTab('trades')}
        >
          {t('page.perpsPro.orderBook.trades')}
        </button>
        {/* Sliding indicator: fixed 20px length, centered under the active tab */}
        <div
          className={clsx(
            'absolute bottom-0 h-[2px] w-[20px] bg-rb-brand-default -translate-x-1/2',
            'transition-[left] duration-300 ease-out'
          )}
          style={{
            // Each tab is half the width, so its center sits at 25% / 75%.
            left: activeTab === 'orderbook' ? '25%' : '75%',
          }}
        />
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'orderbook' ? (
          <OrderBook latestTrade={latestTrade} />
        ) : (
          <Trades trades={trades} selectedCoin={selectedCoin} />
        )}
      </div>
    </div>
  );
};
