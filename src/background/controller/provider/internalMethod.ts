import { CHAINS_ENUM, CHAINS } from 'consts';
import providerController from './controller';
import { permissionService } from 'background/service';

const tabCheckin = ({
  data: {
    params: { origin, name, icon },
  },
  session,
}) => {
  session.setProp({ origin, name, icon });
};

const getProviderState = async (req) => {
  const {
    session: { origin },
  } = req;

  const chainEnum = permissionService.getWithoutUpdate(origin)?.chain;

  return {
    chainId: CHAINS[chainEnum || CHAINS_ENUM.ETH].id,
    accounts: await providerController.ethAccounts(req),
    networkVersion: await providerController.netVersion(req),
  };
};

export default {
  tabCheckin,
  getProviderState,
};
