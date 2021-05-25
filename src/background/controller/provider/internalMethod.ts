import { CHAINS_ENUM, CHAINS } from 'consts';
import providerController from './controller';

const tabCheckin = ({
  data: {
    params: { origin, name, icon },
  },
  session,
}) => {
  session.setProp({ origin, name, icon });
};

const getProviderState = async (req) => {
  return {
    chainId: CHAINS[CHAINS_ENUM.ETH].id,
    accounts: await providerController.ethAccounts(req),
    networkVersion: await providerController.netVersion(req),
  };
};

export default {
  tabCheckin,
  getProviderState,
};
