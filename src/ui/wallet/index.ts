import { EVENTS } from 'consts';

import eventBus from '@/eventBus';
import type { PublicOpenapiStore } from '@/services/openapi';
import type { PersistedStoreSnapshot } from '@/types/persistedStore';
import { createUIOpenapiRuntime } from '../service/openapi';
import { onBackgroundStoreChanged } from '../utils/broadcastToUI';
import { getUITypeName } from '../utils/uiType';
import { createWallet } from './createWallet';

const walletClient = createWallet({
  name: getUITypeName(),
  onBroadcast(data) {
    eventBus.emit(data.type, data.data);
  },
});

const uiOpenapiRuntime = createUIOpenapiRuntime({
  async load() {
    return (await walletClient.request({
      type: 'controller',
      method: 'getStorageSnapshot',
      params: ['openapi'],
    })) as PersistedStoreSnapshot<'openapi'>;
  },
  async commit(partials: Partial<PublicOpenapiStore>) {
    await walletClient.request({
      type: 'controller',
      method: 'setStorageItem',
      params: ['openapi', partials, []],
    });
  },
  subscribe(listener) {
    return onBackgroundStoreChanged(
      'openapi',
      ({ origin, partials, revision }) => {
        listener({ origin, partials, revision });
      }
    );
  },
  onReconnect: walletClient.onReconnect,
});

walletClient.setNamespace('openapi', uiOpenapiRuntime.openapi);

eventBus.addEventListener(EVENTS.broadcastToBackground, (data) => {
  void walletClient.request({
    type: 'broadcast',
    method: data.method,
    params: data.data,
  });
});

export const wallet = walletClient.wallet;
export const walletReady = walletClient.ready;
export const walletRequest = walletClient.request;
export const onWalletReconnect = walletClient.onReconnect;
export const disposeWallet = () => {
  uiOpenapiRuntime.dispose();
  walletClient.dispose();
};

export { createWallet } from './createWallet';
export type { WalletMessageChannel, WalletRequest } from './createWallet';
