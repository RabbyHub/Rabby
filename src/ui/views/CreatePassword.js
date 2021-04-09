import { useHistory } from 'react-router-dom';
import { Button, Header, Input } from 'ui/component';

const { Textarea } = Input;

const CreateMnemonic = () => {
  const history = useHistory();

  const handleSubmit = () => {

  }

  return <>
    <Header
      title="Create Password"
      subTitle="this password will be used to unlock your wallet"
    />
    <Input placeholder="Password" />
    <Input placeholder="Repeat Password" />
    <Button block onClick={handleSubmit}>Next</Button>
  </>

}

export default CreateMnemonic;
