/// fork from https://github.com/MetaMask/KeyringController/blob/master/index.js

import { EventEmitter } from 'events';
import log from 'loglevel';
import * as encryptor from '@metamask/browser-passworder';
import * as ethUtil from 'ethereumjs-util';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { ObservableStore } from '@metamask/obs-store';
import {
  normalizeAddress,
  setPageStateCacheWhenPopupClose,
  hasWalletConnectPageStateCache,
} from 'background/utils';
import SimpleKeyring from '@rabby-wallet/eth-simple-keyring';
import HdKeyring from '@rabby-wallet/eth-hd-keyring';
import WatchKeyring from '@rabby-wallet/eth-watch-keyring';
import BitBox02Keyring from './eth-bitbox02-keyring/eth-bitbox02-keyring';
import LedgerBridgeKeyring from './eth-ledger-keyring';
import { WalletConnectKeyring } from '@rabby-wallet/eth-walletconnect-keyring';
import CoinbaseKeyring from '@rabby-wallet/eth-coinbase-keyring';
import TrezorKeyring from './eth-trezor-keyring/eth-trezor-keyring';
import OnekeyKeyring from './eth-onekey-keyring/eth-onekey-keyring';
import LatticeKeyring from './eth-lattice-keyring/eth-lattice-keyring';
import KeystoneKeyring from './eth-keystone-keyring';
import CoboArgusKeyring from './eth-cobo-argus-keyring';
import GnosisKeyring, {
  TransactionBuiltEvent,
  TransactionConfirmedEvent,
} from './eth-gnosis-keyring';
import preference from '../preference';
import i18n from '../i18n';
import { KEYRING_TYPE, EVENTS, KEYRING_CLASS } from 'consts';
import DisplayKeyring from './display';
import eventBus from '@/eventBus';
import { isSameAddress } from 'background/utils';
import contactBook from '../contactBook';
import { generateAliasName } from '@/utils/account';
import * as Sentry from '@sentry/browser';
import { GET_WALLETCONNECT_CONFIG, allChainIds } from '@/utils/walletconnect';
import { EthImKeyKeyring } from './eth-imkey-keyring/eth-imkey-keyring';
import { getKeyringBridge, hasBridge } from './bridge';
import { getChainList } from '@/utils/chain';

export const KEYRING_SDK_TYPES = {
  SimpleKeyring,
  HdKeyring,
  BitBox02Keyring,
  TrezorKeyring,
  LedgerBridgeKeyring,
  OnekeyKeyring,
  WatchKeyring,
  WalletConnectKeyring,
  GnosisKeyring,
  LatticeKeyring,
  KeystoneKeyring,
  CoboArgusKeyring,
  CoinbaseKeyring,
  EthImKeyKeyring,
};

interface MemStoreState {
  isUnlocked: boolean;
  keyringTypes: any[];
  keyrings: any[];
  preMnemonics: string;
}

export interface DisplayedKeryring {
  type: string;
  accounts: {
    address: string;
    brandName: string;
    type?: string;
    keyring?: DisplayKeyring;
    alianName?: string;
  }[];
  keyring: DisplayKeyring;
  byImport?: boolean;
  publicKey?: string;
}

export class KeyringService extends EventEmitter {
  //
  // PUBLIC METHODS
  //
  keyringTypes: any[];
  store!: ObservableStore<any>;
  memStore: ObservableStore<MemStoreState>;
  keyrings: any[];
  encryptor: typeof encryptor = encryptor;
  password: string | null = null;

  constructor() {
    super();
    this.keyringTypes = Object.values(KEYRING_SDK_TYPES);
    this.memStore = new ObservableStore({
      isUnlocked: false,
      keyringTypes: this.keyringTypes.map((krt) => krt.type),
      keyrings: [],
      preMnemonics: '',
    });

    this.keyrings = [];
  }

  loadStore(initState) {
    this.store = new ObservableStore(initState);
  }

  async boot(password: string) {
    this.password = password;
    const encryptBooted = await this.encryptor.encrypt(password, 'true');
    this.store.updateState({ booted: encryptBooted });
    this.memStore.updateState({ isUnlocked: true });
  }

  isBooted() {
    return !!this.store.getState().booted;
  }

  hasVault() {
    return !!this.store.getState().vault;
  }

