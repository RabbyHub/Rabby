import { matomoRequestEvent } from '@/utils/matomo-request';
import * as Sentry from '@sentry/browser';
import Common, { Hardfork } from '@ethereumjs/common';
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
  RPCService,
  i18n,
  swapService,
  transactionBroadcastWatchService,
  notificationService,
} from 'background/service';
import { notification } from 'background/webapi';
import { Session } from 'background/service/session';
import { Tx, TxPushType } from 'background/service/openapi';
import RpcCache from 'background/utils/rpcCache';
import Wallet from '../wallet';
import {
  CHAINS,
  CHAINS_ENUM,
  SAFE_RPC_METHODS,
  KEYRING_TYPE,
  KEYRING_CATEGORY_MAP,
  EVENTS,
} from 'consts';
import buildinProvider from 'background/utils/buildinProvider';
import BaseController from '../base';
import { Account } from 'background/service/preference';
import { validateGasPriceRange, is1559Tx } from '@/utils/transaction';
import stats from '@/stats';
import BigNumber from 'bignumber.js';
import { AddEthereumChainParams } from '@/ui/views/Approval/components/AddChain/type';
import { formatTxMetaForRpcResult } from 'background/utils/tx';
import { findChainByEnum } from '@/utils/chain';
import eventBus from '@/eventBus';

const reportSignText = (params: {
  method: string;
  account: Account;
  success: boolean;
}) => {
  const { method, account, success } = params;
  matomoRequestEvent({
    category: 'SignText',
    action: 'completeSignText',
    label: [
      KEYRING_CATEGORY_MAP[account.type],
      account.brandName,
      success,
    ].join('|'),
  });
  stats.report('completeSignText', {
    type: account.brandName,
    category: KEYRING_CATEGORY_MAP[account.type],
    method,
    success,
  });
};

interface ApprovalRes extends Tx {
  type?: string;
  address?: string;
  uiRequestComponent?: string;
  isSend?: boolean;
  isSpeedUp?: boolean;
  isCancel?: boolean;
  isSwap?: boolean;
  isGnosis?: boolean;
  account?: Account;
  extra?: Record<string, any>;
  traceId?: string;
  $ctx?: any;
  signingTxId?: string;
  pushType?: TxPushType;
  lowGasDeadline?: number;
  reqId?: string;
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
    params: [from, data],
  },
  session,
}) => {
  let jsonData;
  try {
    jsonData = JSON.parse(data);
  } catch (e) {
    throw ethErrors.rpc.invalidParams('data is not a validate JSON string');
  }
  const currentChain = permissionService.getConnectedSite(session.origin)
    ?.chain;
  if (jsonData.domain.chainId) {
    const chainItem = findChainByEnum(currentChain);
    if (
      !currentChain ||
      (chainItem && Number(jsonData.domain.chainId) !== chainItem.id)
    ) {
      throw ethErrors.rpc.invalidParams(
        'chainId should be same as current chainId'
      );
    }
  }
  const currentAddress = preferenceService
    .getCurrentAccount()
    ?.address.toLowerCase();
  if (from.toLowerCase() !== currentAddress)
    throw ethErrors.rpc.invalidParams('from should be same as current address');
};

class ProviderController extends BaseController {
  @Reflect.metadata('PRIVATE', true)
  ethRpc = (req, forceChainServerId?: string) => {
    const {
      data: { method, params },
      session: { origin },
    } = req;

    if (
      !permissionService.hasPermission(origin) &&
      !SAFE_RPC_METHODS.includes(method)
    ) {
      throw ethErrors.provider.unauthorized();
    }

    const site = permissionService.getSite(origin);
    let chainServerId = CHAINS[CHAINS_ENUM.ETH].serverId;
    if (site) {
      chainServerId = CHAINS[site.chain].serverId;
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
    const chain = Object.values(CHAINS).find(
      (item) => item.serverId === chainServerId
    )!;
    if (RPCService.hasCustomRPC(chain.enum)) {
      const promise = RPCService.requestCustomRPC(
        chain.enum,
        method,
        params
      ).then((result) => {
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
    } else {
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
    }
  };

  ethRequestAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPermission(origin)) {
      throw ethErrors.provider.unauthorized();
    }

    const _account = await this.getCurrentAccount();
    const account = _account ? [_account.address.toLowerCase()] : [];
    sessionService.broadcastEvent('accountsChanged', account);
    const connectSite = permissionService.getConnectedSite(origin);
    if (connectSite) {
      const chain = CHAINS[connectSite.chain];
      // rabby:chainChanged event must be sent before chainChanged event
      sessionService.broadcastEvent('rabby:chainChanged', chain, origin);
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

  @Reflect.metadata('SAFE', true)
  ethAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPermission(origin) || !Wallet.isUnlocked()) {
      return [];
    }

    const account = await this.getCurrentAccount();
    return account ? [account.address.toLowerCase()] : [];
  };

  ethCoinbase = async ({ session: { origin } }) => {
    if (!permissionService.hasPermission(origin)) {
      return null;
    }

    const account = await this.getCurrentAccount();
    return account ? account.address.toLowerCase() : null;
  };

  @Reflect.metadata('SAFE', true)
  ethChainId = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);

