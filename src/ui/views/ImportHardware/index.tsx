import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { StrayPage } from 'ui/component';
import { useWallet } from 'ui/utils';
import { SvgIconOnekey, SvgIconTrezor, ImportLedgerIcon } from 'ui/assets';
import { BIP44_PATH } from './LedgerHdPath';
import { IS_CHROME, KEYRING_CLASS } from 'consts';

import './index.css';

const HARDWARES = [
  {
    icon: ImportLedgerIcon,
    name: 'Ledger',
    type: 'LEDGER',
  },
  {
    icon: SvgIconTrezor,
    name: 'Trezor',
    type: 'TREZOR',
  },
  {
    icon: SvgIconOnekey,
    name: 'Onekey',
    type: 'ONEKEY',
  },
];

const ImportHardware = () => {
  const history = useHistory();
  const [spinning, setSpin] = useState(false);
  const { t } = useTranslation();

  const navSelectAddress = async (hardware) => {
    if (hardware === 'LEDGER') {
      history.push(
        IS_CHROME
          ? '/import/hardware/ledger-connect'
          : '/import/hardware/ledger'
      );
      return;
    }

    try {
      // setSpin(true);
      // const keyring = await wallet.connectHardware(hardware, BIP44_PATH, true);
      // setSpin(false);
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring: KEYRING_CLASS.HARDWARE[hardware],
        },
      });
    } catch (err) {
      console.log('connect error', err);
      setSpin(false);
    }
  };

  return (
    <StrayPage
      header={{
        title: t('Connect Hardware Wallet'),
        subTitle: t('Select the hardware wallet you are using'),
        center: true,
      }}
      headerClassName="mb-40"
      spinning={spinning}
    >
      <div className="flex justify-center mr-[-80px]">
        {HARDWARES.map((hardware) => {
          const Icon = hardware.icon;
          return (
            <div
              className="w-[100px] mr-[80px] text-center active:text-blue-light"
              key={hardware.name}
              onClick={() => navSelectAddress(hardware.type)}
            >
              <div className="rounded-full h-[100px] bg-white border border-white hover:border-blue-light overflow-hidden">
                <Icon className="hardware-icon" />
              </div>
              <div className="mt-20 font-medium text-20">{hardware.name}</div>
            </div>
          );
        })}
      </div>
      {/* <div className="text-center mb-[100px] text-gray-content text-14">
        {t('hardwareImportTip')}
      </div> */}
    </StrayPage>
  );
};

export default ImportHardware;
