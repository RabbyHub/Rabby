import React from 'react';
import { SvgIconTrezor, SvgIconLedger, SvgIconOnekey } from 'ui/assets';
import { HARDWARE_KEYRING_TYPES } from 'consts';

const Hardware = ({ type }: { type: string }) => {
  console.log('type', type);
  const currentKeyringType = Object.keys(HARDWARE_KEYRING_TYPES)
    .map((key) => HARDWARE_KEYRING_TYPES[key])
    .find((item) => item.type === type);

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
  return (
    <div className="hardware-operation">
      <Icon />
      <h1 className="brand-name">{currentKeyringType.brandName}</h1>
      <p className="text-15 text-medium text-gray-content text-center">
        Please operate in your hardware wallet
      </p>
    </div>
  );
};

export default Hardware;