    return findChainByEnum(site?.chain, { fallback: CHAINS_ENUM.ETH })!.hex;
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
      $ctx?: any;
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
    const isSpeedUp = !!txParams.isSpeedUp;
    const isCancel = !!txParams.isCancel;
    const traceId = approvalRes.traceId;
    const extra = approvalRes.extra;
    const signingTxId = approvalRes.signingTxId;
    const isCoboSafe = !!txParams.isCoboSafe;
    const pushType = approvalRes.pushType || 'default';
    const lowGasDeadline = approvalRes.lowGasDeadline;
    const preReqId = approvalRes.reqId;

    let signedTransactionSuccess = false;
    delete txParams.isSend;
    delete approvalRes.isSend;
    delete approvalRes.isSwap;
    delete approvalRes.address;
    delete approvalRes.type;
    delete approvalRes.uiRequestComponent;
    delete approvalRes.traceId;
    delete approvalRes.extra;
    delete approvalRes.$ctx;
    delete approvalRes.signingTxId;
    delete approvalRes.pushType;
    delete approvalRes.lowGasDeadline;
    delete approvalRes.reqId;
    delete txParams.isCoboSafe;

    let is1559 = is1559Tx(approvalRes);
    if (
      is1559 &&
      approvalRes.maxFeePerGas === approvalRes.maxPriorityFeePerGas
    ) {
      // fallback to legacy transaction if maxFeePerGas is equal to maxPriorityFeePerGas
      approvalRes.gasPrice = approvalRes.maxFeePerGas;
      delete approvalRes.maxFeePerGas;
      delete approvalRes.maxPriorityFeePerGas;
      is1559 = false;
    }
    const common = Common.custom(
      { chainId: approvalRes.chainId },
      { hardfork: Hardfork.London }
    );
    const txData = { ...approvalRes, gasLimit: approvalRes.gas };
    if (is1559) {
      txData.type = '0x2';
    }
    const tx = TransactionFactory.fromTxData(txData, {
      common,
    });
    const currentAccount = preferenceService.getCurrentAccount()!;
    let opts;
    opts = extra;
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
    const chain = permissionService.isInternalOrigin(origin)
      ? Object.values(CHAINS).find((chain) => chain.id === approvalRes.chainId)!
          .enum
      : permissionService.getConnectedSite(origin)!.chain;

    const approvingTx = transactionHistoryService.getSigningTx(signingTxId!);
    if (!approvingTx?.rawTx || !approvingTx?.explain) {
      throw new Error(`approvingTx not found: ${signingTxId}`);
    }
    transactionHistoryService.updateSigningTx(signingTxId!, {
      isSubmitted: true,
    });

    const { explain: cacheExplain, rawTx, action } = approvingTx;

    const chainItem = findChainByEnum(chain);

    // wait ui
    if (
      currentAccount.type === KEYRING_TYPE.SimpleKeyring ||
      currentAccount.type === KEYRING_TYPE.HdKeyring
    ) {
      await new Promise((r) => setTimeout(r, 200));
    }
    const statsData = {
      signed: false,
      signedSuccess: false,
      submit: false,
      submitSuccess: false,
      type: currentAccount.brandName,
      chainId: chainItem?.serverId || '',
      category: KEYRING_CATEGORY_MAP[currentAccount.type],
      preExecSuccess: cacheExplain
        ? cacheExplain.pre_exec.success && cacheExplain.calcSuccess
        : true,
      createBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
      source: options?.data?.$ctx?.ga?.source || '',
      trigger: options?.data?.$ctx?.ga?.trigger || '',
    };

