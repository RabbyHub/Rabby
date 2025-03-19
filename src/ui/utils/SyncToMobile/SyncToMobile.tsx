import React from 'react';
import { useTranslation } from 'react-i18next';
import { EncodeQRCode } from './EncodeQRCode';
import { useWallet } from '../WalletContext';
import { ReactComponent as PhoneSVG } from '@/ui/assets/sync-to-mobile/phone.svg';
import { ReactComponent as BackgroundLineSVG } from '@/ui/assets/sync-to-mobile/bg.svg';

export interface Props {}

export const SyncToMobile: React.FC<Props> = ({ children }) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [vault, setVault] = React.useState<string>();

  React.useEffect(() => {
    const fetchVault = async () => {
      const _vault = await wallet.getVault();

      setVault(_vault);
    };

    fetchVault();
  }, [wallet]);

  return (
    <section
      className="h-full"
      style={{
        background: 'linear-gradient(114deg, #708AFF 9.12%, #6177FF 93.25%)',
      }}
    >
      <header className="flex items-center justify-center py-[8px]">
        <img src="/images/logo-white.svg" className="h-[60px]" />
      </header>
      <div className="flex flex-col items-center justify-center mt-[32px] text-center">
        <h1 className="text-r-neutral-title-2 text-[44px] leading-[60px] font-bold">
          Sync Wallet Address from Rabby Extension to Mobile
        </h1>
        <p className="text-r-neutral-title-2 text-[20px] leading-[24px] font-medium mt-[16px]">
          Your address data stays fully offline, encrypted, and securely
          transferred via a QR code.
        </p>
      </div>
      <main className="flex justify-center items-center mt-[58px] gap-x-[70px] relative z-0">
        <BackgroundLineSVG className="absolute top-[-48px] left-[-16px] w-full h-[700px] z-[-1]" />

        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-[275px] h-[600px]"
          src="/images/sync-to-mobile.mp4"
        />
        <div className="w-[400px] h-[600px] bg-white rounded-[16px] p-[32px]">
          <h2>1. Download Rabby Mobile</h2>
          <h2>2. Scan with Rabby Mobile</h2>
          <p>
            *Your QR code contains sensitive data. Keep it private and never
            share it with anyone.
          </p>
          {vault && <EncodeQRCode input={vault} />}
        </div>
      </main>
    </section>
  );
};
