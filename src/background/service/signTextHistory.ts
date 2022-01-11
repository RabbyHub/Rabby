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
        { site, createAt: Date.now(), text, type },
      ],
    };
  };

  getHistory = () => {
    return this.store.history;
  };
}

export default new PermissionService();