  /**
   * Full Update
   *
   * Emits the `update` event and @returns a Promise that resolves to
   * the current state.
   *
   * Frequently used to end asynchronous chains in this class,
   * indicating consumers can often either listen for updates,
   * or accept a state-resolving promise to consume their results.
   *
   * @returns {Object} The controller state.
   */
  fullUpdate(): MemStoreState {
    this.emit('update', this.memStore.getState());
    return this.memStore.getState();
  }

  /**
   * Import Keychain using Private key
   *
   * @emits KeyringController#unlock
   * @param {string} privateKey - The privateKey to generate address
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  importPrivateKey(privateKey: string): Promise<any> {
    let keyring;

    return this.persistAllKeyrings()
      .then(this.addNewKeyring.bind(this, 'Simple Key Pair', [privateKey]))
      .then(async (_keyring) => {
        keyring = _keyring;
        const [address] = await keyring.getAccounts();
        const keyrings = await this.getAllTypedAccounts();
        if (!contactBook.getContactByAddress(address)) {
          const alias = generateAliasName({
            keyringType: KEYRING_TYPE.SimpleKeyring,
            keyringCount:
              keyrings.filter(
                (keyring) => keyring.type === KEYRING_TYPE.SimpleKeyring
              ).length - 1,
          });
          contactBook.addAlias({
            address,
            name: alias,
          });
        }
        return this.persistAllKeyrings.bind(this);
      })
      .then(this.setUnlocked.bind(this))
      .then(this.fullUpdate.bind(this))
      .then(() => keyring);
  }

  generateMnemonic(): string {
    return bip39.generateMnemonic(wordlist);
  }

  async generatePreMnemonic(): Promise<string> {
    if (!this.password) {
      throw new Error(i18n.t('background.error.unlock'));
    }
    const mnemonic = this.generateMnemonic();
    const preMnemonics = await this.encryptor.encrypt(this.password, mnemonic);
    this.memStore.updateState({ preMnemonics });

    return mnemonic;
  }

  getKeyringByType(type: string) {
    const keyring = this.keyrings.find((keyring) => keyring.type === type);

    return keyring;
  }

  removePreMnemonics() {
    this.memStore.updateState({ preMnemonics: '' });
  }

  async getPreMnemonics(): Promise<any> {
    if (!this.memStore.getState().preMnemonics) {
      return '';
    }

    if (!this.password) {
      throw new Error(i18n.t('background.error.unlock'));
    }

    return await this.encryptor.decrypt(
      this.password,
      this.memStore.getState().preMnemonics
    );
  }

  /**
   * CreateNewVaultAndRestore Mnenoic
   *
   * Destroys any old encrypted storage,
   * creates a new HD wallet from the given seed with 1 account.
   *
   * @emits KeyringController#unlock
   * @param {string} seed - The BIP44-compliant seed phrase.
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  createKeyringWithMnemonics(seed: string): Promise<any> {
    if (!bip39.validateMnemonic(seed, wordlist)) {
      return Promise.reject(
        new Error(i18n.t('background.error.invalidMnemonic'))
      );
    }

    let keyring;
    return (
      this.persistAllKeyrings()
        .then(() => {
          return this.addNewKeyring('HD Key Tree', {
            mnemonic: seed,
            activeIndexes: [],
          });
        })
        .then((firstKeyring) => {
          keyring = firstKeyring;
          return firstKeyring.getAccounts();
        })
        // .then(([firstAccount]) => {
        //   if (!firstAccount) {
        //     throw new Error('KeyringController - First Account not found.');
        //   }
        //   return null;
        // })
        .then(this.persistAllKeyrings.bind(this))
        .then(this.setUnlocked.bind(this))
        .then(this.fullUpdate.bind(this))
        .then(() => keyring)
    );
  }

  addKeyring(keyring) {
    return keyring
      .getAccounts()
      .then((accounts) => {
        return this.checkForDuplicate(keyring.type, accounts);
      })
      .then(() => {
        this.keyrings.push(keyring);
        return this.persistAllKeyrings();
      })
      .then(() => this._updateMemStoreKeyrings())
      .then(() => this.fullUpdate())
      .then(() => {
        return keyring;
      });
  }

  updateHdKeyringIndex(keyring) {
    if (keyring.type !== KEYRING_TYPE.HdKeyring) {
      return;
    }
    if (this.keyrings.find((item) => item === keyring)) {
      return;
    }
    const keryings = this.keyrings.filter(
      (item) => item.type === KEYRING_TYPE.HdKeyring
    );
    keyring.index =
      Math.max(...keryings.map((item) => item.index), keryings.length - 1) + 1;
  }

  /**
   * Set Locked
   * This method deallocates all secrets, and effectively locks MetaMask.
   *
   * @emits KeyringController#lock
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  async setLocked(): Promise<MemStoreState> {
    // set locked
    this.password = null;
    this.memStore.updateState({ isUnlocked: false });
    // remove keyrings
    this.keyrings = [];
    await this._updateMemStoreKeyrings();
    this.emit('lock');
    return this.fullUpdate();
  }

  /**
   * Submit Password
   *
   * Attempts to decrypt the current vault and load its keyrings
   * into memory.
   *
   * Temporarily also migrates any old-style vaults first, as well.
   * (Pre MetaMask 3.0.0)
   *
   * @emits KeyringController#unlock
   * @param {string} password - The keyring controller password.
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  async submitPassword(password: string): Promise<MemStoreState> {
    await this.verifyPassword(password);
    this.password = password;
    try {
      this.keyrings = await this.unlockKeyrings(password);
    } catch {
      //
    } finally {
      this.setUnlocked();
    }

    return this.fullUpdate();
  }

  /**
   * Verify Password
   *
   * Attempts to decrypt the current vault with a given password
   * to verify its validity.
   *
   * @param {string} password
   */
  async verifyPassword(password: string): Promise<void> {
    const encryptedBooted = this.store.getState().booted;
    if (!encryptedBooted) {
      throw new Error(i18n.t('background.error.canNotUnlock'));
    }
    await this.encryptor.decrypt(password, encryptedBooted);
  }

