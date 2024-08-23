import { JsonTx, TransactionFactory, TypedTransaction } from '@ethereumjs/tx';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import { EventEmitter } from 'events';
import { Hex, parseTransaction, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hash } from '@narval-xyz/armory-sdk/signature';
import {
  ArmoryConfig,
  getArmoryAccount,
  getArmoryClient,
  listArmoryAccounts,
} from '../../utils/armory';
import {
  Eip712TypedData,
  TransactionRequest,
} from '@narval-xyz/armory-sdk/policy-engine-shared';

const TYPE = 'Narval';

export type NarvalAccount = {
  accountId: string;
  address: string;
};

type KeyringOpt = {
  withAppKeyOrigin?: string;
  version?: SignTypedDataVersion | string;
};

type SerializedState = {
  armoryConfig: ArmoryConfig;
  accounts?: NarvalAccount[];
};

// export default class NarvalKeyring implements Keyring<SerializedState> {
export default class NarvalKeyring extends EventEmitter {
  #armoryConfig: ArmoryConfig | undefined;

  #accounts: NarvalAccount[];

  readonly type: string = TYPE;

  static type: string = TYPE;

  static getCredentialAddress(credentialPrivateKey: Hex) {
    const account = privateKeyToAccount(credentialPrivateKey);

    return account.address;
  }

  static getNarvalConnectionId(config: ArmoryConfig) {
    const { credentialPrivateKey, ...armoryConfig } = config;

    const credentialAddress = NarvalKeyring.getCredentialAddress(
      credentialPrivateKey
    );

    return hash({
      ...armoryConfig,
      credentialAddress,
    });
  }

  static async fetchNarvalAccounts(config: ArmoryConfig) {
    try {
      const armoryClient = await getArmoryClient(config);

      const accounts = (await listArmoryAccounts(armoryClient)).map(
        ({ id: accountId, address }) => ({
          accountId,
          address,
        })
      );

      return accounts;
    } catch (err) {
      if (
        err.message === 'Unauthorized' &&
        err?.context?.authorization?.status
      ) {
        throw new Error(err.context.authorization.status);
      }

      throw err;
    }
  }

  constructor(state: SerializedState | undefined) {
    super();
    this.#accounts = state?.accounts || [];

    /* istanbul ignore next: It's not possible to write a unit test for this, because a constructor isn't allowed
     * to be async. Jest can't await the constructor, and when the error gets thrown, Jest can't catch it. */
    if (state) {
      this.deserialize(state).catch((error: Error) => {
        throw new Error(`Problem deserializing NarvalKeyring ${error.message}`);
      });
    }
  }

  async serialize() {
    return {
      armoryConfig: this.#armoryConfig,
      accounts: this.#accounts,
    };
  }

  async deserialize(state: SerializedState) {
    this.#armoryConfig = state.armoryConfig;
    this.#accounts = state.accounts || [];
  }

  getCredentialAddress() {
    if (!this.#armoryConfig) {
      throw new Error('Narval not configured');
    }

    return NarvalKeyring.getCredentialAddress(
      this.#armoryConfig.credentialPrivateKey
    );
  }

