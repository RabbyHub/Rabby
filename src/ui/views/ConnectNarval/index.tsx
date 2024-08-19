import { useWallet } from '@/ui/utils';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const ConnectNarval = () => {
  const history = useHistory();
  const wallet = useWallet();

  useEffect(() => {
    const init = async () => {
      const connections = await wallet.getNarvalConnections();

      if (!connections.length) {
        history.push({
          pathname: '/import/narval/connection-form',
        });
      } else {
        history.push({
          pathname: '/import/narval/connections-list',
          state: { connections },
        });
      }
    };

    init();
  }, []);

  return null;
};

export default ConnectNarval;
