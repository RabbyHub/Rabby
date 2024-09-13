import { MetaMaskKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { toChecksumAddress } from 'ethereumjs-util';
import { StoredKeyring } from '@keystonehq/base-eth-keyring';
import { Eth, default as EthLegacy } from '@keystonehq/hw-app-eth';
import { TransportWebUSB } from '@keystonehq/hw-transport-webusb';
import {
  CryptoAccount,
  CryptoOutput,
  CryptoHDKey,
  CryptoKeypath,
  PathComponent,
} from '@keystonehq/bc-ur-registry-eth';
import { LedgerHDPathType as HDPathType } from './helper';

const pathBase = 'm';
const HDPATH_PLACEHOLDER = 'x';

const LEDGER_LIVE_LIMIT = 10;

export const AcquireMemeStoreData = 'AcquireMemeStoreData';
export const MemStoreDataReady = 'MemStoreDataReady';
export const DEFAULT_BRAND = 'Keystone';

const keystoneAccountTypeModel = [
  {
    keyringType: 'account.standard',
    rabbyType: HDPathType.BIP44,
    hdpath: "m/44'/60'/0'",
    childrenPath: new CryptoKeypath([
      new PathComponent({
        index: 0,
        hardened: false,
      }),
      new PathComponent({
        hardened: false,
      }),
    ]),
  },
  {
    keyringType: 'account.ledger_live',
    rabbyType: HDPathType.LedgerLive,
    hdpath: `m/44'/60'/${HDPATH_PLACEHOLDER}'/0/0`,
  },
  {
    keyringType: 'account.ledger_legacy',
    rabbyType: HDPathType.Legacy,
    hdpath: "m/44'/60'/0'",
    childrenPath: new CryptoKeypath([
      new PathComponent({
        hardened: false,
      }),
    ]),
  },
];

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

const createCryptoHDKeyFromResult = (
  result: GetAddressResultType,
  type: HDPathType = HDPathType.BIP44
): CryptoHDKey => {
  const currentType = keystoneAccountTypeModel.find(
    (model) => model.rabbyType === type
  )!;
  return new CryptoHDKey({
    chainCode: Buffer.from(result.chainCode!, 'hex'),
    isMaster: false,
    children: currentType.childrenPath,
    key: Buffer.from(result.publicKey, 'hex'),
    parentFingerprint: Buffer.from(result.mfp, 'hex'),
    origin: new CryptoKeypath(
      currentType.hdpath.split('/').map((component) => {
        return new PathComponent({
          index: parseInt(component),
          hardened: component.endsWith("'"),
        });
      }),
      Buffer.from(result.mfp, 'hex')
    ),
    note: keystoneAccountTypeModel.find((model) => model.rabbyType === type)
      ?.keyringType,
  });
};

const createCryptoAccountFromResults = (
  results: GetAddressResultType[],
  type: HDPathType = HDPathType.BIP44,
  mfp: Buffer
): CryptoAccount => {
  return new CryptoAccount(
    mfp,
    results.map((result) => {
      return new CryptoOutput([], createCryptoHDKeyFromResult(result, type));
    })
  );
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

  async getAddressesViaUSB(type: HDPathType = HDPathType.BIP44) {
    const keystoneEth = await this.getKeystoneDevice();
    const path = keystoneAccountTypeModel.find(
      (model) => model.rabbyType === type
    )!.hdpath;
    if (type === HDPathType.LedgerLive) {
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
    )?.rabbyType;
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
