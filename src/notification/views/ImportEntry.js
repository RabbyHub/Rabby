import { useState } from 'react';
import { useHistory } from "react-router-dom";
import { Button, Footer } from 'popup/component';

const ImportEntry = () => {
  const history = useHistory();
  const [mode, setMode] = useState('');

  const chooseImportMode = ({ currentTarget: { dataset: { mode } } }) => {
    setMode(mode);
  }

  const handleNext = () => {
    history.push(`/import/${mode}`);
  }

  return <>
    <h4 className="font-bold">How You Want to Import</h4>
    <p className="text-xs mt-2">
      Please select from the options below which method you would like to import the address
    </p>
    <div className="pt-8 space-y-4">
      <Button
        block
        type="primary"
        data-mode="key"
        onClick={chooseImportMode}
      >
        Import Private Key
      </Button>
      <Button
        block
        onClick={chooseImportMode}
      >
        Import Mnemonics
      </Button>
      <Button
        block
        onClick={chooseImportMode}
      >
        Import JSON File
      </Button>
    </div>
    <Footer.Nav nextDisabled={!mode} onNextClick={handleNext} />
  </>
}

export default ImportEntry;
