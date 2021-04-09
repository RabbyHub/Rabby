import { useHistory } from 'react-router-dom';
import { Button, Header, Input } from 'ui/component';

const { Textarea } = Input;

const CreateMnemonic = () => {
  const history = useHistory();

  return <>
    <Header
      title="Back"
    />
  </>

}

export default CreateMnemonic;
