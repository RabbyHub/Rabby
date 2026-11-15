import { EventEmitter } from 'events';
import { isAddress } from 'viem';
import {
  addHexPrefix,
  toChecksumAddress,
  bytesToHex,
  isHexString,
} from '@ethereumjs/util';
import Safe from '@rabby-wallet/gnosis-sdk';
import {
  SafeSignature,
  SafeTransaction,
  SafeTransactionDataPartial,
} from '@safe-global/types-kit';
import semverSatisfies from 'semver/functions/satisfies';
import { adjustVInSignature } from '@safe-global/protocol-kit/dist/src/utils';
import {
  buildSignatureBytes,
  EthSafeMessage,
  EthSafeSignature,
  hashSafeMessage,
  SigningMethod,
} from '@safe-global/protocol-kit';
import { SafeClientTxStatus } from '@safe-global/sdk-starter-kit/dist/src/constants';
import { TypedTransaction } from '@ethereumjs/tx';
import BigNumber from 'bignumber.js';
import { normalizeSafeOperation } from '@/utils/gnosis';

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
  networkIdsMap?: Record<string, string[]>;
}

export enum Operation {
  CALL = '0',
  DELEGATE = '1',
}

export type TxArgs = {
  baseGas: string;
  data: string;
  gasPrice: string;
  gasToken: string;
  nonce: number;
  operation: Operation;
  refundReceiver: string;
  safeTxGas: string;
  to: string;
  valueInWei: string;
};

export interface SigningTxArgs extends TxArgs {
  safeAddress: string;
  safeVersion: string;
  networkId: string;
}

type Eip712MessageTypes = {
  EIP712Domain: {
    type: string;
    name: string;
  }[];
  SafeTx: {
    type: string;
    name: string;
  }[];
};

type GenerateTypedData = {
  types: Eip712MessageTypes;
  domain: {
    chainId: string | undefined;
    verifyingContract: string;
  };
  primaryType: string;
  message: {
    to: string;
    value: string;
    data: string;
    operation: Operation;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    nonce: number;
  };
};

const EIP712_DOMAIN_BEFORE_V130 = [
  {
    type: 'address',
    name: 'verifyingContract',
  },
];

const EIP712_DOMAIN = [
  {
    type: 'uint256',
    name: 'chainId',
  },
  {
    type: 'address',
    name: 'verifyingContract',
  },
];

const getEip712MessageTypes = (version) => {
  const eip712WithChainId = semverSatisfies(version, '>=1.3.0');
  return {
    EIP712Domain: eip712WithChainId ? EIP712_DOMAIN : EIP712_DOMAIN_BEFORE_V130,
    SafeTx: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
      { type: 'bytes', name: 'data' },
      { type: 'uint8', name: 'operation' },
      { type: 'uint256', name: 'safeTxGas' },
      { type: 'uint256', name: 'baseGas' },
      { type: 'uint256', name: 'gasPrice' },
      { type: 'address', name: 'gasToken' },
      { type: 'address', name: 'refundReceiver' },
      { type: 'uint256', name: 'nonce' },
    ],
  };
};

export const generateTypedDataFrom = ({
  safeAddress,
  safeVersion,
  baseGas,
  data,
  gasPrice,
  gasToken,
  nonce,
  operation,
  refundReceiver,
  safeTxGas,
  to,
  valueInWei,
  networkId,
}: SigningTxArgs): GenerateTypedData => {
  const eip712WithChainId = semverSatisfies(safeVersion, '>=1.3.0');

  const typedData = {
    types: getEip712MessageTypes(safeVersion),
    domain: {
      chainId: eip712WithChainId ? networkId : undefined,
      verifyingContract: safeAddress,
    },
    primaryType: 'SafeTx',
    message: {
      to,
      value: valueInWei,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce: Number(nonce),
    },
  };

  return typedData;
};

type SignatureHolder = {
  signatures: Map<string, SafeSignature>;
  addSignature(signature: SafeSignature): void;
};

