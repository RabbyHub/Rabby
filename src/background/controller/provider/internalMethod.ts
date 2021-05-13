import { CHAINS_ENUM, CHAINS } from 'consts';

const tabCheckin = ({
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
  tabCheckin,
  getProviderState,
};
