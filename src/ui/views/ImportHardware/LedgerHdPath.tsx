import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrayPageWithButton, FieldCheckbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import { IS_AFTER_CHROME91, HARDWARE_KEYRING_TYPES } from 'consts';

export const LEDGER_LIVE_PATH = "m/44'/60'/0'/0/0";
const MEW_PATH = "m/44'/60'/0'";
export const BIP44_PATH = "m/44'/60'/0'/0";

const HD_PATHS = [
  { name: 'Ledger Live', value: LEDGER_LIVE_PATH },
  { name: 'Legacy (MEW / MyCrypto)', value: MEW_PATH },
  { name: 'BIP44 Standard', value: BIP44_PATH },
];

const LedgerHdPath = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [currentPath, setCurrentPath] = useState(LEDGER_LIVE_PATH);
  const [spinning, setSpin] = useState(false);

  const { t } = useTranslation();

  const onSubmit = async () => {
    if (!currentPath) {
      return;
    }
    setSpin(true);
    const useLedgerLive = await wallet.isUseLedgerLive();
    const isSupportWebUSB = await TransportWebHID.isSupported();
    const keyringId = await wallet.connectHardware({
      type: HARDWARE_KEYRING_TYPES.Ledger.type,
      hdPath: currentPath,
    });
    try {
      if (IS_AFTER_CHROME91 && isSupportWebUSB && !useLedgerLive) {
        await wallet.requestKeyring(
          HARDWARE_KEYRING_TYPES.Ledger.type,
          'cleanUp',
          keyringId
        );
        const transport = await TransportWebHID.create();
        await transport.close();
      }
      setSpin(false);
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring: HARDWARE_KEYRING_TYPES.Ledger.type,
          path: currentPath,
          isWebUSB: !useLedgerLive && isSupportWebUSB,
          keyringId,
          ledgerLive: useLedgerLive,
        },
      });
    } catch (err) {
      console.log('connect error', err);
      message.error(
        'Connection is not available, please try to kill the browser and relaunch again'
      );
      setSpin(false);
    }
  };

  const handlePathChange = (_path, checked) => {
    setCurrentPath(checked && _path);
  };

  return (
    <StrayPageWithButton
      header={{
        title: t('Select HD Path'),
        center: true,
      }}
      headerClassName="mb-40"
      onSubmit={onSubmit}
      hasBack
      spinning={spinning}
      footerFixed={false}
    >
      <div>
        {HD_PATHS.map((path) => (
          <FieldCheckbox
            key={path.name}
            checked={currentPath === path.value}
            onChange={(checked) => handlePathChange(path.value, checked)}
          >
            {path.name}
          </FieldCheckbox>
        ))}
      </div>
    </StrayPageWithButton>
  );
};

export default LedgerHdPath;
