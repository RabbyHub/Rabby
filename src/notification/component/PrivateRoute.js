import { useEffect, useState, useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useEth } from 'popup/utils';

const PrivateRoute = ({ children, ...restProps }) => {
  const eth = useEth();
  const [hasAccount, setHasAccount] = useState(null);
  const noVaultPath = '/import';

  const fetchVault = async () => {
    const accounts = await eth.getAccounts();
    setHasAccount(accounts.length);
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
