import { CHAINS_ENUM, CHAINS } from 'consts';

const tabConnect = ({
  data: {
    params: { origin, name, icon },
  },
  session,
}) => {
  session.setProp({ origin, name, icon });
};

const getProviderState = (req) => {
  return {
    chainId: CHAINS[CHAINS_ENUM.ETH].id,
    // accounts: methodMap.getAccounts(req),
  };
};

export default {
  tabConnect,
  getProviderState,
};
