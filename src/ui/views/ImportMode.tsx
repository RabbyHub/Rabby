import React from 'react';
import { useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'antd';
import { Footer } from 'ui/component';
import { useWallet } from 'ui/utils';

const entries = [
  {
    name: 'key',
    label: 'Import Private Key',
  },
  {
    name: 'mnemonics',
    label: 'Import Mnemonics',
  },
  {
    name: 'json',
    label: 'Import JSON File',
  },
  {
    name: 'hardware',
    label: 'Connect hardware',
  },
];

const ImportEntry = () => {
  const history = useHistory();
  const [mode, setMode] = useState('');
  const wallet = useWallet();

  const chooseImportMode = (mode) => {
    setMode(mode);
  };

  const handleNext = () => {
    const route = `/import/${mode}`;

    if (mode === 'hardware') {
      wallet.openIndexPage(route);
      return;
    }

    history.push(route);
  };

  return (
    <>
      <h4 className="font-bold">How You Want to Import</h4>
      <p className="text-xs mt-2">
        Please select from the options below which method you would like to
        import the address
      </p>
      <div className="pt-8 space-y-4">
        {entries.map((e) => (
          <Button
            block
            key={e.name}
            type={mode === e.name ? 'primary' : undefined}
            onClick={() => chooseImportMode(e.name)}
          >
            {e.label}
          </Button>
        ))}
      </div>
      <Footer.Nav nextDisabled={!mode} onNextClick={handleNext} />
    </>
  );
};

export default ImportEntry;