  /**
   * Add New Keyring
   *
   * Adds a new Keyring of the given `type` to the vault
   * and the current decrypted Keyrings array.
   *
   * All Keyring classes implement a unique `type` string,
   * and this is used to retrieve them from the keyringTypes array.
   *
   * @param {string} type - The type of keyring to add.
   * @param {Object} opts - The constructor options for the keyring.
   * @returns {Promise<Keyring>} The new keyring.
   */
  addNewKeyring(type: string, opts?: any): Promise<any> {
    const Keyring = this.getKeyringClassForType(type);
    const keyring = new Keyring(
      hasBridge(type)
        ? {
            bridge: getKeyringBridge(type),
            ...(opts ?? {}),
          }
        : opts
    );
    this.updateHdKeyringIndex(keyring);
    return this.addKeyring(keyring);
  }

  /**
   * Remove Empty Keyrings
   *
   * Loops through the keyrings and removes the ones with empty accounts
   * (usually after removing the last / only account) from a keyring
   */
  async removeEmptyKeyrings(): Promise<undefined> {
    const validKeyrings: unknown[] = [];

    // Since getAccounts returns a Promise
    // We need to wait to hear back form each keyring
    // in order to decide which ones are now valid (accounts.length > 0)

    await Promise.all(
      this.keyrings.map(async (keyring) => {
        const accounts = await keyring.getAccounts();
        if (accounts.length > 0) {
          validKeyrings.push(keyring);
        }
      })
    );
    this.keyrings = validKeyrings;
    return;
  }

  /**
   * Checks for duplicate keypairs, using the first account in the given
   * array. Rejects if a duplicate is found.
   *
   * Only supports 'Simple Key Pair'.
   *
   * @param {string} type - The key pair type to check for.
   * @param {Array<string>} newAccountArray - Array of new accounts.
   * @returns {Promise<Array<string>>} The account, if no duplicate is found.
   */
  async checkForDuplicate(
    type: string,
    newAccountArray: string[]
  ): Promise<string[]> {
    const keyrings = this.getKeyringsByType(type);
    const _accounts = await Promise.all(
      keyrings.map((keyring) => keyring.getAccounts())
    );

    const accounts: string[] = _accounts
      .reduce((m, n) => m.concat(n), [] as string[])
      .map((address) => normalizeAddress(address).toLowerCase());

    const isIncluded = newAccountArray.find((account) => {
      return accounts.find(
        (key) =>
          key === account.toLowerCase() ||
          key === ethUtil.stripHexPrefix(account)
      );
    });

    const error = new Error(
      JSON.stringify({
        address: isIncluded,
        anchor: 'DuplicateAccountError',
      })
    );

    return isIncluded
      ? Promise.reject(error)
      : Promise.resolve(newAccountArray);
  }

