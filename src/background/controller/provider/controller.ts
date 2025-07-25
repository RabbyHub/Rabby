import { matomoRequestEvent } from '@/utils/matomo-request';
import { AuthorizationListItem, Common, Hardfork } from '@ethereumjs/common';
import { FeeMarketEIP1559TxData, TransactionFactory } from '@ethereumjs/tx';
import { ethers } from 'ethers';
import {
  isHexString,
  addHexPrefix,
  intToHex,
  bytesToHex,
} from '@ethereumjs/util';
import { ethErrors } from 'eth-rpc-errors';
import {
  normalize as normalizeAddress,
  recoverPersonalSignature,
} from '@metamask/eth-sig-util';
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
  swapService,
  transactionBroadcastWatchService,
  notificationService,
  bridgeService,
  gasAccountService,
} from 'background/service';
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
  INTERNAL_REQUEST_SESSION,
  INTERNAL_REQUEST_ORIGIN,
} from 'consts';
import buildinProvider from 'background/utils/buildinProvider';
import BaseController from '../base';
import { Account } from 'background/service/preference';
import {
  validateGasPriceRange,
  is1559Tx,
  ApprovalRes,
  is7702Tx,
} from '@/utils/transaction';
import stats from '@/stats';
import BigNumber from 'bignumber.js';
import { AddEthereumChainParams } from '@/ui/views/Approval/components/AddChain/type';
import { formatTxMetaForRpcResult } from 'background/utils/tx';
import { findChain, findChainByEnum, isTestnet } from '@/utils/chain';
import eventBus from '@/eventBus';
import { StatsData } from '../../service/notification';
import {
  CustomTestnetTokenBase,
  TestnetChain,
  customTestnetService,
} from '@/background/service/customTestnet';
import { isString } from 'lodash';
import { broadcastChainChanged } from '../utils';
import { getOriginFromUrl } from '@/utils';
import { hexToNumber, numberToHex, stringToHex, toHex } from 'viem';
import { ProviderRequest } from './type';
import { assertProviderRequest } from '@/background/utils/assertProviderRequest';
import { add0x } from '@/ui/utils/address';
import {
  EIP7702RevokeMiniGasLimit,
  removeLeadingZeroes,
} from '@/background/utils/7702';

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

const convertToHex = (data: Buffer | bigint) => {
  if (typeof data === 'bigint') {
    return `0x${data.toString(16)}`;
  }
  return bytesToHex(data);
};

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
  account,
}: ProviderRequest) => {
  const currentAddress = account?.address?.toLowerCase();
  if (from.toLowerCase() !== currentAddress)
    throw ethErrors.rpc.invalidParams('from should be same as current address');
};

const signTypedDataVlidation = ({
  data: {
    params: [from, data],
  },
  session,
  account,
}: ProviderRequest) => {
  let jsonData;
  try {
    jsonData = JSON.parse(data);
  } catch (e) {
    throw ethErrors.rpc.invalidParams('data is not a validate JSON string');
  }
  const currentChain = permissionService.isInternalOrigin(session!.origin)
    ? findChain({ id: jsonData.domain.chainId })?.enum
    : permissionService.getConnectedSite(session!.origin)?.chain;
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
  const currentAddress = account?.address.toLowerCase();
  if (from.toLowerCase() !== currentAddress)
    throw ethErrors.rpc.invalidParams('from should be same as current address');
};

