import { setPopupIcon } from './../../utils/index';
import { CHAINS_ENUM, CHAINS } from 'consts';
import {
  permissionService,
  keyringService,
  preferenceService,
} from 'background/service';
import providerController from './controller';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { browser } from 'webextension-polyfill-ts';

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
  return true;
};

const isDefaultWallet = () => {
  return preferenceService.getIsDefaultWallet();
};

const detectPhishSite = async (req) => {
  const origin = req.data.params.origin;
  const isPhishing = await preferenceService.detectPhishSite(origin);

  if (isPhishing) {
    matomoRequestEvent({
      category: 'PhishSite',
      action: 'active',
      label: origin,
    });
  }

  return isPhishing;
};

const closePhishSite = async (req) => {
  const origin = req.data.params.origin;
  matomoRequestEvent({
    category: 'PhishSite',
    action: 'close',
    label: origin,
  });

  // close current tab
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    browser.tabs.remove(tab.id);
  }
};

const continuePhishSite = async (req) => {
  const origin = req.data.params.origin;

  matomoRequestEvent({
    category: 'PhishSite',
    action: 'continue',
    label: origin,
  });

  return await preferenceService.continuePhishSite(origin);
};

export default {
  tabCheckin,
  getProviderState,
  providerOverwrite,
  hasOtherProvider,
  isDefaultWallet,
  detectPhishSite,
  closePhishSite,
  continuePhishSite,
};
