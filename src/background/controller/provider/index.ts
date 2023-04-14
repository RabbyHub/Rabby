import { ProviderRequest } from './type';

import { ethErrors } from 'eth-rpc-errors';
import { tab } from 'background/webapi';
import {
  sessionService,
  keyringService,
  contextMenuService,
} from 'background/service';

import rpcFlow from './rpcFlow';
import internalMethod from './internalMethod';

tab.on('tabRemove', (id) => {
  sessionService.deleteSession(id);
});

export default async <T = void>(req: ProviderRequest): Promise<T> => {
  const {
    data: { method },
  } = req;

  if (internalMethod[method]) {
    return internalMethod[method](req);
  }

  const hasVault = keyringService.hasVault();
  if (!hasVault) {
    throw ethErrors.provider.userRejectedRequest({
      message: 'wallet must has at least one account',
    });
  }

  return rpcFlow(req) as any;
};
