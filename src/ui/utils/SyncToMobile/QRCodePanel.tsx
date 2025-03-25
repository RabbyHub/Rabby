import React from 'react';
import { useTranslation } from 'react-i18next';
import { EncodeQRCode } from './EncodeQRCode';
import { useWallet } from '../WalletContext';
import { ReactComponent as AppleStoreSVG } from '@/ui/assets/sync-to-mobile/apple-store.svg';
import { ReactComponent as GooglePlaySVG } from '@/ui/assets/sync-to-mobile/google-play.svg';
import { ReactComponent as RabbyCircleSVG } from '@/ui/assets/sync-to-mobile/rabby-circle.svg';
import clsx from 'clsx';
import { DownloadCard } from './DownloadCard';

const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.debank.rabbymobile';
const APPLE_STORE_URL =
  'https://apps.apple.com/us/app/rabby-wallet-crypto-evm/id6474381673';

export const QRCodePanel: React.FC = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [data, setData] = React.useState<string>();

  React.useEffect(() => {
    const fetchData = async () => {
      const data = await wallet.getSyncDataString();

      setData(data);
    };

    fetchData();
  }, [wallet]);

  return (
    <div
      className={clsx(
        'w-[400px] h-[610px] bg-r-neutral-bg1 rounded-[16px]',
        'py-[24px] px-[32px]'
      )}
      style={{
        boxShadow: '0px 16px 32px 0px rgba(25, 41, 69, 0.22)',
      }}
    >
      <div>
        <h2
          className={clsx(
            'text-r-neutral-title-1 text-[20px] leading-[24px] font-medium',
            'text-center'
          )}
        >
          {t('page.syncToMobile.steps1')}
        </h2>
        <div className="flex gap-x-[16px] mt-[16px]">
          <DownloadCard
            Icon={<AppleStoreSVG className="w-[32px] h-[32px]" />}
            title={t('page.syncToMobile.downloadAppleStore')}
            href={APPLE_STORE_URL}
          />
          <DownloadCard
            Icon={<GooglePlaySVG className="w-[32px] h-[32px]" />}
            title={t('page.syncToMobile.downloadGooglePlay')}
            href={GOOGLE_PLAY_URL}
          />
        </div>
      </div>
      <div className="border-t border-rabby-neutral-line border-dashed my-[18px]"></div>
      <div>
        <h2
          className={clsx(
            'text-r-neutral-title-1 text-[20px] leading-[24px] font-medium',
            'text-center'
          )}
        >
          {t('page.syncToMobile.steps2')}
        </h2>
        <p
          className={clsx(
            'text-r-neutral-foot text-[13px] leading-[16px] font-normal',
            'mt-[8px]',
            'text-center'
          )}
        >
          {t('page.syncToMobile.steps2Description')}
        </p>
        <div className="mt-[16px] flex justify-center items-center relative">
          {/* <RabbyCircleSVG className="absolute z-10" /> */}
          {data && <EncodeQRCode input={data} />}
        </div>
      </div>
    </div>
  );
};
