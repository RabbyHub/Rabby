import { createPersistStore } from 'background/utils';
import dayjs from 'dayjs';

export type Store = Record<string, number>;

class HDKeyRingLastAddAddrTime {
  store!: Store;

  init = async () => {
    this.store = await createPersistStore<Store>({
      name: 'HDKeyRingLastAddAddrTime',
      template: {},
    });
  };

  addUnixRecord = (basePublicKey: string) => {
    this.store[basePublicKey] = dayjs().unix();
  };

  getStore = () => {
    return this.store;
  };
}

export default new HDKeyRingLastAddAddrTime();
