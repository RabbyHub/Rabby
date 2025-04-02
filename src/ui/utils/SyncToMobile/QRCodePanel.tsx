import React from 'react';
import { useTranslation } from 'react-i18next';
import { EncodeQRCode } from './EncodeQRCode';
import { useWallet } from '../WalletContext';
import { ReactComponent as AppleStoreSVG } from '@/ui/assets/sync-to-mobile/apple-store.svg';
import { ReactComponent as GooglePlaySVG } from '@/ui/assets/sync-to-mobile/google-play.svg';
import clsx from 'clsx';
import { DownloadCard } from './DownloadCard';
import { SelectAddressModal } from './SelectAddressModal';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';

const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.debank.rabbymobile';
const APPLE_STORE_URL =
  'https://apps.apple.com/us/app/rabby-wallet-crypto-evm/id6474381673';

export const QRCodePanel: React.FC = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [data, setData] = React.useState<string>();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [qrCodeVisible, setQRCodeVisible] = React.useState(false);
  const [len, setLen] = React.useState(0);

  const handleClickQRCode = React.useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleModalConfirm = React.useCallback(
    async (accounts: IDisplayedAccountWithBalance[]) => {
      setModalVisible(false);
      setQRCodeVisible(true);

      const data = await wallet.getSyncDataString(accounts);
      setLen(accounts.length);

      setData(data);
    },
    []
  );

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
      <div className="border-t border-rabby-neutral-line border-dashed my-[10px]"></div>
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
        <div className="flex justify-center items-center relative">
          {/* <RabbyCircleSVG className="absolute z-10" /> */}
          <EncodeQRCode
            visible={qrCodeVisible}
            input={data ?? ''}
            onClick={handleClickQRCode}
          />
        </div>

        {len > 0 && (
          <div
            className={clsx(
              'text-r-neutral-foot',
              'text-14 leading-[17px]',
              'text-center',
              'mt-[9px]'
            )}
          >
            {len <= 1
              ? t('page.syncToMobile.selectedLenAddressesForSync_one', {
                  len,
                })
              : t('page.syncToMobile.selectedLenAddressesForSync_other', {
                  len,
                })}
            <span
              className={clsx(
                'text-r-blue-default',
                'cursor-pointer',
                'px-[4px]'
              )}
              onClick={handleClickQRCode}
            >
              {t('global.editButton')}
            </span>
          </div>
        )}
      </div>

      <SelectAddressModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
};
