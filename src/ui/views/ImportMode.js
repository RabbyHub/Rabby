import { useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Button, Footer } from 'ui/component';

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
];

const ImportEntry = () => {
  const history = useHistory();
  const [mode, setMode] = useState('');

  const chooseImportMode = ({
    currentTarget: {
      dataset: { mode },
    },
  }) => {
    setMode(mode);
  };

  const handleNext = () => {
    history.push(`/import/${mode}`);
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
            type={mode === e.name && 'primary'}
            data-mode={e.name}
            onClick={chooseImportMode}>
            {e.label}
          </Button>
        ))}
      </div>
      <Footer.Nav nextDisabled={!mode} onNextClick={handleNext} />
    </>
  );
};

export default ImportEntry;
