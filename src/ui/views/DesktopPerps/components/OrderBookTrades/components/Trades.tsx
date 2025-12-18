import React, { useState, useEffect } from 'react';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { splitNumberByStep } from '@/ui/utils';
import dayjs from 'dayjs';

interface Trade {
  time: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export const Trades: React.FC = () => {
  const { t } = useTranslation();
  const { selectedCoin } = useRabbySelector((state) => state.perps);
  const [trades, setTrades] = useState<Trade[]>([]);

  // Subscribe to trades via WebSocket
  useEffect(() => {
    if (!selectedCoin) return;

    const sdk = getPerpsSDK();

    // Subscribe to trades updates
    const { unsubscribe } = sdk.ws.subscribeToTrades(selectedCoin, (data) => {
      if (data && Array.isArray(data)) {
        const newTrades: Trade[] = data.map((trade: any) => ({
          time: trade.time,
          price: Number(trade.px),
          size: Number(trade.sz),
          side: (trade.side === 'B' ? 'buy' : 'sell') as 'buy' | 'sell',
        }));

        setTrades((prevTrades) => {
          // Add new trades to the beginning and keep only the latest 100
          const combined = [...newTrades, ...prevTrades];
          return combined.slice(0, 300);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedCoin]);

  const formatTime = (timestamp: number) => {
    return dayjs(timestamp).format('HH:mm:ss');
  };

  return (
    <div className="h-full flex flex-col bg-rb-neutral-bg-1">
      {/* Header */}
      <div className="flex items-center justify-between px-[8px] py-[6px] border-b border-solid border-rb-neutral-line text-[11px] text-r-neutral-foot flex-shrink-0">
        <span className="min-w-[60px] text-left">
          {t('page.perpsPro.orderBook.time')}
        </span>
        <span className="min-w-[90px] text-right">
          {t('page.perpsPro.orderBook.price')} (USD)
        </span>
        <span className="min-w-[90px] text-right">
          {t('page.perpsPro.orderBook.amount')} ({selectedCoin})
        </span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-r-neutral-foot text-[12px]">
            {t('page.perpsPro.orderBook.noTrades')}
          </div>
        ) : (
          trades.map((trade, index) => (
            <div
              key={`${trade.time}-${index}`}
              className="flex items-center justify-between px-[8px] py-[4px] text-[12px] hover:bg-rb-neutral-bg-2"
            >
              <span className="min-w-[60px] text-left text-r-neutral-foot">
                {formatTime(trade.time)}
              </span>
              <span
                className={clsx(
                  'min-w-[90px] text-right font-medium',
                  trade.side === 'buy'
                    ? 'text-r-green-default'
                    : 'text-r-red-default'
                )}
              >
                {splitNumberByStep(trade.price)}
              </span>
              <span className="min-w-[90px] text-right text-r-neutral-title-1">
                {splitNumberByStep(trade.size)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