    try {
      const signedTx = await keyringService.signTransaction(
        keyring,
        tx,
        txParams.from,
        opts
      );
      if (
        currentAccount.type === KEYRING_TYPE.GnosisKeyring ||
        currentAccount.type === KEYRING_TYPE.CoboArgusKeyring
      ) {
        signedTransactionSuccess = true;
        // stats.report('signedTransaction', {
        //   type: currentAccount.brandName,
        //   chainId: chainItem?.serverId || '',
        //   category: KEYRING_CATEGORY_MAP[currentAccount.type],
        //   success: true,
        //   preExecSuccess: cacheExplain
        //     ? cacheExplain.pre_exec.success && cacheExplain.calcSuccess
        //     : true,
        //   createBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
        //   source: options?.data?.$ctx?.ga?.source || '',
        //   trigger: options?.data?.$ctx?.ga?.trigger || '',
        // });
        statsData.signed = true;
        statsData.signedSuccess = true;
        return;
      }

      const onTransactionCreated = (info: {
        hash?: string;
        reqId?: string;
        pushType?: TxPushType;
      }) => {
        const { hash, reqId, pushType = 'default' } = info;
        if (
          options?.data?.$ctx?.stats?.afterSign?.length &&
          Array.isArray(options?.data?.$ctx?.stats?.afterSign)
        ) {
          options.data.$ctx.stats.afterSign.forEach(({ name, params }) => {
            if (name && params) {
              stats.report(name, params);
            }
          });
        }

        const { r, s, v, ...other } = approvalRes;

        if (hash) {
          swapService.postSwap(chain, hash, other);
        }

        // stats.report('submitTransaction', {
        //   type: currentAccount.brandName,
        //   chainId: chainItem?.serverId || '',
        //   category: KEYRING_CATEGORY_MAP[currentAccount.type],
        //   success: true,
        //   preExecSuccess: cacheExplain
        //     ? cacheExplain.pre_exec.success && cacheExplain.calcSuccess
        //     : true,
        //   createBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
        //   source: options?.data?.$ctx?.ga?.source || '',
        //   trigger: options?.data?.$ctx?.ga?.trigger || '',
        // });
        statsData.submit = true;
        statsData.submitSuccess = true;
        if (isSend) {
          pageStateCacheService.clear();
        }
        transactionHistoryService.addTx({
          tx: {
            rawTx: {
              ...rawTx,
              ...approvalRes,
              r: bufferToHex(signedTx.r),
              s: bufferToHex(signedTx.s),
              v: bufferToHex(signedTx.v),
            },
            createdAt: Date.now(),
            isCompleted: false,
            hash,
            failed: false,
            reqId,
            pushType,
          },
          explain: cacheExplain,
          actionData: action,
          origin,
          $ctx: options?.data?.$ctx,
          isDropFailed: true,
        });
        transactionHistoryService.removeSigningTx(signingTxId!);
        if (hash) {
          transactionWatchService.addTx(
            `${txParams.from}_${approvalRes.nonce}_${chain}`,
            {
              nonce: approvalRes.nonce,
              hash,
              chain,
            }
          );
        }
        if (reqId && !hash) {
          transactionBroadcastWatchService.addTx(reqId, {
            reqId,
            address: txParams.from,
            chainId: CHAINS[chain].id,
            nonce: approvalRes.nonce,
          });
        }

        if (isCoboSafe) {
          preferenceService.resetCurrentCoboSafeAddress();
        }
      };
      const onTransactionSubmitFailed = (e: any) => {
        if (
          options?.data?.$ctx?.stats?.afterSign?.length &&
          Array.isArray(options?.data?.$ctx?.stats?.afterSign)
        ) {
          options.data.$ctx.stats.afterSign.forEach(({ name, params }) => {
            if (name && params) {
              stats.report(name, params);
            }
          });
        }

        stats.report('submitTransaction', {
          type: currentAccount.brandName,
          chainId: chainItem?.serverId || '',
          category: KEYRING_CATEGORY_MAP[currentAccount.type],
          success: false,
          preExecSuccess: cacheExplain
            ? cacheExplain.pre_exec.success && cacheExplain.calcSuccess
            : true,
          createBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
          source: options?.data?.$ctx?.ga?.source || '',
          trigger: options?.data?.$ctx?.ga?.trigger || '',
        });
        if (!isSpeedUp && !isCancel) {
          // const cacheExplain = transactionHistoryService.getExplainCache({
          //   address: txParams.from,
          //   chainId: Number(approvalRes.chainId),
          //   nonce: Number(approvalRes.nonce),
          // });
          transactionHistoryService.addSubmitFailedTransaction(
            {
              rawTx: approvalRes,
              createdAt: Date.now(),
              isCompleted: true,
              hash: '',
              failed: false,
              isSubmitFailed: true,
            },
            cacheExplain,
            origin
          );
        }
        const errMsg = e.message || JSON.stringify(e);
        // notification.create(
        //   undefined,
        //   i18n.t('background.error.txPushFailed'),
        //   errMsg
        // );
        // transactionHistoryService.removeSigningTx(signingTxId!);
        notificationService.setStatsData(statsData);
        throw new Error(errMsg);
      };

      if (typeof signedTx === 'string') {
        onTransactionCreated({
          hash: signedTx,
          pushType: 'default',
        });
        if (currentAccount.type === KEYRING_TYPE.WalletConnectKeyring) {
          statsData.signed = true;
          statsData.signedSuccess = true;
        }
        notificationService.setStatsData(statsData);
        return signedTx;
      }

      const buildTx = TransactionFactory.fromTxData({
        ...approvalRes,
        r: addHexPrefix(signedTx.r),
        s: addHexPrefix(signedTx.s),
        v: addHexPrefix(signedTx.v),
        type: is1559 ? '0x2' : '0x0',
      });

      // Report address type(not sensitive information) to sentry when tx signature is invalid
      if (!buildTx.verifySignature()) {
        if (!buildTx.v) {
          Sentry.captureException(new Error(`v missed, ${keyring.type}`));
        } else if (!buildTx.s) {
          Sentry.captureException(new Error(`s missed, ${keyring.type}`));
        } else if (!buildTx.r) {
          Sentry.captureException(new Error(`r missed, ${keyring.type}`));
        } else {
          Sentry.captureException(
            new Error(`invalid signature, ${keyring.type}`)
          );
        }
      }
      signedTransactionSuccess = true;
      // stats.report('signedTransaction', {
      //   type: currentAccount.brandName,
      //   chainId: chainItem?.serverId || '',
      //   category: KEYRING_CATEGORY_MAP[currentAccount.type],
      //   success: true,
      //   preExecSuccess: cacheExplain
      //     ? cacheExplain.pre_exec.success && cacheExplain.calcSuccess
      //     : true,
      //   createBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
      //   source: options?.data?.$ctx?.ga?.source || '',
      //   trigger: options?.data?.$ctx?.ga?.trigger || '',
      // });
      statsData.signed = true;
      statsData.signedSuccess = true;
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.TX_SUBMITTING,
      });
      try {
        validateGasPriceRange(approvalRes);
        let hash: string | undefined = undefined;
        let reqId: string | undefined = undefined;
        if (RPCService.hasCustomRPC(chain)) {
          const txData: any = {
            ...approvalRes,
            gasLimit: approvalRes.gas,
            r: addHexPrefix(signedTx.r),
            s: addHexPrefix(signedTx.s),
            v: addHexPrefix(signedTx.v),
          };
          if (is1559) {
            txData.type = '0x2';
          }
          const tx = TransactionFactory.fromTxData(txData);
          const rawTx = bufferToHex(tx.serialize());
          hash = await RPCService.requestCustomRPC(
            chain,
            'eth_sendRawTransaction',
            [rawTx]
          );
          try {
            openapiService.traceTx(
              hash!,
              traceId || '',
              chainItem?.serverId || ''
            );
          } catch (e) {
            // DO nothing
          }
          onTransactionCreated({ hash, reqId, pushType });
        } else {
          // hash = await openapiService.pushTx(
          //   {
          //     ...approvalRes,
          //     r: bufferToHex(signedTx.r),
          //     s: bufferToHex(signedTx.s),
          //     v: bufferToHex(signedTx.v),
          //     value: approvalRes.value || '0x0',
          //   },
          //   traceId
          // );
          const res = await openapiService.submitTx({
            tx: {
              ...approvalRes,
              r: bufferToHex(signedTx.r),
              s: bufferToHex(signedTx.s),
              v: bufferToHex(signedTx.v),
              value: approvalRes.value || '0x0',
            },
            push_type: pushType,
            low_gas_deadline: lowGasDeadline,
            req_id: preReqId || '',
            origin,
          });
          hash = res.req.tx_id || undefined;
          reqId = res.req.id || undefined;
          if (res.req.push_status === 'failed') {
            onTransactionSubmitFailed(new Error('Submit tx failed'));
          } else {
            onTransactionCreated({ hash, reqId, pushType });
            notificationService.setStatsData(statsData);
          }
        }

        return hash;
      } catch (e: any) {
        console.log('submit tx failed', e);
        onTransactionSubmitFailed(e);
      }
    } catch (e) {
      if (!signedTransactionSuccess) {
        // stats.report('signedTransaction', {
        //   type: currentAccount.brandName,
        //   chainId: chainItem?.serverId || '',
        //   category: KEYRING_CATEGORY_MAP[currentAccount.type],
        //   success: false,
        //   preExecSuccess: cacheExplain
        //     ? cacheExplain.pre_exec.success && cacheExplain.calcSuccess
        //     : true,
        //   createBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
        //   source: options?.data?.$ctx?.ga?.source || '',
        //   trigger: options?.data?.$ctx?.ga?.trigger || '',
        // });
        statsData.signed = true;
        statsData.signedSuccess = false;
      }
      // transactionHistoryService.removeSigningTx(signingTxId!);
      notificationService.setStatsData(statsData);
      throw new Error(e);
    }
  };
  @Reflect.metadata('SAFE', true)
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

  @Reflect.metadata('APPROVAL', ['ETHSign', () => null, { height: 390 }])
  ethSign = () => {
    throw new Error(
      "Signing with 'eth_sign' can lead to asset loss. For your safety, Rabby does not support this method."
    );
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
    const currentAccount = preferenceService.getCurrentAccount()!;
    try {
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
      reportSignText({
        account: currentAccount,
        method: 'personalSign',
        success: true,
      });
      return result;
    } catch (e) {
      reportSignText({
        account: currentAccount,
        method: 'personalSign',
        success: false,
      });
      throw e;
    }
  };

  @Reflect.metadata('PRIVATE', true)
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
    const currentAccount = preferenceService.getCurrentAccount()!;
    try {
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
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedData',
        success: true,
      });
      return result;
    } catch (e) {
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedData',
        success: false,
      });
      throw e;
    }
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', v1SignTypedDataVlidation])
  ethSignTypedDataV1 = async ({
    data: {
      params: [data, from],
    },
    session,
    approvalRes,
  }) => {
    const currentAccount = preferenceService.getCurrentAccount()!;
    try {
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
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedDataV1',
        success: true,
      });
      return result;
    } catch (e) {
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedDataV1',
        success: false,
      });
      throw e;
    }
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV3 = async ({
    data: {
      params: [from, data],
    },
    session,
    approvalRes,
  }) => {
    const currentAccount = preferenceService.getCurrentAccount()!;
    try {
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
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedDataV3',
        success: true,
      });
      return result;
    } catch (e) {
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedDataV3',
        success: false,
      });
      throw e;
    }
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV4 = async ({
    data: {
      params: [from, data],
    },
    session,
    approvalRes,
  }) => {
    const currentAccount = preferenceService.getCurrentAccount()!;
    try {
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
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedDataV4',
        success: true,
      });
      return result;
    } catch (e) {
      reportSignText({
        account: currentAccount,
        method: 'ethSignTypedDataV4',
        success: false,
      });
      throw e;
    }
  };

  @Reflect.metadata('APPROVAL', [
    'AddChain',
    ({
      data: {
        params: [chainParams],
      },
      session,
    }) => {
      if (!chainParams) {
        throw ethErrors.rpc.invalidParams('params is required but got []');
      }
      if (!chainParams.chainId) {
        throw ethErrors.rpc.invalidParams('chainId is required');
      }
      const connected = permissionService.getConnectedSite(session.origin);
      if (connected) {
        if (Number(chainParams.chainId) === CHAINS[connected.chain].id) {
          return true;
        }
      }
    },
    { height: 650 },
  ])
  walletAddEthereumChain = ({
    data: {
      params: [chainParams],
    },
    session: { origin },
    approvalRes,
  }: {
    data: {
      params: AddEthereumChainParams[];
    };
    session: {
      origin: string;
    };
    approvalRes?: {
      chain: CHAINS_ENUM;
      rpcUrl: string;
    };
  }) => {
    let chainId = chainParams.chainId;
    if (typeof chainId === 'number') {
      chainId = intToHex(chainId).toLowerCase();
    } else {
      chainId = chainId.toLowerCase();
    }
    const chain = Object.values(CHAINS).find((value) =>
      new BigNumber(value.hex).isEqualTo(chainId)
    );

    if (!chain) {
      throw new Error('This chain is not supported by Rabby yet.');
    }

    if (approvalRes) {
      RPCService.setRPC(approvalRes.chain, approvalRes.rpcUrl);
    }

    permissionService.updateConnectSite(
      origin,
      {
        chain: chain.enum,
      },
      true
    );

    // rabby:chainChanged event must be sent before chainChanged event
    sessionService.broadcastEvent('rabby:chainChanged', chain, origin);
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
      if (!data.params[0]) {
        throw ethErrors.rpc.invalidParams('params is required but got []');
      }
      if (!data.params[0]?.chainId) {
        throw ethErrors.rpc.invalidParams('chainId is required');
      }
      const connected = permissionService.getConnectedSite(session.origin);
      if (connected) {
        const { chainId } = data.params[0];
        if (Number(chainId) === CHAINS[connected.chain].id) {
          return true;
        }
      }
    },
    { height: 650 },
  ])
  walletSwitchEthereumChain = ({
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
    const chain = Object.values(CHAINS).find((value) =>
      new BigNumber(value.hex).isEqualTo(chainId)
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

    // rabby:chainChanged event must be sent before chainChanged event
    sessionService.broadcastEvent('rabby:chainChanged', chain, origin);
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

  @Reflect.metadata('APPROVAL', ['AddAsset', () => null, { height: 600 }])
  walletWatchAsset = ({
    approvalRes,
  }: {
    approvalRes: { id: string; chain: string };
  }) => {
    const { id, chain } = approvalRes;
    preferenceService.addCustomizedToken({
      address: id,
      chain,
    });
  };

  walletRequestPermissions = ({ data: { params: permissions } }) => {
    const result: Web3WalletPermission[] = [];
    if (permissions && 'eth_accounts' in permissions[0]) {
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

  @Reflect.metadata('SAFE', true)
  netListening = () => {
    return true;
  };

  @Reflect.metadata('PRIVATE', true)
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

  @Reflect.metadata('APPROVAL', [
    'GetPublicKey',
    ({
      data: {
        params: [address],
      },
      session: { origin },
    }) => {
      const account = preferenceService.getCurrentAccount();

      if (address?.toLowerCase() !== account?.address?.toLowerCase()) {
        throw ethErrors.rpc.invalidParams({
          message:
            'Invalid parameters: must use the current user address to sign',
        });
      }
    },
    { height: 390 },
  ])
  ethGetEncryptionPublicKey = async ({
    data: {
      params: [address],
    },
    session: { origin },
    approvalRes,
  }) => {
    return approvalRes?.data;
  };

  @Reflect.metadata('APPROVAL', [
    'Decrypt',
    ({
      data: {
        params: [message, address],
      },
      session: { origin },
    }) => {
      return null;
    },
  ])
  ethDecrypt = async ({
    data: {
      params: [message, address],
    },
    session: { origin },
    approvalRes,
  }) => {
    return approvalRes.data;
  };

  ethGetTransactionByHash = async (req) => {
    const {
      data: {
        params: [hash],
      },
    } = req;
    const tx = transactionHistoryService.getPendingTxByHash(hash);
    if (tx) return formatTxMetaForRpcResult(tx);
    return this.ethRpc({
      ...req,
      data: { method: 'eth_getTransactionByHash', params: [hash] },
    });
  };
}

export default new ProviderController();
