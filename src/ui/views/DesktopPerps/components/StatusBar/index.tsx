import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Switch } from 'antd';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { ReactComponent as RcIconTwitter } from '@/ui/assets/perps/icon-twitter.svg';
import { ReactComponent as RcIconDiscord } from '@/ui/assets/perps/icon-discord.svg';
import { ReactComponent as RcIconDocs } from '@/ui/assets/perps/icon-docs.svg';
import { useTranslation } from 'react-i18next';
import { openInTab } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

const VERSION = 'v1.001';

const OnlineStatus: React.FC<{ online: boolean }> = ({ online }) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex items-center justify-center gap-4 h-[20px] px-[8px] rounded-[4px] border border-solid text-[12px] font-medium',
        online
          ? 'border-rb-green-default text-rb-green-default bg-rb-green-light-1'
          : 'border-rb-neutral-line text-rb-neutral-secondary bg-rb-neutral-bg-2'
      )}
    >
      <span
        className={clsx(
          'w-[6px] h-[6px] rounded-full',
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
  const dispatch = useRabbyDispatch();
  const [isConnected, setIsConnected] = useState(true);
  const { t } = useTranslation();

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
    openInTab('https://discord.gg/rabby');
  };

  const handleOpenDocs = () => {
    openInTab('https://rabby.io/docs');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[32px] border-t border-solid border-rb-neutral-line bg-rb-neutral-bg-1 flex items-center justify-between px-[16px]">
      {/* Left section */}
      <div className="flex items-center gap-[16px]">
        <OnlineStatus online={isConnected} />

        <div className="flex items-center gap-[8px] text-[12px] text-r-neutral-foot">
          <Switch
            size="small"
            checked={soundEnabled}
            onChange={(checked) => dispatch.perps.updateEnabledSound(checked)}
          />
          <span>{t('page.perpsPro.statusBar.sound')}</span>
        </div>

        <div className="flex items-center gap-[12px]">
          <RcIconTwitter
            className="w-[16px] h-[16px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 transition-colors"
            onClick={handleOpenTwitter}
          />
          {/* <RcIconDiscord
            className="w-[16px] h-[16px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 transition-colors"
            onClick={handleOpenDiscord}
          />
          <RcIconDocs
            className="w-[16px] h-[16px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 transition-colors"
            onClick={handleOpenDocs}
          /> */}
        </div>

        {/* <div className="text-[12px] text-r-neutral-foot">{VERSION}</div> */}
      </div>
    </div>
  );
};
