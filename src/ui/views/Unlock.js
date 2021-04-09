import { useState } from 'react';
import { useHistory, useLocation } from "react-router-dom";
import { Input, Footer, Button } from 'ui/component';
import { useEth, useApproval } from 'ui/helper';

const Unlock = () => {
  const history = useHistory();
  const [value, setValue] = useState('');
  const eth = useEth();
  const [, handleApproval] = useApproval();

  const handleChange = ({ currentTarget: { value }}) => {
    setValue(value);
  }

  const handleNext = async () => {
    await eth.submitPassword(value);
    handleApproval(null, true);
  }

  return <>
    <h4 className="font-bold">Welcome back</h4>
    <p className="text-xs mt-2">input your password to unlock</p>
    <div className="pt-8">
      <Input onChange={handleChange} placeholder="Password" />
    </div>
    <Footer>
      <Button block onClick={handleNext}>Unlock</Button>
    </Footer>
  </>
}

export default Unlock;
