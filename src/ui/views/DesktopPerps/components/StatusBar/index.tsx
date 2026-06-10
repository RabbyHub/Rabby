import React, { useMemo, useState, useEffect } from 'react';
import clsx from 'clsx';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { ReactComponent as RcIconTwitter } from '@/ui/assets/perps/IconTwitter.svg';
import { ReactComponent as RcIconDiscord } from '@/ui/assets/perps/IconDiscord.svg';
import { ReactComponent as RcIconOpenVolume } from '@/ui/assets/perps/IconOpenVolume.svg';
import { ReactComponent as RcIconClosedVolume } from '@/ui/assets/perps/IconClosedVolume.svg';
import { ReactComponent as RcIconDocs } from '@/ui/assets/perps/IconDocument.svg';
import { useTranslation } from 'react-i18next';
import { openInTab, splitNumberByStep } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { playSound } from '@/ui/utils/sound';
import { formatPerpsCoin } from '../../utils';

const getPriceChangePercent = (markPx?: string, prevDayPx?: string) => {
  const mark = Number(markPx || 0);
  const prev = Number(prevDayPx || 0);
  if (!mark || !prev) return 0;
  return ((mark - prev) / prev) * 100;
};

const OnlineStatus: React.FC<{ online: boolean }> = ({ online }) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex h-[20px] w-[60px] items-center justify-center gap-[4px] rounded-[4px] border-[0.5px] border-solid text-[12px] leading-[14px] font-medium',
        online
          ? 'border-rb-green-default text-rb-green-default bg-rb-green-light-1'
          : 'border-rb-neutral-line text-rb-neutral-secondary bg-rb-neutral-bg-2'
      )}
    >
      <span
        className={clsx(
          'w-[4px] h-[4px] rounded-full',
          online ? 'bg-rb-green-default' : 'bg-rb-neutral-secondary'
        )}
      />
      <span>
        {online
          ? t('page.perpsPro.statusBar.online')
          : t('page.perpsPro.statusBar.offline')}
      </span>
    </div>
  );
};

export const StatusBar: React.FC = () => {
  const soundEnabled = useRabbySelector((state) => state.perps.soundEnabled);
  const marketData = useRabbySelector((state) => state.perps.marketData);
  const dispatch = useRabbyDispatch();
  const [isConnected, setIsConnected] = useState(true);
  const { t } = useTranslation();

  const tickerMarkets = useMemo(() => {
    return marketData
      .filter((item) => Number(item.markPx || 0) > 0)
      .sort((a, b) => Number(b.dayNtlVlm || 0) - Number(a.dayNtlVlm || 0))
      .slice(0, 24);
  }, [marketData]);

  const tickerRenderList = useMemo(() => {
    if (tickerMarkets.length === 0) return [];
    return [...tickerMarkets, ...tickerMarkets];
  }, [tickerMarkets]);

  useEffect(() => {
    const sdk = getPerpsSDK();
    // Check WebSocket connection status periodically
    const checkConnection = () => {
      setIsConnected(sdk.ws.isConnected ?? true);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenTwitter = () => {
    openInTab('https://twitter.com/Rabby_io');
  };

  const handleOpenDiscord = () => {
    openInTab('https://discord.gg/seFBCWmUre');
  };

  const handleOpenDocs = () => {
    openInTab('https://support.rabby.io/');
  };

  const handleToggleSound = () => {
    if (!soundEnabled) {
      playSound('/sounds/order-filled.mp3');
    }
    dispatch.perps.updateEnabledSound(!soundEnabled);
  };

  const RcIconVolume = soundEnabled ? RcIconOpenVolume : RcIconClosedVolume;

  return (
    <div className="fixed bottom-[6px] left-[6px] right-[6px] h-[32px] rounded-[6px] bg-rb-neutral-bg-1 flex items-center overflow-hidden px-[12px] z-30 gap-[12px]">
      <div className="flex items-center flex-shrink-0">
        <OnlineStatus online={isConnected} />
      </div>

      <div className="desktop-perps-status-ticker flex-1 min-w-0 overflow-hidden">
        {tickerRenderList.length > 0 ? (
          <div className="desktop-perps-status-track flex w-max items-center gap-[24px]">
            {tickerRenderList.map((item, index) => {
              const priceChange = getPriceChangePercent(
                item.markPx,
                item.prevDayPx
              );
              const isPositive = priceChange > 0;
              const isNegative = priceChange < 0;

              return (
                <div
                  key={`${item.dexId || 'hyper'}-${item.name}-${index}`}
                  className="flex flex-shrink-0 items-center gap-[6px] text-[12px] leading-[14px]"
                >
                  <span className="text-rb-neutral-foot">
                    {formatPerpsCoin(item.displayName || item.name)}
                  </span>
                  <span
                    className={clsx(
                      isPositive && 'text-rb-green-default',
                      isNegative && 'text-rb-red-default',
                      !isPositive && !isNegative && 'text-rb-neutral-secondary'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {priceChange.toFixed(2)}%
                  </span>
                  <span className="text-rb-neutral-secondary">
                    {splitNumberByStep(Number(item.markPx))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 items-center gap-[12px]">
        <button
          type="button"
          title={t('page.perpsPro.statusBar.sound')}
          className="flex h-[20px] w-[20px] items-center justify-center border-0 bg-transparent p-0 text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
          onClick={handleToggleSound}
        >
          <RcIconVolume className="h-[20px] w-[20px]" />
        </button>
        <div className="h-[12px] w-0 border-l border-solid border-rb-neutral-line" />
        <RcIconTwitter
          className="h-[20px] w-[20px] text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
          onClick={handleOpenTwitter}
        />
        <RcIconDiscord
          className="h-[20px] w-[20px] text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
          onClick={handleOpenDiscord}
        />
        <RcIconDocs
          className="h-[20px] w-[20px] text-rb-neutral-foot cursor-pointer hover:text-rb-brand-default"
          onClick={handleOpenDocs}
        />
      </div>
    </div>
  );
};
