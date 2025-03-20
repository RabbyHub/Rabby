import React from 'react';
import { ReactComponent as BackgroundLineSVG } from '@/ui/assets/sync-to-mobile/bg.svg';
import { DemoPanel } from './DemoPanel';
import { QRCodePanel } from './QRCodePanel';
import { useTranslation } from 'react-i18next';
import { openInTab } from '../webapi';
import { useWallet } from '../WalletContext';

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

  React.useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <section
      className="h-full overflow-hidden"
      style={{
        background: 'linear-gradient(114deg, #708AFF 9.12%, #6177FF 93.25%)',
      }}
    >
      <header className="flex items-center justify-center py-[8px]">
        <img src="/images/logo-white.svg" className="h-[60px]" />
      </header>
      <div className="flex flex-col items-center justify-center mt-[32px] text-center">
        <h1 className="text-r-neutral-title2 text-[44px] leading-[60px] font-bold">
          {t('page.syncToMobile.title')}
        </h1>
        <p className="text-r-neutral-title2 text-[20px] leading-[24px] font-medium mt-[16px]">
          {t('page.syncToMobile.description')}
        </p>
      </div>
      <main className="flex justify-center items-center mt-[58px] gap-x-[100px] relative z-0">
        <BackgroundLineSVG className="absolute top-[-48px] left-[-16px] w-full h-[700px] z-[-1]" />

        <DemoPanel />
        <QRCodePanel />
      </main>
    </section>
  );
};
