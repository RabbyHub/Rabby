import { CHAINS_ENUM, CHAINS } from 'consts';
import { permissionService, keyringService } from 'background/service';
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
  const {
    session: { origin },
  } = req;

  const chainEnum = permissionService.getWithoutUpdate(origin)?.chain;
  const isUnlocked = keyringService.memStore.getState().isUnlocked;

  return {
    chainId: CHAINS[chainEnum || CHAINS_ENUM.ETH].id,
    isUnlocked,
    accounts: isUnlocked ? await providerController.ethAccounts(req) : [],
    networkVersion: await providerController.netVersion(req),
  };
};

export default {
  tabCheckin,
  getProviderState,
};
