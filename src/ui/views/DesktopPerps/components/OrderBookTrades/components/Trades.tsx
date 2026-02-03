import React, { useState, useEffect } from 'react';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { splitNumberByStep } from '@/ui/utils';
import dayjs from 'dayjs';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { formatPerpsCoin } from '../../../utils';
interface Trade {
  time: number;
  price: string;
  size: string;
  side: 'buy' | 'sell';
}

export const Trades: React.FC<{ trades: Trade[]; selectedCoin: string }> = ({
  trades,
  selectedCoin,
}) => {
  const { t } = useTranslation();

  const formatTime = (timestamp: number) => {
    return dayjs(timestamp).format('HH:mm:ss');
  };

  const handleClickPrice = (price: string) => {
    eventBus.emit(EVENTS.PERPS.HANDLE_CLICK_PRICE, price);
  };

  return (
    <div className="h-full flex flex-col bg-rb-neutral-bg-1">
      {/* Header */}
      <div className="flex items-center justify-between px-[8px] py-[6px] text-[11px] text-r-neutral-foot flex-shrink-0">
        <span className="min-w-[60px] text-left">
          {t('page.perpsPro.orderBook.price')} (USD)
        </span>
        <span className="min-w-[90px] text-right">
          {t('page.perpsPro.orderBook.amount')} ({formatPerpsCoin(selectedCoin)}
          )
        </span>
        <span className="min-w-[60px] text-right">
          {t('page.perpsPro.orderBook.time')}
        </span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto trades-container-no-scrollbar">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-r-neutral-foot text-[12px]">
            {t('page.perpsPro.orderBook.noTrades')}
          </div>
        ) : (
          trades.map((trade, index) => (
            <div
              key={`${trade.time}-${index}`}
              onClick={() => handleClickPrice(trade.price)}
              className="flex items-center justify-between px-[8px] py-[4px] text-[12px] hover:bg-rb-neutral-bg-2 cursor-pointer group"
            >
              <span
                className={clsx(
                  'min-w-[60px] text-left cursor-pointer group-hover:font-bold',
                  trade.side === 'buy'
                    ? 'text-rb-green-default'
                    : 'text-rb-red-default'
                )}
              >
                {splitNumberByStep(trade.price)}
              </span>
              <span className="min-w-[90px] text-right text-r-neutral-title-1">
                {splitNumberByStep(trade.size)}
              </span>
              <span className="min-w-[60px] text-right text-r-neutral-title-1">
                {formatTime(trade.time)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
