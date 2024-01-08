import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import { StrayPageWithButton, FieldCheckbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import { KEYRING_CLASS } from 'consts';
import ImportIcon from 'ui/assets/import-icon.svg';

const ImportMode = () => {
  const history = useHistory();
  const [currentMode, setCurrentMode] = useState('');
  const wallet = useWallet();
  const { t } = useTranslation();
  const [modes, setModes] = useState<
    { name: string; label: string; disabled?: boolean; tip?: string }[]
  >([
    {
      name: 'key',
      label: t('Import via Private Key'),
    },
    {
      name: 'json',
      label: t('Import via KeyStore'),
    },
  ]);

  const loadMnemonics = async () => {
    const accounts = await wallet.getTypedAccounts(KEYRING_CLASS.MNEMONIC);
    if (accounts.length <= 0) {
      modes.splice(1, 0, {
        name: 'mnemonics',
        label: t('Import via Seed Phrase'),
      });
    } else {
      modes.push({
        name: 'mnemonics',
        label: t('Import via Seed Phrase'),
        disabled: true,
        tip: t('MnemonicDisableTip'),
      });
    }
    setModes([...modes]);
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
      nextDisabled={!currentMode}
      onNextClick={handleNext}
      hasBack
      hasDivider
      noPadding
    >
      <header className="create-new-header create-password-header h-[234px] dark:bg-r-blue-disable">
        <img
          className="unlock-logo w-[128px] h-[128px] mx-auto"
          src={ImportIcon}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t('Import')}
        </p>
      </header>
      <div className="pt-32 px-20">
        {modes.map((e) => (
          <Tooltip title={e.tip} key={e.name}>
            <div>
              <FieldCheckbox
                key={e.name}
                disable={e.disabled}
                checked={e.name === currentMode}
                onChange={(checked) => chooseImportMode(e.name, checked)}
              >
                <div>{e.label}</div>
              </FieldCheckbox>
            </div>
          </Tooltip>
        ))}
      </div>
    </StrayPageWithButton>
  );
};

export default ImportMode;
