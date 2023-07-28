import { DisplayedKeryring } from '@/background/service/keyring';

/**
 * @description event would be broadcasted to ALL connected wallet
 *
 * notice never send sensitive data in this event
 **/
export const enum BROADCAST_TO_UI_EVENTS {
  accountAliasNameChanged = 'accountAliasNameChanged',
  // legacy
  accountsChanged = 'accountsChanged',
}

export type BROADCAST_TO_UI_EVENTS_PAYLOAD = {
  [BROADCAST_TO_UI_EVENTS.accountAliasNameChanged]: {
    address: string;
    name: string;
  };
  [BROADCAST_TO_UI_EVENTS.accountsChanged]: DisplayedKeryring['accounts'][number];
};

export type IDisposeFunc = () => any;

export function runBroadcastDispose<T extends IDisposeFunc>(dispose: T | T[]) {
  const disposeList = Array.isArray(dispose) ? dispose : [dispose];

  disposeList.forEach((d) => d.apply(null, []));
}
