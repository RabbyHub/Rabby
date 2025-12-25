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
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';

const IGNORE_CHECK = ['wallet_importAddress'];

tab.on('tabRemove', (id) => {
  sessionService.deleteSessionsByTabId(id);
});

export default async <T = void>(req: ProviderRequest): Promise<T> => {
  const {
    data: { method },
  } = req;

  const origin = req.session?.origin || req.origin;
  let account: Account | undefined = undefined;
  if (preferenceService.getPreference('isEnabledDappAccount')) {
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
        message: 'wallet must have at least one account',
      });
    }
  }

  return rpcFlow(req) as any;
};
