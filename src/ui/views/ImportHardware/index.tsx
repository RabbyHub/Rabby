import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { StrayPage } from 'ui/component';
import {
  SvgIconBitBox02,
  SvgIconOnekey,
  SvgIconTrezor,
  ImportLedgerIcon,
} from 'ui/assets';
import { IS_CHROME, KEYRING_CLASS } from 'consts';

import './index.css';

const HARDWARES = [
  {
    icon: SvgIconBitBox02,
    name: 'BitBox02',
    type: 'BITBOX02',
  },
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
  const query = new URLSearchParams(history.location.search);
  const connectType = query.get('connectType');
  const brand = query.get('brand');
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
      let search = `?hd=${KEYRING_CLASS.HARDWARE[hardware]}`;
      if (brand) {
        search += `&brand=${brand}`;
      }
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring: KEYRING_CLASS.HARDWARE[hardware],
          brand,
        },
        search,
      });
    } catch (err) {
      console.log('connect error', err);
      setSpin(false);
    }
  };
  if (connectType) {
    navSelectAddress(connectType);
  }
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
      {/* <div className="text-center mb-[100px] text-r-neutral-body text-14">
        {t('hardwareImportTip')}
      </div> */}
    </StrayPage>
  );
};

export default ImportHardware;
