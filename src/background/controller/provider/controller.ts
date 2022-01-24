import * as Sentry from '@sentry/browser';
import Transaction from 'ethereumjs-tx';
import { TransactionFactory } from '@ethereumjs/tx';
import { ethers } from 'ethers';
import {
  bufferToHex,
  isHexString,
  addHexPrefix,
  intToHex,
} from 'ethereumjs-util';
import { stringToHex } from 'web3-utils';
import { ethErrors } from 'eth-rpc-errors';
import {
  normalize as normalizeAddress,
  recoverPersonalSignature,
} from 'eth-sig-util';
import cloneDeep from 'lodash/cloneDeep';
import {
  keyringService,
  permissionService,
  sessionService,
  openapiService,
  preferenceService,
  transactionWatchService,
  transactionHistoryService,
  pageStateCacheService,
  signTextHistoryService,
  i18n,
} from 'background/service';
import { notification } from 'background/webapi';
import { Session } from 'background/service/session';
import { Tx } from 'background/service/openapi';
import RpcCache from 'background/utils/rpcCache';
import Wallet from '../wallet';
import { CHAINS, CHAINS_ENUM, SAFE_RPC_METHODS, KEYRING_TYPE } from 'consts';
import buildinProvider from 'background/utils/buildinProvider';
import BaseController from '../base';
import { Account } from 'background/service/preference';
import { validateGasPriceRange } from '@/utils/transaction';

interface ApprovalRes extends Tx {
  type?: string;
  address?: string;
  uiRequestComponent?: string;
  isSend?: boolean;
  isGnosis?: boolean;
  account?: Account;
  extra?: Record<string, any>;
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
  ethRpc = (req, forceChainServerId?: string) => {
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
    if (forceChainServerId) {
      chainServerId = forceChainServerId;
    }

    const currentAddress =
      preferenceService.getCurrentAccount()?.address.toLowerCase() || '0x';
    const cache = RpcCache.get(currentAddress, {
      method,
      params,
      chainId: chainServerId,
    });
    if (cache) return cache;

    const promise = openapiService
      .ethRpc(chainServerId, {
        origin: encodeURIComponent(origin),
        method,
        params,
      })
      .then((result) => {
        RpcCache.set(currentAddress, {
          method,
          params,
          result,
          chainId: chainServerId,
        });
        return result;
      });
    RpcCache.set(currentAddress, {
      method,
      params,
      result: promise,
      chainId: chainServerId,
    });
    return promise;
  };

  ethRequestAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      throw ethErrors.provider.unauthorized();
    }

    const _account = await this.getCurrentAccount();
    const account = _account ? [_account.address] : [];
    sessionService.broadcastEvent('accountsChanged', account);
    const connectSite = permissionService.getConnectedSite(origin);
    if (connectSite) {
      const chain = CHAINS[connectSite.chain];
      sessionService.broadcastEvent(
        'chainChanged',
        {
          chain: chain.hex,
          networkVersion: chain.network,
        },
        origin
      );
    }

    return account;
  };

  ethAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      return [];
    }

    const account = await this.getCurrentAccount();
    return account ? [account.address] : [];
  };

  ethCoinbase = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      return null;
    }

    const account = await this.getCurrentAccount();
    return account ? account.address : null;
  };

  ethChainId = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);

    return CHAINS[site?.chain || CHAINS_ENUM.ETH].hex;
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
      const currentChain = permissionService.isInternalOrigin(session.origin)
        ? Object.values(CHAINS).find((chain) => chain.id === tx.chainId)!.enum
        : permissionService.getConnectedSite(session.origin)?.chain;
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
    const isSend = !!txParams.isSend;
    delete txParams.isSend;
    delete approvalRes.isSend;
    delete approvalRes.address;
    delete approvalRes.type;
    delete approvalRes.uiRequestComponent;
    const tx = new Transaction(approvalRes);
    const currentAccount = preferenceService.getCurrentAccount()!;
    let opts;
    opts = approvalRes?.extra;
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      buildinProvider.currentProvider.currentAccount = approvalRes!.account!.address;
      buildinProvider.currentProvider.currentAccountType = approvalRes!.account!.type;
      buildinProvider.currentProvider.currentAccountBrand = approvalRes!.account!.brandName;
      try {
        const provider = new ethers.providers.Web3Provider(
          buildinProvider.currentProvider
        );
        opts = {
          provider,
        };
      } catch (e) {
        console.log(e);
      }
    }
    const signedTx = await keyringService.signTransaction(
      keyring,
      tx,
      txParams.from,
      opts
    );
    const onTranscationSubmitted = (hash: string) => {
      const chain = permissionService.isInternalOrigin(origin)
        ? Object.values(CHAINS).find(
            (chain) => chain.id === approvalRes.chainId
          )!.enum
        : permissionService.getConnectedSite(origin)!.chain;
      const cacheExplain = transactionHistoryService.getExplainCache({
        address: txParams.from,
        chainId: Number(approvalRes.chainId),
        nonce: Number(approvalRes.nonce),
      });
      if (isSend) {
        pageStateCacheService.clear();
      }
      transactionHistoryService.addTx(
        {
          rawTx: approvalRes,
          createdAt: Date.now(),
          isCompleted: false,
          hash,
          failed: false,
        },
        cacheExplain
      );
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
      validateGasPriceRange(approvalRes);
      const hash = await openapiService.pushTx({
        ...approvalRes,
        r: bufferToHex(signedTx.r),
        s: bufferToHex(signedTx.s),
        v: bufferToHex(signedTx.v),
        value: approvalRes.value || '0x0',
      });
      onTranscationSubmitted(hash);
      return hash;
    } catch (e: any) {
      const cacheExplain = transactionHistoryService.getExplainCache({
        address: txParams.from,
        chainId: Number(approvalRes.chainId),
        nonce: Number(approvalRes.nonce),
      });
      transactionHistoryService.addSubmitFailedTransaction(
        {
          rawTx: approvalRes,
          createdAt: Date.now(),
          isCompleted: true,
          hash: '',
          failed: false,
          isSubmitFailed: true,
        },
        cacheExplain
      );
      const errMsg = e.message || JSON.stringify(e);
      notification.create(undefined, i18n.t('Transaction push failed'), errMsg);
      throw new Error(errMsg);
    }
  };

  netVersion = (req) => {
    return this.ethRpc({
      ...req,
      data: { method: 'net_version', params: [] },
    });
  };

  @Reflect.metadata('SAFE', true)
  web3ClientVersion = () => {
    return `Rabby/${process.env.release}`;
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
  personalSign = async ({ data, approvalRes, session }) => {
    if (!data.params) return;
    const [string, from] = data.params;
    const hex = isHexString(string) ? string : stringToHex(string);
    const keyring = await this._checkAddress(from);
    const result = await keyringService.signPersonalMessage(
      keyring,
      { data: hex, from },
      approvalRes?.extra
    );
    signTextHistoryService.createHistory({
      address: from,
      text: string,
      origin: session.origin,
      type: 'personalSign',
    });
    return result;
  };

  private _signTypedData = async (from, data, version, extra?) => {
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
      { version, ...(extra || {}) }
    );
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', v1SignTypedDataVlidation])
  ethSignTypedData = async ({
    data: {
      params: [data, from],
    },
    session,
    approvalRes,
  }) => {
    const result = await this._signTypedData(
      from,
      data,
      'V1',
      approvalRes?.extra
    );
    signTextHistoryService.createHistory({
      address: from,
      text: data,
      origin: session.origin,
      type: 'ethSignTypedData',
    });
    return result;
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', v1SignTypedDataVlidation])
  ethSignTypedDataV1 = async ({
    data: {
      params: [data, from],
    },
    session,
    approvalRes,
  }) => {
    const result = await this._signTypedData(
      from,
      data,
      'V1',
      approvalRes?.extra
    );
    signTextHistoryService.createHistory({
      address: from,
      text: data,
      origin: session.origin,
      type: 'ethSignTypedDataV1',
    });
    return result;
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV3 = async ({
    data: {
      params: [from, data],
    },
    session,
    approvalRes,
  }) => {
    const result = await this._signTypedData(
      from,
      data,
      'V3',
      approvalRes?.extra
    );
    signTextHistoryService.createHistory({
      address: from,
      text: data,
      origin: session.origin,
      type: 'ethSignTypedDataV3',
    });
    return result;
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV4 = async ({
    data: {
      params: [from, data],
    },
    session,
    approvalRes,
  }) => {
    const result = await this._signTypedData(
      from,
      data,
      'V4',
      approvalRes?.extra
    );
    signTextHistoryService.createHistory({
      address: from,
      text: data,
      origin: session.origin,
      type: 'ethSignTypedDataV4',
    });
    return result;
  };

  @Reflect.metadata('APPROVAL', [
    'AddChain',
    ({ data, session }) => {
      const connected = permissionService.getConnectedSite(session.origin);
      if (connected) {
        const { chainId } = data.params[0];
        if (Number(chainId) === CHAINS[connected.chain].id) {
          return true;
        }
      }
    },
    { height: 390 },
  ])
  walletAddEthereumChain = ({
    data: {
      params: [chainParams],
    },
    session: { origin },
  }) => {
    let chainId = chainParams.chainId;
    if (typeof chainId === 'number') {
      chainId = intToHex(chainId).toLowerCase();
    } else {
      chainId = chainId.toLowerCase();
    }
    const chain = Object.values(CHAINS).find((value) => value.hex === chainId);

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

  @Reflect.metadata('APPROVAL', [
    'AddChain',
    ({ data, session }) => {
      const connected = permissionService.getConnectedSite(session.origin);
      if (connected) {
        const { chainId } = data.params[0];
        if (Number(chainId) === CHAINS[connected.chain].id) {
          return true;
        }
      }
    },
    { height: 390 },
  ])
  walletSwitchEthereumChain = this.walletAddEthereumChain;

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

  personalEcRecover = ({
    data: {
      params: [data, sig, extra = {}],
    },
  }) => {
    return recoverPersonalSignature({
      ...extra,
      data,
      sig,
    });
  };

  netListening = () => {
    return true;
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
