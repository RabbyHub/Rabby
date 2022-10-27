import { setPopupIcon } from './../../utils/index';
import { CHAINS_ENUM, CHAINS } from 'consts';
import {
  permissionService,
  keyringService,
  preferenceService,
  widgetService,
} from 'background/service';
import providerController from './controller';
import ReactGA from 'react-ga';

const networkIdMap: {
  [key: string]: string;
} = {};

const tabCheckin = ({
  data: {
    params: { name, icon },
  },
  session,
  origin,
}) => {
  session.setProp({ origin, name, icon });
};

const getProviderState = async (req) => {
  const {
    session: { origin },
  } = req;

  const chainEnum =
    permissionService.getWithoutUpdate(origin)?.chain || CHAINS_ENUM.ETH;
  const isUnlocked = keyringService.memStore.getState().isUnlocked;
  let networkVersion = '1';
  if (networkIdMap[chainEnum]) {
    networkVersion = networkIdMap[chainEnum];
  } else {
    networkVersion = await providerController.netVersion(req);
    networkIdMap[chainEnum] = networkVersion;
  }
  return {
    chainId: CHAINS[chainEnum].hex,
    isUnlocked,
    accounts: isUnlocked ? await providerController.ethAccounts(req) : [],
    networkVersion,
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
  ReactGA.event({
    category: 'User',
    action: 'hasMetaMask',
  });
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
