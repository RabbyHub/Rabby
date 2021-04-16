import { useEffect, useState, useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useWallet } from 'ui/helper';

const PrivateRoute = ({ children, ...restProps }) => {
  const wallet = useWallet();
  const [hasAccount, setHasAccount] = useState(null);
  const noVaultPath = '/password';

  const fetchVault = async () => {
    const accounts = await wallet.getAccounts();

    setHasAccount(accounts?.length);
  }

  useEffect(() => {
    fetchVault();
  }, []);

  return (
    hasAccount === null
      ? 'loading'
      : <Route {...restProps} render={() => hasAccount ? children : <Redirect to={noVaultPath} />} />
  );
}

export default PrivateRoute;
