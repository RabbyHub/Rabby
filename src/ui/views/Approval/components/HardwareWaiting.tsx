import React from 'react';
import { Button } from 'antd';
import { useApproval, useWallet } from 'ui/utils';
import { SvgIconTrezor, SvgIconLedger, SvgIconOnekey } from 'ui/assets';
import { HARDWARE_KEYRING_TYPES, IS_AFTER_CHROME91 } from 'consts';

const Hardware = ({
  params,
  requestDefer,
}: {
  params: { type: string };
  requestDefer: Promise<any>;
}) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const { type } = params;
  const currentKeyringType = Object.keys(HARDWARE_KEYRING_TYPES)
    .map((key) => HARDWARE_KEYRING_TYPES[key])
    .find((item) => item.type === type);
  const wallet = useWallet();
  const useLedgerLive = wallet.isUseLedgerLive();
  requestDefer.then(resolveApproval).catch(rejectApproval);

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
      {IS_AFTER_CHROME91 && !useLedgerLive ? (
        <div className="text-yellow text-15 text-center whitespace-pre-line px-16 py-12 border-yellow border-opacity-20 border bg-yellow bg-opacity-10 rounded w-[360px] leading-5">
          <div>Unable to proceed due to a Chrome issue.</div>
          <div>Please delete and re-connect this address.</div>
        </div>
      ) : (
        <p className="text-15 text-gray-content text-center">
          Please proceed in your hardware wallet
        </p>
      )}
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
