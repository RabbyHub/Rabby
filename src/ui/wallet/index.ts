import { EVENTS } from 'consts';

import eventBus from '@/eventBus';
import { getUITypeName } from '../utils/uiType';
import { createWallet } from './createWallet';

const walletClient = createWallet({
  name: getUITypeName(),
  onBroadcast(data) {
    eventBus.emit(data.type, data.data);
  },
});

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
export const disposeWallet = walletClient.dispose;

export { createWallet } from './createWallet';
export type { WalletMessageChannel, WalletRequest } from './createWallet';
