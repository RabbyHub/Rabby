import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton, FieldCheckbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import { KEYRING_CLASS } from 'background/service/keyring';

const ImportMode = () => {
  const history = useHistory();
  const [currentMode, setCurrentMode] = useState('');
  const wallet = useWallet();
  const [modes, setModes] = useState([
    {
      name: 'key',
      label: 'Import Private Key',
    },
    {
      name: 'json',
      label: 'Import JSON File',
    },
  ]);

  const loadMnemonics = async () => {
    const accounts = await wallet.getTypedAccounts(KEYRING_CLASS.MNEMONIC);

    if (!accounts?.length) {
      modes.splice(1, 0, {
        name: 'mnemonics',
        label: 'Import Mnemonics',
      });
      setModes([...modes]);
    }
  };

  useEffect(() => {
    loadMnemonics();
  }, []);

  const chooseImportMode = (mode, checked) => {
    setCurrentMode(checked && mode);
  };

  const handleNext = () => {
    const route = `/import/${currentMode}`;

    if (currentMode === 'hardware') {
      wallet.openIndexPage(route);
      return;
    }

    history.push(route);
  };

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'How You Want to Import',
        subTitle:
          'Please select from the options below which method you would like to import the address',
      }}
      nextDisabled={!currentMode}
      onNextClick={handleNext}
      hasBack
      hasDivider
    >
      <div className="mt-32">
        {modes.map((e) => (
          <FieldCheckbox
            key={e.name}
            checked={e.name === currentMode}
            onChange={(checked) => chooseImportMode(e.name, checked)}
          >
            <div>{e.label}</div>
          </FieldCheckbox>
        ))}
      </div>
    </StrayPageWithButton>
  );
};

export default ImportMode;
