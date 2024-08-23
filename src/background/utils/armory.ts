import { v4 } from 'uuid';
import { bytesToString, hexToString } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  AuthClient,
  AuthConfig,
  VaultClient,
  VaultConfig,
  resourceId,
  buildSignerEip191,
  privateKeyToJwk,
  Address,
  Eip712TypedData,
  Hex,
  Request,
  TransactionRequest,
  Resource,
  Permission,
} from '@narval-xyz/armory-sdk';
import {
  Action,
  SignableMessage,
} from '@narval-xyz/armory-sdk/policy-engine-shared';
import {
  Alg,
  SigningAlg,
} from '@narval-xyz/armory-sdk/policy-engine-shared/signature';
import { NarvalAccount } from '../service/keyring/eth-narval-keyring';
import { WalletDtoAccount } from '@narval-xyz/armory-sdk/src/lib/http/client/vault';

export type ArmoryConfig = {
  credentialPrivateKey: Hex;
  authHost: string;
  authClientId: string;
  vaultHost: string;
  vaultClientId: string;
};

export type ArmoryConnection = {
  connectionId: string;
  credentialPublicKey: string;
  accounts: NarvalAccount[];
};

export type ArmoryClient = {
  authClient: AuthClient;
  vaultClient: VaultClient;
};

export const getArmoryClient = async ({
  credentialPrivateKey,
  authHost,
  authClientId,
  vaultHost,
  vaultClientId,
}: ArmoryConfig): Promise<ArmoryClient> => {
  const account = privateKeyToAccount(credentialPrivateKey);

  const credential = privateKeyToJwk(
    credentialPrivateKey,
    Alg.ES256K,
    account.address
  );

  const signer = {
    jwk: credential,
    alg: SigningAlg.EIP191,
    sign: await buildSignerEip191(credentialPrivateKey),
  };

  const authConfig: AuthConfig = {
    host: authHost,
    clientId: authClientId,
    signer,
  };

  const vaultConfig: VaultConfig = {
    host: vaultHost,
    clientId: vaultClientId,
    signer,
  };

  const authClient = new AuthClient(authConfig);
  const vaultClient = new VaultClient(vaultConfig);

  return {
    authClient,
    vaultClient,
  };
};

export const getArmoryAccount = (
  { authClient, vaultClient }: ArmoryClient,
  address: Address
) => {
  return {
    address,

    signMessage: async ({
      message,
    }: {
      message: SignableMessage;
    }): Promise<Hex> => {
      // convert the msg to a string, temporarily b/c backend breaks otherwise
      let msg = message;

      if (typeof message !== 'string') {
        if (typeof message.raw === 'string') {
          msg = hexToString(message.raw);
        } else {
          msg = bytesToString(message.raw);
        }
      }

      const request: Request = {
        action: Action.SIGN_MESSAGE,
        resourceId: resourceId(address),
        message: msg,
        nonce: v4(),
      };

      const accessToken = await authClient.requestAccessToken(request);

      const { signature } = await vaultClient.sign({
        data: request,
        accessToken,
      });

      return signature;
    },

    signTransaction: async (
      transactionRequest: TransactionRequest
    ): Promise<Hex> => {
      const request: Request = {
        action: Action.SIGN_TRANSACTION,
        resourceId: resourceId(address),
        transactionRequest,
        nonce: v4(),
      };

      const accessToken = await authClient.requestAccessToken(request);

      const { signature } = await vaultClient.sign({
        data: request,
        accessToken,
      });

      return signature;
    },

    signTypedData: async (typedData: Eip712TypedData): Promise<Hex> => {
      const request: Request = {
        action: Action.SIGN_TYPED_DATA,
        resourceId: resourceId(address),
        typedData,
        nonce: v4(),
      };

      const accessToken = await authClient.requestAccessToken(request);

      const { signature } = await vaultClient.sign({
        data: request,
        accessToken,
      });

      return signature;
    },
  };
};

export const listArmoryAccounts = async ({
  authClient,
  vaultClient,
}: ArmoryClient): Promise<WalletDtoAccount[]> => {
  const request: Request = {
    action: Action.GRANT_PERMISSION,
    resourceId: Resource.VAULT,
    nonce: v4(),
    permissions: [Permission.WALLET_READ],
  };

  const accessToken = await authClient.requestAccessToken(request);

  const { accounts } = await vaultClient.listAccounts({ accessToken });

  return accounts;
};
