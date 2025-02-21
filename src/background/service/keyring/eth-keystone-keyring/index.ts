import { MetaMaskKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { toChecksumAddress } from '@ethereumjs/util';
import { StoredKeyring } from '@keystonehq/base-eth-keyring';
import { Eth, default as EthLegacy } from '@keystonehq/hw-app-eth';
import { TransportWebUSB } from '@keystonehq/hw-transport-webusb';
import {
  KeystoneHDPathType,
  HDPATH_PLACEHOLDER,
  LEDGER_LIVE_LIMIT,
  keystoneAccountTypeModel,
  pathBase,
  createCryptoHDKeyFromResult,
  createCryptoAccountFromResults,
} from './utils';

export const AcquireMemeStoreData = 'AcquireMemeStoreData';
export const MemStoreDataReady = 'MemStoreDataReady';
export const DEFAULT_BRAND = 'Keystone';

export type RequestSignPayload = {
  requestId: string;
  payload: {
    type: string;
    cbor: string;
  };
};

type PagedAccount = { address: string; balance: any; index: number };

type GetDeviceReturnType<T extends boolean> = T extends true ? EthLegacy : Eth;

interface IStoredKeyring extends StoredKeyring {
  brandsMap: Record<string, string>;
}

type GetAddressResultType = {
  address: string;
  publicKey: string;
  mfp: string;
  chainCode?: string;
};

export default class KeystoneKeyring extends MetaMaskKeyring {
  perPage = 5;
  memStoreData: RequestSignPayload | undefined;
  brandsMap: Record<string, string> = {};
  currentBrand: string = DEFAULT_BRAND;

  constructor() {
    super();

    this.getInteraction().on(AcquireMemeStoreData, () => {
      const request = this.getMemStore().getState().sign?.request;

      if (request) {
        this.getInteraction().emit(MemStoreDataReady, request);
      }
    });
  }

  /**
   * Asynchronously gets the Keystone device.
   *
   * This function attempts to create an instance of `KeystoneEth` with the help of `TransportWebUSB`.
   * If the current environment does not support `WebUSB` or if it cannot find a Keystone device that supports USB signing,
   * an error is thrown.
   *
   * @async
   * @function getKeystoneDevice
   * @returns {Promise<Eth|null>} A promise that resolves to an instance of `KeystoneEth` or `null` if unable to create an instance.
   * @throws Will throw an error if the current environment does not support `WebUSB` or a Keystone device supporting USB signing could not be found.
   */
  getKeystoneDevice = async <T extends boolean = false>(
    isLegacy: T = false as T
  ): Promise<GetDeviceReturnType<T>> => {
    const transport: any = await TransportWebUSB.connect({
      timeout: 100000,
    });
    await transport.close();
    return (isLegacy
      ? new EthLegacy(transport!)
      : new Eth(transport!)) as GetDeviceReturnType<T>;
  };

  async getAddressesViaUSB(
    type: KeystoneHDPathType = KeystoneHDPathType.BIP44
  ) {
    const keystoneEth = await this.getKeystoneDevice();
    const path = keystoneAccountTypeModel.find((model) => model.type === type)!
      .hdpath;
    if (type === KeystoneHDPathType.LedgerLive) {
      const results: GetAddressResultType[] = [];
      let mfp = Buffer.from('', 'hex');
      for (let i = 0; i < LEDGER_LIVE_LIMIT; i++) {
        const result = await keystoneEth.getAddress(
          path.replace(HDPATH_PLACEHOLDER, i.toString()),
          true,
          true
        );
        results.push(result);
        mfp = Buffer.from(result.mfp, 'hex');
      }
      this.syncKeyring(createCryptoAccountFromResults(results, type, mfp));
      return Promise.resolve();
    }
    const result = await keystoneEth.getAddress(path, true, true);
    this.syncKeyring(createCryptoHDKeyFromResult(result, type));
    return Promise.resolve();
  }

  async exportCurrentSignRequestIdIfExist() {
    return this.getMemStore().getState().sign?.request?.requestId ?? null;
  }

  async signTransactionUrViaUSB(ur: string) {
    const keystoneEth = await this.getKeystoneDevice(true);
    return await keystoneEth.signTransactionFromUr(ur);
  }

  async getAccountInfo(address: string) {
    const currentAccount = (await this.getCurrentAccounts()).find((account) => {
      return account.address?.toUpperCase() === address?.toUpperCase();
    });
    return {
      address,
      index: currentAccount?.index,
      balance: null,
      hdPathType: await this.getCurrentUsedHDPathType(),
      hdPathBasePublicKey: this.xpub,
    };
  }

  async getCurrentUsedHDPathType() {
    return keystoneAccountTypeModel.find(
      (model) => model.keyringType === this.keyringAccount
    )?.type;
  }

  async serialize(): Promise<IStoredKeyring> {
    const data = await super.serialize();
    return {
      ...data,
      brandsMap: this.brandsMap,
    };
  }

  deserialize(opts?: IStoredKeyring) {
    super.deserialize(opts);
    if (opts?.brandsMap) {
      this.brandsMap = opts.brandsMap;
    }
    this.accounts.forEach((account) => {
      if (!this.brandsMap[account.toLowerCase()]) {
        this.brandsMap[account.toLowerCase()] = DEFAULT_BRAND;
      }
    });
  }

  async getMaxAccountLimit() {
    if (!this.initialized) {
      await this.readKeyring();
    }
    if (this.keyringMode === 'pubkey') {
      return Object.keys(this.paths).length;
    }
  }

  async getAddresses(start: number, end: number) {
    if (!this.initialized) {
      await this.readKeyring();
    }
    if (this.keyringMode === 'pubkey') {
      end = Math.min(end, Object.keys(this.paths).length);
      start = Math.min(start, end);
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
        index: i + 1,
      });
      this.indexes[toChecksumAddress(address)] = i;
    }
    return accounts;
  }

  async getAccountsWithBrand() {
    const accounts = await this.getAccounts();
    return accounts.map((account) => ({
      address: account,
      brandName: this.brandsMap[account.toLowerCase()] || DEFAULT_BRAND,
    }));
  }

  async getFirstPage(): Promise<PagedAccount[]> {
    const pagedAccount = await super.getFirstPage();
    pagedAccount.forEach((account) => (account.index += 1));
    return pagedAccount;
  }

  async getNextPage(): Promise<PagedAccount[]> {
    const pagedAccount = await super.getNextPage();
    pagedAccount.forEach((account) => (account.index += 1));
    return pagedAccount;
  }

  setCurrentBrand(brand: string) {
    this.currentBrand = brand;
  }

  async addAccounts(n = 1): Promise<string[]> {
    const accounts = await super.addAccounts(n);
    accounts.forEach((account) => {
      if (!this.brandsMap[account.toLowerCase()]) {
        this.brandsMap[account.toLowerCase()] = this.currentBrand;
      }
    });

    return accounts;
  }

  removeAccount = (address: string) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    super.removeAccount(address);
    delete this.brandsMap[address.toLowerCase()];
  };

  getCurrentAccounts = async () => {
    const addrs = await this.getAccounts();

    return addrs.map((address) => {
      const checksummedAddress = toChecksumAddress(address);

      return {
        address,
        index: this.indexes[checksummedAddress] + 1,
      };
    });
  };

  isReady = async () => {
    return this.initialized;
  };

  getCurrentBrand = async () => {
    return this.currentBrand;
  };

  checkAllowImport = async (brand: string) => {
    const [account] = await this.getAccountsWithBrand();

    if (!account) {
      await this.forgetDevice();
      return {
        allowed: true,
      };
    }

    return {
      brand: account.brandName,
      allowed: account.brandName === brand,
    };
  };
}