  /**
   * Add New Account
   *
   * Calls the `addAccounts` method on the given keyring,
   * and then saves those changes.
   *
   * @param {Keyring} selectedKeyring - The currently selected keyring.
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  addNewAccount(selectedKeyring: any): Promise<string[]> {
    let _accounts;
    return selectedKeyring
      .addAccounts(1)
      .then(() => {
        if (selectedKeyring.getAccountsWithBrand) {
          return selectedKeyring.getAccountsWithBrand();
        } else {
          return selectedKeyring.getAccounts();
        }
      })
      .then((accounts) => {
        const allAccounts = accounts.map((account) => ({
          address: normalizeAddress(
            typeof account === 'string' ? account : account.address
          ),
          brandName:
            typeof account === 'string'
              ? selectedKeyring.type
              : account?.realBrandName || account.brandName,
        }));
        allAccounts.forEach((account) => {
          this.setAddressAlias(
            account.address,
            selectedKeyring,
            account.brandName
          );
          this.emit('newAccount', account.address);
        });
        _accounts = accounts;
      })
      .then(this.persistAllKeyrings.bind(this))
      .then(this._updateMemStoreKeyrings.bind(this))
      .then(this.fullUpdate.bind(this))
      .then(() => _accounts);
  }

  async setAddressAlias(address: string, keyring, brandName: string) {
    const cacheAlias = contactBook.getCacheAlias(address);
    const existAlias = contactBook.getContactByAddress(address);
    if (!existAlias) {
      if (cacheAlias) {
        contactBook.removeCacheAlias(address);
        contactBook.addAlias(cacheAlias);
      } else {
        const accounts = await keyring.getAccounts();

        let addressCount = accounts.length - 1; // TODO: change 1 to real count of accounts if this function can add multiple accounts
        if (keyring.type === KEYRING_CLASS.WALLETCONNECT) {
          const accountWithBrands = await keyring.getAccountsWithBrand();
          addressCount =
            accountWithBrands.filter(
              (item) =>
                item.brandName === brandName || item.realBrandName === brandName
            ).length - 1;
        }
        const alias = generateAliasName({
          brandName,
          keyringType: keyring.type,
          addressCount,
        });
        contactBook.addAlias({
          address,
          name: alias,
        });
      }
    } else {
      if (!existAlias.isAlias) {
        contactBook.updateAlias(existAlias);
      }
    }
  }

  /**
   * Export Account
   *
   * Requests the private key from the keyring controlling
   * the specified address.
   *
   * Returns a Promise that may resolve with the private key string.
   *
   * @param {string} address - The address of the account to export.
   * @returns {Promise<string>} The private key of the account.
   */
  exportAccount(address: string): Promise<string> {
    try {
      return this.getKeyringForAccount(address).then((keyring) => {
        return keyring.exportAccount(normalizeAddress(address));
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   *
   * Remove Account
   *
   * Removes a specific account from a keyring
   * If the account is the last/only one then it also removes the keyring.
   *
   * @param {string} address - The address of the account to remove.
   * @returns {Promise<void>} A Promise that resolves if the operation was successful.
   */
  removeAccount(
    address: string,
    type: string,
    brand?: string,
    removeEmptyKeyrings = true
  ): Promise<any> {
    return this.getKeyringForAccount(address, type)
      .then(async (keyring) => {
        // Not all the keyrings support this, so we have to check
        if (typeof keyring.removeAccount === 'function') {
          keyring.removeAccount(address, brand);
          this.emit('removedAccount', address);
          const currentKeyring = keyring;
          return [await keyring.getAccounts(), currentKeyring];
        }
        return Promise.reject(
          new Error(
            `Keyring ${keyring.type} doesn't support account removal operations`
          )
        );
      })
      .then(([accounts, currentKeyring]) => {
        // Check if this was the last/only account
        if (accounts.length === 0 && removeEmptyKeyrings) {
          currentKeyring.forgetDevice?.();
          this.keyrings = this.keyrings.filter(
            (item) => item !== currentKeyring
          );

          // return this.removeEmptyKeyrings();
        }
        return undefined;
      })
      .then(this.persistAllKeyrings.bind(this))
      .then(this._updateMemStoreKeyrings.bind(this))
      .then(this.fullUpdate.bind(this))
      .catch((e) => {
        return Promise.reject(e);
      });
  }

  removeKeyringByPublicKey(publicKey: string) {
    this.keyrings = this.keyrings.filter((item) => {
      if (item.publicKey) {
        return item.publicKey !== publicKey;
      }
      return true;
    });
    return this.persistAllKeyrings()
      .then(this._updateMemStoreKeyrings.bind(this))
      .then(this.fullUpdate.bind(this))
      .catch((e) => {
        return Promise.reject(e);
      });
  }

  //
  // SIGNING METHODS
  //

  /**
   * Sign Ethereum Transaction
   *
   * Signs an Ethereum transaction object.
   *
   * @param {Object} ethTx - The transaction to sign.
   * @param {string} _fromAddress - The transaction 'from' address.
   * @param {Object} opts - Signing options.
   * @returns {Promise<Object>} The signed transactio object.
   */
  signTransaction(keyring, ethTx, _fromAddress, opts = {}) {
    const fromAddress = normalizeAddress(_fromAddress);
    return keyring.signTransaction(fromAddress, ethTx, opts);
  }

  /**
   * Sign Message
   *
   * Attempts to sign the provided message parameters.
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  signMessage(msgParams, opts = {}) {
    const address = normalizeAddress(msgParams.from);
    return this.getKeyringForAccount(address).then((keyring) => {
      return keyring.signMessage(address, msgParams.data, opts);
    });
  }

  /**
   * Sign Personal Message
   *
   * Attempts to sign the provided message parameters.
   * Prefixes the hash before signing per the personal sign expectation.
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  signPersonalMessage(keyring, msgParams, opts = {}) {
    const address = normalizeAddress(msgParams.from);
    return keyring.signPersonalMessage(address, msgParams.data, opts);
  }

  /**
   * Sign Typed Data
   * (EIP712 https://github.com/ethereum/EIPs/pull/712#issuecomment-329988454)
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  signTypedMessage(keyring, msgParams, opts = { version: 'V1' }) {
    const address = normalizeAddress(msgParams.from);
    return keyring.signTypedData(address, msgParams.data, opts);
  }

  /**
   * Get encryption public key
   *
   * Get encryption public key for using in encrypt/decrypt process.
   *
   * @param {Object} address - The address to get the encryption public key for.
   * @returns {Promise<Buffer>} The public key.
   */
  getEncryptionPublicKey(_address, opts = {}) {
    const address = normalizeAddress(_address);
    return this.getKeyringForAccount(address).then((keyring) => {
      return keyring.getEncryptionPublicKey(address, opts);
    });
  }

  /**
   * Decrypt Message
   *
   * Attempts to decrypt the provided message parameters.
   *
   * @param {Object} msgParams - The decryption message parameters.
   * @returns {Promise<Buffer>} The raw decryption result.
   */
  decryptMessage(msgParams, opts = {}) {
    const address = normalizeAddress(msgParams.from);
    return this.getKeyringForAccount(address).then((keyring) => {
      return keyring.decryptMessage(address, msgParams.data, opts);
    });
  }

  /**
   * Gets the app key address for the given Ethereum address and origin.
   *
   * @param {string} _address - The Ethereum address for the app key.
   * @param {string} origin - The origin for the app key.
   * @returns {string} The app key address.
   */
  async getAppKeyAddress(_address, origin) {
    const address = normalizeAddress(_address);
    const keyring = await this.getKeyringForAccount(address);
    return keyring.getAppKeyAddress(address, origin);
  }

  /**
   * Exports an app key private key for the given Ethereum address and origin.
   *
   * @param {string} _address - The Ethereum address for the app key.
   * @param {string} origin - The origin for the app key.
   * @returns {string} The app key private key.
   */
  async exportAppKeyForAddress(_address, origin) {
    const address = normalizeAddress(_address);
    const keyring = await this.getKeyringForAccount(address);
    if (!('exportAccount' in keyring)) {
      throw new Error(
        `The keyring for address ${_address} does not support exporting.`
      );
    }
    return keyring.exportAccount(address, { withAppKeyOrigin: origin });
  }

  /**
   * Persist All Keyrings
   *
   * Iterates the current `keyrings` array,
   * serializes each one into a serialized array,
   * encrypts that array with the provided `password`,
   * and persists that encrypted string to storage.
   *
   * @param {string} password - The keyring controller password.
   * @returns {Promise<boolean>} Resolves to true once keyrings are persisted.
   */
  persistAllKeyrings(): Promise<boolean> {
    if (!this.password || typeof this.password !== 'string') {
      return Promise.reject(
        new Error('KeyringController - password is not a string')
      );
    }

    return Promise.all(
      this.keyrings.map((keyring) => {
        return Promise.all([keyring.type, keyring.serialize()]).then(
          (serializedKeyringArray) => {
            // Label the output values on each serialized Keyring:
            return {
              type: serializedKeyringArray[0],
              data: serializedKeyringArray[1],
            };
          }
        );
      })
    )
      .then((serializedKeyrings) => {
        return this.encryptor.encrypt(
          this.password as string,
          (serializedKeyrings as unknown) as Buffer
        );
      })
      .then((encryptedString) => {
        this.store.updateState({ vault: encryptedString });
        return true;
      });
  }

  /**
   * Unlock Keyrings
   *
   * Attempts to unlock the persisted encrypted storage,
   * initializing the persisted keyrings to RAM.
   *
   * @param {string} password - The keyring controller password.
   * @returns {Promise<Array<Keyring>>} The keyrings.
   */
  async unlockKeyrings(password: string): Promise<any[]> {
    const encryptedVault = this.store.getState().vault;
    if (!encryptedVault) {
      throw new Error(i18n.t('background.error.canNotUnlock'));
    }

    await this.clearKeyrings();
    const vault = await this.encryptor.decrypt(password, encryptedVault);
    // TODO: FIXME
    await Promise.all(
      Array.from(vault as any).map(this._restoreKeyring.bind(this))
    );
    await this._updateMemStoreKeyrings();
    return this.keyrings;
  }

  /**
   * Restore Keyring
   *
   * Attempts to initialize a new keyring from the provided serialized payload.
   * On success, updates the memStore keyrings and returns the resulting
   * keyring instance.
   *
   * @param {Object} serialized - The serialized keyring.
   * @returns {Promise<Keyring>} The deserialized keyring.
   */
  async restoreKeyring(serialized) {
    const keyring = await this._restoreKeyring(serialized);
    await this._updateMemStoreKeyrings();
    return keyring;
  }

  /**
   * Restore Keyring Helper
   *
   * Attempts to initialize a new keyring from the provided serialized payload.
   * On success, returns the resulting keyring instance.
   *
   * @param {Object} serialized - The serialized keyring.
   * @returns {Promise<Keyring>} The deserialized keyring.
   */
  async _restoreKeyring(serialized: any): Promise<any> {
    const { type, data } = serialized;
    const Keyring = this.getKeyringClassForType(type);
    const keyring =
      Keyring?.type === KEYRING_CLASS.WALLETCONNECT
        ? new Keyring(GET_WALLETCONNECT_CONFIG())
        : new Keyring(
            hasBridge(type)
              ? {
                  bridge: getKeyringBridge(type),
                }
              : undefined
          );
    await keyring.deserialize(data);
    if (keyring.type === KEYRING_CLASS.WALLETCONNECT) {
      eventBus.addEventListener(EVENTS.WALLETCONNECT.INIT, (props) => {
        const { address, brandName, type } = props;
        if (type !== KEYRING_CLASS.WALLETCONNECT) {
          return;
        }
        (keyring as WalletConnectKeyring).init(
          address,
          brandName,
          getChainList('mainnet').map((item) => item.id)
        );
      });
      (keyring as WalletConnectKeyring).on('inited', (uri) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.WALLETCONNECT.INITED,
          params: { uri },
        });
      });

      keyring.on('transport_error', (data) => {
        Sentry.captureException(
          new Error('Transport error: ' + JSON.stringify(data))
        );

        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
          params: data,
        });
      });
      keyring.on('statusChange', (data) => {
        if (!preference.getPopupOpen() && hasWalletConnectPageStateCache()) {
          setPageStateCacheWhenPopupClose(data);
        }
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.WALLETCONNECT.STATUS_CHANGED,
          params: data,
        });
      });

      keyring.on('sessionStatusChange', (data) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.WALLETCONNECT.SESSION_STATUS_CHANGED,
          params: data,
        });
      });
      keyring.on('sessionAccountChange', (data) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.WALLETCONNECT.SESSION_ACCOUNT_CHANGED,
          params: data,
        });
      });
      keyring.on('sessionNetworkDelay', (data) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.WALLETCONNECT.SESSION_NETWORK_DELAY,
          params: data,
        });
      });
      keyring.on('error', (error) => {
        console.error(error);
        Sentry.captureException(error);
      });
    }

    if (keyring.type === KEYRING_CLASS.Coinbase) {
      const coinbaseKeyring = keyring as CoinbaseKeyring;
      eventBus.addEventListener(
        EVENTS.WALLETCONNECT.INIT,
        ({ address, type }) => {
          if (type !== KEYRING_CLASS.Coinbase) {
            return;
          }
          const uri = coinbaseKeyring.connect({
            address,
          });

          eventBus.emit(EVENTS.broadcastToUI, {
            method: EVENTS.WALLETCONNECT.INITED,
            params: { uri },
          });
        }
      );

      coinbaseKeyring.on('message', (data) => {
        if (data.status === 'CHAIN_CHANGED') {
          eventBus.emit(EVENTS.broadcastToUI, {
            method: EVENTS.WALLETCONNECT.SESSION_ACCOUNT_CHANGED,
            params: {
              ...data,
              status: 'CONNECTED',
            },
          });
        } else {
          eventBus.emit(EVENTS.broadcastToUI, {
            method: EVENTS.WALLETCONNECT.SESSION_STATUS_CHANGED,
            params: data,
          });
          eventBus.emit(EVENTS.broadcastToUI, {
            method: EVENTS.WALLETCONNECT.SESSION_ACCOUNT_CHANGED,
            params: data,
          });
        }
      });
    }

    if (keyring.type === KEYRING_CLASS.GNOSIS) {
      (keyring as GnosisKeyring).on(TransactionBuiltEvent, (data) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: TransactionBuiltEvent,
          params: data,
        });
        (keyring as GnosisKeyring).on(TransactionConfirmedEvent, (data) => {
          eventBus.emit(EVENTS.broadcastToUI, {
            method: TransactionConfirmedEvent,
            params: data,
          });
        });
      });
    }
    // getAccounts also validates the accounts for some keyrings
    await keyring.getAccounts();
    this.keyrings.push(keyring);
    return keyring;
  }

  /**
   * Get Keyring Class For Type
   *
   * Searches the current `keyringTypes` array
   * for a Keyring class whose unique `type` property
   * matches the provided `type`,
   * returning it if it exists.
   *
   * @param {string} type - The type whose class to get.
   * @returns {Keyring|undefined} The class, if it exists.
   */
  getKeyringClassForType(type: string): any {
    return this.keyringTypes.find((kr) => kr.type === type);
  }

  /**
   * Get Keyrings by Type
   *
   * Gets all keyrings of the given type.
   *
   * @param {string} type - The keyring types to retrieve.
   * @returns {Array<Keyring>} The keyrings.
   */
  getKeyringsByType(type: string): any[] {
    return this.keyrings.filter((keyring) => keyring.type === type);
  }

  /**
   * Get Accounts
   *
   * Returns the public addresses of all current accounts
   * managed by all currently unlocked keyrings.
   *
   * @returns {Promise<Array<string>>} The array of accounts.
   */
  async getAccounts(): Promise<string[]> {
    const keyrings = this.keyrings || [];
    const addrs = await Promise.all(
      keyrings.map((kr) => kr.getAccounts())
    ).then((keyringArrays) => {
      return keyringArrays.reduce((res, arr) => {
        return res.concat(arr);
      }, []);
    });
    return addrs.map(normalizeAddress);
  }

  resetResend() {
    this.keyrings.forEach((keyring) => {
      keyring?.resetResend?.();
    });
  }

  /**
   * Get Keyring For Account
   *
   * Returns the currently initialized keyring that manages
   * the specified `address` if one exists.
   *
   * @param {string} address - An account address.
   * @returns {Promise<Keyring>} The keyring of the account, if it exists.
   */
  getKeyringForAccount(
    address: string,
    type?: string,
    start?: number,
    end?: number,
    includeWatchKeyring = true
  ): Promise<any> {
    const hexed = normalizeAddress(address).toLowerCase();
    log.debug(`KeyringController - getKeyringForAccount: ${hexed}`);
    let keyrings = type
      ? this.keyrings.filter((keyring) => keyring.type === type)
      : this.keyrings;
    if (!includeWatchKeyring) {
      keyrings = keyrings.filter(
        (keyring) => keyring.type !== KEYRING_TYPE.WatchAddressKeyring
      );
    }
    return Promise.all(
      keyrings.map((keyring) => {
        return Promise.all([keyring, keyring.getAccounts()]);
      })
    ).then((candidates) => {
      const winners = candidates.filter((candidate) => {
        const accounts = candidate[1].map((addr) => {
          return normalizeAddress(addr).toLowerCase();
        });
        return accounts.includes(hexed);
      });
      if (winners && winners.length > 0) {
        return winners[0][0];
      }
      throw new Error('No keyring found for the requested account.');
    });
  }

  /**
   * Display For Keyring
   *
   * Is used for adding the current keyrings to the state object.
   * @param {Keyring} keyring
   * @returns {Promise<Object>} A keyring display object, with type and accounts properties.
   */
  displayForKeyring(keyring, includeHidden = true): Promise<DisplayedKeryring> {
    const hiddenAddresses = preference.getHiddenAddresses();
    const accounts: Promise<
      ({ address: string; brandName: string } | string)[]
    > = keyring.getAccountsWithBrand
      ? keyring.getAccountsWithBrand()
      : keyring.getAccounts();

    return accounts.then((accounts) => {
      const allAccounts = accounts.map((account) => ({
        address: normalizeAddress(
          typeof account === 'string' ? account : account.address
        ),
        brandName:
          typeof account === 'string' ? keyring.type : account.brandName,
      }));

      return {
        type: keyring.type,
        accounts: includeHidden
          ? allAccounts
          : allAccounts.filter(
              (account) =>
                !hiddenAddresses.find(
                  (item) =>
                    item.type === keyring.type &&
                    item.address.toLowerCase() === account.address.toLowerCase()
                )
            ),
        keyring,
        byImport: keyring.byImport,
        publicKey: keyring.publicKey,
      };
    });
  }

  getAllTypedAccounts(): Promise<DisplayedKeryring[]> {
    return Promise.all(
      this.keyrings.map((keyring) => this.displayForKeyring(keyring))
    );
  }

  async getAllTypedVisibleAccounts(): Promise<DisplayedKeryring[]> {
    const keyrings = await Promise.all(
      this.keyrings.map((keyring) => this.displayForKeyring(keyring, false))
    );
    return keyrings.filter((keyring) => keyring.accounts.length > 0);
  }

  async getAllVisibleAccountsArray() {
    const typedAccounts = await this.getAllTypedVisibleAccounts();
    const result: { address: string; type: string; brandName: string }[] = [];
    typedAccounts.forEach((accountGroup) => {
      result.push(
        ...accountGroup.accounts.map((account) => ({
          address: account.address,
          brandName: account.brandName,
          type: accountGroup.type,
        }))
      );
    });

    return result;
  }

  async getAllAdresses() {
    const keyrings = await this.getAllTypedAccounts();
    const result: { address: string; type: string; brandName: string }[] = [];
    keyrings.forEach((accountGroup) => {
      result.push(
        ...accountGroup.accounts.map((account) => ({
          address: account.address,
          brandName: account.brandName,
          type: accountGroup.type,
        }))
      );
    });

    return result;
  }

  async hasAddress(address: string) {
    const addresses = await this.getAllAdresses();
    return !!addresses.find((item) => isSameAddress(item.address, address));
  }

  /**
   * Clear Keyrings
   *
   * Deallocates all currently managed keyrings and accounts.
   * Used before initializing a new vault.
   */
  /* eslint-disable require-await */
  async clearKeyrings(): Promise<void> {
    // clear keyrings from memory
    this.keyrings = [];
    this.memStore.updateState({
      keyrings: [],
    });
  }

  /**
   * Update Memstore Keyrings
   *
   * Updates the in-memory keyrings, without persisting.
   */
  async _updateMemStoreKeyrings(): Promise<void> {
    const keyrings = await Promise.all(
      this.keyrings.map((keyring) => this.displayForKeyring(keyring))
    );
    return this.memStore.updateState({ keyrings });
  }

  /**
   * Unlock Keyrings
   *
   * Unlocks the keyrings.
   *
   * @emits KeyringController#unlock
   */
  setUnlocked(): void {
    this.memStore.updateState({ isUnlocked: true });
    this.emit('unlock');
  }
}

export default new KeyringService();
