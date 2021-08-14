import * as Sentry from '@sentry/browser';
import Transaction from 'ethereumjs-tx';
import { TransactionFactory } from '@ethereumjs/tx';
import { bufferToHex, isHexString, addHexPrefix } from 'ethereumjs-util';
import { stringToHex } from 'web3-utils';
import { ethErrors } from 'eth-rpc-errors';
import { normalize as normalizeAddress } from 'eth-sig-util';
import cloneDeep from 'lodash/cloneDeep';
import {
  keyringService,
  permissionService,
  chainService,
  sessionService,
  openapiService,
  preferenceService,
  transactionWatchService,
  i18n,
} from 'background/service';
import { notification } from 'background/webapi';
import { Session } from 'background/service/session';
import { Tx } from 'background/service/openapi';
import RpcCache from 'background/utils/rpcCache';
import Wallet from '../wallet';
import { CHAINS, CHAINS_ENUM, SAFE_RPC_METHODS } from 'consts';
import BaseController from '../base';

interface ApprovalRes extends Tx {
  type?: string;
  address?: string;
  uiRequestComponent?: string;
}

interface Web3WalletPermission {
  // The name of the method corresponding to the permission
  parentCapability: string;

  // The date the permission was granted, in UNIX epoch time
  date?: number;
}

const v1SignTypedDataVlidation = ({
  data: {
    params: [_, from],
  },
}) => {
  const currentAddress = preferenceService
    .getCurrentAccount()
    ?.address.toLowerCase();
  if (from.toLowerCase() !== currentAddress)
    throw ethErrors.rpc.invalidParams('from should be same as current address');
};

const signTypedDataVlidation = ({
  data: {
    params: [from, _],
  },
}) => {
  const currentAddress = preferenceService
    .getCurrentAccount()
    ?.address.toLowerCase();
  if (from.toLowerCase() !== currentAddress)
    throw ethErrors.rpc.invalidParams('from should be same as current address');
};

class ProviderController extends BaseController {
  ethRpc = (req) => {
    const {
      data: { method, params },
      session: { origin },
    } = req;

    if (
      !permissionService.hasPerssmion(origin) &&
      !SAFE_RPC_METHODS.includes(method)
    ) {
      throw ethErrors.provider.unauthorized();
    }

    const connected = permissionService.getConnectedSite(origin);
    let chainServerId = CHAINS[CHAINS_ENUM.ETH].serverId;

    if (connected) {
      chainServerId = CHAINS[connected.chain].serverId;
    }

    const currentAddress =
      preferenceService.getCurrentAccount()?.address.toLowerCase() || '0x';
    const cache = RpcCache.get(currentAddress, { method, params });

    if (cache) return cache;

    const promise = openapiService
      .ethRpc(chainServerId, {
        origin: encodeURIComponent(origin),
        method,
        params,
      })
      .then((result) => {
        RpcCache.set(
          currentAddress,
          { method, params, result },
          method === 'eth_call' ? 20 * 60000 : undefined
        );
        return result;
      });
    RpcCache.set(
      currentAddress,
      { method, params, result: promise },
      method === 'eth_call' ? 20 * 60000 : undefined
    );
    return promise;
  };

  ethRequestAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      throw ethErrors.provider.unauthorized();
    }

    const _account = await this.getCurrentAccount();
    const account = _account ? [_account.address] : [];
    sessionService.broadcastEvent('accountsChanged', account);

    return account;
  };

  @Reflect.metadata('SAFE', true)
  ethAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      return [];
    }

    const account = await this.getCurrentAccount();
    return account ? [account.address] : [];
  };

  @Reflect.metadata('SAFE', true)
  ethCoinbase = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      return null;
    }

    const account = await this.getCurrentAccount();
    return account ? account.address : null;
  };

  @Reflect.metadata('SAFE', true)
  ethChainId = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);

    return CHAINS[site?.chain || CHAINS_ENUM.ETH].hex;
  };

  @Reflect.metadata('SAFE', true)
  netVersion = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);

    return CHAINS[site?.chain || CHAINS_ENUM.ETH].network;
  };

  @Reflect.metadata('APPROVAL', [
    'SignTx',
    ({
      data: {
        params: [tx],
      },
      session,
    }) => {
      const currentAddress = preferenceService
        .getCurrentAccount()
        ?.address.toLowerCase();
      const currentChain = permissionService.getConnectedSite(session.origin)
        ?.chain;
      if (tx.from.toLowerCase() !== currentAddress) {
        throw ethErrors.rpc.invalidParams(
          'from should be same as current address'
        );
      }
      if (
        'chainId' in tx &&
        (!currentChain || Number(tx.chainId) !== CHAINS[currentChain].id)
      ) {
        throw ethErrors.rpc.invalidParams(
          'chainId should be same as current chainId'
        );
      }
    },
  ])
  ethSendTransaction = async (options: {
    data: {
      params: any;
    };
    session: Session;
    approvalRes: ApprovalRes;
    pushed: boolean;
    result: any;
  }) => {
    if (options.pushed) return options.result;
    const {
      data: {
        params: [txParams],
      },
      session: { origin },
      approvalRes,
    } = cloneDeep(options);
    const keyring = await this._checkAddress(txParams.from);
    delete approvalRes.address;
    delete approvalRes.type;
    delete approvalRes.uiRequestComponent;
    const tx = new Transaction(approvalRes);
    const signedTx = await keyringService.signTransaction(
      keyring,
      tx,
      txParams.from
    );
    const onTranscationSubmitted = (hash: string) => {
      const chain = permissionService.getConnectedSite(origin)!.chain;
      transactionWatchService.addTx(
        `${txParams.from}_${approvalRes.nonce}_${chain}`,
        {
          nonce: approvalRes.nonce,
          hash,
          chain,
        }
      );
    };
    if (typeof signedTx === 'string') {
      onTranscationSubmitted(signedTx);
      return signedTx;
    }
    const buildTx = TransactionFactory.fromTxData({
      ...approvalRes,
      r: addHexPrefix(signedTx.r),
      s: addHexPrefix(signedTx.s),
      v: addHexPrefix(signedTx.v),
    });

    // Report address type(not sensitive information) to sentry when tx signatuure is invalid
    if (!buildTx.verifySignature()) {
      if (!buildTx.v) {
        Sentry.captureException(new Error(`v missed, ${keyring.type}`));
      } else if (!buildTx.s) {
        Sentry.captureException(new Error(`s midded, ${keyring.type}`));
      } else if (!buildTx.r) {
        Sentry.captureException(new Error(`r midded, ${keyring.type}`));
      } else {
        Sentry.captureException(
          new Error(`invalid signature, ${keyring.type}`)
        );
      }
    }
    try {
      const hash = await openapiService.pushTx({
        ...approvalRes,
        r: bufferToHex(signedTx.r),
        s: bufferToHex(signedTx.s),
        v: bufferToHex(signedTx.v),
        value: approvalRes.value || '0x0',
      });

      onTranscationSubmitted(hash);

      return hash;
    } catch (e) {
      const errMsg = e.message || JSON.stringify(e);
      notification.create(undefined, i18n.t('Transaction push failed'), errMsg);
      throw new Error(errMsg);
    }
  };

  @Reflect.metadata('APPROVAL', [
    'SignText',
    ({
      data: {
        params: [_, from],
      },
    }) => {
      const currentAddress = preferenceService
        .getCurrentAccount()
        ?.address.toLowerCase();
      if (from.toLowerCase() !== currentAddress)
        throw ethErrors.rpc.invalidParams(
          'from should be same as current address'
        );
    },
  ])
  personalSign = async ({
    data: {
      params: [data, from],
    },
  }) => {
    data = data = isHexString(data) ? data : stringToHex(data);
    const keyring = await this._checkAddress(from);

    return keyringService.signPersonalMessage(keyring, { data, from });
  };

  private _signTypedData = async (from, data, version) => {
    const keyring = await this._checkAddress(from);
    let _data = data;
    if (version !== 'V1') {
      if (typeof data === 'string') {
        _data = JSON.parse(data);
      }
    }

    return keyringService.signTypedMessage(
      keyring,
      { from, data: _data },
      { version }
    );
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', v1SignTypedDataVlidation])
  ethSignTypedData = async ({
    data: {
      params: [data, from],
    },
  }) => this._signTypedData(from, data, 'V1');

  @Reflect.metadata('APPROVAL', ['SignTypedData', v1SignTypedDataVlidation])
  ethSignTypedDataV1 = async ({
    data: {
      params: [data, from],
    },
  }) => this._signTypedData(from, data, 'V1');

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV3 = async ({
    data: {
      params: [from, data],
    },
  }) => this._signTypedData(from, data, 'V3');

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV4 = async ({
    data: {
      params: [from, data],
    },
  }) => this._signTypedData(from, data, 'V4');

  @Reflect.metadata('APPROVAL', [
    'AddChain',
    ({
      data: {
        params: [chainParams],
      },
      session: { origin },
    }) => {
      return (
        chainService
          .getEnabledChains()
          .some((chain) => chain.hex === chainParams.chainId) &&
        CHAINS[permissionService.getConnectedSite(origin)!.chain]?.hex ===
          chainParams.chainId
      );
    },
    { height: 390 },
  ])
  walletAddEthereumChain = ({
    data: {
      params: [chainParams],
    },
    session: { origin },
  }) => {
    const chain = Object.values(CHAINS).find(
      (value) => value.hex === chainParams.chainId
    );

    if (!chain) {
      throw new Error('This chain is not supported by Rabby yet.');
    }

    permissionService.updateConnectSite(
      origin,
      {
        chain: chain.enum,
      },
      true
    );

    chainService.enableChain(chain.enum);

    sessionService.broadcastEvent(
      'chainChanged',
      {
        chain: chain.hex,
        networkVersion: chain.network,
      },
      origin
    );
    return null;
  };

  walletRequestPermissions = ({ data: { params: permissions } }) => {
    const result: Web3WalletPermission[] = [];
    if ('eth_accounts' in permissions?.[0]) {
      result.push({ parentCapability: 'eth_accounts' });
    }
    return result;
  };

  @Reflect.metadata('SAFE', true)
  walletGetPermissions = ({ session: { origin } }) => {
    const result: Web3WalletPermission[] = [];
    if (Wallet.isUnlocked() && Wallet.getConnectedSite(origin)) {
      result.push({ parentCapability: 'eth_accounts' });
    }
    return result;
  };

  private _checkAddress = async (address) => {
    // eslint-disable-next-line prefer-const
    let { address: currentAddress, type } =
      (await this.getCurrentAccount()) || {};
    currentAddress = currentAddress?.toLowerCase();
    if (
      !currentAddress ||
      currentAddress !== normalizeAddress(address).toLowerCase()
    ) {
      throw ethErrors.rpc.invalidParams({
        message:
          'Invalid parameters: must use the current user address to sign',
      });
    }
    const keyring = await keyringService.getKeyringForAccount(
      currentAddress,
      type
    );

    return keyring;
  };
}

export default new ProviderController();
