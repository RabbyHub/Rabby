import React from 'react';
import { Button } from 'antd';
import clsx from 'clsx';
import { useApproval, useWallet } from 'ui/utils';
import { SvgIconTrezor, SvgIconLedger, SvgIconOnekey } from 'ui/assets';
import { HARDWARE_KEYRING_TYPES, IS_AFTER_CHROME91 } from 'consts';

const Hardware = ({
  params,
  requestDeffer,
}: {
  params: { type: string };
  requestDeffer: Promise<any>;
}) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const { type } = params;
  const currentKeyringType = Object.keys(HARDWARE_KEYRING_TYPES)
    .map((key) => HARDWARE_KEYRING_TYPES[key])
    .find((item) => item.type === type);
  const wallet = useWallet();
  const useLedgerLive = wallet.isUseLedgerLive();
  requestDeffer.then(resolveApproval).catch(rejectApproval);

  const Icon = () => {
    switch (type) {
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
    <div className="hardware-operation">
      <Icon />
      <h1 className="brand-name">{currentKeyringType.brandName}</h1>
      <p
        className={clsx(
          'text-15',
          'text-medium',
          'text-gray-content',
          'text-center',
          'whitespace-pre-line',
          {
            'text-yellow': IS_AFTER_CHROME91 && !useLedgerLive,
          }
        )}
      >
        {IS_AFTER_CHROME91 && !useLedgerLive
          ? 'Unable to proceed  due to a Chrome issue. \n Please delete and re-connect this address'
          : 'Please proceed in your hardware wallet'}
      </p>
      <footer>
        <div className="action-buttons flex justify-center">
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Hardware;
