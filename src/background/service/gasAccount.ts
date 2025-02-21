import { createPersistStore } from 'background/utils';

export type GasAccountRecord = {
  chain_id: string;
  token_id: string;
  amount: number;
};

export type GasAccountServiceStore = {
  accountId?: string;
  sig?: string;
  account?: {
    address: string;
    type: string;
    brandName: string;
  };
};

class GasAccountService {
  store: GasAccountServiceStore = {
    sig: undefined,
    accountId: undefined,
  };

  init = async () => {
    const storage = await createPersistStore<GasAccountServiceStore>({
      name: 'gasAccount',
      template: {},
    });

    this.store = storage || this.store;
  };

  getGasAccountData = (key?: keyof GasAccountServiceStore) => {
    return key ? this.store[key] : { ...this.store };
  };

  getGasAccountSig = () => {
    return { sig: this.store.sig, accountId: this.store.accountId };
  };

  setGasAccountSig = (
    sig?: string,
    account?: GasAccountServiceStore['account']
  ) => {
    if (!sig || !account) {
      this.store.sig = undefined;
      this.store.accountId = undefined;
      this.store.account = undefined;
    } else {
      this.store.sig = sig;
      this.store.accountId = account?.address;
      this.store.account = {
        ...account!,
      };
    }
  };
}

export default new GasAccountService();
