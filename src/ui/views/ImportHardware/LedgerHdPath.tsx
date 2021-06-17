import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton, FieldCheckbox } from 'ui/component';
import { useWallet } from 'ui/utils';

const LEDGER_LIVE_PATH = "m/44'/60'/0'/0/0";
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

  const onSubmit = async () => {
    if (!currentPath) {
      return;
    }
    setSpin(true);
    const useLedgerLive = wallet.isUseLedgerLive();
    try {
      const keyring = await wallet.connectHardware('LEDGER', currentPath);
      if (useLedgerLive) {
        await keyring.updateTransportMethod(true);
      }
      await keyring.unlock();
      setSpin(false);
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring,
        },
      });
    } catch (err) {
      console.log('connect error', err);
      setSpin(false);
    }
  };

  const handlePathChange = (_path, checked) => {
    setCurrentPath(checked && _path);
  };

  return (
    <StrayPageWithButton
      header={{
        title: 'Select HD Path',
        center: true,
      }}
      onSubmit={onSubmit}
      hasBack
      spinning={spinning}
    >
      <div className="mt-40 mb-[188px]">
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
