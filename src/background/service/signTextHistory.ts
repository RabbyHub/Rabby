import { createPersistStore } from 'background/utils';
import permissionService, { ConnectedSite } from './permission';

export interface SignTextHistoryItem {
  site: ConnectedSite;
  createAt: number;
  text: string;
  type:
    | 'personalSign'
    | 'ethSignTypedData'
    | 'ethSignTypedDataV1'
    | 'ethSignTypedDataV3'
    | 'ethSignTypedDataV4';
}

interface SignTextHistoryStore {
  history: Record<string, SignTextHistoryItem[]>;
}

class PermissionService {
  store: SignTextHistoryStore = {
    history: {},
  };

  init = async () => {
    const storage = await createPersistStore<SignTextHistoryStore>({
      name: 'signTextHistory',
      template: {
        history: {},
      },
    });
    this.store = storage || this.store;
  };

  createHistory = ({
    address,
    origin,
    text,
    type,
  }: {
    address: string;
    origin: string;
    text: string;
    type: SignTextHistoryItem['type'];
  }) => {
    const site = permissionService.getConnectedSite(origin);
    if (!site) return;
    const history = this.store.history[address.toLowerCase()] || [];

    this.store.history = {
      ...this.store.history,
      [address.toLowerCase()]: [
        ...history,
        {
          site,
          createAt: Date.now(),
          text: typeof text === 'string' ? text : JSON.stringify(text),
          type,
        },
      ],
    };
  };

  getHistory = (address: string) => {
    const list = this.store.history[address.toLowerCase()] || [];
    return list.sort((a, b) => (a.createAt - b.createAt > 0 ? -1 : 1));
  };

  removeList = (address: string) => {
    delete this.store.history[address.toLowerCase()];
  };
}

export default new PermissionService();
