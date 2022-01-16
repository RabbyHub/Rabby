import { EventEmitter } from 'events';
import { isAddress, toChecksumAddress } from 'web3-utils';
import { addHexPrefix, bufferToHex } from 'ethereumjs-util';
import Safe from '@rabby-wallet/gnosis-sdk';
import {
  SafeTransaction,
  SafeTransactionDataPartial,
} from '@gnosis.pm/safe-core-sdk-types';
import {
  isTxHashSignedWithPrefix,
  adjustVInSignature,
} from '@rabby-wallet/gnosis-sdk/dist/utils';
import EthSignSignature from '@gnosis.pm/safe-core-sdk/dist/src/utils/signatures/SafeSignature';

export const keyringType = 'Gnosis';
export const TransactionBuiltEvent = 'TransactionBuilt';
export const TransactionConfirmedEvent = 'TransactionConfirmed';
export const TransactionReadyForExecEvent = 'TransactionReadyForExec';

interface SignTransactionOptions {
  signatures: string[];
  provider: any;
}

interface DeserializeOption {
  accounts?: string[];
  networkIdMap?: Record<string, string>;
}

function sanitizeHex(hex: string): string {
  hex = hex.substring(0, 2) === '0x' ? hex.substring(2) : hex;
  if (hex === '') {
    return '';
  }
  hex = hex.length % 2 !== 0 ? '0' + hex : hex;
  return '0x' + hex;
}

class GnosisKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  accountToAdd: string | null = null;
  networkIdMap: Record<string, string> = {};
  currentTransaction: SafeTransaction | null = null;
  currentTransactionHash: string | null = null;
  onExecedTransaction: ((hash: string) => void) | null = null;
  safeInstance: Safe | null = null;

  constructor(options: DeserializeOption = {}) {
    super();
    this.deserialize(options);
  }

  deserialize(opts: DeserializeOption) {
    if (opts.accounts) {
      this.accounts = opts.accounts;
    }
    if (opts.networkIdMap) {
      this.networkIdMap = opts.networkIdMap;
    }
    // filter address which dont have networkId in cache
    this.accounts = this.accounts.filter(
      (account) => account.toLowerCase() in this.networkIdMap
    );
  }

  serialize() {
    return Promise.resolve({
      accounts: this.accounts,
      networkIdMap: this.networkIdMap,
    });
  }

  setNetworkId = (address: string, networkId: string) => {
    this.networkIdMap = {
      ...this.networkIdMap,
      [address.toLowerCase()]: networkId,
    };
  };

  setAccountToAdd = (account: string) => {
    this.accountToAdd = account;
  };

  async getAccounts() {
    return this.accounts;
  }

  async getTransactionHash() {
    if (this.currentTransactionHash) return this.currentTransactionHash;
    if (!this.safeInstance || !this.currentTransaction) return;
    const safe = this.safeInstance;
    const hash = await safe.getTransactionHash(this.currentTransaction);
    this.currentTransactionHash = hash;
    return hash;
  }

  addAccounts = async () => {
    if (!this.accountToAdd) throw new Error('There is no address to add');
    if (!isAddress(this.accountToAdd)) {
      throw new Error("The address you're are trying to import is invalid");
    }
    const prefixedAddress = addHexPrefix(this.accountToAdd);

    if (
      this.accounts.find(
        (acct) => acct.toLowerCase() === prefixedAddress.toLowerCase()
      )
    ) {
      throw new Error("The address you're are trying to import is duplicate");
    }

    this.accounts.push(prefixedAddress);

    return [prefixedAddress];
  };

  removeAccount(address: string): void {
    this.accounts = this.accounts.filter(
      (account) => account.toLowerCase() !== address.toLowerCase()
    );
  }

  async confirmTransaction({
    safeAddress,
    transaction,
    networkId,
    provider,
  }: {
    safeAddress: string;
    transaction: SafeTransaction | null;
    networkId: string;
    provider?: any;
  }) {
    let isCurrent = false; // Confirming a stash transaction or not
    if (!transaction) {
      transaction = this.currentTransaction!;
      isCurrent = true;
    }
    if (!transaction) throw new Error('No avaliable transaction');
    const checksumAddress = toChecksumAddress(safeAddress);
    let safe = this.safeInstance;
    if (!isCurrent) {
      const safeInfo = await Safe.getSafeInfo(checksumAddress, networkId);
      safe = new Safe(checksumAddress, safeInfo.version, provider, networkId);
    }
    await safe!.confirmTransaction(transaction);
    const threshold = await safe!.getThreshold();
    this.emit(TransactionConfirmedEvent, {
      safeAddress,
      data: {
        signatures: Array.from(transaction.signatures.values()).map((item) => ({
          data: item.data,
          signer: item.signer,
        })),
        threshold,
      },
    });
  }

  async addConfirmation(address: string, signature: string) {
    if (!this.currentTransaction || !this.safeInstance) {
      throw new Error('No transaction in Gnosis keyring');
    }
    const safe = this.safeInstance;
    this.addSignature(address, signature);
    const hash = await this.getTransactionHash();
    const sig = this.currentTransaction.signatures.get(address.toLowerCase());
    if (sig) {
      await safe.request.confirmTransaction(hash, { signature: sig.data });
    }
  }

  async addPureSignature(address: string, signature: string) {
    if (!this.currentTransaction || !this.safeInstance) {
      throw new Error('No transaction in Gnosis keyring');
    }
    const sig = new EthSignSignature(address, signature);
    this.currentTransaction.addSignature(sig);
  }

  async addSignature(address: string, signature: string) {
    if (!this.currentTransaction || !this.safeInstance) {
      throw new Error('No transaction in Gnosis keyring');
    }
    const hash = await this.getTransactionHash();
    const hasPrefix = isTxHashSignedWithPrefix(hash, signature, address);
    signature = adjustVInSignature(signature, hasPrefix);
    const sig = new EthSignSignature(address, signature);
    this.currentTransaction.addSignature(sig);
  }

  async getOwners(address: string, version: string, provider) {
    const networkId = this.networkIdMap[address.toLowerCase()];
    if (!networkId) {
      throw new Error(`No networkId in keyring for address ${address}`);
    }
    const safe = new Safe(address, version, provider, networkId);
    const owners = await safe.getOwners();
    return owners;
  }

  async execTransaction({
    safeAddress,
    transaction,
    networkId,
    provider,
  }: {
    safeAddress: string;
    transaction: SafeTransaction | null;
    networkId: string;
    provider: any;
  }) {
    let isCurrent = false; // Confirming a stash transaction or not
    if (!transaction) {
      transaction = this.currentTransaction!;
      isCurrent = true;
    }
    if (!transaction) throw new Error('No avaliable transaction');
    const checksumAddress = toChecksumAddress(safeAddress);
    let safe = this.safeInstance;
    if (!isCurrent) {
      const safeInfo = await Safe.getSafeInfo(checksumAddress, networkId);
      safe = new Safe(checksumAddress, safeInfo.version, provider, networkId);
    }
    const result = await safe!.executeTransaction(transaction);
    this.onExecedTransaction && this.onExecedTransaction(result.hash);
    return result.hash;
  }

  async postTransaction() {
    const safe = this.safeInstance;
    const safeTransaction = this.currentTransaction;
    if (!safe || !safeTransaction) return;
    const transactionHash = await safe.getTransactionHash(safeTransaction);
    try {
      await safe.postTransaction(safeTransaction, transactionHash);
    } catch (e) {
      let errMsg = 'Post transaction to Gnosis Server failed';
      if (e?.response?.data) {
        const keys = Object.keys(e.response.data);
        if (Array.isArray(e.response.data[keys[0]])) {
          errMsg = e.response.data[keys[0]][0];
        }
      } else {
        errMsg = e.message;
      }
      throw new Error(errMsg);
    }
  }

  async buildTransaction(
    address: string,
    transaction: SafeTransactionDataPartial,
    provider
  ) {
    if (
      !this.accounts.find(
        (account) => account.toLowerCase() === address.toLowerCase()
      )
    ) {
      throw new Error('Can not find this address');
    }
    const checksumAddress = toChecksumAddress(address);
    const tx = {
      data: transaction.data,
      from: address,
      to: this._normalize(transaction.to),
      value: this._normalize(transaction.value) || '0x0', // prevent 0x
      safeTxGas: transaction.safeTxGas,
      nonce: transaction.nonce ? Number(transaction.nonce) : undefined,
      baseGas: transaction.baseGas,
      operation: transaction.operation,
    };
    const networkId = this.networkIdMap[address.toLowerCase()];
    const safeInfo = await Safe.getSafeInfo(checksumAddress, networkId);
    const safe = new Safe(
      checksumAddress,
      safeInfo.version,
      provider,
      networkId
    );
    this.safeInstance = safe;
    const safeTransaction = await safe.buildTransaction(tx);
    this.currentTransaction = safeTransaction;
    this.currentTransactionHash = await safe.getTransactionHash(
      safeTransaction
    );
    return safeTransaction;
  }

  async signTransaction(
    address: string,
    transaction,
    opts: SignTransactionOptions
  ) {
    // eslint-disable-next-line no-async-promise-executor
    if (
      !this.accounts.find(
        (account) => account.toLowerCase() === address.toLowerCase()
      )
    ) {
      throw new Error('Can not find this address');
    }
    let safeTransaction: SafeTransaction;
    let transactionHash: string;
    const networkId = this.networkIdMap[address.toLowerCase()];
    const checksumAddress = toChecksumAddress(address);
    const safeInfo = await Safe.getSafeInfo(checksumAddress, networkId);
    const safe = new Safe(
      checksumAddress,
      safeInfo.version,
      opts.provider,
      networkId
    );
    if (this.currentTransaction) {
      safeTransaction = this.currentTransaction;
      transactionHash = await this.getTransactionHash();
    } else {
      const tx = {
        data: this._normalize(transaction.data) || '0x',
        from: address,
        to: this._normalize(transaction.to),
        value: this._normalize(transaction.value) || '0x0', // prevent 0x
      };
      safeTransaction = await safe.buildTransaction(tx);
      this.currentTransaction = safeTransaction;
      transactionHash = await this.getTransactionHash();
    }
    await safe.signTransaction(safeTransaction);
    this.safeInstance = safe;
    this.emit(TransactionBuiltEvent, {
      safeAddress: address,
      data: {
        hash: transactionHash,
      },
    });
  }

  signTypedData() {
    throw new Error('Gnosis address not support signTypedData');
  }

  signPersonalMessage() {
    throw new Error('Gnosis address not support signPersonalMessage');
  }

  _normalize(buf) {
    return sanitizeHex(bufferToHex(buf).toString());
  }
}

export default GnosisKeyring;