class ProviderController extends BaseController {
  @Reflect.metadata('PRIVATE', true)
  ethRpc = (req, forceChainServerId?: string) => {
    const {
      data: { method, params },
      session: { origin: _origin },
      account,
    } = req;

    let origin = _origin;

    if (
      !permissionService.hasPermission(origin) &&
      !SAFE_RPC_METHODS.includes(method)
    ) {
      throw ethErrors.provider.unauthorized();
    }

    const site = permissionService.getSite(origin);

    if (method === 'net_version') {
      if (!site?.isConnected) {
        return Promise.resolve('1');
      }
      origin = INTERNAL_REQUEST_ORIGIN;
    }

    let chainServerId = CHAINS[CHAINS_ENUM.ETH].serverId;
    if (site) {
      chainServerId =
        findChain({
          enum: site.chain,
        })?.serverId || CHAINS[CHAINS_ENUM.ETH].serverId;
    }
    if (forceChainServerId) {
      chainServerId = forceChainServerId;
    }

    const currentAddress = account?.address?.toLowerCase() || '0x';
    const cache = RpcCache.get(currentAddress, {
      method,
      params,
      chainId: chainServerId,
    });
    if (cache) return cache;
    const chain = findChain({
      serverId: chainServerId,
    })!;
    if (!chain.isTestnet) {
      if (RPCService.hasCustomRPC(chain.enum as CHAINS_ENUM)) {
        const promise = RPCService.requestCustomRPC(
          chain.enum as CHAINS_ENUM,
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
        const promise = RPCService.requestDefaultRPC({
          chainServerId,
          method,
          params,
          origin,
        }).then((result) => {
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
    } else {
      const chainData = findChain({
        serverId: chainServerId,
      })!;
      const client = customTestnetService.getClient(chainData.id);
      return client.request({ method, params });
    }
  };

  ethRequestAccounts = async (req) => {
    assertProviderRequest(req);
    const {
      session: { origin },
    } = req;
    if (!permissionService.hasPermission(origin)) {
      throw ethErrors.provider.unauthorized();
    }

    const _account = req.account;
    const account = _account ? [_account.address.toLowerCase()] : [];
    sessionService.broadcastEvent('accountsChanged', account, origin);
    const connectSite = permissionService.getConnectedSite(origin);
    if (connectSite) {
      const chain = findChain({ enum: connectSite.chain });
      if (chain) {
        broadcastChainChanged({
          origin,
          chain,
        });
      }
    }

    return account;
  };

  @Reflect.metadata('SAFE', true)
  ethAccounts = async ({ session: { origin }, account }) => {
    if (!permissionService.hasPermission(origin) || !Wallet.isUnlocked()) {
      return [];
    }

    return account ? [account.address.toLowerCase()] : [];
  };

  ethCoinbase = async ({ session: { origin }, account }) => {
    if (!permissionService.hasPermission(origin)) {
      return null;
    }

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
    (req: ProviderRequest) => {
      assertProviderRequest(req);
      const {
        data: {
          params: [tx],
        },
        session,
        account,
      } = req;
      const currentAddress = account?.address?.toLowerCase();
      const currentChain = permissionService.isInternalOrigin(session.origin)
        ? findChain({ id: tx.chainId })!.enum
        : permissionService.getConnectedSite(session.origin)?.chain;
      if (tx.from.toLowerCase() !== currentAddress) {
        throw ethErrors.rpc.invalidParams(
          'from should be same as current address'
        );
      }
      if (
        'chainId' in tx &&
        (!currentChain ||
          Number(tx.chainId) !== findChain({ enum: currentChain })?.id)
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
    session: typeof INTERNAL_REQUEST_SESSION;
    approvalRes: ApprovalRes;
    pushed: boolean;
    result: any;
    account: Account;
  }) => {
    assertProviderRequest(options as any);
    if (options.pushed) return options.result;
    const {
      data: {
        params: [txParams],
      },
      session: { origin },
      approvalRes,
      account,
    } = cloneDeep(options);
    const currentAccount = account;
    const keyring = await this._checkAddress(txParams.from, options);
    const isSend = !!txParams.isSend;
    const isSpeedUp = !!txParams.isSpeedUp;
    const isCancel = !!txParams.isCancel;
    const extra = approvalRes.extra;
    const signingTxId = approvalRes.signingTxId;
    const isCoboSafe = !!txParams.isCoboSafe;
    const pushType = approvalRes.pushType || 'default';
    const lowGasDeadline = approvalRes.lowGasDeadline;
    const preReqId = approvalRes.reqId;
    const isGasLess = approvalRes.isGasLess || false;
    const logId = approvalRes.logId || '';
    const isGasAccount = approvalRes.isGasAccount || false;
    const sig = approvalRes.sig;

    const eip7702Revoke = options?.data?.$ctx?.eip7702Revoke || false;
    const eip7702RevokeAuthorization =
      options?.data?.$ctx?.eip7702RevokeAuthorization || [];

    let signedTransactionSuccess = false;
    delete txParams.isSend;
    delete txParams.isSwap;
    delete txParams.swapPreferMEVGuarded;
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
    delete approvalRes.isGasLess;
    delete approvalRes.logId;
    delete approvalRes.isGasAccount;
    delete approvalRes.sig;
    delete approvalRes.$account;

    let is1559 = is1559Tx(approvalRes);
    const is7702 = is7702Tx(approvalRes);

    if (is7702 && !(eip7702Revoke || isSpeedUp)) {
      // todo
      throw new Error('not support 7702');
    }

    if (
      is1559 &&
      approvalRes.maxFeePerGas === approvalRes.maxPriorityFeePerGas &&
      !eip7702Revoke &&
      !is7702
    ) {
      // fallback to legacy transaction if maxFeePerGas is equal to maxPriorityFeePerGas
      approvalRes.gasPrice = approvalRes.maxFeePerGas;
      delete approvalRes.maxFeePerGas;
      delete approvalRes.maxPriorityFeePerGas;
      is1559 = false;
    }
    const common = Common.custom(
      {
        chainId: approvalRes.chainId,
      },
      { hardfork: Hardfork.Prague, eips: [7702] }
    );

    const txData = { ...approvalRes, gasLimit: approvalRes.gas };

    if (is1559) {
      txData.type = '0x2';
    }

    if (
      (is7702 && isSpeedUp) ||
      (eip7702Revoke && eip7702RevokeAuthorization?.length)
    ) {
      txData.type = '0x4';

      if (!isSpeedUp) {
        const authorizationList = [] as AuthorizationListItem[];

        for (const authorization of eip7702RevokeAuthorization) {
          const signature: string = await keyringService.signEip7702Authorization(
            keyring,
            {
              from: txParams.from,
              authorization: authorization,
            }
          );
          const r = signature.slice(0, 66) as `0x${string}`;
          const s = add0x(signature.slice(66, 130));
          const v = parseInt(signature.slice(130, 132), 16);
          const yParity = toHex(v - 27 === 0 ? 0 : 1);
          authorizationList.push({
            chainId: toHex(authorization[0]),
            address: authorization[1],
            nonce: toHex(authorization[2]),
            r: removeLeadingZeroes(r),
            s: removeLeadingZeroes(s),
            yParity: removeLeadingZeroes(yParity),
          } as any);
        }
        txData.authorizationList = authorizationList;
        approvalRes.authorizationList = authorizationList;
      }

      // bsc use gasPrice
      if (!txData.maxFeePerGas || !txData.maxPriorityFeePerGas) {
        txData.maxFeePerGas = txData.maxFeePerGas || txData.gasPrice;
        txData.maxPriorityFeePerGas =
          txData.maxPriorityFeePerGas || txData.gasPrice;
        delete txData.gasPrice;
      }

      if (!approvalRes.maxFeePerGas || !approvalRes.maxPriorityFeePerGas) {
        approvalRes.maxFeePerGas =
          approvalRes.maxFeePerGas || approvalRes.gasPrice;
        approvalRes.maxPriorityFeePerGas =
          approvalRes.maxPriorityFeePerGas || approvalRes.gasPrice;
        delete approvalRes.gasPrice;
      }
    }

    const tx = TransactionFactory.fromTxData(txData as FeeMarketEIP1559TxData, {
      common,
    });
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
      ? (findChain({
          id: approvalRes.chainId,
        })?.enum as CHAINS_ENUM)
      : permissionService.getConnectedSite(origin)!.chain;

    const approvingTx = transactionHistoryService.getSigningTx(signingTxId!);

    // if (!approvingTx?.rawTx || !approvingTx?.explain) {
    //   throw new Error(`approvingTx not found: ${signingTxId}`);
    // }
    if (!approvingTx?.rawTx) {
      throw new Error(`approvingTx not found: ${signingTxId}`);
    }
    transactionHistoryService.updateSigningTx(signingTxId!, {
      isSubmitted: true,
    });

    const { explain: cacheExplain, rawTx, action } = approvingTx;

    const chainItem = findChainByEnum(chain);

    const statsData: StatsData = {
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
      createdBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
      source: options?.data?.$ctx?.ga?.source || '',
      trigger: options?.data?.$ctx?.ga?.trigger || '',
      networkType: chainItem?.isTestnet
        ? 'Custom Network'
        : 'Integrated Network',
      reported: false,
    };

    let signedTx;
    try {
      signedTx = await keyringService.signTransaction(
        keyring,
        tx,
        txParams.from,
        opts
      );
    } catch (e) {
      console.error(e);
      const errObj =
        typeof e === 'object'
          ? { message: e.message }
          : ({ message: e } as any);
      errObj.method = EVENTS.COMMON_HARDWARE.REJECTED;

      throw errObj;
    }

    try {
      if (
        currentAccount.type === KEYRING_TYPE.GnosisKeyring ||
        currentAccount.type === KEYRING_TYPE.CoboArgusKeyring
      ) {
        signedTransactionSuccess = true;
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
          bridgeService.postBridge(chain, hash, other);
          const key = `${chain}-${other.data}`;
          transactionHistoryService.postCacheHistoryData(key, hash);
        }

        statsData.submit = true;
        statsData.submitSuccess = true;
        if (isSend) {
          pageStateCacheService.clear();
        }
        const _rawTx = {
          ...rawTx,
          ...approvalRes,
          r: convertToHex(signedTx.r),
          s: convertToHex(signedTx.s),
          v: convertToHex(signedTx.v),
        };
        if (is1559) {
          delete _rawTx.gasPrice;
        } else {
          delete _rawTx.maxPriorityFeePerGas;
          delete _rawTx.maxFeePerGas;
        }
        transactionHistoryService.addTx({
          tx: {
            rawTx: _rawTx,
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
            chainId: findChain({ enum: chain })!.id,
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
          createdBy: options?.data?.$ctx?.ga ? 'rabby' : 'dapp',
          source: options?.data?.$ctx?.ga?.source || '',
          trigger: options?.data?.$ctx?.ga?.trigger || '',
          networkType: chainItem?.isTestnet
            ? 'Custom Network'
            : 'Integrated Network',
        });
        if (!isSpeedUp && !isCancel) {
          transactionHistoryService.addSubmitFailedTransaction({
            tx: {
              rawTx: approvalRes,
              createdAt: Date.now(),
              isCompleted: true,
              hash: '',
              failed: false,
              isSubmitFailed: true,
            },
            explain: cacheExplain,
            actionData: action,
            origin,
          });
        }
        const errMsg = e.details || e.message || JSON.stringify(e);
        if (notificationService.statsData?.signMethod) {
          statsData.signMethod = notificationService.statsData?.signMethod;
        }
        notificationService.setStatsData(statsData);
        throw new Error(errMsg);
      };

      if (typeof signedTx === 'string') {
        onTransactionCreated({
          hash: signedTx,
          pushType: 'default',
        });
        if (
          currentAccount.type === KEYRING_TYPE.WalletConnectKeyring ||
          currentAccount.type === KEYRING_TYPE.CoinbaseKeyring
        ) {
          statsData.signed = true;
          statsData.signedSuccess = true;
        }
        if (notificationService.statsData?.signMethod) {
          statsData.signMethod = notificationService.statsData?.signMethod;
        }
        notificationService.setStatsData(statsData);
        return signedTx;
      }

      signedTransactionSuccess = true;
      statsData.signed = true;
      statsData.signedSuccess = true;
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.TX_SUBMITTING,
      });
      try {
        validateGasPriceRange(approvalRes);
        let hash: string | undefined = undefined;
        let reqId: string | undefined = undefined;
        if (!findChain({ enum: chain })?.isTestnet) {
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

            if (approvalRes.authorizationList) {
              txData.type = '0x4';
              if (!txData.maxFeePerGas || !txData.maxPriorityFeePerGas) {
                txData.maxFeePerGas = txData.maxFeePerGas || txData.gasPrice;
                txData.maxPriorityFeePerGas =
                  txData.maxPriorityFeePerGas || txData.gasPrice;
                delete txData.gasPrice;
              }
            }

            const tx = TransactionFactory.fromTxData(txData, { common });
            const rawTx = bytesToHex(tx.serialize());
            try {
              hash = await RPCService.requestCustomRPC(
                chain,
                'eth_sendRawTransaction',
                [rawTx]
              );
            } catch (e) {
              let errMsg = typeof e === 'object' ? e.message : e;
              if (RPCService.hasCustomRPC(chain)) {
                const rpc = RPCService.getRPCByChain(chain);
                const origin = getOriginFromUrl(rpc.url);
                errMsg = `[From ${origin}] ${errMsg}`;
              }
              onTransactionSubmitFailed({
                ...e,
                message: errMsg,
              });
            }
            onTransactionCreated({ hash, reqId, pushType });
            notificationService.setStatsData(statsData);
          } else {
            const chainServerId = findChain({ enum: chain })!.serverId;
            const params: Parameters<typeof openapiService.submitTxV2>[0] = {
              context: {
                tx: {
                  ...approvalRes,
                  r: convertToHex(signedTx.r),
                  s: convertToHex(signedTx.s),
                  v: convertToHex(signedTx.v),
                  value: approvalRes.value || '0x0',
                },
                origin,
                log_id: logId,
              },
              backend_push_require: {
                gas_type: isGasAccount
                  ? 'gas_account'
                  : isGasLess
                  ? 'gasless'
                  : null,
              },
              sig,
              mev_share_model: pushType === 'mev' ? 'user' : 'rabby',
            };

            const adoptBE7702Params = () => {
              if (
                approvalRes.authorizationList &&
                approvalRes.authorizationList?.some((e) => e.yParity)
              ) {
                params.context.tx = {
                  ...params.context.tx,
                  authorizationList: approvalRes.authorizationList.map((e) => ({
                    chainId: hexToNumber(e.chainId),
                    address: e.address,
                    nonce: e.nonce,
                    r: e.r,
                    s: e.s,
                    v: e.yParity,
                  })),
                } as any;
              }
            };

            const defaultRPC = RPCService.getDefaultRPC(chainServerId);
            if (defaultRPC?.txPushToRPC && !isGasLess && !isGasAccount) {
              let fePushedFailed = false;
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
              const rawTx = bytesToHex(tx.serialize());

              try {
                const [
                  fePushedHash,
                  url,
                ] = await RPCService.defaultRPCSubmitTxWithFallback(
                  chainServerId,
                  'eth_sendRawTransaction',
                  [rawTx]
                );

                hash = fePushedHash;

                params.frontend_push_result = {
                  success: true,
                  has_pushed: true,
                  raw_tx: rawTx,
                  url,
                  return_tx_id: fePushedHash!,
                };

                openapiService.submitTxV2(params).catch((error) => {
                  console.log('ignore BE error', error);
                });
              } catch (fePushError) {
                fePushedFailed = true;

                const urls = RPCService.getDefaultRPCByChainServerId(
                  chainServerId
                );
                params.frontend_push_result = {
                  success: false,
                  has_pushed: true,
                  url: urls?.rpcUrl?.[0] || '',
                  error_msg:
                    typeof fePushError === 'object'
                      ? fePushError.message
                      : String(fePushError),
                };
              }

              if (fePushedFailed) {
                adoptBE7702Params();
                const res = await openapiService.submitTxV2(params);
                hash = res.tx_id;
              }
            } else {
              adoptBE7702Params();
              const res = await openapiService.submitTxV2(params);
              if (res.access_token) {
                gasAccountService.setGasAccountSig(
                  res.access_token,
                  currentAccount
                );
                eventBus.emit(EVENTS.broadcastToUI, {
                  method: EVENTS.GAS_ACCOUNT.LOG_IN,
                });
              }
              hash = res.tx_id;
            }

            //No more low gas push, reqId is no longer required.
            reqId = undefined;

            if (!hash) {
              onTransactionSubmitFailed(new Error('Submit tx failed'));
            } else {
              onTransactionCreated({ hash, reqId, pushType });
              if (notificationService.statsData?.signMethod) {
                statsData.signMethod =
                  notificationService.statsData?.signMethod;
              }
              notificationService.setStatsData(statsData);
            }
          }
        } else {
          const chainData = findChain({
            enum: chain,
          })!;
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
          const tx = TransactionFactory.fromTxData(txData, { common });
          const rawTx = bytesToHex(tx.serialize());
          const client = customTestnetService.getClient(chainData.id);

          hash = await client.request({
            method: 'eth_sendRawTransaction',
            params: [rawTx as any],
          });
          onTransactionCreated({ hash, reqId, pushType });
          notificationService.setStatsData(statsData);
        }

        return hash;
      } catch (e: any) {
        const chainData = findChain({
          enum: chain,
        })!;
        let errMsg = e.details || e.message || JSON.stringify(e);
        if (chainData && chainData.isTestnet) {
          const rpcUrl = RPCService.hasCustomRPC(chain)
            ? RPCService.getRPCByChain(chain).url
            : (chainData as TestnetChain).rpcUrl;
          errMsg = rpcUrl
            ? `[From ${getOriginFromUrl(rpcUrl)}] ${errMsg}`
            : errMsg;
        }
        console.log('submit tx failed', e);
        onTransactionSubmitFailed(errMsg);
      }
    } catch (e) {
      if (!signedTransactionSuccess) {
        statsData.signed = true;
        statsData.signedSuccess = false;
      }
      if (notificationService.statsData?.signMethod) {
        statsData.signMethod = notificationService.statsData?.signMethod;
      }
      notificationService.setStatsData(statsData);
      throw typeof e === 'object' ? e : new Error(e);
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
    (req) => {
      assertProviderRequest(req);
      const {
        data: {
          params: [_, from],
        },
        account,
      } = req;
      const currentAddress = account.address.toLowerCase();
      if (from.toLowerCase() !== currentAddress)
        throw ethErrors.rpc.invalidParams(
          'from should be same as current address'
        );
    },
  ])
  personalSign = async (req) => {
    assertProviderRequest(req);
    const { data, approvalRes, session, account: currentAccount } = req;
    if (!data.params) return;

    if (
      currentAccount.type === KEYRING_TYPE.GnosisKeyring &&
      isString(approvalRes)
    ) {
      return approvalRes;
    }
    try {
      const [string, from] = data.params;
      const hex = isHexString(string) ? string : stringToHex(string);
      const keyring = await this._checkAddress(from, req);
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
  private _signTypedData = async (
    {
      from,
      data,
      version,
      extra,
    }: {
      from: string;
      data: any;
      version: string;
      extra: any;
    },
    req: ProviderRequest
  ) => {
    const keyring = await this._checkAddress(from, req);
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
  ethSignTypedData = async (req) => {
    const {
      data: {
        params: [data, from],
      },
      session,
      approvalRes,
    } = req;
    assertProviderRequest(req);
    const currentAccount = req.account;
    if (
      currentAccount.type === KEYRING_TYPE.GnosisKeyring &&
      isString(approvalRes)
    ) {
      return approvalRes;
    }
    try {
      const result = await this._signTypedData(
        {
          from,
          data,
          version: 'V1',
          extra: approvalRes?.extra,
        },
        req
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
  ethSignTypedDataV1 = async (req) => {
    assertProviderRequest(req);
    const {
      data: {
        params: [data, from],
      },
      session,
      approvalRes,
      account,
    } = req;
    const currentAccount = account;
    if (
      currentAccount.type === KEYRING_TYPE.GnosisKeyring &&
      isString(approvalRes)
    ) {
      return approvalRes;
    }
    try {
      const result = await this._signTypedData(
        {
          from,
          data,
          version: 'V1',
          extra: approvalRes?.extra,
        },
        req
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
  ethSignTypedDataV3 = async (req) => {
    assertProviderRequest(req);
    const {
      data: {
        params: [from, data],
      },
      session,
      approvalRes,
      account: currentAccount,
    } = req;
    if (
      currentAccount.type === KEYRING_TYPE.GnosisKeyring &&
      isString(approvalRes)
    ) {
      return approvalRes;
    }
    try {
      const result = await this._signTypedData(
        {
          from,
          data,
          version: 'V3',
          extra: approvalRes?.extra,
        },
        req
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
  ethSignTypedDataV4 = async (req) => {
    const {
      data: {
        params: [from, data],
      },
      session,
      approvalRes,
      account: currentAccount,
    } = req;
    assertProviderRequest(req);
    if (
      currentAccount.type === KEYRING_TYPE.GnosisKeyring &&
      isString(approvalRes)
    ) {
      return approvalRes;
    }
    try {
      const result = await this._signTypedData(
        {
          from,
          data,
          version: 'V4',
          extra: approvalRes?.extra,
        },
        req
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
        // if rabby supported this chain, do not show popup
        if (findChain({ id: chainParams.chainId })) {
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
      chainId = `0x${new BigNumber(chainId).toString(16).toLowerCase()}`;
    }

    const chain = findChain({
      hex: chainId,
    });

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

    broadcastChainChanged({
      origin,
      chain,
    });
    return null;
  };

  @Reflect.metadata('APPROVAL', [
    'SwitchChain',
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
        // if rabby supported this chain, do not show popup
        if (
          findChain({
            id: chainId,
          })
        ) {
          return true;
        }
        throw ethErrors.provider.custom({
          code: 4902,
          message: `Unrecognized chain ID "${chainId}". Try adding the chain using wallet_switchEthereumChain first.`,
        });
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
      chainId = `0x${new BigNumber(chainId).toString(16).toLowerCase()}`;
    }

    const chain = findChain({ hex: chainId });

    if (!chain) {
      throw ethErrors.provider.custom({
        code: 4902,
        message: `Unrecognized chain ID "${chainId}". Try adding the chain using wallet_switchEthereumChain first.`,
      });
    }

    permissionService.updateConnectSite(
      origin,
      {
        chain: chain.enum,
      },
      true
    );

    broadcastChainChanged({
      origin,
      chain,
    });
    return null;
  };

  @Reflect.metadata('APPROVAL', ['AddAsset', () => null, { height: 600 }])
  walletWatchAsset = ({
    approvalRes,
  }: {
    approvalRes: { id: string; chain: string } & CustomTestnetTokenBase;
  }) => {
    const { id, chain, chainId, symbol, decimals } = approvalRes;
    const chainInfo = findChain({
      serverId: chain,
    });
    if (chainInfo?.isTestnet) {
      customTestnetService.addToken({
        chainId,
        symbol,
        decimals,
        id,
      });
    } else {
      preferenceService.addCustomizedToken({
        address: id,
        chain,
      });
    }
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

  /**
   * https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md
   */
  @Reflect.metadata('SAFE', true)
  walletRevokePermissions = ({ session: { origin }, data: { params } }) => {
    if (Wallet.isUnlocked() && Wallet.getSite(origin)) {
      if (params?.[0] && 'eth_accounts' in params[0]) {
        Wallet.removeConnectedSite(origin);
      }
    }
    return null;
  };

  personalEcRecover = ({
    data: {
      params: [data, sig, extra = {}],
    },
  }) => {
    return recoverPersonalSignature({
      ...extra,
      data,
      signature: sig,
    });
  };

  @Reflect.metadata('SAFE', true)
  netListening = () => {
    return true;
  };

  @Reflect.metadata('PRIVATE', true)
  private _checkAddress = async (address, req) => {
    // eslint-disable-next-line prefer-const
    let { address: currentAddress, type } = req.account || {};
    currentAddress = currentAddress?.toLowerCase();
    if (
      !currentAddress ||
      currentAddress !== normalizeAddress(address)?.toLowerCase()
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
    (req) => {
      assertProviderRequest(req);
      const {
        data: {
          params: [address],
        },
        session: { origin },
        account,
      } = req;

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

  @Reflect.metadata('APPROVAL', [
    'ImportAddress',
    ({ data }) => {
      if (!data.params[0]) {
        throw ethErrors.rpc.invalidParams('params is required but got []');
      }
      if (!data.params[0]?.chainId) {
        throw ethErrors.rpc.invalidParams('chainId is required');
      }
    },
    { height: 628 },
  ])
  walletImportAddress = async () => {
    return null;
  };
}

export default new ProviderController();
