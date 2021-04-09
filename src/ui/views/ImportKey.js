import { useState, useContext } from 'react';
import { Input, Footer } from 'ui/component';
import { useEth, useApproval } from 'ui/helper';

const ImportKey = () => {
  const [key, setKey] = useState('');
  const eth = useEth();
  const [, handleApproval] = useApproval();

  const handleChange = ({ currentTarget: { value }}) => {
    setKey(value);
  }

  const handleNext = async () => {
    try {
      await eth.importKey(key);
      eth.hasVault(true);

      handleApproval(null, true);
    } catch (err) {
      console.error('err', err)
    }
  }

  return <>
    <h4 className="font-bold">Import Private Key</h4>
    <p className="text-xs mt-2">Please input your private key below</p>
    <div className="pt-8">
      <Input onChange={handleChange} placeholder="Private key" />
    </div>
    <Footer.Nav nextDisabled={!key} onNextClick={handleNext} />
  </>
}

export default ImportKey;
