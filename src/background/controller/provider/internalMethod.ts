import { setPopupIcon } from './../../utils/index';
import { CHAINS_ENUM, CHAINS } from 'consts';
import {
  permissionService,
  keyringService,
  preferenceService,
  widgetService,
} from 'background/service';
import providerController from './controller';
// import ReactGA from 'react-ga';

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
    chainId: CHAINS[chainEnum || CHAINS_ENUM.ETH].hex,
    isUnlocked,
    accounts: isUnlocked ? await providerController.ethAccounts(req) : [],
    networkVersion: await providerController.netVersion(req),
  };
};

const providerOverwrite = ({
  data: {
    params: [val],
  },
}) => {
  preferenceService.setHasOtherProvider(val);
  return true;
};

const hasOtherProvider = () => {
  preferenceService.setHasOtherProvider(true);
  const isRabby = preferenceService.getIsDefaultWallet();
  setPopupIcon(isRabby ? 'rabby' : 'metamask');
  // ReactGA.event({
  //   category: 'User',
  //   action: 'hasMetaMask',
  // });
  return true;
};

const isDefaultWallet = () => {
  return preferenceService.getIsDefaultWallet();
};

const isWidgetDisabled = ({
  data: {
    params: [name],
  },
}) => {
  return widgetService.isWidgetDisabled(name);
};

export default {
  tabCheckin,
  getProviderState,
  providerOverwrite,
  hasOtherProvider,
  isDefaultWallet,
  isWidgetDisabled,
};
