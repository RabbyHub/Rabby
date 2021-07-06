import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton, FieldCheckbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import { KEYRING_CLASS } from 'consts';

const ImportMode = () => {
  const history = useHistory();
  const [currentMode, setCurrentMode] = useState('');
  const wallet = useWallet();
  const { t } = useTranslation();
  const [modes, setModes] = useState([
    {
      name: 'key',
      label: t('Import via Private Key'),
    },
    {
      name: 'json',
      label: t('Import via Keystore'),
    },
  ]);

  const loadMnemonics = async () => {
    const accounts = await wallet.getTypedAccounts(KEYRING_CLASS.MNEMONIC);

    if (!accounts?.length) {
      modes.splice(1, 0, {
        name: 'mnemonics',
        label: t('Import via Mnemonic'),
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
        secondTitle: 'Import',
      }}
      nextDisabled={!currentMode}
      onNextClick={handleNext}
      hasBack
      hasDivider
    >
      <div className="mt-20">
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
