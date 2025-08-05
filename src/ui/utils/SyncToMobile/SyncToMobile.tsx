import React from 'react';
import { ReactComponent as BackgroundLineSVG } from '@/ui/assets/sync-to-mobile/bg.svg';
import { DemoPanel } from './DemoPanel';
import { QRCodePanel } from './QRCodePanel';
import { useTranslation } from 'react-i18next';
import { openInTab } from '../webapi';
import { useWallet } from '../WalletContext';
import clsx from 'clsx';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbySelector } from '@/ui/store';

export interface Props {}

export const SyncToMobile: React.FC<Props> = ({ children }) => {
  const { t } = useTranslation();
  const wallet = useWallet();

  React.useEffect(() => {
    wallet.isUnlocked().then((isUnlocked) => {
      if (!isUnlocked) {
        openInTab('index.html#/unlock');
      }
    });
  }, []);

  const themeMode = useRabbySelector((state) => state.preference.themeMode);

  React.useEffect(() => {
    setTimeout(() => {
      document.documentElement.classList.remove('dark');
    }, 0);
  }, [themeMode]);

  return (
    <section
      className={clsx(
        'h-full overflow-y-auto',
        'flex flex-col bg-r-blue-default'
      )}
    >
      <header className="flex flex-col items-center justify-center mt-[42px] text-center">
        <h1 className="text-r-neutral-title2 text-[40px] leading-[48px] font-bold">
          {t('page.syncToMobile.title')}
        </h1>
        <p
          className={clsx(
            'text-r-neutral-title2 text-[16px] leading-[19px] font-medium',
            'mt-[12px] mb-0'
          )}
        >
          {t('page.syncToMobile.description')}
        </p>
      </header>
      <main
        className={clsx(
          'flex justify-center',
          'relative z-0',
          'mt-[57px] gap-x-[100px]',
          'flex-1'
        )}
      >
        <BackgroundLineSVG className="absolute top-[-48px] left-[-16px] w-full h-[700px] z-[-1]" />

        <DemoPanel />
        <QRCodePanel />
      </main>
    </section>
  );
};
