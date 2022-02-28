import { MetaMaskKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { toChecksumAddress } from 'ethereumjs-util';

const pathBase = 'm';

export const AcquireMemeStoreData = 'AcquireMemeStoreData';
export const MemStoreDataReady = 'MemStoreDataReady';

export type RequestSignPayload = {
  requestId: string;
  payload: {
    type: string;
    cbor: string;
  };
};

export default class KeystoneKeyring extends MetaMaskKeyring {
  perPage = 10;
  memStoreData: RequestSignPayload | undefined;
  constructor() {
    super();
    this.getMemStore().subscribe((data) => {
      const request = data.sign?.request;
      this.getInteraction().once(AcquireMemeStoreData, () => {
        if (request) {
          this.getInteraction().emit(MemStoreDataReady, request);
        }
      });
    });
  }

  async getAddresses(start: number, end: number) {
    if (!this.initialized) {
      await this.readKeyring();
    }
    const accounts: {
      address: string;
      balance: number | null;
      index: number;
    }[] = [];
    for (let i = start; i < end; i++) {
      const address = await this.__addressFromIndex(pathBase, i);
      accounts.push({
        address,
        balance: null,
        index: i,
      });
      this.indexes[toChecksumAddress(address)] = i;
    }
    return accounts;
  }
}
