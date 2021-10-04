import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useApproval, useWallet } from 'ui/utils';
import {
  SvgIconBitBox02,
  SvgIconTrezor,
  SvgIconLedger,
  SvgIconOnekey,
} from 'ui/assets';
import { HARDWARE_KEYRING_TYPES, IS_AFTER_CHROME91 } from 'consts';
import AccountCard from './AccountCard';

const Hardware = ({
  params,
  requestDefer,
}: {
  params: { type: string };
  requestDefer: Promise<any>;
}) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const { type } = params;
  const currentKeyringType = Object.keys(HARDWARE_KEYRING_TYPES)
    .map((key) => HARDWARE_KEYRING_TYPES[key])
    .find((item) => item.type === type);
  const wallet = useWallet();
  const useLedgerLive = wallet.isUseLedgerLive();
  requestDefer.then(resolveApproval).catch(rejectApproval);

  const Icon = () => {
    switch (type) {
      case HARDWARE_KEYRING_TYPES.BitBox02.type:
        return <SvgIconBitBox02 className="icon icon-hardware" />;
      case HARDWARE_KEYRING_TYPES.Ledger.type:
        return <SvgIconLedger className="icon icon-hardware" />;
      case HARDWARE_KEYRING_TYPES.Onekey.type:
        return <SvgIconOnekey className="icon icon-hardware" />;
      case HARDWARE_KEYRING_TYPES.Trezor.type:
        return <SvgIconTrezor className="icon icon-hardware" />;
      default:
        return <></>;
    }
  };

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  return (
    <>
      <AccountCard />
      <div className="hardware-operation">
        <Icon />
        <h1 className="brand-name">{currentKeyringType.brandName}</h1>
        <p className="text-15 text-gray-content text-center">
          {t('Please proceed in your hardware wallet')}
        </p>
        {IS_AFTER_CHROME91 && !useLedgerLive && (
          <div className="text-yellow text-15 text-center whitespace-pre-line px-16 py-12 border-yellow border-opacity-20 border bg-yellow bg-opacity-10 rounded w-[360px] leading-5 mt-[60px]">
            <div>{t('ledgerWebUSBSignAlertPart1')}</div>
            <div>{t('ledgerWebUSBSignAlertPart2')}</div>
          </div>
        )}
        <footer>
          <div className="action-buttons flex justify-center">
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={handleCancel}
            >
              {t('Cancel')}
            </Button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Hardware;
