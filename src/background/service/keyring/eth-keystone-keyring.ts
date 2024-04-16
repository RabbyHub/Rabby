import { MetaMaskKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { toChecksumAddress } from 'ethereumjs-util';
import { StoredKeyring } from '@keystonehq/base-eth-keyring';
import Eth, { HDPathType as KeystoneHDPathType } from '@keystonehq/hw-app-eth';
import { LedgerHDPathType as HDPathType } from './helper';

const pathBase = 'm';

export const AcquireMemeStoreData = 'AcquireMemeStoreData';
export const MemStoreDataReady = 'MemStoreDataReady';
export const DEFAULT_BRAND = 'Keystone';

enum KEYRING_ACCOUNT {
  standard = 'account.standard',
  ledger_live = 'account.ledger_live',
  ledger_legacy = 'account.ledger_legacy',
}

const AccountTypeMap = {
  [KEYRING_ACCOUNT.standard]: HDPathType.BIP44,
  [KEYRING_ACCOUNT.ledger_live]: HDPathType.LedgerLive,
  [KEYRING_ACCOUNT.ledger_legacy]: HDPathType.Legacy,
};

export type RequestSignPayload = {
  requestId: string;
  payload: {
    type: string;
    cbor: string;
  };
};

type PagedAccount = { address: string; balance: any; index: number };

interface IStoredKeyring extends StoredKeyring {
  brandsMap: Record<string, string>;
}

export default class KeystoneKeyring extends MetaMaskKeyring {
  perPage = 5;
  memStoreData: RequestSignPayload | undefined;
  brandsMap: Record<string, string> = {};
  currentBrand: string = DEFAULT_BRAND;

  private eth: Eth | null = null;

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
  getKeystoneDevice = async () => {
    if (!this.eth) {
      this.eth = await Eth.createWithUSBTransport({
        timeout: 60000,
        disconnectListener: (device) => {
          this.eth = null;
        },
      });
    }
    return this.eth;
  };

  async getAddressesViaUSB(type: HDPathType = HDPathType.BIP44) {
    const pathMap = {
      [HDPathType.BIP44]: KeystoneHDPathType.Bip44Standard,
      [HDPathType.LedgerLive]: KeystoneHDPathType.LedgerLive,
      [HDPathType.Legacy]: KeystoneHDPathType.LedgerLegacy,
    };

    const keystoneEth = await this.getKeystoneDevice();
    const result = await keystoneEth.exportPubKeyFromUr({
      type: pathMap[type],
    });
    this.syncKeyring(result as any);
    return Promise.resolve();
  }

  async exportCurrentSignRequestIdIfExist() {
    return this.getMemStore().getState().sign?.request?.requestId ?? null;
  }

  async signTransactionViaUSB(address: string, tx: any) {
    const keystoneEth = await this.getKeystoneDevice();
    return await keystoneEth.signTransaction(this, address, tx);
  }

  async signTransactionUrViaUSB(ur: string) {
    const keystoneEth = await this.getKeystoneDevice();
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
    return AccountTypeMap[this.keyringAccount] ?? HDPathType.BIP44;
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