type ApprovalTransaction = {
  approvalId: string;
  hash: string;
  safe: Safe;
  transaction: SafeTransaction;
};

/**
 * Adds `signature` to `holder` for the duration of `submit` and removes it
 * again if `submit` fails, so in-memory signatures only ever mirror what the
 * Safe Transaction Service accepted.
 *
 * Callers choose between "create" and "append a signature" by whether any
 * signature is already present. A signature left behind by a failed create
 * sends the retry to the append endpoint for an object that was never
 * created, which the service answers with 404 on every retry.
 */
export const submitWithSignature = async <T>(
  holder: SignatureHolder,
  signature: SafeSignature,
  submit: () => Promise<T>
): Promise<T> => {
  const key = signature.signer.toLowerCase();
  const previous = holder.signatures.get(key);
  holder.addSignature(signature);
  try {
    return await submit();
  } catch (e) {
    if (previous) {
      holder.signatures.set(key, previous);
    } else {
      holder.signatures.delete(key);
    }
    throw e;
  }
};

class GnosisKeyring extends EventEmitter {
  private approvalTransaction: ApprovalTransaction | null = null;
  signingDiagnosticsProvider = 'gnosis';
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  accountToAdd: string | null = null;
  /**
   * @deprecated
   */
  networkIdMap: Record<string, string> = {};
  networkIdsMap: Record<string, string[]> = {};
  currentTransaction: SafeTransaction | null = null;
  currentTransactionHash: string | null = null;
  currentSafeMessage: EthSafeMessage | null = null;
  currentSafeMessageHash: string | null = null;
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
    if (opts.networkIdsMap) {
      this.networkIdsMap = opts.networkIdsMap;
    } else {
      this.networkIdsMap = Object.entries(opts.networkIdMap || {}).reduce(
        (res, [key, value]) => {
          res[key] = Array.isArray(value) ? value : [value];
          return res;
        },
        {} as Record<string, string[]>
      );
    }
    // filter address which dont have networkId in cache
    this.accounts = this.accounts.filter(
      (account) => account.toLowerCase() in this.networkIdsMap
    );
  }

  serialize() {
    return Promise.resolve({
      accounts: this.accounts,
      networkIdMap: this.networkIdMap,
      networkIdsMap: this.networkIdsMap,
    });
  }

  /**
   * @deprecated
   */
  setNetworkId = (address: string, networkId: string) => {
    this.networkIdMap = {
      ...this.networkIdMap,
      [address.toLowerCase()]: networkId,
    };
  };

  setNetworkIds = (address: string, networkIds: string | string[]) => {
    this.networkIdsMap = {
      ...this.networkIdsMap,
      [address.toLowerCase()]: Array.isArray(networkIds)
        ? networkIds
        : [networkIds],
    };
    this.setNetworkId(
      address,
      Array.isArray(networkIds) ? networkIds[0] : networkIds
    );
  };

  setAccountToAdd = (account: string) => {
    this.accountToAdd = account;
  };

  generateTypedData = () => {
    if (!this.safeInstance || !this.currentTransaction) return;
    return this.generateTransactionTypedData(
      this.safeInstance,
      this.currentTransaction
    );
  };

  private generateTransactionTypedData = (
    safe: Safe,
    transaction: SafeTransaction
  ) => {
    const { version } = safe;
    const {
      data,
      value,
      to,
      gasPrice,
      safeTxGas,
      baseGas,
      nonce,
      refundReceiver,
      operation,
      gasToken,
    } = transaction.data;
    return generateTypedDataFrom({
      safeAddress: safe.safeAddress,
      data,
      valueInWei: value,
      safeVersion: version,
      to,
      gasPrice: gasPrice.toString(),
      gasToken,
      refundReceiver,
      nonce,
      baseGas: baseGas.toString(),
      safeTxGas: safeTxGas.toString(),
      operation: (operation as unknown) as Operation,
      networkId: safe.network,
    });
  };

  clearApprovalTransaction = () => {
    this.approvalTransaction = null;
  };

  cleanUp = () => {
    this.clearApprovalTransaction();
  };

  getApprovalTransaction = (approvalId: string, hash: string) => {
    const snapshot = this.approvalTransaction;
    if (
      !approvalId ||
      !hash ||
      snapshot?.approvalId !== approvalId ||
      snapshot.hash.toLowerCase() !== hash.toLowerCase()
    ) {
      throw new Error('The Safe transaction approval is no longer current');
    }
    return snapshot;
  };

  getApprovalTypedData = (approvalId: string, hash: string) => {
    const { safe, transaction } = this.getApprovalTransaction(approvalId, hash);
    return this.generateTransactionTypedData(safe, transaction);
  };

  async prepareTransactionForApproval({
    approvalId,
    address,
    transaction,
    provider,
    version,
    networkId,
    expectedHash,
    confirmations = [],
    assertCurrentApproval,
  }: {
    approvalId: string;
    address: string;
    transaction: SafeTransactionDataPartial;
    provider: any;
    version: string;
    networkId: string;
    expectedHash?: string;
    confirmations?: { owner: string; signature: string }[];
    assertCurrentApproval: () => void;
  }) {
    assertCurrentApproval();
    const snapshot = await this.createTransaction(
      address,
      transaction,
      provider,
      version,
      networkId
    );
    if (
      expectedHash !== undefined &&
      snapshot.hash.toLowerCase() !== expectedHash.toLowerCase()
    ) {
      throw new Error(
        'The Safe proposal does not match the reviewed transaction'
      );
    }
    confirmations.forEach(({ owner, signature }) => {
      snapshot.transaction.addSignature(new EthSafeSignature(owner, signature));
    });
    // No shared proposal state is read after this asynchronous construction.
    // Recheck consent before publishing the snapshot for the waiting view.
    assertCurrentApproval();
    this.approvalTransaction = { ...snapshot, approvalId };
    return {
      transactionHash: snapshot.hash,
      typedData: this.generateTransactionTypedData(
        snapshot.safe,
        snapshot.transaction
      ),
    };
  }

  async submitApprovalSignature(
    approvalId: string,
    hash: string,
    address: string,
    signature: string
  ) {
    const snapshot = this.getApprovalTransaction(approvalId, hash);
    const { safe, transaction } = snapshot;
    const isExistingProposal = transaction.signatures.size > 0;
    const sig = new EthSafeSignature(address, signature);
    await submitWithSignature(transaction, sig, () =>
      isExistingProposal
        ? safe.request.confirmTransaction(hash, { signature: sig.data })
        : this.postSafeTransaction(safe, transaction, hash)
    );
    if (this.approvalTransaction === snapshot) {
      this.clearApprovalTransaction();
    }
  }

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
      const error = new Error(
        JSON.stringify({
          address: prefixedAddress,
          anchor: 'DuplicateAccountError',
        })
      );
      throw error;
    }

    this.accounts.push(prefixedAddress.toLowerCase());

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
    if (!transaction) throw new Error('No available transaction');
    const checksumAddress = toChecksumAddress(safeAddress);
    let safe = this.safeInstance;
    if (!isCurrent) {
      const version = await Safe.getSafeVersion({
        provider,
        address: checksumAddress,
      });
      safe = new Safe(checksumAddress, version, provider, networkId);
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
    const hash = await this.getTransactionHash();
    if (!hash) throw new Error('No transaction hash in Gnosis keyring');
    const sig = new EthSafeSignature(address, signature);
    await submitWithSignature(this.currentTransaction, sig, () =>
      safe.request.confirmTransaction(hash, { signature: sig.data })
    );
  }

  async addPureSignature(address: string, signature: string) {
    if (!this.currentTransaction || !this.safeInstance) {
      throw new Error('No transaction in Gnosis keyring');
    }
    const sig = new EthSafeSignature(address, signature);
    this.currentTransaction.addSignature(sig);
  }

  async addSignature(address: string, signature: string) {
    if (!this.currentTransaction || !this.safeInstance) {
      throw new Error('No transaction in Gnosis keyring');
    }
    const sig = new EthSafeSignature(address, signature);
    this.currentTransaction.addSignature(sig);
  }

  async getOwners(address: string, version: string, provider, networkId) {
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
    if (!transaction) throw new Error('No available transaction');
    const checksumAddress = toChecksumAddress(safeAddress);
    let safe = this.safeInstance;
    if (!isCurrent) {
      const version = await Safe.getSafeVersion({
        provider,
        address: checksumAddress,
      });
      safe = new Safe(checksumAddress, version, provider, networkId);
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
    return this.postSafeTransaction(safe, safeTransaction, transactionHash);
  }

  private async postSafeTransaction(
    safe: Safe,
    safeTransaction: SafeTransaction,
    transactionHash: string
  ) {
    try {
      await safe.postTransaction(safeTransaction, transactionHash);
    } catch (e) {
      // The transaction was not created, so the service holds none of the
      // signatures collected for it. Drop them: callers confirm instead of
      // creating whenever a signature is present, and confirming a
      // transaction that does not exist fails with 404 on every retry.
      safeTransaction.signatures.clear();
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
    provider,
    version: string,
    networkId: string
  ) {
    const {
      safe,
      transaction: safeTransaction,
      hash,
    } = await this.createTransaction(
      address,
      transaction,
      provider,
      version,
      networkId
    );
    this.safeInstance = safe;
    this.currentTransaction = safeTransaction;
    this.currentTransactionHash = hash;
    return safeTransaction;
  }

  private async createTransaction(
    address: string,
    transaction: SafeTransactionDataPartial,
    provider: any,
    version: string,
    networkId: string
  ) {
    if (
      !this.accounts.find(
        (account) => account.toLowerCase() === address.toLowerCase()
      )
    ) {
      throw new Error('Can not find this address');
    }
    const checksumAddress = toChecksumAddress(address);
    const bigVal = new BigNumber(transaction.value || 0);
    const tx = {
      data: transaction.data,
      from: address,
      to: this._normalize(transaction.to),
      value: !bigVal.isNaN() && bigVal.toFixed() ? bigVal.toFixed() : '0',
      safeTxGas: transaction.safeTxGas,
      nonce: transaction.nonce == null ? undefined : Number(transaction.nonce),
      baseGas: transaction.baseGas,
      gasPrice:
        transaction.gasPrice == null
          ? undefined
          : new BigNumber(transaction.gasPrice).toFixed(),
      gasToken: transaction.gasToken,
      refundReceiver: transaction.refundReceiver,
      operation: normalizeSafeOperation(transaction.operation),
    };

    const safe = new Safe(checksumAddress, version, provider, networkId);
    const safeTransaction = await safe.buildTransaction(tx);
    const hash = await safe.getTransactionHash(safeTransaction);
    return { safe, transaction: safeTransaction, hash };
  }

  async validateTransaction(
    {
      address,
      transaction,
      provider,
      version,
      networkId,
    }: {
      address: string;
      transaction: SafeTransactionDataPartial;
      provider;
      version: string;
      networkId: string;
    },
    hash: string
  ) {
    const snapshot = await this.createTransaction(
      address,
      transaction,
      provider,
      version,
      networkId
    );
    return snapshot.hash.toLowerCase() === hash.toLowerCase();
  }

  async signTransaction(
    address: string,
    transaction: TypedTransaction,
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
    const networkId = transaction.common.chainId().toString();
    const checksumAddress = toChecksumAddress(address);
    const version = await Safe.getSafeVersion({
      provider: opts.provider,
      address: checksumAddress,
    });
    const safe = new Safe(checksumAddress, version, opts.provider, networkId);
    if (this.currentTransaction) {
      safeTransaction = this.currentTransaction;
      transactionHash = await this.getTransactionHash();
    } else {
      const tx = {
        data: this._normalize(transaction.data) || '0x',
        from: address,
        to: this._normalize(transaction.to),
        value: (transaction.value || 0).toString(),
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

  async buildMessage({
    address,
    provider,
    version,
    networkId,
    message,
  }: {
    address: string;
    provider: any;
    version: string;
    networkId: string;
    message: ConstructorParameters<typeof EthSafeMessage>[0];
  }) {
    if (
      !this.accounts.find(
        (account) => account.toLowerCase() === address.toLowerCase()
      )
    ) {
      throw new Error('Can not find this address');
    }
    const checksumAddress = toChecksumAddress(address);
    const safe = new Safe(checksumAddress, version, provider, networkId);
    const safeMessage = new EthSafeMessage(message);
    this.safeInstance = safe;
    this.currentSafeMessage = safeMessage;
    this.currentSafeMessageHash = await safe.getSafeMessageHash(
      hashSafeMessage(safeMessage.data)
    );

    return {
      safeMessageHash: this.currentSafeMessageHash,
    };
  }

  async getMessageInfo() {
    if (
      !this.currentSafeMessage ||
      !this.safeInstance ||
      !this.currentSafeMessageHash
    ) {
      throw new Error('No message in Gnosis keyring');
    }
    try {
      const message = await this.safeInstance.getMessage(
        this.currentSafeMessageHash
      );

      return {
        safeAddress: this.safeInstance.safeAddress,
        status:
          message.confirmations.length ===
          (await this.safeInstance.getThreshold())
            ? SafeClientTxStatus.MESSAGE_CONFIRMED
            : SafeClientTxStatus.MESSAGE_PENDING_SIGNATURES,
        safeMessageHash: this.currentSafeMessageHash,
        message,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async addMessage({
    signerAddress,
    signature,
  }: {
    signerAddress: string;
    signature: string;
  }) {
    if (!this.currentSafeMessage || !this.safeInstance) {
      throw new Error('No message in Gnosis keyring');
    }
    signature = await adjustVInSignature(
      SigningMethod.ETH_SIGN_TYPED_DATA,
      signature
    );
    const safe = this.safeInstance;
    const safeMessage = this.currentSafeMessage;
    const safeSignature = new EthSafeSignature(signerAddress, signature);
    return submitWithSignature(safeMessage, safeSignature, () =>
      safe.addMessage({ safeMessage })
    );
  }

  async addMessageSignature({
    signerAddress,
    signature,
  }: {
    signerAddress: string;
    signature: string;
  }) {
    if (
      !this.currentSafeMessage ||
      !this.safeInstance ||
      !this.currentSafeMessageHash
    ) {
      throw new Error('No message in Gnosis keyring');
    }
    signature = await adjustVInSignature(
      SigningMethod.ETH_SIGN_TYPED_DATA,
      signature
    );
    const safe = this.safeInstance;
    const safeMessageHash = this.currentSafeMessageHash;
    const safeSignature = new EthSafeSignature(signerAddress, signature);
    return submitWithSignature(this.currentSafeMessage, safeSignature, () =>
      safe.addMessageSignature(
        safeMessageHash,
        buildSignatureBytes([safeSignature])
      )
    );
  }

  async addPureMessageSignature({
    signerAddress,
    signature,
  }: {
    signerAddress: string;
    signature: string;
  }) {
    if (
      !this.currentSafeMessage ||
      !this.safeInstance ||
      !this.currentSafeMessageHash
    ) {
      throw new Error('No message in Gnosis keyring');
    }

    signature = await adjustVInSignature(
      SigningMethod.ETH_SIGN_TYPED_DATA,
      signature
    );
    const safeSignature = new EthSafeSignature(signerAddress, signature);
    this.currentSafeMessage.addSignature(safeSignature);
  }

  signTypedData() {
    throw new Error('Gnosis address not support signTypedData');
  }

  signPersonalMessage() {
    throw new Error('Gnosis address not support signPersonalMessage');
  }

  _normalize(buf) {
    if (isHexString(buf)) {
      return buf;
    }
    return bytesToHex(buf);
  }
}

export default GnosisKeyring;
