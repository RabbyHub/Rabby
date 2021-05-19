import React from 'react';
import { useHistory } from 'react-router-dom';
import { StrayHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { IconLedger, IconOnekey, IconTrezor } from 'ui/assets';

import './index.css';
const HARDWARES = [
  {
    icon: IconLedger,
    name: 'Ledger',
  },
  {
    icon: IconTrezor,
    name: 'Trezor',
  },
  {
    icon: IconOnekey,
    name: 'Onekey',
  },
];

const ImportHardware = () => {
  const wallet = useWallet();
  const history = useHistory();

  const navSelectAddress = async (hardware) => {
    const keyring = await wallet.connectHardware(hardware);
    history.push({
      pathname: '/import/select-address',
      state: {
        keyring,
      },
    });
  };

  return (
    <div className="bg-gray-bg w-[993px] h-[519px] mt-[150px] rounded-md mx-auto pt-[60px]">
      <StrayHeader
        title="Connect Hardware Wallet"
        subTitle="Select a hardware wallet you'd ike to use"
        center
      />
      <div className="flex my-[60px] justify-center mr-[-80px]">
        {HARDWARES.map((hardware) => {
          const Icon = hardware.icon;
          return (
            <div
              className="w-[128px] mr-[80px] text-center active:text-blue-light"
              key={hardware.name}
              onClick={() => navSelectAddress(hardware.name)}
            >
              <div className="rounded-full h-[128px] bg-white border border-white hover:border-blue-light">
                <Icon className="hardware-icon" />
              </div>
              <div className="mt-20 font-medium text-20">{hardware.name}</div>
            </div>
          );
        })}
      </div>
      <div className="text-center text-gray-content text-14">
        If you are using a hardware wallet with a camera on it, you should use
        watch address instead.
      </div>
    </div>
  );
};

export default ImportHardware;
