import { useHistory, Link } from 'react-router-dom';
import { Button, Header } from 'popup/component';

const Start = () => {
  const history = useHistory();

  return <>
    <Header
      title={'Create or Import Account Number'}
      subTitle={'you can create a new account or import an existing one through seed pharse,private key or JSON file'}
      className="mb-4"
    />
    <Link to="/create"><Button>Create</Button></Link>
    <Link to="/import/mnemonic"><Button>Import</Button></Link>
  </>

}

export default Start;