  getNarvalConnectionId() {
    if (!this.#armoryConfig) {
      throw new Error('Narval not configured');
    }

    return NarvalKeyring.getNarvalConnectionId(this.#armoryConfig);
  }

  async fetchNarvalAccounts(): Promise<NarvalAccount[]> {
    if (!this.#armoryConfig) {
      throw new Error('Narval not configured');
    }

    return NarvalKeyring.fetchNarvalAccounts(this.#armoryConfig);
  }

  getNarvalAccounts(): NarvalAccount[] {
    return this.#accounts;
  }

  setNarvalAccounts(accounts: NarvalAccount[]) {
    this.#accounts = accounts;
  }

  async getAccounts() {
    return this.#accounts.map((a) => a.address);
  }

  removeAccount(address: string) {
    const addressExists = this.#accounts
      .map((a) => a.address.toLowerCase())
      .includes(address.toLowerCase());

    if (!addressExists) {
      throw new Error(`Address ${address} not found in this keyring`);
    }

    this.#accounts = this.#accounts.filter(
      (a) => a.address.toLowerCase() !== address.toLowerCase()
    );
  }

  async signTransaction(
    address: Hex,
    tx: TypedTransaction,
    opts: KeyringOpt = {}
  ) {
    if (!this.#armoryConfig) {
      throw new Error('Narval not configured');
    }

    try {
      const armoryClient = await getArmoryClient(this.#armoryConfig);
      const armoryAccount = getArmoryAccount(armoryClient, address);

      const txData = tx.toJSON();
      const chainId = tx.common.chainIdBN().toNumber();

      const transactionRequest = TransactionRequest.parse({
        ...txData,
        chainId,
        from: address,
        gas: txData.gasLimit,
        maxFeePerGas: txData.maxFeePerGas,
        maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
        nonce: tx.nonce.toNumber(),
        type: String(tx.type),
      });

      const serializedTransaction = await armoryAccount.signTransaction(
        transactionRequest
      );

      const { r, s, v, yParity } = parseTransaction(serializedTransaction);

      const txDataWithSignature: JsonTx = {
        chainId: transactionRequest.chainId
          ? toHex(transactionRequest.chainId)
          : undefined,
        nonce: transactionRequest.nonce
          ? toHex(transactionRequest.nonce)
          : undefined,
        to: transactionRequest.to!,
        data:
          !transactionRequest.data || transactionRequest.data === '0x'
            ? undefined
            : transactionRequest.data,
        value:
          !transactionRequest.value || transactionRequest.value === '0x'
            ? undefined
            : transactionRequest.value,
        gasLimit: transactionRequest.gas
          ? toHex(transactionRequest.gas)
          : undefined,
        type: transactionRequest.type
          ? toHex(Number(transactionRequest.type))
          : undefined,
        r,
        s,
        v: v ? toHex(v) : undefined,
      };

      if (transactionRequest.type === '2') {
        txDataWithSignature.maxFeePerGas = transactionRequest.maxFeePerGas
          ? toHex(transactionRequest.maxFeePerGas)
          : undefined;

        txDataWithSignature.maxPriorityFeePerGas = transactionRequest.maxPriorityFeePerGas
          ? toHex(transactionRequest.maxPriorityFeePerGas)
          : undefined;
        txDataWithSignature.v = yParity ? '0x1' : '0x0';
      } else {
        txDataWithSignature.gasPrice = txData.gasPrice
          ? toHex(txData.gasPrice)
          : undefined;
      }

      const buildTx = TransactionFactory.fromTxData(txDataWithSignature);

      return buildTx;
    } catch (err) {
      const message =
        err?.context?.authorization?.errors.map((e) => e.message).join(', ') ||
        err?.message;

      throw new Error(message);
    }
  }

  // For personal_sign, we need to prefix the message:
  async signPersonalMessage(
    address: Hex,
    rawMessage: Hex,
    opts = { withAppKeyOrigin: '' }
  ): Promise<Hex> {
    if (!this.#armoryConfig) {
      throw new Error('Narval not configured');
    }

    try {
      const armoryClient = await getArmoryClient(this.#armoryConfig);
      const armoryAccount = getArmoryAccount(armoryClient, address);

      const signature = await armoryAccount.signMessage({
        message: { raw: rawMessage },
      });

      return signature;
    } catch (err) {
      const message =
        err?.context?.authorization?.errors.map((e) => e.message).join(', ') ||
        err?.message;

      throw new Error(message);
    }
  }

  // personal_signTypedData, signs data along with the schema
  async signTypedData(
    address: Hex,
    typedData: Eip712TypedData,
    opts: KeyringOpt = { version: SignTypedDataVersion.V1 }
  ) {
    if (!this.#armoryConfig) {
      throw new Error('Narval not configured');
    }

    try {
      // Treat invalid versions as "V1"
      let version = SignTypedDataVersion.V1;

      if (opts.version && isSignTypedDataVersion(opts.version)) {
        version = SignTypedDataVersion[opts.version];
      }

      const coercedTypedData = Eip712TypedData.parse(typedData);
      const armoryClient = await getArmoryClient(this.#armoryConfig);
      const armoryAccount = getArmoryAccount(armoryClient, address);
      const signature = await armoryAccount.signTypedData(coercedTypedData);

      return signature;
    } catch (err) {
      const message =
        err?.context?.authorization?.errors.map((e) => e.message).join(', ') ||
        err?.message;

      throw new Error(message);
    }
  }

  async signMessage() {
    throw new Error('Not supported');
  }

  async decryptMessage(withAccount: any, encryptedData: any) {
    throw new Error('Not supported');
  }

  async getEncryptionPublicKey(withAccount: Hex, opts?: KeyringOpt) {
    throw new Error('Not supported');
  }

  async getAppKeyAddress(address: Hex, origin: string) {
    throw new Error('Not supported');
  }

  async exportAccount(address: Hex, opts = { withAppKeyOrigin: '' }) {
    throw new Error('Not supported');
  }
}

/**
 * Type predicate type guard to check if a string is in the enum SignTypedDataVersion.
 *
 * @param version - The string to check.
 * @returns Whether it's in the enum.
 */
function isSignTypedDataVersion(
  version: SignTypedDataVersion | string
): version is SignTypedDataVersion {
  return version in SignTypedDataVersion;
}
