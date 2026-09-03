import { ProviderRequest } from './type';

import { ethErrors } from 'eth-rpc-errors';
import { tab } from 'background/webapi';
import {
  sessionService,
  keyringService,
  preferenceService,
  permissionService,
} from 'background/service';

import rpcFlow from './rpcFlow';
import internalMethod from './internalMethod';
import { Account } from '@/background/service/preference';
import { INTERNAL_REQUEST_ORIGIN, INTERNAL_REQUEST_SESSION } from '@/constant';

const IGNORE_CHECK = ['wallet_importAddress'];

tab.on('tabRemove', (id) => {
  sessionService.deleteSessionsByTabId(id);

  // Clean up desktop tab ID references when a tab is closed
  const desktopTabIds = preferenceService.getPreference('desktopTabIds') || {};
  const updatedIds = { ...desktopTabIds };
  let changed = false;
  for (const key of Object.keys(updatedIds)) {
    if (updatedIds[key as keyof typeof updatedIds] === id) {
      updatedIds[key as keyof typeof updatedIds] = undefined;
      changed = true;
    }
  }
  if (changed) {
    preferenceService.setPreferencePartials({ desktopTabIds: updatedIds });
  }
});

export default async <T = void>(req: ProviderRequest): Promise<T> => {
  const {
    data: { method },
  } = req;

  const origin = req.signing?.origin || req.session?.origin || req.origin;
  if (req.signing) {
    req.session = {
      ...(req.session || INTERNAL_REQUEST_SESSION),
      origin: req.signing.origin,
    };
  }
  let account: Account | undefined = undefined;
  if (req.signing) {
    // A signing context is produced by the background flow owner. Its account
    // is canonical for nested flows (for example Cobo's owner), so the
    // dapp-account selector must not replace it with site state.
    account = req.signing.account;
  } else if (preferenceService.getPreference('isEnabledDappAccount')) {
    if (origin) {
      if (origin === INTERNAL_REQUEST_ORIGIN) {
        account =
          req.account || preferenceService.getCurrentAccount() || undefined;
      } else {
        const site = permissionService.getConnectedSite(origin);

        const isSpeedUpOrCancel =
          method === 'eth_sendTransaction' &&
          (req.data?.params?.[0]?.isSpeedUp || req.data?.params?.[0]?.isCancel);

        if (site?.isConnected) {
          account =
            (isSpeedUpOrCancel
              ? preferenceService.getCurrentAccount()
              : site.account) ||
            preferenceService.getCurrentAccount() ||
            undefined;
        }
      }
    }
  } else {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      account =
        req.account || preferenceService.getCurrentAccount() || undefined;
    } else {
      account = preferenceService.getCurrentAccount() || undefined;
    }
  }

  req.account = account;

  if (internalMethod[method]) {
    return internalMethod[method](req);
  }

  if (!IGNORE_CHECK.includes(method)) {
    const hasVault = keyringService.hasVault();
    if (!hasVault) {
      throw ethErrors.provider.userRejectedRequest({
        message: 'wallet must has at least one account',
      });
    }
  }

  return rpcFlow(req) as any;
};
