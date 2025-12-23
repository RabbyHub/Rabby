import {
  stripHexPrefix,
  isValidPrivate,
  addHexPrefix,
  toChecksumAddress,
} from '@ethereumjs/util';
import { ethErrors } from 'eth-rpc-errors';
import { ethers, Contract } from 'ethers';
import { groupBy, isEqual, last, pick, sortBy, truncate, uniq } from 'lodash';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import {
  keyringService,
  preferenceService,
  notificationService,
  permissionService,
  sessionService,
  openapiService,
  pageStateCacheService,
  transactionHistoryService,
  transactionsService,
  contactBookService,
  signTextHistoryService,
  whitelistService,
  swapService,
  RPCService,
  unTriggerTxCounter,
  securityEngineService,
  transactionBroadcastWatchService,
  RabbyPointsService,
  HDKeyRingLastAddAddrTimeService,
  bridgeService,
  gasAccountService,
  uninstalledService,
  OfflineChainsService,
  perpsService,
  miscService,
} from 'background/service';
import buildinProvider, {
  EthereumProvider,
} from 'background/utils/buildinProvider';
import { openIndexPage } from 'background/webapi/tab';
import { CacheState } from 'background/service/pageStateCache';
import { DisplayedKeryring, KeyringService } from 'background/service/keyring';
import providerController from './provider/controller';
import BaseController from './base';
import {
  KEYRING_WITH_INDEX,
  EVENTS,
  BRAND_ALIAN_TYPE_TEXT,
  WALLET_BRAND_CONTENT,
  CHAINS_ENUM,
  KEYRING_TYPE,
  GNOSIS_SUPPORT_CHAINS,
  INTERNAL_REQUEST_SESSION,
  DARK_MODE_TYPE,
  KEYRING_CLASS,
  DBK_CHAIN_ID,
  DBK_NFT_CONTRACT_ADDRESS,
  CORE_KEYRING_TYPES,
} from 'consts';
import { ERC20ABI, ERC721ABI, SeaportABI } from 'consts/abi';
import { Account, IHighlightedAddress } from '../service/preference';
import { ConnectedSite } from '../service/permission';
import {
  TokenItem,
  Tx,
  TxHistoryResult,
  NFTDetail,
  BridgeHistory,
  testnetOpenapiService,
} from '../service/openapi';
import {
  ContextActionData,
  ContractAddress,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import DisplayKeyring from '../service/keyring/display';
import provider from './provider';
import { WalletConnectKeyring } from '@rabby-wallet/eth-walletconnect-keyring';
import eventBus from '@/eventBus';
import {
  setPageStateCacheWhenPopupClose,
  isSameAddress,
  setPopupIcon,
} from 'background/utils';
import GnosisKeyring, {
  TransactionBuiltEvent,
  TransactionConfirmedEvent,
} from '../service/keyring/eth-gnosis-keyring';
import KeystoneKeyring, {
  AcquireMemeStoreData,
  MemStoreDataReady,
} from '../service/keyring/eth-keystone-keyring';
import WatchKeyring from '@rabby-wallet/eth-watch-keyring';
import stats from '@/stats';
import {
  generateAliasName,
  isFullVersionAccountType,
  isSameAccount,
} from '@/utils/account';
import BigNumber from 'bignumber.js';
import * as Sentry from '@sentry/browser';
import PQueue from 'p-queue';
import { ProviderRequest } from './provider/type';
import { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import transactionWatcher from '../service/transactionWatcher';
import Safe from '@rabby-wallet/gnosis-sdk';
import { Chain } from '@debank/common';
import {
  decodeFunctionResult,
  encodeFunctionData,
  fromHex,
  isAddress,
  parseAbi,
  zeroAddress,
} from 'viem';
import {
  ensureChainListValid,
  findChain,
  findChainByEnum,
  findChainByID,
  findChainByServerID,
  getChainList,
} from '@/utils/chain';
import { cached } from '../utils/cache';
import { createSafeService } from '../utils/safe';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { autoLockService } from '../service/autoLock';
import { t } from 'i18next';
import {
  broadcastChainChanged,
  createWeb3Provider,
  getWeb3Provider,
  web3AbiCoder,
} from './utils';
import { CoboSafeAccount } from '@/utils/cobo-agrus-sdk/cobo-agrus-sdk';
import CoboArgusKeyring from '../service/keyring/eth-cobo-argus-keyring';
import { GET_WALLETCONNECT_CONFIG, allChainIds } from '@/utils/walletconnect';
import { estimateL1Fee } from '@/utils/l2';
import HdKeyring from '@rabby-wallet/eth-hd-keyring';
import CoinbaseKeyring from '@rabby-wallet/eth-coinbase-keyring/dist/coinbase-keyring';
import {
  customTestnetService,
  fakeTestnetOpenapi,
} from '../service/customTestnet';
import { getKeyringBridge, hasBridge } from '../service/keyring/bridge';
import { syncChainService } from '../service/syncChain';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { BALANCE_LOADING_CONFS } from '@/constant/timeout';
import { IExtractFromPromise } from '@/ui/utils/type';
import { Wallet, thirdparty } from '@ethereumjs/wallet';
import { BridgeRecord } from '../service/bridge';
import { TokenSpenderPair } from '@/types/permit2';
import {
  summarizeRevoke,
  ApprovalSpenderItemToBeRevoked,
  decodePermit2GroupKey,
} from '@/utils/approve';
import { appIsProd, isManifestV3 } from '@/utils/env';
import { getRecommendGas, getRecommendNonce } from './walletUtils/sign';
import { waitSignComponentAmounted } from '@/utils/signEvent';
import pRetry from 'p-retry';
import Browser from 'webextension-polyfill';
import { hashSafeMessage } from '@safe-global/protocol-kit';
import { userGuideService } from '../service/userGuide';
import { metamaskModeService } from '../service/metamaskModeService';
import { ga4 } from '@/utils/ga4';
import { bgRetryTxMethods } from '../utils/errorTxRetry';
import {
  BridgeTxHistoryItem,
  SendNftTxHistoryItem,
  SendTxHistoryItem,
  SwapTxHistoryItem,
} from '../service/transactionHistory';

import { Seaport } from '@opensea/seaport-js';
import { OrderComponents } from '@opensea/seaport-js/lib/types';
import { CROSS_CHAIN_SEAPORT_V1_6_ADDRESS } from '@opensea/seaport-js/lib/constants';
import { buildCreateListingTypedData } from '@/utils/nft';
import { http } from '../utils/http';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';

const stashKeyrings: Record<string | number, any> = {};

const MAX_UNSIGNED_256_INT = new BigNumber(2).pow(256).minus(1).toString(10);

const gnosisPQueue = new PQueue({
  interval: 1000,
  intervalCap: 5,
  carryoverConcurrencyCount: false,
  concurrency: 5,
});

export class WalletController extends BaseController {
  openapi = openapiService;
  testnetOpenapi = testnetOpenapiService;
  fakeTestnetOpenapi = fakeTestnetOpenapi;

  /* wallet */
  boot = async (password) => {
    await keyringService.boot(password);
    userGuideService.destroy();
    const hasOtherProvider = preferenceService.getHasOtherProvider();
    const isDefaultWallet = preferenceService.getIsDefaultWallet();
    if (!hasOtherProvider) {
      setPopupIcon('default');
    } else {
      setPopupIcon(isDefaultWallet ? 'rabby' : 'metamask');
    }
  };
  isBooted = () => keyringService.isBooted();
  verifyPassword = (password: string) =>
    keyringService.verifyPassword(password);

  setWhitelist = async (password: string, addresses: string[]) => {
    await this.verifyPassword(password);
    whitelistService.setWhitelist(addresses);
  };

  addWhitelist = async (password: string, address: string) => {
    await this.verifyPassword(password);
    whitelistService.addWhitelist(address);
  };

  removeWhitelist = async (address: string) => {
    whitelistService.removeWhitelist(address);
  };

  toggleWhitelist = async (password: string, enable: boolean) => {
    await this.verifyPassword(password);
    if (enable) {
      whitelistService.enableWhitelist();
    } else {
      whitelistService.disableWhiteList();
    }
  };

  getWhitelist = () => {
    return whitelistService.getWhitelist();
  };

  isWhitelistEnabled = () => {
    return whitelistService.isWhitelistEnabled();
  };

  requestETHRpc = <T = any>(
    data: { method: string; params: any },
    chainId: string,
    account?: Account
  ): Promise<IExtractFromPromise<T>> => {
    return providerController.ethRpc(
      {
        data,
        session: INTERNAL_REQUEST_SESSION,
        account,
      },
      chainId
    );
  };

  sendRequest = <T = any>(
    data: ProviderRequest['data'],
    options?: {
      isBuild?: boolean;
      account?: Account;
      session?: typeof INTERNAL_REQUEST_SESSION;
    }
  ) => {
    const { isBuild = false, account, session } = options || {};
    if (isBuild) {
      return Promise.resolve<T>(data as T);
    }
    return provider<T>({
      data,
      session: session || INTERNAL_REQUEST_SESSION,
      account,
    });
  };

  resendSign = (retry?: boolean) => {
    notificationService.callCurrentRequestDeferFn(retry);
  };

  getApproval = notificationService.getApproval;
  resolveApproval = notificationService.resolveApproval;
  rejectApproval = (err?: string, stay = false, isInternal = false) => {
    return notificationService.rejectApproval(err, stay, isInternal);
  };

  rejectAllApprovals = () => {
    notificationService.rejectAllApprovals();
    notificationService.clear();
  };

  getERC20Allowance = async (
    chainServerId,
    erc20Address: string,
    contractAddress: string
  ): Promise<string> => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainId = findChain({
      serverId: chainServerId,
    })?.id.toString();
    if (!chainId) throw new Error(t('background.error.invalidChainId'));

    buildinProvider.currentProvider.currentAccount = account.address;
    buildinProvider.currentProvider.currentAccountType = account.type;
    buildinProvider.currentProvider.currentAccountBrand = account.brandName;
    buildinProvider.currentProvider.chainId = chainId;

    const provider = new ethers.providers.Web3Provider(
      buildinProvider.currentProvider
    );

    const contract = new Contract(erc20Address, ERC20ABI, provider);
    const amount = await contract.allowance(account.address, contractAddress);
    return amount.toString();
  };

  sendToken = async ({
    to,
    chainServerId,
    tokenId,
    rawAmount,
    $ctx,
  }: {
    to: string;
    chainServerId: string;
    tokenId: string;
    rawAmount: string;
    $ctx?: any;
  }) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chain = findChain({
      serverId: chainServerId,
    });
    const chainId = chain?.id;
    if (!chainId) throw new Error(t('background.error.invalidChainId'));
    const params: Record<string, any> = {
      chainId: chain.id,
      from: account!.address,
      to: tokenId,
      value: '0x0',
      data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            {
              type: 'address',
              name: 'to',
            },
            {
              type: 'uint256',
              name: 'value',
            },
          ],
        },
        [to, rawAmount]
      ),
      isSend: true,
    };
    const isNativeToken = tokenId === chain.nativeTokenAddress;

    if (isNativeToken) {
      params.to = to;
      delete params.data;
      params.value = addHexPrefix(
        ((abiCoder as unknown) as AbiCoder).encodeParameter(
          'uint256',
          rawAmount
        )
      );
    }

    return await this.sendRequest<string>({
      method: 'eth_sendTransaction',
      params: [params],
      $ctx,
    });
  };

  getSafeVersion = async ({
    address,
    networkId,
  }: {
    address: string;
    networkId: string;
  }) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) {
      throw new Error(t('background.error.noCurrentAccount'));
    }
    const currentProvider = new EthereumProvider();
    currentProvider.currentAccount = account.address;
    currentProvider.currentAccountType = account.type;
    currentProvider.currentAccountBrand = account.brandName;
    currentProvider.chainId = networkId;

    return Safe.getSafeVersion({
      address,
      provider: new ethers.providers.Web3Provider(currentProvider) as any,
    });
  };

  getBasicSafeInfo = async ({
    address,
    networkId,
  }: {
    address: string;
    networkId: string;
  }) => {
    const safe = await createSafeService({ address, networkId });
    return safe.getBasicSafeInfo();
  };

  gasTopUp = async (params: {
    to: string;
    chainServerId: string;
    tokenId: string;
    rawAmount: string;
    gasPrice?: string;
    $ctx?: any;
    toChainId: string;
    toTokenAmount: string;
    fromTokenAmount: string;
    gasTokenSymbol: string;
    paymentTokenSymbol: string;
    fromUsdValue: number;
  }) => {
    const {
      gasTokenSymbol,
      paymentTokenSymbol,
      fromUsdValue,
      toChainId,
      fromTokenAmount,
      toTokenAmount,
      ...others
    } = params;

    stats.report('gasTopUpConfirm', {
      topUpChain: toChainId,
      topUpAmount: fromUsdValue,
      topUpToken: gasTokenSymbol,
      paymentChain: others.chainServerId,
      paymentToken: paymentTokenSymbol,
    });

    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const txId = await this.sendToken(others);

    stats.report('gasTopUpTxFinished', {
      topUpChain: toChainId,
      topUpAmount: fromUsdValue,
      paymentChain: others.chainServerId,
      paymentToken: paymentTokenSymbol,
    });

    const postGasStationOrder = async () =>
      await this.openapi.postGasStationOrder({
        userAddr: account.address,
        fromChainId: others.chainServerId,
        fromTxId: txId,
        toChainId: toChainId,
        toTokenAmount,
        fromTokenId: others.tokenId,
        fromTokenAmount: fromTokenAmount,
        fromUsdValue,
      });

    const reportGasTopUpPostGasStationOrder = () =>
      stats.report('gasTopUpPostGasStationOrder', {
        topUpChain: toChainId,
        topUpAmount: fromUsdValue,
        paymentChain: others.chainServerId,
        paymentToken: paymentTokenSymbol,
      });

    try {
      await postGasStationOrder();
      reportGasTopUpPostGasStationOrder();
    } catch (error) {
      try {
        await postGasStationOrder();
        reportGasTopUpPostGasStationOrder();
      } catch (error) {
        Sentry.captureException(
          new Error(
            'postGasStationOrder failed, params: ' +
              JSON.stringify({
                userAddr: account.address,
                fromChainId: others.chainServerId,
                fromTxId: txId,
                toChainId: toChainId,
                toTokenAmount,
                fromTokenId: others.tokenId,
                fromTokenAmount: fromTokenAmount,
                fromUsdValue,
              })
          )
        );
      }
    }
  };

  dexSwap = async (
    {
      chain,
      quote,
      needApprove,
      spender,
      pay_token_id,
      unlimited,
      gasPrice,
      shouldTwoStepApprove,
      postSwapParams,
      addHistoryData,
      swapPreferMEVGuarded,
    }: {
      chain: CHAINS_ENUM;
      quote: QuoteResult;
      needApprove: boolean;
      spender: string;
      pay_token_id: string;
      unlimited: boolean;
      gasPrice?: number;
      shouldTwoStepApprove: boolean;
      swapPreferMEVGuarded: boolean;

      postSwapParams?: Omit<
        Parameters<OpenApiService['postSwap']>[0],
        'tx_id' | 'tx'
      >;
      addHistoryData: Omit<SwapTxHistoryItem, 'hash'>;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainObj = findChainByEnum(chain);
    if (!chainObj)
      throw new Error(t('background.error.notFindChain', { chain }));
    try {
      if (shouldTwoStepApprove) {
        unTriggerTxCounter.increase(3);
        await this.approveToken(
          chainObj.serverId,
          pay_token_id,
          spender,
          0,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndSwap|tokenApproval',
            },
          },
          gasPrice,
          { isSwap: true, swapPreferMEVGuarded }
        );
        unTriggerTxCounter.decrease();
      }

      if (needApprove) {
        if (!shouldTwoStepApprove) {
          unTriggerTxCounter.increase(2);
        }
        await this.approveToken(
          chainObj.serverId,
          pay_token_id,
          spender,
          // unlimited ? MAX_UNSIGNED_256_INT : quote.fromTokenAmount,
          quote.fromTokenAmount,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndSwap|tokenApproval',
            },
          },
          gasPrice,
          { isSwap: true, swapPreferMEVGuarded }
        );
        unTriggerTxCounter.decrease();
      }

      if (postSwapParams) {
        swapService.addTx(chain, quote.tx.data, postSwapParams);
        transactionHistoryService.addCacheHistoryData(
          `${chain}-${quote.tx.data}`,
          addHistoryData,
          'swap'
        );
      }
      await this.sendRequest({
        $ctx:
          needApprove && pay_token_id !== chainObj.nativeTokenAddress
            ? {
                ga: {
                  ...$ctx?.ga,
                  source: 'approvalAndSwap|swap',
                },
              }
            : $ctx,
        method: 'eth_sendTransaction',
        params: [
          {
            from: quote.tx.from,
            to: quote.tx.to,
            data: quote.tx.data || '0x',
            value: `0x${new BigNumber(quote.tx.value || '0').toString(16)}`,
            chainId: chainObj.id,
            gasPrice: gasPrice
              ? `0x${new BigNumber(gasPrice).toString(16)}`
              : undefined,
            isSwap: true,
            swapPreferMEVGuarded,
          },
        ],
      });
      unTriggerTxCounter.decrease();
    } catch (e) {
      unTriggerTxCounter.reset();
    }
  };

  buildDexSwap = async (
    {
      chain,
      quote,
      needApprove,
      spender,
      pay_token_id,
      unlimited,
      gasPrice,
      shouldTwoStepApprove,
      postSwapParams,
      addHistoryData,
      swapPreferMEVGuarded,
    }: {
      chain: CHAINS_ENUM;
      quote: QuoteResult;
      needApprove: boolean;
      spender: string;
      pay_token_id: string;
      unlimited: boolean;
      gasPrice?: number;
      shouldTwoStepApprove: boolean;
      swapPreferMEVGuarded: boolean;

      postSwapParams?: Omit<
        Parameters<OpenApiService['postSwap']>[0],
        'tx_id' | 'tx'
      >;
      addHistoryData: Omit<SwapTxHistoryItem, 'hash'>;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainObj = findChainByEnum(chain);
    if (!chainObj)
      throw new Error(t('background.error.notFindChain', { chain }));

    const txs: Tx[] = [];
    try {
      if (shouldTwoStepApprove) {
        unTriggerTxCounter.increase(3);
        const res = await this.approveToken(
          chainObj.serverId,
          pay_token_id,
          spender,
          0,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndSwap|tokenApproval',
            },
          },
          gasPrice,
          { isSwap: true, swapPreferMEVGuarded },
          true
        );
        txs.push(res.params[0]);
        unTriggerTxCounter.decrease();
      }

      if (needApprove) {
        if (!shouldTwoStepApprove) {
          unTriggerTxCounter.increase(2);
        }
        const res = await this.approveToken(
          chainObj.serverId,
          pay_token_id,
          spender,
          // unlimited ? MAX_UNSIGNED_256_INT : quote.fromTokenAmount,
          quote.fromTokenAmount,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndSwap|tokenApproval',
            },
          },
          gasPrice,
          { isSwap: true, swapPreferMEVGuarded },
          true
        );

        txs.push(res.params[0]);
        unTriggerTxCounter.decrease();
      }

      if (postSwapParams) {
        swapService.addTx(chain, quote.tx.data, postSwapParams);
        transactionHistoryService.addCacheHistoryData(
          `${chain}-${quote.tx.data}`,
          addHistoryData,
          'swap'
        );
      }
      const res = await this.sendRequest(
        {
          $ctx:
            needApprove && pay_token_id !== chainObj.nativeTokenAddress
              ? {
                  ga: {
                    ...$ctx?.ga,
                    source: 'approvalAndSwap|swap',
                  },
                }
              : $ctx,
          method: 'eth_sendTransaction',
          params: [
            {
              from: quote.tx.from,
              to: quote.tx.to,
              data: quote.tx.data || '0x',
              value: `0x${new BigNumber(quote.tx.value || '0').toString(16)}`,
              chainId: chainObj.id,
              gasPrice: gasPrice
                ? `0x${new BigNumber(gasPrice).toString(16)}`
                : undefined,
              isSwap: true,
              swapPreferMEVGuarded,
            },
          ],
        },
        {
          isBuild: true,
        }
      );
      txs.push(res.params[0]);
      unTriggerTxCounter.decrease();
    } catch (e) {
      unTriggerTxCounter.reset();
    }

    return txs;
  };

  bridgeToken = async (
    {
      to,
      data,
      payTokenRawAmount,
      payTokenId,
      payTokenChainServerId,
      shouldApprove,
      shouldTwoStepApprove,
      gasPrice,
      info,
      value,
      addHistoryData,
    }: {
      data: string;
      to: string;
      value: string;
      chainId: number;
      shouldApprove: boolean;
      shouldTwoStepApprove: boolean;
      payTokenId: string;
      payTokenChainServerId: string;
      payTokenRawAmount: string;
      gasPrice?: number;
      info: BridgeRecord;
      addHistoryData: Omit<BridgeTxHistoryItem, 'hash'>;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainObj = findChain({ serverId: payTokenChainServerId });
    if (!chainObj)
      throw new Error(
        t('background.error.notFindChain', { payTokenChainServerId })
      );
    try {
      if (shouldTwoStepApprove) {
        unTriggerTxCounter.increase(3);
        await this.approveToken(
          payTokenChainServerId,
          payTokenId,
          to,
          0,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndBridge|tokenApproval',
            },
          },
          gasPrice,
          { isBridge: true }
        );
        unTriggerTxCounter.decrease();
      }

      if (shouldApprove) {
        if (!shouldTwoStepApprove) {
          unTriggerTxCounter.increase(2);
        }
        await this.approveToken(
          payTokenChainServerId,
          payTokenId,
          to,
          payTokenRawAmount,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndBridge|tokenApproval',
            },
          },
          gasPrice,
          { isBridge: true }
        );
        unTriggerTxCounter.decrease();
      }

      if (info) {
        bridgeService.addTx(chainObj.enum, data, info);
        transactionHistoryService.addCacheHistoryData(
          `${chainObj.enum}-${data}`,
          addHistoryData,
          'bridge'
        );
      }
      await this.sendRequest({
        $ctx:
          shouldApprove && payTokenId !== chainObj.nativeTokenAddress
            ? {
                ga: {
                  ...$ctx?.ga,
                  source: 'approvalAndBridge|bridge',
                },
              }
            : $ctx,
        method: 'eth_sendTransaction',
        params: [
          {
            from: account.address,
            to: to,
            data: data || '0x',
            value: `0x${new BigNumber(value || '0').toString(16)}`,
            chainId: chainObj.id,
            gasPrice: gasPrice
              ? `0x${new BigNumber(gasPrice).toString(16)}`
              : undefined,
            isBridge: true,
          },
        ],
      });
      unTriggerTxCounter.decrease();
    } catch (e) {
      unTriggerTxCounter.reset();
    }
  };

  buildBridgeToken = async (
    {
      to,
      data,
      payTokenRawAmount,
      payTokenId,
      payTokenChainServerId,
      shouldApprove,
      shouldTwoStepApprove,
      gasPrice,
      info,
      value,
      addHistoryData,
    }: {
      data: string;
      to: string;
      value: string;
      chainId: number;
      shouldApprove: boolean;
      shouldTwoStepApprove: boolean;
      payTokenId: string;
      payTokenChainServerId: string;
      payTokenRawAmount: string;
      gasPrice?: number;
      info: BridgeRecord;
      addHistoryData: Omit<BridgeTxHistoryItem, 'hash'>;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainObj = findChain({ serverId: payTokenChainServerId });
    if (!chainObj)
      throw new Error(
        t('background.error.notFindChain', { payTokenChainServerId })
      );

    const txs: Tx[] = [];
    try {
      if (shouldTwoStepApprove) {
        unTriggerTxCounter.increase(3);
        const res = await this.approveToken(
          payTokenChainServerId,
          payTokenId,
          to,
          0,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndBridge|tokenApproval',
            },
          },
          gasPrice,
          { isBridge: true },
          true
        );
        txs.push(res.params[0]);
        unTriggerTxCounter.decrease();
      }

      if (shouldApprove) {
        if (!shouldTwoStepApprove) {
          unTriggerTxCounter.increase(2);
        }
        const res = await this.approveToken(
          payTokenChainServerId,
          payTokenId,
          to,
          payTokenRawAmount,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndBridge|tokenApproval',
            },
          },
          gasPrice,
          { isBridge: true },
          true
        );
        txs.push(res.params[0]);
        unTriggerTxCounter.decrease();
      }

      if (info) {
        bridgeService.addTx(chainObj.enum, data, info);
        transactionHistoryService.addCacheHistoryData(
          `${chainObj.enum}-${data}`,
          addHistoryData,
          'bridge'
        );
      }
      const res = await this.sendRequest(
        {
          $ctx:
            shouldApprove && payTokenId !== chainObj.nativeTokenAddress
              ? {
                  ga: {
                    ...$ctx?.ga,
                    source: 'approvalAndBridge|bridge',
                  },
                }
              : $ctx,
          method: 'eth_sendTransaction',
          params: [
            {
              from: account.address,
              to: to,
              data: data || '0x',
              value: `0x${new BigNumber(value || '0').toString(16)}`,
              chainId: chainObj.id,
              gasPrice: gasPrice
                ? `0x${new BigNumber(gasPrice).toString(16)}`
                : undefined,
              isBridge: true,
            },
          ],
        },
        {
          isBuild: true,
        }
      );
      txs.push(res.params[0]);
      unTriggerTxCounter.decrease();
    } catch (e) {
      unTriggerTxCounter.reset();
    }
    return txs;
  };

  getUnTriggerTxCount = () => {
    return unTriggerTxCounter.count;
  };

  generateApproveTokenTx = ({
    from,
    to,
    chainId,
    spender,
    amount,
  }: {
    from: string;
    to: string;
    chainId: number;
    spender: string;
    amount: string;
  }) => {
    return {
      from,
      to,
      chainId: chainId,
      value: '0x',
      data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
        {
          constant: false,
          inputs: [
            {
              name: '_spender',
              type: 'address',
            },
            {
              name: '_value',
              type: 'uint256',
            },
          ],
          name: 'approve',
          outputs: [
            {
              name: '',
              type: 'bool',
            },
          ],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
        [spender, amount] as any
      ),
    };
  };

  approveToken = async (
    chainServerId: string,
    id: string,
    spender: string,
    amount: number | string,
    $ctx?: any,
    gasPrice?: number,
    extra?: {
      isSwap?: boolean;
      swapPreferMEVGuarded?: boolean;
      isBridge?: boolean;
    },
    isBuild = false
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainId = findChain({
      serverId: chainServerId,
    })?.id;
    if (!chainId) throw new Error(t('background.error.invalidChainId'));
    let tx: any = {
      from: account.address,
      to: id,
      chainId: chainId,
      data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
        {
          constant: false,
          inputs: [
            {
              name: '_spender',
              type: 'address',
            },
            {
              name: '_value',
              type: 'uint256',
            },
          ],
          name: 'approve',
          outputs: [
            {
              name: '',
              type: 'bool',
            },
          ],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
        [spender, amount] as any
      ),
    };
    if (gasPrice) {
      tx.gasPrice = gasPrice;
    }
    if (extra) {
      tx = {
        ...tx,
        ...extra,
      };
    }
    return await this.sendRequest(
      {
        $ctx,
        method: 'eth_sendTransaction',
        params: [tx],
      },
      {
        isBuild,
      }
    );
  };

  lockdownPermit2 = async (
    input: {
      id: string;
      chainServerId: string;
      tokenSpenders: TokenSpenderPair[];
      $ctx?: any;
      gasPrice?: number;
    },
    isBuild = false
  ) => {
    const {
      chainServerId,
      id,
      tokenSpenders: _tokenSpenders,
      $ctx,
      gasPrice,
    } = input;

    const tokenSpenders = JSON.parse(JSON.stringify(_tokenSpenders));

    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainId = findChain({
      serverId: chainServerId,
    })?.id;
    if (!chainId) throw new Error(t('background.error.invalidChainId'));
    const tx: any = {
      from: account.address,
      to: id,
      chainId: chainId,
      data: web3AbiCoder.encodeFunctionCall(
        {
          constant: false,
          inputs: [
            {
              name: 'approvals',
              type: 'tuple[]',
              internalType: 'tuple[]',
              components: [
                { type: 'address', name: 'token' },
                { type: 'address', name: 'spender' },
              ],
            },
          ],
          name: 'lockdown',
          outputs: [
            {
              name: '',
              type: 'bool',
            },
          ],
          payable: false,
          stateMutability: 'nonpayable',
          type: 'function',
        },
        [tokenSpenders] as any
      ),
    };
    if (gasPrice) {
      tx.gasPrice = gasPrice;
    }

    return await this.sendRequest(
      {
        $ctx,
        method: 'eth_sendTransaction',
        params: [tx],
      },
      {
        isBuild,
      }
    );
  };

  fetchEstimatedL1Fee = async (
    txMeta: Record<string, any> & {
      txParams: any;
    },
    chain = CHAINS_ENUM.OP,
    _account?: Account
  ) => {
    const account = _account || (await preferenceService.getCurrentAccount());
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    buildinProvider.currentProvider.currentAccount = account.address;
    buildinProvider.currentProvider.currentAccountType = account.type;
    buildinProvider.currentProvider.currentAccountBrand = account.brandName;
    buildinProvider.currentProvider.chainId = findChain({
      enum: chain,
    })!.network;

    const provider = new ethers.providers.Web3Provider(
      buildinProvider.currentProvider
    );

    const res = await estimateL1Fee({
      txParams: txMeta.txParams,
      chain,
      provider,
    });

    return res;
  };

  mintDBKChainNFT = async () => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    await this.sendRequest({
      method: 'eth_sendTransaction',
      params: [
        {
          from: account.address,
          to: DBK_NFT_CONTRACT_ADDRESS,
          chainId: DBK_CHAIN_ID,
          data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
            {
              name: 'mint',
              inputs: [],
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            []
          ),
        },
      ],
    });
  };

  transferNFT = async (
    {
      to,
      chainServerId,
      contractId,
      abi,
      tokenId,
      amount,
    }: {
      to: string;
      chainServerId: string;
      contractId: string;
      abi: 'ERC721' | 'ERC1155';
      tokenId: string;
      amount?: number;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainId = findChain({
      serverId: chainServerId,
    })?.id;
    if (!chainId) throw new Error(t('background.error.invalidChainId'));
    if (abi === 'ERC721') {
      await this.sendRequest({
        $ctx,
        method: 'eth_sendTransaction',
        params: [
          {
            from: account.address,
            to: contractId,
            chainId: chainId,
            data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
              {
                constant: false,
                inputs: [
                  { internalType: 'address', name: 'from', type: 'address' },
                  { internalType: 'address', name: 'to', type: 'address' },
                  {
                    internalType: 'uint256',
                    name: 'tokenId',
                    type: 'uint256',
                  },
                ],
                name: 'safeTransferFrom',
                outputs: [],
                payable: false,
                stateMutability: 'nonpayable',
                type: 'function',
              },
              [account.address, to, tokenId]
            ),
          },
        ],
      });
    } else if (abi === 'ERC1155') {
      await this.sendRequest({
        $ctx,
        method: 'eth_sendTransaction',
        params: [
          {
            from: account.address,
            to: contractId,
            chainId: chainId,
            data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
              {
                inputs: [
                  {
                    internalType: 'address',
                    name: 'from',
                    type: 'address',
                  },
                  {
                    internalType: 'address',
                    name: 'to',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'id',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'amount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'bytes',
                    name: 'data',
                    type: 'bytes',
                  },
                ],
                name: 'safeTransferFrom',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
              },
              [account.address, to, tokenId, amount, []] as any
            ),
          },
        ],
      });
    } else {
      throw new Error(t('background.error.unknownAbi'));
    }
  };

  revokeNFTApprove = async (
    {
      chainServerId,
      contractId,
      spender,
      abi,
      nftTokenId,
      isApprovedForAll,
    }: {
      chainServerId: string;
      contractId: string;
      spender: string;
      abi: 'ERC721' | 'ERC1155' | '';
      isApprovedForAll: boolean;
      nftTokenId?: string | null | undefined;
    },
    $ctx?: any,
    isBuild = false
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainId = findChain({
      serverId: chainServerId,
    })?.id;
    if (!chainId) throw new Error(t('background.error.invalidChainId'));
    if (abi === 'ERC721') {
      if (isApprovedForAll) {
        return await this.sendRequest(
          {
            $ctx,
            method: 'eth_sendTransaction',
            params: [
              {
                from: account.address,
                to: contractId,
                chainId: chainId,
                data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
                  {
                    inputs: [
                      {
                        internalType: 'address',
                        name: 'operator',
                        type: 'address',
                      },
                      {
                        internalType: 'bool',
                        name: 'approved',
                        type: 'bool',
                      },
                    ],
                    name: 'setApprovalForAll',
                    outputs: [],
                    stateMutability: 'nonpayable',
                    type: 'function',
                  },
                  [spender, false] as any
                ),
              },
            ],
          },
          {
            isBuild,
          }
        );
      } else {
        return await this.sendRequest(
          {
            $ctx,
            method: 'eth_sendTransaction',
            params: [
              {
                from: account.address,
                to: contractId,
                chainId: chainId,
                data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
                  {
                    constant: false,
                    inputs: [
                      { internalType: 'address', name: 'to', type: 'address' },
                      {
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                      },
                    ],
                    name: 'approve',
                    outputs: [],
                    payable: false,
                    stateMutability: 'nonpayable',
                    type: 'function',
                  },
                  [
                    '0x0000000000000000000000000000000000000000',
                    nftTokenId,
                  ] as any
                ),
              },
            ],
          },
          {
            isBuild,
          }
        );
      }
    } else if (abi === 'ERC1155') {
      return await this.sendRequest(
        {
          $ctx,
          method: 'eth_sendTransaction',
          params: [
            {
              from: account.address,
              to: contractId,
              data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
                {
                  constant: false,
                  inputs: [
                    { internalType: 'address', name: 'to', type: 'address' },
                    { internalType: 'bool', name: 'approved', type: 'bool' },
                  ],
                  name: 'setApprovalForAll',
                  outputs: [],
                  payable: false,
                  stateMutability: 'nonpayable',
                  type: 'function',
                },
                [spender, false] as any
              ),
              chainId,
            },
          ],
        },
        {
          isBuild,
        }
      );
    } else {
      throw new Error(t('background.error.unknownAbi'));
    }
  };

  initAlianNames = async () => {
    await preferenceService.changeInitAlianNameStatus();
    const contacts = await this.listContact();
    const keyrings = await keyringService.getAllTypedAccounts();
    const walletConnectKeyrings = keyrings.filter(
      (item) => item.type === 'WalletConnect'
    );
    const catergoryGroupAccount = keyrings.map((item) => ({
      type: item.type,
      accounts: item.accounts,
    }));
    let walletConnectList: DisplayedKeryring['accounts'] = [];
    for (let i = 0; i < walletConnectKeyrings.length; i++) {
      const keyring = walletConnectKeyrings[i];
      walletConnectList = [...walletConnectList, ...keyring.accounts];
    }
    const groupedWalletConnectList = groupBy(walletConnectList, 'brandName');
    if (keyrings.length > 0) {
      Object.keys(groupedWalletConnectList).forEach((key) => {
        groupedWalletConnectList[key].map((acc, index) => {
          if (
            contacts.find((contact) =>
              isSameAddress(contact.address, acc.address)
            )
          ) {
            return;
          }
          this.updateAlianName(
            acc?.address,
            `${WALLET_BRAND_CONTENT[acc?.brandName]} ${index + 1}`
          );
        });
      });
      const catergories = groupBy(
        catergoryGroupAccount.filter((group) => group.type !== 'WalletConnect'),
        'type'
      );
      const result = Object.keys(catergories)
        .map((key) =>
          catergories[key].map((item) =>
            item.accounts.map((acc) => ({
              address: acc.address,
              type: key,
            }))
          )
        )
        .map((item) => item.flat(1));
      result.forEach((group) =>
        group.forEach((acc, index) => {
          this.updateAlianName(
            acc?.address,
            `${BRAND_ALIAN_TYPE_TEXT[acc?.type]} ${index + 1}`
          );
        })
      );
    }
    if (contacts.length !== 0 && keyrings.length !== 0) {
      const allAccounts = keyrings.map((item) => item.accounts).flat();
      const sameAddressList = contacts.filter((item) =>
        allAccounts.find((contact) =>
          isSameAddress(contact.address, item.address)
        )
      );
      if (sameAddressList.length > 0) {
        sameAddressList.forEach((item) =>
          this.updateAlianName(item.address, item.name)
        );
      }
    }
  };

  getPendingApprovalCount = () => {
    return notificationService.approvals.length;
  };

  activeFirstApproval = () => {
    notificationService.activeFirstApproval();
  };

  unlock = async (password: string) => {
    const alianNameInited = await preferenceService.getInitAlianNameStatus();
    const alianNames = contactBookService.listAlias();
    await keyringService.submitPassword(password);
    sessionService.broadcastEvent('unlock');
    if (!alianNameInited && alianNames.length === 0) {
      this.initAlianNames();
    }
    const hasOtherProvider = preferenceService.getHasOtherProvider();
    const isDefaultWallet = preferenceService.getIsDefaultWallet();
    if (!hasOtherProvider) {
      setPopupIcon('default');
    } else {
      setPopupIcon(isDefaultWallet ? 'rabby' : 'metamask');
    }

    uninstalledService.syncStatus();
  };
  isUnlocked = () => keyringService.isUnlocked();

  lockWallet = async () => {
    await keyringService.setLocked();
    if (isManifestV3) {
      await Browser.storage.session.clear();
    }
    sessionService.broadcastEvent('accountsChanged', []);
    sessionService.broadcastEvent('lock');
    setPopupIcon('locked');
    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.LOCK_WALLET,
    });
  };

  setAutoLockTime = (time: number) => {
    return autoLockService.setAutoLockTime(time);
  };

  setLastActiveTime = () => {
    return autoLockService.setLastActiveTime();
  };

  setHiddenBalance = (isHidden: boolean) => {
    return preferenceService.setHiddenBalance(isHidden);
  };

  getIsShowTestnet = () => {
    return preferenceService.getIsShowTestnet();
  };

  setIsShowTestnet = (value: boolean) => {
    return preferenceService.setIsShowTestnet(value);
  };

  setDesktopTokensAllMode = (value: boolean) => {
    return preferenceService.setDesktopTokensAllMode(value);
  };

  setPopupOpen = (isOpen) => {
    preferenceService.setPopupOpen(isOpen);
  };
  openIndexPage = openIndexPage;

  openInDesktop = async (_url: string) => {
    const desktopTabId = preferenceService.getPreference('desktopTabId');
    const currentDesktopTab = desktopTabId
      ? await Browser.tabs.get(desktopTabId).catch(() => null)
      : null;

    const url = `desktop.html#/${_url.replace(/^\//, '')}`;
    if (currentDesktopTab) {
      const tab = await Browser.tabs.update(currentDesktopTab.id, {
        active: true,
        url: url,
      });
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.DESKTOP.FOCUSED,
      });
      const currentWindow = await Browser.windows.getLastFocused();
      if (tab.windowId && tab.windowId !== currentWindow.id) {
        Browser.windows.update(tab.windowId, {
          focused: true,
        });
      }
      return tab;
    }
    const tab = await Browser.tabs.create({
      active: true,
      url: url,
    });
    preferenceService.setPreferencePartials({
      desktopTabId: tab.id,
    });
    return tab;
  };

  hasPageStateCache = () => pageStateCacheService.has();
  getPageStateCache = () => {
    if (!this.isUnlocked()) return null;
    return pageStateCacheService.get();
  };
  clearPageStateCache = () => pageStateCacheService.clear();
  setPageStateCache = (cache: CacheState) => pageStateCacheService.set(cache);
  getTransactionsCache = (address: string) =>
    transactionsService.getTransactions(address);
  updateTransactionsCache = (address: string, data: TxHistoryResult) =>
    transactionsService.updateTransactions(address, data);

  getIndexByAddress = (address: string, type: string) => {
    const hasIndex = KEYRING_WITH_INDEX.includes(type as any);
    if (!hasIndex) return null;
    const keyring = keyringService.getKeyringByType(type);
    if (!keyring) return null;
    switch (type) {
      case KEYRING_CLASS.HARDWARE.LEDGER: {
        return keyring.getIndexFromAddress(address);
      }
      case KEYRING_CLASS.HARDWARE.GRIDPLUS: {
        const accountIndices = keyring.accountIndices;
        const accounts = keyring.accounts;
        const index = accounts.findIndex(
          (account) => account.toLowerCase() === address.toLowerCase()
        );
        if (index === -1) return null;
        if (accountIndices.length - 1 < index) return null;
        return accountIndices[index];
      }
      default:
        return null;
    }
  };

  private getTotalBalanceCached = cached(
    'getTotalBalanceCached',
    async (address: string) => {
      const addresses = await keyringService.getAllAdresses();
      const filtered = addresses.filter((item) =>
        isSameAddress(item.address, address)
      );
      let core = false;
      if (
        filtered.some((item) => CORE_KEYRING_TYPES.includes(item.type as any))
      ) {
        core = true;
      }
      const data = await openapiService.getTotalBalance(address, core);
      let appChainTotalNetWorth = 0;
      const appChainIds: string[] = [];
      try {
        const { apps } = await openapiService.getAppChainList(address);
        apps?.forEach((app) => {
          app?.portfolio_item_list?.forEach((item) => {
            appChainTotalNetWorth += item.stats.net_usd_value;
          });
          appChainIds.push(app.id);
        });
      } catch (error) {
        // just ignore appChain data
      }
      const formatData = {
        ...data,
        evmUsdValue: data.total_usd_value,
        total_usd_value: data.total_usd_value + appChainTotalNetWorth,
        appChainIds,
      };
      preferenceService.updateBalanceAboutCache(address, {
        totalBalance: formatData,
      });
      return formatData;
    },
    {
      timeout: BALANCE_LOADING_CONFS.TIMEOUT,
      maxSize: BALANCE_LOADING_CONFS.CACHE_LIMIT,
    }
  );

  private getTestnetTotalBalanceCached = cached(
    'getTestnetTotalBalanceCached',
    async (address: string) => {
      const testnetData = await testnetOpenapiService.getTotalBalance(address);
      preferenceService.updateTestnetAddressBalance(address, testnetData);
      return testnetData;
    },
    {
      timeout: BALANCE_LOADING_CONFS.TIMEOUT,
      maxSize: BALANCE_LOADING_CONFS.CACHE_LIMIT,
    }
  );

  /**
   * @description get balance about info by address,
   * it will use cache in memory, or re-fetch, update-cache
   * AND **persist the cache to preference store** if expired
   */
  getInMemoryAddressBalance = async (
    address: string,
    force = false,
    isTestnet = false
  ) => {
    const addr = address?.toLowerCase() || '';

    if (isTestnet) {
      return this.getTestnetTotalBalanceCached.fn([addr], addr, force);
    }
    return this.getTotalBalanceCached.fn([addr], addr, force);
  };

  forceExpireInMemoryAddressBalance = (address: string, isTestnet = false) => {
    if (isTestnet) {
      // preferenceService.removeTestnetAddressBalance(address);
      return this.getTestnetTotalBalanceCached.forceExpire(address);
    }

    // preferenceService.removeAddressBalance(address);
    return this.getTotalBalanceCached.forceExpire(address);
  };

  isInMemoryAddressBalanceExpired = (address: string, isTestnet = false) => {
    if (isTestnet) {
      return this.getTestnetTotalBalanceCached.isExpired(address);
    }

    return this.getTotalBalanceCached.isExpired(address);
  };

  /**
   * @deprecatedgetPersistedBalanceAboutCacheMap
   */
  getAddressCacheBalance = (address: string | undefined, isTestnet = false) => {
    if (!address) return null;
    if (isTestnet) {
      return null;
    }

    return (
      preferenceService.getBalanceAboutCacheByAddress(address)?.totalBalance ??
      null
    );
  };

  getPersistedBalanceAboutCacheMap = () => {
    return preferenceService.getBalanceAboutCacheMap();
  };

  private getNetCurveCached = cached(
    'getNetCurveCached',
    async (address) => {
      const data = await openapiService.getNetCurve(address);
      preferenceService.updateBalanceAboutCache(address, { curvePoints: data });
      return data;
    },
    {
      timeout: BALANCE_LOADING_CONFS.TIMEOUT,
      maxSize: BALANCE_LOADING_CONFS.CACHE_LIMIT,
    }
  );

  getInMemoryNetCurve = (address: string, force = false) => {
    return this.getNetCurveCached.fn([address], address, force);
  };

  forceExpireInMemoryNetCurve = (address: string) => {
    // preferenceService.removeCurvePoints(address);
    return this.getNetCurveCached.forceExpire(address);
  };

  isInMemoryNetCurveExpired = (address: string) => {
    return this.getNetCurveCached.isExpired(address);
  };

  setHasOtherProvider = (val: boolean) =>
    preferenceService.setHasOtherProvider(val);
  getHasOtherProvider = () => preferenceService.getHasOtherProvider();

  getExternalLinkAck = () => preferenceService.getExternalLinkAck();

  setExternalLinkAck = (ack) => preferenceService.setExternalLinkAck(ack);

  getLocale = () => preferenceService.getLocale();
  setLocale = (locale: string) => preferenceService.setLocale(locale);

  getThemeMode = () => preferenceService.getThemeMode();
  setThemeMode = (themeMode: DARK_MODE_TYPE) =>
    preferenceService.setThemeMode(themeMode);

  isReserveGasOnSendToken = () => preferenceService.isReserveGasOnSendToken();
  setReserveGasOnSendToken = (val: boolean) =>
    preferenceService.setPreferencePartials({ reserveGasOnSendToken: val });

  enableDappAccount = (enabled: boolean) => {
    preferenceService.setPreferencePartials({ isEnabledDappAccount: enabled });
    const currentAccount = preferenceService.getCurrentAccount();
    const sites = permissionService.getSites();
    sites.forEach((site) => {
      if (enabled) {
        if (site.isConnected) {
          permissionService.setSite({
            ...site,
            account: currentAccount,
          });
        }
      } else {
        permissionService.setSite({
          ...site,
          account: undefined,
        });
      }
    });
    sessionService.broadcastEvent(
      'accountsChanged',
      currentAccount?.address ? [currentAccount?.address] : []
    );
  };

  updateGa4EventTime = (timestamp: number) => {
    preferenceService.setPreferencePartials({ ga4EventTime: timestamp });
  };

  getLastTimeSendToken = () => preferenceService.getLastTimeSendToken();
  setLastTimeSendToken = (token: TokenItem) =>
    preferenceService.setLastTimeSendToken(token);

  getTokenApprovalChain = (address: string) =>
    preferenceService.getTokenApprovalChain(address);

  setTokenApprovalChain = (address: string, chain: CHAINS_ENUM) => {
    preferenceService.setTokenApprovalChain(address, chain);
  };

  getNFTApprovalChain = (address: string) =>
    preferenceService.getNFTApprovalChain(address);

  setNFTApprovalChain = (address: string, chain: CHAINS_ENUM) => {
    preferenceService.setNFTApprovalChain(address, chain);
  };

  getLastSelectedSwapPayToken = preferenceService.getLastSelectedSwapPayToken;
  setLastSelectedSwapPayToken = preferenceService.setLastSelectedSwapPayToken;

  getLastSelectedGasTopUpChain = preferenceService.getLastSelectedGasTopUpChain;
  setLastSelectedGasTopUpChain = preferenceService.setLastSelectedGasTopUpChain;

  getAddressSortStoreValue = preferenceService.getAddressSortStoreValue;
  setAddressSortStoreValue = preferenceService.setAddressSortStoreValue;

  getLastSelectedSwapChain = swapService.getSelectedChain;
  setLastSelectedSwapChain = swapService.setSelectedChain;
  getSelectedFromToken = swapService.getSelectedFromToken;
  getSelectedToToken = swapService.getSelectedToToken;
  setSelectedFromToken = swapService.setSelectedFromToken;
  setSelectedToToken = swapService.setSelectedToToken;

  getSwap = swapService.getSwap;
  getSwapGasCache = swapService.getLastTimeGasSelection;
  updateSwapGasCache = swapService.updateLastTimeGasSelection;
  getSwapDexId = swapService.getSelectedDex;
  setSwapDexId = swapService.setSelectedDex;
  getUnlimitedAllowance = swapService.getUnlimitedAllowance;
  setUnlimitedAllowance = swapService.setUnlimitedAllowance;
  setSwapView = swapService.setSwapView;
  setSwapTrade = swapService.setSwapTrade;
  getSwapViewList = swapService.getSwapViewList;
  getSwapTradeList = swapService.getSwapTradeList;
  getSwapSortIncludeGasFee = swapService.getSwapSortIncludeGasFee;
  setSwapSortIncludeGasFee = swapService.setSwapSortIncludeGasFee;
  getSwapPreferMEVGuarded = swapService.getSwapPreferMEVGuarded;
  setSwapPreferMEVGuarded = swapService.setSwapPreferMEVGuarded;
  setAutoSlippage = swapService.setAutoSlippage;
  setIsCustomSlippage = swapService.setIsCustomSlippage;
  setSlippage = swapService.setSlippage;
  getRecentSwapToTokens = swapService.getRecentSwapToTokens;
  setRecentSwapToToken = swapService.setRecentSwapToToken;

  setRedirect2Points = RabbyPointsService.setRedirect2Points;
  setRabbyPointsSignature = RabbyPointsService.setSignature;
  getRabbyPointsSignature = RabbyPointsService.getSignature;
  clearRabbyPointsSignature = RabbyPointsService.clearSignature;

  addHDKeyRingLastAddAddrTime = HDKeyRingLastAddAddrTimeService.addUnixRecord;
  getHDKeyRingLastAddAddrTimeStore = HDKeyRingLastAddAddrTimeService.getStore;

  getBridgeData = bridgeService.getBridgeData;
  getBridgeAggregators = bridgeService.getBridgeAggregators;
  setBridgeAggregators = bridgeService.setBridgeAggregators;
  getBridgeUnlimitedAllowance = bridgeService.getUnlimitedAllowance;
  setBridgeUnlimitedAllowance = bridgeService.setUnlimitedAllowance;
  setBridgeSelectedChain = bridgeService.setSelectedChain;
  setBridgeSelectedFromToken = bridgeService.setSelectedFromToken;
  setBridgeSelectedToToken = bridgeService.setSelectedToToken;
  getBridgeSortIncludeGasFee = bridgeService.getBridgeSortIncludeGasFee;
  setBridgeSortIncludeGasFee = bridgeService.setBridgeSortIncludeGasFee;
  setBridgeSettingFirstOpen = bridgeService.setBridgeSettingFirstOpen;

  getGasAccountData = gasAccountService.getGasAccountData;
  getGasAccountSig = gasAccountService.getGasAccountSig;
  setGasAccountSig = gasAccountService.setGasAccountSig;

  getCloseTipsChains = OfflineChainsService.getCloseTipsChains;
  setCloseTipsChains = OfflineChainsService.setCloseTipsChains;

  getRetryTxType = bgRetryTxMethods.getRetryTxType;
  setRetryTxType = bgRetryTxMethods.setRetryTxType;
  retryTxReset = bgRetryTxMethods.retryTxReset;
  getRetryTxRecommendNonce = bgRetryTxMethods.getRetryTxRecommendNonce;
  setRetryTxRecommendNonce = bgRetryTxMethods.setRetryTxRecommendNonce;
  getTxFailedResult = bgRetryTxMethods.getTxFailedResult;

  setCustomRPC = (chainEnum: CHAINS_ENUM, url: string) => {
    RPCService.setRPC(chainEnum, url);
    const chain = findChain({
      enum: chainEnum,
    });
    if (chain?.isTestnet && RPCService.hasCustomRPC(chainEnum)) {
      customTestnetService.setCustomRPC({ chainId: chain.id, url: url });
    }
  };
  removeCustomRPC = (chainEnum: CHAINS_ENUM) => {
    RPCService.removeCustomRPC(chainEnum);
    const chain = findChain({
      enum: chainEnum,
    });
    if (chain?.isTestnet) {
      customTestnetService.removeCustomRPC(chain.id);
    }
  };
  getAllCustomRPC = RPCService.getAllRPC;
  getCustomRpcByChain = RPCService.getRPCByChain;
  pingCustomRPC = RPCService.ping;
  setRPCEnable = (chainEnum: CHAINS_ENUM, enable: boolean) => {
    RPCService.setRPCEnable(chainEnum, enable);
    const chain = findChain({
      enum: chainEnum,
    });
    if (chain?.isTestnet) {
      if (enable) {
        customTestnetService.setCustomRPC({
          chainId: chain.id,
          url: RPCService.getRPCByChain(chainEnum).url,
        });
      } else {
        customTestnetService.removeCustomRPC(chain.id);
      }
    }
  };
  validateRPC = async (url: string, chainId: number) => {
    const chain = findChain({
      id: chainId,
    });
    if (!chain) throw new Error(`ChainId ${chainId} is not supported`);
    const [_, rpcChainId] = await Promise.all([
      RPCService.ping(chain.enum),
      RPCService.request(url, 'eth_chainId', []),
    ]);
    return chainId === Number(rpcChainId);
  };

  hasCustomRPC = RPCService.hasCustomRPC;

  syncDefaultRPC = RPCService.syncDefaultRPC;

  /* chains */
  getSavedChains = () => preferenceService.getSavedChains();
  saveChain = (id: string) => preferenceService.saveChain(id);
  updateChain = (list: string[]) => preferenceService.updateChain(list);
  /* connectedSites */

  getConnectedSite = permissionService.getConnectedSite;
  getSite = permissionService.getSite;
  getConnectedSites = permissionService.getConnectedSites;
  getSites = permissionService.getSites;
  setRecentConnectedSites = (sites: ConnectedSite[]) => {
    permissionService.setRecentConnectedSites(sites);
  };
  getRecentConnectedSites = () => {
    return permissionService.getRecentConnectedSites();
  };
  getCurrentSite = (tabId: number, domain: string): ConnectedSite | null => {
    const { origin, name, icon } =
      sessionService.getSession(`${tabId}-${domain}`) || {};
    if (!origin) {
      return null;
    }
    const site = permissionService.getSite(origin);
    if (site) {
      return site;
    }
    return {
      origin,
      name: name!,
      icon: icon!,
      chain: CHAINS_ENUM.ETH,
      isConnected: false,
      isSigned: false,
      isTop: false,
    };
  };
  getCurrentConnectedSite = (tabId: number, domain: string) => {
    const session = sessionService.getSession(`${tabId}-${domain}`);
    if (session) {
      return permissionService.getWithoutUpdate(session.origin);
    } else {
      return null;
    }
  };
  setSite = (
    data: ConnectedSite,
    options?: {
      shouldBroadcastEvent?: false;
    }
  ) => {
    const chainItem = findChain({ enum: data.chain });
    if (!chainItem) {
      throw new Error(`[wallet::setSite] Chain ${data.chain} is not supported`);
    }
    if (data.isConnected && !data.account) {
      data.account = preferenceService.getCurrentAccount();
    }
    permissionService.setSite(data);
    broadcastChainChanged({
      origin: data.origin,
      chain: chainItem,
    });
  };

  setSiteAccount = ({
    origin,
    account,
  }: {
    origin: string;
    account?: Account | null;
  }) => {
    const site = permissionService.getSite(origin);
    if (!site) {
      return;
    }
    const _account = account || preferenceService.getCurrentAccount();

    site.account = _account
      ? pick(_account, 'address', 'type', 'brandName')
      : undefined;
    permissionService.setSite(site);

    if (site?.isConnected) {
      sessionService.broadcastEvent(
        'accountsChanged',
        site?.account?.address ? [site.account.address.toLowerCase()] : [],
        site.origin
      );
    }
  };

  updateSiteBasicInfo = async (origin: string | string[]) => {
    if (!origin?.length) {
      return [];
    }

    const origins = Array.isArray(origin) ? origin : [origin];
    const infoList = await this.openapi.getDappsInfo({
      ids: origins.map((item) => item.replace(/^https?:\/\//, '')),
    });

    return origins
      .map((origin) => {
        const local = permissionService.getSite(origin);
        const id = origin.replace(/^https?:\/\//, '');
        const info = infoList.find((item) => item.id === id) || {
          id,
          name: local?.name || '',
          logo_url: local?.icon || '',
          description: '',
          user_range: '',
          tags: [],
          chain_ids: [],
        };
        if (local) {
          const item: ConnectedSite = {
            ...local,
            info,
          };
          permissionService.setSite(item);
          return item;
        }
      })
      .filter((v): v is ConnectedSite => !!v);
  };
  removePreferMetamask = (origin: string) => {
    const site = permissionService.getSite(origin);
    if (!site?.preferMetamask) {
      return;
    }
    const prevIsDefaultWallet = preferenceService.getIsDefaultWallet(
      site?.origin
    );
    site.preferMetamask = false;
    permissionService.setSite(site);
    const currentIsDefaultWallet = preferenceService.getIsDefaultWallet(origin);
    const hasOtherProvider = preferenceService.getHasOtherProvider();
    if (prevIsDefaultWallet !== currentIsDefaultWallet && hasOtherProvider) {
      sessionService.broadcastEvent(
        'defaultWalletChanged',
        currentIsDefaultWallet ? 'rabby' : 'metamask',
        site.origin
      );
    }
  };
  updateConnectSite = (origin: string, data: ConnectedSite) => {
    const chainItem = findChain({ enum: data.chain });

    if (!chainItem) {
      throw new Error(
        `[wallet::updateConnectSite] Chain ${data.chain} is not supported`
      );
    }

    permissionService.updateConnectSite(origin, data);

    broadcastChainChanged({
      origin: data.origin,
      chain: chainItem,
    });
  };
  addConnectedSiteV2 = permissionService.addConnectedSiteV2;
  removeAllRecentConnectedSites = () => {
    const sites = permissionService
      .getRecentConnectedSites()
      .filter((item) => !item.isTop);
    sites.forEach((item) => {
      this.removeConnectedSite(item.origin);
    });
  };
  removeConnectedSite = (origin: string) => {
    sessionService.broadcastEvent('accountsChanged', [], origin);
    permissionService.removeConnectedSite(origin);
  };
  getSitesByDefaultChain = permissionService.getSitesByDefaultChain;
  /**
   * @deprecated
   */
  getPreferMetamaskSites = permissionService.getPreferMetamaskSites;
  getMetamaskModeSites = permissionService.getMetamaskModeSites;
  addMetamaskModeSite = (site: ConnectedSite) => {
    permissionService.setSite({
      ...site,
      isMetamaskMode: true,
    });
    metamaskModeService.localSites.push(
      site.origin.replace(/^https?:\/\//, '')
    );
  };
  removeMetamaskModeSite = (site: ConnectedSite) => {
    permissionService.setSite({
      ...site,
      isMetamaskMode: false,
    });
    metamaskModeService.localSites = metamaskModeService.localSites.filter(
      (item) => item !== site.origin.replace(/^https?:\/\//, '')
    );
  };
  topConnectedSite = (origin: string) =>
    permissionService.topConnectedSite(origin);
  unpinConnectedSite = (origin: string) =>
    permissionService.unpinConnectedSite(origin);
  favoriteWebsite = (origin: string) =>
    permissionService.favoriteWebsite(origin);
  unFavoriteWebsite = (origin: string) =>
    permissionService.unFavoriteWebsite(origin);
  /* keyrings */

  clearKeyrings = () => keyringService.clearKeyrings();

  importGnosisAddress = async (address: string, networkIds: string[]) => {
    let keyring, isNewKey;
    const keyringType = KEYRING_CLASS.GNOSIS;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const GnosisKeyring = keyringService.getKeyringClassForType(keyringType);
      keyring = new GnosisKeyring({});
      isNewKey = true;
    }

    keyring.setAccountToAdd(address);
    keyring.setNetworkIds(address, networkIds);
    await keyringService.addNewAccount(keyring);
    if (isNewKey) {
      await keyringService.addKeyring(keyring);
    }
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
    return this._setCurrentAccountFromKeyring(keyring, -1);
  };

  fetchGnosisChainList = (address: string) => {
    if (!isAddress(address)) {
      return Promise.reject(new Error(t('background.error.invalidAddress')));
    }
    return Promise.all(
      ensureChainListValid(GNOSIS_SUPPORT_CHAINS).map(async (chainEnum) => {
        const chain = findChain({ enum: chainEnum });
        try {
          const safe = await createSafeService({
            address,
            networkId: chain!.network,
          });
          const owners = await safe.getOwners();
          if (owners) {
            return chain;
          }
        } catch (e) {
          console.error(e);
          return null;
        }
      })
    ).then((chains) => chains.filter((chain): chain is Chain => !!chain));
  };

  syncAllGnosisNetworks = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) {
      return;
    }
    Object.entries(keyring.networkIdsMap).forEach(
      async ([address, networks]) => {
        const chainList = await this.fetchGnosisChainList(address);
        keyring.setNetworkIds(
          address,
          uniq((networks || []).concat(chainList.map((chain) => chain.network)))
        );
      }
    );
  };

  syncGnosisNetworks = async (address: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) {
      return;
    }
    const networks = keyring.networkIdsMap[address];
    const chainList = await this.fetchGnosisChainList(address);
    const nextNetworks = uniq(
      (networks || []).concat(chainList.map((chain) => chain.network))
    );
    const isSame = isEqual(sortBy(networks), sortBy(nextNetworks));
    if (isSame) {
      return;
    }
    keyring.setNetworkIds(address, nextNetworks);
    await keyringService.persistAllKeyrings();
  };

  clearGnosisTransaction = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction || keyring.safeInstance) {
      keyring.currentTransaction = null;
      keyring.safeInstance = null;
    }
  };

  clearGnosisMessage = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentSafeMessage || keyring.safeInstance) {
      keyring.currentSafeMessage = null;
      keyring.safeInstance = null;
    }
  };

  /**
   * @deprecated
   */
  getGnosisNetworkId = (address: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    const networkId = keyring.networkIdMap[address.toLowerCase()];
    if (networkId === undefined) {
      throw new Error(`Address ${address} is not in keyring"`);
    }
    return networkId;
  };

  getGnosisNetworkIds = (address: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    const networkId = keyring.networkIdsMap[address.toLowerCase()];
    if (networkId === undefined) {
      throw new Error(`Address ${address} is not in keyring"`);
    }
    return networkId;
  };

  getGnosisTransactionHash = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction) {
      return keyring.getTransactionHash();
    }
    return null;
  };

  getGnosisTransactionSignatures = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction) {
      const sigs = Array.from(keyring.currentTransaction.signatures.values());
      return sigs.map((sig) => ({ data: sig.data, signer: sig.signer }));
    }
    return [];
  };

  setGnosisTransactionHash = (hash: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    keyring.currentTransactionHash = hash;
  };

  buildGnosisTransaction = async (
    safeAddress: string,
    account: Account,
    tx,
    version: string,
    networkId: string
  ) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring) {
      const currentProvider = new EthereumProvider();
      currentProvider.currentAccount = account.address;
      currentProvider.currentAccountType = account.type;
      currentProvider.currentAccountBrand = account.brandName;
      currentProvider.chainId = networkId;
      await keyring.buildTransaction(
        safeAddress,
        tx,
        new ethers.providers.Web3Provider(currentProvider),
        version,
        networkId
      );
    } else {
      throw new Error(t('background.error.notFoundGnosisKeyring'));
    }
  };

  validateGnosisTransaction = async (
    {
      account,
      tx,
      version,
      networkId,
    }: {
      account: Account;
      tx;
      version: string;
      networkId: string;
    },
    hash: string
  ) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring) {
      buildinProvider.currentProvider.currentAccount = account.address;
      buildinProvider.currentProvider.currentAccountType = account.type;
      buildinProvider.currentProvider.currentAccountBrand = account.brandName;
      buildinProvider.currentProvider.chainId = networkId;
      return keyring.validateTransaction(
        {
          address: account.address,
          transaction: tx,
          provider: new ethers.providers.Web3Provider(
            buildinProvider.currentProvider
          ),
          version,
          networkId,
        },
        hash
      );
    } else {
      throw new Error(t('background.error.notFoundGnosisKeyring'));
    }
  };

  postGnosisTransaction = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring || !keyring.currentTransaction) {
      throw new Error(t('background.error.notFoundTxGnosisKeyring'));
    }
    return keyring.postTransaction();
  };

  getGnosisAllPendingTxs = async (address: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) {
      throw new Error(t('background.error.notFoundGnosisKeyring'));
    }
    const networks = keyring.networkIdsMap[address];
    if (!networks || !networks.length) {
      return null;
    }
    const results = await Promise.all(
      networks.map(async (networkId) => {
        return gnosisPQueue.add(async () => {
          try {
            const safe = await createSafeService({
              networkId: networkId,
              address,
            });
            const { results } = await safe.getPendingTransactions();
            return {
              networkId,
              txs: results,
            };
          } catch (e) {
            console.error(e);
            return {
              networkId,
              txs: [],
            };
          }
        });
      })
    );

    const total = results.reduce((t, item) => {
      return t + item.txs.length;
    }, 0);

    return {
      total,
      results,
    };
  };

  getGnosisAllPendingMessages = async (address: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) {
      throw new Error(t('background.error.notFoundGnosisKeyring'));
    }
    const networks = keyring.networkIdsMap[address.toLowerCase()];
    if (!networks || !networks.length) {
      return null;
    }
    const safeAddress = toChecksumAddress(address);
    const results = await Promise.all(
      networks.map(async (networkId) => {
        return gnosisPQueue.add(async () => {
          try {
            const safe = await createSafeService({
              networkId: networkId,
              address: safeAddress,
            });
            const threshold = await safe.getThreshold();
            const { results } = await safe.apiKit.getMessages(safeAddress);
            return {
              networkId,
              messages: results.filter(
                (item) => item.confirmations.length < threshold
              ),
            };
          } catch (e) {
            console.error(e);
            return {
              networkId,
              messages: [],
            };
          }
        });
      })
    );

    const total = results.reduce((t, item) => {
      return t + item.messages.length;
    }, 0);

    return {
      total,
      results,
    };
  };

  getGnosisPendingTxs = async (address: string, networkId: string) => {
    if (!networkId) {
      return [];
    }
    const safe = await createSafeService({
      networkId: networkId,
      address,
    });
    const { results } = await safe.getPendingTransactions();
    return results;
  };

  getGnosisOwners = async (
    account: Account,
    safeAddress: string,
    version: string,
    networkId: string
  ) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    const currentProvider = new EthereumProvider();
    currentProvider.currentAccount = account.address;
    currentProvider.currentAccountType = account.type;
    currentProvider.currentAccountBrand = account.brandName;
    currentProvider.chainId = networkId;

    const owners = await keyring.getOwners(
      safeAddress,
      version,
      new ethers.providers.Web3Provider(currentProvider),
      networkId
    );
    return owners;
  };

  signGnosisTransaction = (account: Account) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction && keyring.safeInstance) {
      buildinProvider.currentProvider.currentAccount = account.address;
      buildinProvider.currentProvider.currentAccountType = account.type;
      buildinProvider.currentProvider.currentAccountBrand = account.brandName;
      return keyring.confirmTransaction({
        safeAddress: keyring.safeInstance.safeAddress,
        transaction: keyring.currentTransaction,
        networkId: keyring.safeInstance.network,
        provider: new ethers.providers.Web3Provider(
          buildinProvider.currentProvider
        ),
      });
    }
  };

  checkGnosisTransactionCanExec = async () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction && keyring.safeInstance) {
      const threshold = await keyring.safeInstance.getThreshold();
      return keyring.currentTransaction.signatures.size >= threshold;
    }
    return false;
  };

  execGnosisTransaction = async (account: Account) => {
    try {
      const keyring: GnosisKeyring = this._getKeyringByType(
        KEYRING_CLASS.GNOSIS
      );
      if (keyring.currentTransaction && keyring.safeInstance) {
        const currentProvider = new EthereumProvider();
        currentProvider.currentAccount = account.address;
        currentProvider.currentAccountType = account.type;
        currentProvider.currentAccountBrand = account.brandName;
        currentProvider.chainId = keyring.safeInstance.network;
        await keyring.execTransaction({
          safeAddress: keyring.safeInstance.safeAddress,
          transaction: keyring.currentTransaction,
          networkId: keyring.safeInstance.network,
          provider: new ethers.providers.Web3Provider(currentProvider),
        });
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  gnosisGenerateTypedData = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    if (!keyring.currentTransaction) {
      throw new Error(t('background.error.notFoundTxGnosisKeyring'));
    }
    return keyring.generateTypedData();
  };

  gnosisAddConfirmation = async (address: string, signature: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    if (!keyring.currentTransaction) {
      throw new Error(t('background.error.notFoundTxGnosisKeyring'));
    }
    await keyring.addConfirmation(address, signature);
  };

  gnosisAddPureSignature = async (address: string, signature: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    if (!keyring.currentTransaction) {
      throw new Error(t('background.error.notFoundTxGnosisKeyring'));
    }
    await keyring.addPureSignature(address, signature);
  };

  gnosisAddSignature = async (address: string, signature: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    if (!keyring.currentTransaction) {
      throw new Error(t('background.error.notFoundTxGnosisKeyring'));
    }
    await keyring.addSignature(address, signature);
  };

  buildGnosisMessage = async ({
    account,
    safeAddress,
    networkId,
    version,
    message,
  }: {
    safeAddress: string;
    account: Account;
    version: string;
    networkId: string;
    message: string | Record<string, any>;
  }) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring) {
      const currentProvider = new EthereumProvider();
      currentProvider.currentAccount = account.address;
      currentProvider.currentAccountType = account.type;
      currentProvider.currentAccountBrand = account.brandName;
      currentProvider.chainId = networkId;
      return keyring.buildMessage({
        address: safeAddress,
        provider: new ethers.providers.Web3Provider(currentProvider),
        version,
        networkId,
        message: message as any,
      });
    } else {
      throw new Error(t('background.error.notFoundGnosisKeyring'));
    }
  };

  getGnosisSafeMessageInfo = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) {
      throw new Error(t('background.error.notFoundGnosisKeyring'));
    }
    return keyring.getMessageInfo();
  };

  addGnosisMessage = async ({
    signerAddress,
    signature,
  }: {
    signerAddress: string;
    signature: string;
  }) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    return keyring.addMessage({
      signerAddress,
      signature,
    });
  };

  addGnosisMessageSignature = async ({
    signerAddress,
    signature,
  }: {
    signerAddress: string;
    signature: string;
  }) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    return keyring.addMessageSignature({
      signerAddress,
      signature,
    });
  };

  handleGnosisMessage = async ({
    signerAddress,
    signature,
  }: {
    signerAddress: string;
    signature: string;
  }) => {
    const sigs = this.getGnosisMessageSignatures();
    if (sigs.length > 0) {
      await wallet.addGnosisMessageSignature({
        signature: signature,
        signerAddress: signerAddress,
      });
    } else {
      await wallet.addGnosisMessage({
        signature: signature,
        signerAddress: signerAddress,
      });
    }
  };

  addPureGnosisMessageSignature = async ({
    signerAddress,
    signature,
  }: {
    signerAddress: string;
    signature: string;
  }) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error(t('background.error.notFoundGnosisKeyring'));
    return keyring.addPureMessageSignature({
      signerAddress,
      signature,
    });
  };

  getGnosisMessage = async ({
    chainId,
    messageHash,
  }: {
    chainId: number;
    messageHash: string;
  }) => {
    const apiKit = Safe.createSafeApiKit(String(chainId));
    return apiKit.getMessage(messageHash);
  };

  getGnosisMessageHash = async ({
    safeAddress,
    chainId,
    message,
  }: {
    safeAddress: string;
    chainId: number;
    message: string | Record<string, any>;
  }) => {
    const safe = await createSafeService({
      address: safeAddress,
      networkId: String(chainId),
    });
    return safe.getSafeMessageHash(hashSafeMessage(message as any));
  };

  getGnosisMessageSignatures = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentSafeMessage) {
      const sigs = Array.from(keyring.currentSafeMessage.signatures.values());
      return sigs.map((sig) => ({ data: sig.data, signer: sig.signer }));
    }
    return [];
  };

  validateGnosisMessage = async (
    {
      address,
      chainId,
      message,
    }: {
      address: string;
      chainId: number;
      message: string | Record<string, any>;
    },
    hash: string
  ) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) {
      throw new Error(t('background.error.notFoundGnosisKeyring'));
    }

    if (
      !keyring.accounts.find(
        (account) => account.toLowerCase() === address.toLowerCase()
      )
    ) {
      throw new Error('Can not find this address');
    }
    const checksumAddress = toChecksumAddress(address);

    const safe = await createSafeService({
      address: checksumAddress,
      networkId: String(chainId),
    });
    const currentSafeMessageHash = await safe.getSafeMessageHash(
      hashSafeMessage(message as any)
    );
    return currentSafeMessageHash === hash;
  };

  hasConfirmSafeSelfHost = (networkId: string) => {
    return preferenceService.hasConfirmSafeSelfHost(networkId);
  };

  setConfirmSafeSelfHost = (networkId: string) => {
    preferenceService.setConfirmSafeSelfHost(networkId);
  };

  /**
   * @description add address as watch only account, and DON'T set it as current account
   */
  addWatchAddressOnly = async (address: string) => {
    let keyring, isNewKey;
    const keyringType = KEYRING_CLASS.WATCH;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const WatchKeyring = keyringService.getKeyringClassForType(keyringType);
      keyring = new WatchKeyring();
      isNewKey = true;
    }

    keyring.setAccountToAdd(address);
    await keyringService.addNewAccount(keyring);
    if (isNewKey) {
      await keyringService.addKeyring(keyring);
    }

    return keyring;
  };

  importWatchAddress = async (address: string) => {
    try {
      const keyring = await this.addWatchAddressOnly(address);
      return this._setCurrentAccountFromKeyring(keyring, -1);
    } catch (error) {
      if (error.message?.includes?.('duplicate')) {
        throw new Error(
          JSON.stringify({
            address,
            anchor: 'DuplicateAccountError',
          })
        );
      } else {
        throw error;
      }
    }
  };

  getWalletConnectStatus = (address: string, brandName: string) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    try {
      const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
      if (keyring) {
        return keyring.getConnectorStatus(address, brandName);
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  getWalletConnectSessionStatus = (address: string, brandName: string) => {
    const keyringType =
      brandName === KEYRING_CLASS.Coinbase
        ? KEYRING_CLASS.Coinbase
        : KEYRING_CLASS.WALLETCONNECT;
    try {
      const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
      if (keyring) {
        return keyring.getSessionStatus(address, brandName);
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  getWalletConnectSessionNetworkDelay = (
    address: string,
    brandName: string
  ) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      return keyring.getSessionNetworkDelay(address, brandName);
    }
    return null;
  };

  getWalletConnectSessionAccount = (address: string, brandName: string) => {
    const keyringType =
      brandName === KEYRING_CLASS.Coinbase
        ? KEYRING_CLASS.Coinbase
        : KEYRING_CLASS.WALLETCONNECT;
    try {
      const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
      if (keyring) {
        return keyring.getSessionAccount(address, brandName);
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  walletConnectSwitchChain = async (account: Account, chainId: number) => {
    const keyringType =
      account.brandName === KEYRING_CLASS.Coinbase
        ? KEYRING_CLASS.Coinbase
        : KEYRING_CLASS.WALLETCONNECT;
    try {
      const keyring = this._getKeyringByType(keyringType);
      if (keyring) {
        await keyring.switchEthereumChain(
          account.brandName,
          chainId,
          account.address
        );
      }
    } catch (e) {
      // ignore
      console.log('walletconnect error', e);
      this.killWalletConnectConnector(account.address, account.brandName, true);
    }
    return null;
  };

  _currentWalletConnectStashId?: undefined | null | number;

  initWalletConnect = async (
    brandName: string,
    curStashId?: number | null,
    chainId = 1
  ) => {
    if (!curStashId && this._currentWalletConnectStashId) {
      curStashId = this._currentWalletConnectStashId;
    }
    let keyring: WalletConnectKeyring, isNewKey;
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    try {
      if (curStashId !== null && curStashId !== undefined) {
        keyring = stashKeyrings[curStashId];
        isNewKey = false;
      } else {
        keyring = this._getKeyringByType(keyringType);
      }
    } catch {
      const WalletConnect = keyringService.getKeyringClassForType(keyringType);
      keyring = new WalletConnect(GET_WALLETCONNECT_CONFIG());
      isNewKey = true;
    }
    keyring.initConnector(
      brandName,
      getChainList('mainnet').map((item) => item.id)
    );
    let stashId = curStashId;
    if (isNewKey) {
      stashId = this.addKeyringToStash(keyring);
      eventBus.addEventListener(
        EVENTS.WALLETCONNECT.INIT,
        ({ address, brandName, type }) => {
          if (type !== KEYRING_CLASS.WALLETCONNECT) {
            return;
          }
          (keyring as WalletConnectKeyring).init(
            address,
            brandName,
            allChainIds
          );
        }
      );
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
      });

      keyring.on('statusChange', (data) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.WALLETCONNECT.STATUS_CHANGED,
          params: data,
        });
        if (!preferenceService.getPopupOpen()) {
          setPageStateCacheWhenPopupClose(data);
        }
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
    this._currentWalletConnectStashId = stashId;
    return {
      stashId,
    };
  };

  killWalletConnectConnector = async (
    address: string,
    brandName: string,
    resetConnect: boolean,
    silent?: boolean
  ) => {
    try {
      const keyringType =
        brandName === KEYRING_CLASS.Coinbase
          ? KEYRING_CLASS.Coinbase
          : KEYRING_CLASS.WALLETCONNECT;
      const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
      if (keyring) {
        await keyring.closeConnector({ address, brandName }, silent);
        // reset onAfterConnect
        // if (resetConnect) keyring.resetConnect();
      }
    } catch (e) {
      // ignore me
    }
  };

  getCommonWalletConnectInfo = (address: string) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      return keyring.getCommonWalletConnectInfo(address);
    }
    return;
  };

  importWalletConnect = async (
    address: string,
    brandName: string,
    bridge?: string,
    stashId?: number,
    realBrandName?: string,
    realBrandUrl?: string
  ) => {
    try {
      let keyring: WalletConnectKeyring, isNewKey;
      const keyringType = KEYRING_CLASS.WALLETCONNECT;
      try {
        keyring = this._getKeyringByType(keyringType);
      } catch {
        if (stashId !== null && stashId !== undefined) {
          keyring = stashKeyrings[stashId];
        } else {
          const WalletConnectKeyring = keyringService.getKeyringClassForType(
            keyringType
          );
          keyring = new WalletConnectKeyring(GET_WALLETCONNECT_CONFIG());
        }
        isNewKey = true;
      }

      keyring.setAccountToAdd({
        address,
        brandName,
        realBrandName,
        realBrandUrl,
      });

      if (isNewKey) {
        await keyringService.addKeyring(keyring);
      }

      await keyringService.addNewAccount(keyring);

      this.clearPageStateCache();
      return this._setCurrentAccountFromKeyring(keyring, -1);
    } catch (error) {
      if (error.message?.includes?.('duplicate')) {
        throw new Error(
          JSON.stringify({
            address,
            anchor: 'DuplicateAccountError',
          })
        );
      } else {
        throw error;
      }
    }
  };

  gridPlusIsConnect = () => {
    const keyringType = KEYRING_CLASS.HARDWARE.GRIDPLUS;
    const keyring = this._getKeyringByType(keyringType);
    if (keyring) {
      return keyring.isUnlocked();
    }
    return null;
  };

  getPrivateKey = async (
    password: string,
    { address, type }: { address: string; type: string }
  ) => {
    await this.verifyPassword(password);
    const keyring = await keyringService.getKeyringForAccount(address, type);
    if (!keyring) return null;
    return await keyring.exportAccount(address);
  };

  getMnemonics = async (password: string, address: string) => {
    await this.verifyPassword(password);
    const keyring = await keyringService.getKeyringForAccount(
      address,
      KEYRING_CLASS.MNEMONIC
    );
    const serialized = await keyring.serialize();
    const seedWords = serialized.mnemonic;

    return seedWords;
  };

  clearAddressPendingTransactions = (address: string, chainId?: number) => {
    transactionHistoryService.clearPendingTransactions(address, chainId);
    transactionWatcher.clearPendingTx(address, chainId);
    transactionBroadcastWatchService.clearPendingTx(address, chainId);
    return;
  };

  removeLocalPendingTx = ({
    address,
    nonce,
    chainId,
  }: {
    address: string;
    nonce: number;
    chainId: number;
  }) => {
    transactionHistoryService.removeLocalPendingTx({
      address,
      nonce,
      chainId,
    });
    transactionWatcher.removeLocalPendingTx({
      address,
      nonce,
      chainId,
    });
    transactionBroadcastWatchService.removeLocalPendingTx({
      address,
      nonce,
      chainId,
    });
    return;
  };

  clearAddressTransactions = (address: string) => {
    transactionHistoryService.removeList(address);
    return;
  };

  validatePrivateKey = async (data: string) => {
    const privateKey = stripHexPrefix(data);
    const buffer = Buffer.from(privateKey, 'hex');

    const error = new Error(t('background.error.invalidPrivateKey'));
    try {
      if (!isValidPrivate(buffer)) {
        throw error;
      }
    } catch {
      throw error;
    }
  };

  importPrivateKey = async (data) => {
    const privateKey = stripHexPrefix(data);
    const buffer = Buffer.from(privateKey, 'hex');

    const error = new Error(t('background.error.invalidPrivateKey'));
    try {
      if (!isValidPrivate(buffer)) {
        throw error;
      }
    } catch {
      throw error;
    }

    const keyring = await keyringService.importPrivateKey(privateKey);
    return this._setCurrentAccountFromKeyring(keyring);
  };

  // json format is from "https://github.com/SilentCicero/ethereumjs-accounts"
  // or "https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition"
  // for example: https://www.myetherwallet.com/create-wallet
  importJson = async (content: string, password: string) => {
    try {
      JSON.parse(content);
    } catch {
      throw new Error(t('background.error.invalidJson'));
    }

    let wallet: Wallet;
    try {
      wallet = await thirdparty.fromEtherWallet(content, password);
    } catch (e) {
      wallet = await Wallet.fromV3(content, password, true);
    }

    const privateKey = wallet.getPrivateKeyString();
    const keyring = await keyringService.importPrivateKey(
      stripHexPrefix(privateKey)
    );
    return this._setCurrentAccountFromKeyring(keyring);
  };
  generateMnemonic = () => keyringService.generateMnemonic();
  getPreMnemonics = () => keyringService.getPreMnemonics();
  generatePreMnemonic = () => keyringService.generatePreMnemonic();
  removePreMnemonics = () => keyringService.removePreMnemonics();
  createKeyringWithMnemonics = async (mnemonic: string) => {
    const keyring = await keyringService.createKeyringWithMnemonics(mnemonic);
    keyringService.removePreMnemonics();
    // return this._setCurrentAccountFromKeyring(keyring);
  };

  getHiddenAddresses = () => preferenceService.getHiddenAddresses();
  showAddress = (type: string, address: string) =>
    preferenceService.showAddress(type, address);
  hideAddress = (type: string, address: string, brandName: string) => {
    preferenceService.hideAddress(type, address, brandName);
    const current = preferenceService.getCurrentAccount();
    if (current?.address === address && current.type === type) {
      this.resetCurrentAccount();
    }
  };

  clearWatchMode = async () => {
    const keyrings: WatchKeyring[] = await keyringService.getKeyringsByType(
      KEYRING_CLASS.WATCH
    );
    let addresses: string[] = [];
    for (let i = 0; i < keyrings.length; i++) {
      const keyring = keyrings[i];
      const accounts = await keyring.getAccounts();
      addresses = [...addresses, ...accounts];
    }
    await Promise.all(
      addresses.map((address) =>
        this.removeAddress(address, KEYRING_CLASS.WATCH)
      )
    );
  };

  getAccountByAddress = async (address: string) => {
    const addressList = await keyringService.getAllAdresses();
    const accounts = addressList.filter((item) => {
      return isSameAddress(item.address, address);
    });
    return last(
      sortBy(accounts, (item) => {
        if (item.type === KEYRING_TYPE.WatchAddressKeyring) {
          return 0;
        } else if (item.type === KEYRING_TYPE.WalletConnectKeyring) {
          return 1;
        } else {
          return 2;
        }
      })
    );
  };

  hasAddress = (address: string) => {
    return keyringService.hasAddress(address);
  };

  removeAddress = async (
    address: string,
    type: string,
    brand?: string,
    removeEmptyKeyrings?: boolean
  ) => {
    await this.killWalletConnectConnector(address, brand || type, true, true);

    if (removeEmptyKeyrings) {
      const keyring = await keyringService.getKeyringForAccount(address, type);
      this.removeMnemonicKeyringFromStash(keyring);
    }

    await keyringService.removeAccount(
      address,
      type,
      brand,
      removeEmptyKeyrings
    );
    if (!(await keyringService.hasAddress(address))) {
      contactBookService.removeAlias(address);
      whitelistService.removeWhitelist(address);
      transactionHistoryService.removeList(address);
      signTextHistoryService.removeList(address);
      preferenceService.removeHighlightedAddress({
        address,
        brandName: brand || type,
      });
      preferenceService.removeAddressBalance(address);
      preferenceService.removeCurvePoints(address);
      perpsService.removeAgentWallet(address);
    }
    const current = preferenceService.getCurrentAccount();
    if (
      current?.address === address &&
      current.type === type &&
      current.brandName === brand
    ) {
      await this.resetCurrentAccount();
    }
    const sites = permissionService.getSites();
    sites.forEach((item) => {
      if (
        item.account &&
        isSameAccount(item.account, { address, type, brandName: brand || type })
      ) {
        this.setSiteAccount({
          origin: item.origin,
          account: preferenceService.getCurrentAccount(),
        });
      }
    });
  };

  removeContactInfo = (address: string) => {
    contactBookService.removeAlias(address);
  };

  resetCurrentAccount = async () => {
    const [account] = await this.getAccounts();
    if (account) {
      preferenceService.setCurrentAccount(account);
    } else {
      preferenceService.setCurrentAccount(null);
    }
  };

  getKeyringByMnemonic = (
    mnemonic: string,
    passphrase = ''
  ): HdKeyring | undefined => {
    const keyring = keyringService.keyrings.find((item) => {
      return (
        item.type === KEYRING_CLASS.MNEMONIC &&
        item.mnemonic === mnemonic &&
        item.checkPassphrase(passphrase)
      );
    });

    keyring?.setPassphrase(passphrase);

    return keyring;
  };

  _getMnemonicKeyringByAddress = (address: string) => {
    return keyringService.keyrings.find((item) => {
      return (
        item.type === KEYRING_CLASS.MNEMONIC &&
        item.mnemonic &&
        item.accounts.includes(address)
      );
    });
  };

  removeMnemonicsKeyRingByPublicKey = async (publicKey: string) => {
    this.removePublicKeyFromStash(publicKey);
    keyringService.removeKeyringByPublicKey(publicKey);
  };

  getMnemonicKeyRingFromPublicKey = (publicKey: string) => {
    const targetKeyring = keyringService.keyrings?.find((item) => {
      if (
        item.type === KEYRING_CLASS.MNEMONIC &&
        item.mnemonic &&
        item.publicKey === publicKey
      ) {
        return true;
      }
      return false;
    });

    return targetKeyring;
  };

  getMnemonicFromPublicKey = (publicKey: string) => {
    const targetKeyring = this.getMnemonicKeyRingFromPublicKey(publicKey);

    return targetKeyring?.mnemonic;
  };

  getMnemonicKeyRingIdFromPublicKey = (publicKey: string) => {
    const targetKeyring = this.getMnemonicKeyRingFromPublicKey(publicKey);
    let keyringId;
    if (targetKeyring) {
      keyringId = this.updateKeyringInStash(targetKeyring);
    }
    return keyringId;
  };

  getMnemonicByAddress = (address: string) => {
    const keyring = this._getMnemonicKeyringByAddress(address);
    if (!keyring) {
      throw new Error(t('background.error.notFoundKeyringByAddress'));
    }
    return keyring.mnemonic;
  };

  private getMnemonicKeyring = async (
    type: 'address' | 'publickey',
    value: string
  ) => {
    let keyring;
    if (type === 'address') {
      keyring = await this._getMnemonicKeyringByAddress(value);
    } else {
      keyring = await this.getMnemonicKeyRingFromPublicKey(value);
    }

    if (!keyring) {
      throw new Error(t('background.error.notFoundKeyringByAddress'));
    }

    return keyring;
  };

  getMnemonicKeyringIfNeedPassphrase = async (
    type: 'address' | 'publickey',
    value: string
  ) => {
    const keyring = await this.getMnemonicKeyring(type, value);
    return keyring.needPassphrase;
  };

  getMnemonicKeyringPassphrase = async (
    type: 'address' | 'publickey',
    value: string
  ) => {
    const keyring = await this.getMnemonicKeyring(type, value);
    return keyring.passphrase;
  };

  checkPassphraseBelongToMnemonic = async (
    type: 'address' | 'publickey',
    value: string,
    passphrase: string
  ) => {
    const keyring = await this.getMnemonicKeyring(type, value);
    const result = keyring.checkPassphrase(passphrase);
    if (result) {
      keyring.setPassphrase(passphrase);
    }
    return result;
  };

  getMnemonicAddressInfo = async (address: string) => {
    const keyring = this._getMnemonicKeyringByAddress(address);
    if (!keyring) {
      throw new Error(t('background.error.notFoundKeyringByAddress'));
    }
    return await keyring.getInfoByAddress(address);
  };

  validateMnemonic = (mnemonic: string) => {
    return HdKeyring.validateMnemonic(mnemonic);
  };

  generateKeyringWithMnemonic = async (
    mnemonic: string,
    passphrase: string
  ) => {
    // keep passphrase is empty string if not set
    passphrase = passphrase || '';

    if (!HdKeyring.validateMnemonic(mnemonic)) {
      throw new Error(t('background.error.invalidMnemonic'));
    }
    // If import twice use same keyring
    let keyring = this.getKeyringByMnemonic(mnemonic, passphrase);
    const result = {
      keyringId: null as number | null,
      isExistedKR: false,
    };
    if (!keyring) {
      const Keyring = keyringService.getKeyringClassForType(
        KEYRING_CLASS.MNEMONIC
      );

      keyring = new Keyring({ mnemonic, passphrase });
      keyringService.updateHdKeyringIndex(keyring);
      result.keyringId = this.addKeyringToStash(keyring);
      keyringService.addKeyring(keyring);
    } else {
      result.isExistedKR = true;
      result.keyringId = this.updateKeyringInStash(keyring);
    }

    return result;
  };

  slip39GetThreshold = (secretShares: string[]) => {
    return HdKeyring.slip39GetThreshold(secretShares);
  };

  slip39DecodeMnemonic = (secretShare: string) => {
    return HdKeyring.slip39DecodeMnemonic(secretShare);
  };

  addKeyringToStash = (keyring) => {
    const stashId = Object.values(stashKeyrings).length + 1;
    stashKeyrings[stashId] = keyring;

    return stashId;
  };

  updateKeyringInStash = (keyring) => {
    let keyringId = Object.keys(stashKeyrings).find((key) => {
      return (
        stashKeyrings[key].mnemonic === keyring.mnemonic &&
        stashKeyrings[key].publicKey === keyring.publicKey
      );
    }) as number | undefined;

    if (!keyringId) {
      keyringId = this.addKeyringToStash(keyring);
    }

    return Number(keyringId);
  };

  removeMnemonicKeyringFromStash = (keyring) => {
    const keyringId = Object.keys(stashKeyrings).find((key) => {
      return (
        stashKeyrings[key]?.mnemonic &&
        stashKeyrings[key].mnemonic === keyring.mnemonic
      );
    });
    if (keyringId) {
      delete stashKeyrings[keyringId];
    }
  };

  removePublicKeyFromStash = (publicKey: string) => {
    const keyring = this.getMnemonicKeyRingFromPublicKey(publicKey);
    if (keyring) {
      this.removeMnemonicKeyringFromStash(keyring);
    }
  };

  addKeyring = async (
    keyringId: keyof typeof stashKeyrings,
    byImport = true
  ) => {
    const keyring = stashKeyrings[keyringId];
    if (keyring) {
      keyring.byImport = byImport;
      // If keyring exits, just save
      if (keyringService.keyrings.find((item) => item === keyring)) {
        await keyringService.persistAllKeyrings();
      } else {
        await keyringService.addKeyring(keyring);
      }
      this._setCurrentAccountFromKeyring(keyring, -1);
    } else {
      throw new Error(t('background.error.addKeyring404'));
    }
  };

  getKeyringByType = (type: string) => keyringService.getKeyringByType(type);

  checkHasMnemonic = () => {
    try {
      const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);
      return !!keyring.mnemonic;
    } catch (e) {
      return false;
    }
  };

  /**
   * @deprecated
   */
  deriveNewAccountFromMnemonic = async () => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);

    const result = await keyringService.addNewAccount(keyring);
    this._setCurrentAccountFromKeyring(keyring, -1);
    return result;
  };

  getAccountsCount = async () => {
    const accounts = await keyringService.getAccounts();
    return accounts.filter((x) => x).length;
  };

  getTypedAccounts = async (type) => {
    return Promise.all(
      keyringService.keyrings
        .map((keyring) => new DisplayKeyring(keyring))
        .filter((keyring) => !type || keyring.type === type)
        .map((keyring) => keyringService.displayForKeyring(keyring))
    );
  };

  getAllVisibleAccounts: () => Promise<DisplayedKeryring[]> = async () => {
    const typedAccounts = await keyringService.getAllTypedVisibleAccounts();

    return typedAccounts.map((account) => ({
      ...account,
      keyring: new DisplayKeyring(account.keyring),
    }));
  };

  getAllVisibleAccountsArray: () => Promise<Account[]> = () => {
    return keyringService.getAllVisibleAccountsArray();
  };

  getAllClassAccounts: () => Promise<DisplayedKeryring[]> = async () => {
    const typedAccounts = await keyringService.getAllTypedAccounts();

    return typedAccounts.map((account) => ({
      ...account,
      keyring: new DisplayKeyring(account.keyring),
    }));
  };

  changeAccount = (account: Account) => {
    preferenceService.setCurrentAccount(account);
    if (notificationService.currentApproval) {
      notificationService.rejectAllApprovals();
      notificationService.clear();
    }
  };

  authorizeLedgerHIDPermission = async () => {
    const keyring = keyringService.getKeyringByType(
      KEYRING_CLASS.HARDWARE.LEDGER
    );
    if (!keyring) return;
    await keyring.authorizeHIDPermission();
    await keyringService.persistAllKeyrings();
  };

  authorizeImKeyHIDPermission = async () => {
    const keyring = keyringService.getKeyringByType(
      KEYRING_CLASS.HARDWARE.IMKEY
    );
    if (!keyring) return;
    await keyring.authorizeHIDPermission();
    await keyringService.persistAllKeyrings();
  };

  authorizeOneKeyHIDPermission = async () => {
    const keyring = keyringService.getKeyringByType(
      KEYRING_CLASS.HARDWARE.ONEKEY
    );
    if (!keyring) return;
    await keyringService.persistAllKeyrings();
  };

  checkLedgerHasHIDPermission = () => {
    const keyring = keyringService.getKeyringByType(
      KEYRING_CLASS.HARDWARE.LEDGER
    );
    if (!keyring) return false;
    return keyring.hasHIDPermission;
  };

  connectHardware = async ({
    type,
    hdPath,
    needUnlock = false,
    isWebHID = false,
  }: {
    type: string;
    hdPath?: string;
    needUnlock?: boolean;
    isWebHID?: boolean;
  }) => {
    let keyring;
    let stashKeyringId: number | null = null;
    let isNew = false;
    try {
      keyring = this._getKeyringByType(type);
    } catch {
      const Keyring = keyringService.getKeyringClassForType(type);
      keyring = new Keyring(
        (await hasBridge(type))
          ? {
              bridge: await getKeyringBridge(type),
            }
          : undefined
      );
      isNew = true;
    }

    Object.keys(stashKeyrings).forEach((key) => {
      const kr = stashKeyrings[key];
      if (kr.type === keyring.type) {
        stashKeyringId = Number(key);
      }
    });
    if (!stashKeyringId) {
      stashKeyringId = Object.values(stashKeyrings).length + 1;
      stashKeyrings[stashKeyringId] = keyring;
    } else {
      if (isNew) {
        stashKeyrings[stashKeyringId] = keyring;
      }
    }

    if (hdPath && keyring.setHdPath) {
      keyring.setHdPath(hdPath);
    }

    if (needUnlock) {
      await keyring?.unlock?.();
    }

    return stashKeyringId;
  };

  acquireKeystoneMemStoreData = async () => {
    const keyringType = KEYRING_CLASS.HARDWARE.KEYSTONE;
    const keyring: KeystoneKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      keyring.getInteraction().on(MemStoreDataReady, (request) => {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.QRHARDWARE.ACQUIRE_MEMSTORE_SUCCEED,
          params: {
            request,
          },
        });
      });
      keyring.getInteraction().emit(AcquireMemeStoreData);
    }
  };

  submitQRHardwareCryptoHDKey = async (
    cbor: string,
    keyringId?: number | null
  ) => {
    let keyring;
    let stashKeyringId: number | null = null;
    const keyringType = KEYRING_CLASS.HARDWARE.KEYSTONE;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(keyringType);
      } catch {
        const keystoneKeyring = keyringService.getKeyringClassForType(
          keyringType
        );
        keyring = new keystoneKeyring({
          bridge: await getKeyringBridge(keyringType),
        });
        stashKeyringId = Object.values(stashKeyrings).length + 1;
        stashKeyrings[stashKeyringId] = keyring;
      }
    }

    keyring.readKeyring();
    await keyring.submitCryptoHDKey(cbor);
    return keyringId ?? stashKeyringId;
  };

  submitQRHardwareCryptoAccount = async (
    cbor: string,
    keyringId?: number | null
  ) => {
    let keyring;
    let stashKeyringId: number | null = null;
    const keyringType = KEYRING_CLASS.HARDWARE.KEYSTONE;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(keyringType);
      } catch {
        const keystoneKeyring = keyringService.getKeyringClassForType(
          keyringType
        );
        keyring = new keystoneKeyring({
          bridge: await getKeyringBridge(keyringType),
        });
        stashKeyringId = Object.values(stashKeyrings).length + 1;
        stashKeyrings[stashKeyringId] = keyring;
      }
    }
    keyring.readKeyring();
    await keyring.submitCryptoAccount(cbor);
    return keyringId ?? stashKeyringId;
  };

  submitQRHardwareSignature = async (
    requestId: string,
    cbor: string,
    address?: string
  ) => {
    const account = await preferenceService.getCurrentAccount();
    const keyring = await keyringService.getKeyringForAccount(
      address ? address : account!.address,
      KEYRING_CLASS.HARDWARE.KEYSTONE
    );
    return await keyring.submitSignature(requestId, cbor);
  };

  signPersonalMessage = async (
    type: string,
    from: string,
    data: string,
    options?: any
  ) => {
    const keyring = await keyringService.getKeyringForAccount(from, type);
    const res = await keyringService.signPersonalMessage(
      keyring,
      { from, data },
      options
    );
    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.SIGN_FINISHED,
      params: {
        success: true,
        data: res,
      },
    });
    return res;
  };

  signPersonalMessageWithUI = async (
    type: string,
    from: string,
    data: string,
    options?: any
  ) => {
    const fn = () =>
      waitSignComponentAmounted().then(() => {
        this.signPersonalMessage(type, from, data as any, options);
      });

    notificationService.setCurrentRequestDeferFn(fn);
    return fn();
  };

  signTypedData = async (
    type: string,
    from: string,
    data: Record<string, any>,
    options?: any
  ) => {
    const keyring = await keyringService.getKeyringForAccount(from, type);
    const res = await keyringService.signTypedMessage(
      keyring,
      { from, data },
      options
    );
    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.SIGN_FINISHED,
      params: {
        success: true,
        data: res,
      },
    });
    return res;
  };

  /**
   * signTypedData when UI is mounted, and can retry if needed
   */
  signTypedDataWithUI = async (
    type: string,
    from: string,
    data: string,
    options?: any
  ) => {
    const fn = () =>
      waitSignComponentAmounted().then(() => {
        return this.signTypedData(type, from, data as any, options);
      });

    notificationService.setCurrentRequestDeferFn(fn);
    return fn();
  };

  signTransaction = async (
    type: string,
    from: string,
    data: any,
    options?: any
  ) => {
    const keyring = await keyringService.getKeyringForAccount(from, type);
    return keyringService.signTransaction(keyring, data, from, options);
  };

  decryptMessage = async ({
    type,
    from,
    data,
    options,
  }: {
    type: string;
    from: string;
    data: string;
    options?: any;
  }) => {
    if (data.startsWith('0x')) {
      const stripped = stripHexPrefix(data);
      const buff = Buffer.from(stripped, 'hex');
      data = JSON.parse(buff.toString('utf8'));
    } else {
      data = JSON.parse(data);
    }
    const keyring = await keyringService.getKeyringForAccount(from, type);
    return keyring.decryptMessage(from, data, options);
  };

  getEncryptionPublicKey = async ({
    address,
    type,
    options,
  }: {
    address: string;
    type: string;
    options?: any;
  }) => {
    const keyring = await keyringService.getKeyringForAccount(address, type);
    return keyring.getEncryptionPublicKey(address, options);
  };

  requestKeyring = async (
    type: string,
    methodName: string,
    keyringId: number | null,
    ...params: any[]
  ) => {
    let keyring: any;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(type);
      } catch {
        const Keyring = keyringService.getKeyringClassForType(type);
        keyring = new Keyring(
          (await hasBridge(type))
            ? { bridge: await getKeyringBridge(type) }
            : undefined
        );
      }
    }
    if (keyring[methodName]) {
      return keyring[methodName].call(keyring, ...params);
    }
  };

  getKeyringIndex = async (type: string, keyringId: number | null) => {
    let keyring: any;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(type);
      } catch {
        const Keyring = keyringService.getKeyringClassForType(type);
        keyring = new Keyring(
          (await hasBridge(type))
            ? { bridge: await getKeyringBridge(type) }
            : undefined
        );
      }
    }
    return keyring?.index;
  };

  requestHDKeyringByMnemonics = (
    mnemonics: string,
    methodName: string,
    passphrase: string,
    ...params: any[]
  ) => {
    const keyring = this.getKeyringByMnemonic(mnemonics, passphrase);
    if (!keyring) {
      throw new Error(
        'failed to requestHDKeyringByMnemonics, no keyring found.'
      );
    }
    if (keyring[methodName]) {
      return keyring[methodName].call(keyring, ...params);
    }
  };

  activeAndPersistAccountsByMnemonics = async (
    mnemonics: string,
    passphrase: string,
    accountsToImport: Required<
      Pick<Account, 'address' | 'alianName' | 'index'>
    >[]
  ) => {
    const keyring = this.getKeyringByMnemonic(mnemonics, passphrase);
    if (!keyring) {
      throw new Error(
        '[activeAndPersistAccountsByMnemonics] no keyring found.'
      );
    }
    await this.requestHDKeyringByMnemonics(
      mnemonics,
      'activeAccounts',
      passphrase,
      accountsToImport.map((acc) => acc.index! - 1)
    );

    await keyringService.persistAllKeyrings();
    const accounts: string[] = await (keyring as any).getAccounts();

    const _account = {
      address: accountsToImport[0].address,
      type: keyring.type,
      brandName: keyring.type,
    };
    preferenceService.setCurrentAccount(_account);
  };

  unlockHardwareAccount = async (keyring, indexes, keyringId) => {
    let keyringInstance: any = null;
    try {
      keyringInstance = this._getKeyringByType(keyring);
    } catch (e) {
      // NOTHING
    }
    if (!keyringInstance && keyringId !== null && keyringId !== undefined) {
      await keyringService.addKeyring(stashKeyrings[keyringId]);
      keyringInstance = stashKeyrings[keyringId];
    }
    for (let i = 0; i < indexes.length; i++) {
      keyringInstance!.setAccountToUnlock(indexes[i]);
      await keyringService.addNewAccount(keyringInstance);
    }

    return this._setCurrentAccountFromKeyring(keyringInstance, -1);
  };

  getSignTextHistory = (address: string) => {
    return signTextHistoryService.getHistory(address);
  };

  // addTxExplainCache = (params: {
  //   address: string;
  //   chainId: number;
  //   nonce: number;
  //   explain: ExplainTxResponse;
  //   calcSuccess: boolean;
  //   approvalId: string;
  // }) => transactionHistoryService.addExplainCache(params);

  // getExplainCache = ({
  //   address,
  //   chainId,
  //   nonce,
  // }: {
  //   address: string;
  //   chainId: number;
  //   nonce: number;
  // }) =>
  //   transactionHistoryService.getExplainCache({
  //     address,
  //     chainId,
  //     nonce,
  //   });

  // getTxExplainCacheByApprovalId = (id: string) =>
  //   transactionHistoryService.getExplainCacheByApprovalId(id);
  getRecentPendingTxHistory: typeof transactionHistoryService.getRecentPendingTxHistory = (
    address,
    type
  ) => transactionHistoryService.getRecentPendingTxHistory(address, type);
  addCacheHistoryData: typeof transactionHistoryService.addCacheHistoryData = (
    key,
    data,
    type
  ) => transactionHistoryService.addCacheHistoryData(key, data, type);
  getRecentTxHistory: typeof transactionHistoryService.getRecentTxHistory = (
    address,
    hash,
    chainId,
    type
  ) =>
    transactionHistoryService.getRecentTxHistory(address, hash, chainId, type);
  completeBridgeTxHistory = (
    from_tx_id: string,
    chainId: number,
    status: BridgeTxHistoryItem['status'],
    bridgeTx?: BridgeHistory
  ) =>
    transactionHistoryService.completeBridgeTxHistory(
      from_tx_id,
      chainId,
      status,
      bridgeTx
    );

  getTransactionHistory = (address: string) =>
    transactionHistoryService.getList(address);

  loadPendingListQueue = (address: string) =>
    transactionHistoryService.loadPendingListQueue(address);

  addSigningTx = (tx: Tx) => transactionHistoryService.addSigningTx(tx);

  updateSigningTx = (
    ...args: Parameters<typeof transactionHistoryService['updateSigningTx']>
  ) => transactionHistoryService.updateSigningTx(...args);

  removeSigningTx = (id: string) =>
    transactionHistoryService.removeSigningTx(id);

  getSigningTx = (id: string) => transactionHistoryService.getSigningTx(id);

  completedTransaction = (params: {
    address: string;
    chainId: number;
    nonce: number;
    hash: string;
    success?: boolean;
    gasUsed?: number;
  }) => transactionHistoryService.completeTx(params);
  getPendingCount = (address: string) =>
    transactionHistoryService.getPendingCount(address);
  getNonceByChain = (address: string, chainId: number) =>
    transactionHistoryService.getNonceByChain(address, chainId);
  getPendingTxsByNonce = (address: string, chainId: number, nonce: number) =>
    transactionHistoryService.getPendingTxsByNonce(address, chainId, nonce);

  getSkipedTxs = async (address: string) => {
    const { pendings: pendingList } = transactionHistoryService.getList(
      address
    );
    const dict = groupBy(pendingList, (item) => item.chainId);

    const res: Record<string, { chainId: number; nonce: number }[]> = {};
    for (const [chainId, list] of Object.entries(dict)) {
      const chain = findChain({
        id: +chainId,
      });
      if (!chain) {
        continue;
      }
      const onChainNonce = await providerController.ethRpc(
        {
          data: {
            method: 'eth_getTransactionCount',
            params: [address, 'latest'],
          },
          session: INTERNAL_REQUEST_SESSION,
        },
        chain.serverId
      );
      const localNonce =
        transactionHistoryService.getNonceByChain(address, +chainId) || 0;
      for (let nonce = +onChainNonce; nonce < +localNonce; nonce++) {
        if (
          !list.find((txGroup) => {
            return +txGroup.nonce === nonce;
          })
        ) {
          if (res[chainId]) {
            res[chainId].push({ nonce, chainId: +chainId });
          } else {
            res[chainId] = [{ nonce, chainId: +chainId }];
          }
        }
      }
    }

    return res;
  };

  quickCancelTx = transactionHistoryService.quickCancelTx;

  retryPushTx = transactionHistoryService.retryPushTx;

  getTxGroup = transactionHistoryService.getTxGroup;

  getPreference = (key?: string) => {
    return preferenceService.getPreference(key);
  };

  setIsDefaultWallet = (val: boolean) => {
    preferenceService.setIsDefaultWallet(val);
    const hasOtherProvider = preferenceService.getHasOtherProvider();
    if (hasOtherProvider) {
      const sites = permissionService
        .getSites()
        .filter((item) => !item.preferMetamask);
      sites.forEach((site) => {
        sessionService.broadcastEvent(
          'defaultWalletChanged',
          val ? 'rabby' : 'metamask',
          site.origin
        );
      });
    }
    const isUnlocked = this.isUnlocked();
    if (isUnlocked) {
      if (hasOtherProvider) {
        setPopupIcon(val ? 'rabby' : 'metamask');
      } else {
        setPopupIcon('default');
      }
    } else {
      setPopupIcon('locked');
    }
  };
  isDefaultWallet = (origin?: string) =>
    preferenceService.getIsDefaultWallet(origin);

  private _getKeyringByType(type) {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw ethErrors.rpc.internal(`No ${type} keyring found`);
  }

  getContactsByMap() {
    return contactBookService.getContactsByMap();
  }

  listContact = (includeAlias = true) => {
    const list = contactBookService.listContacts();
    if (includeAlias) {
      return list;
    } else {
      return list.filter((item) => !item.isAlias);
    }
  };

  private async _setCurrentAccountFromKeyring(keyring, index = 0) {
    const accounts = keyring.getAccountsWithBrand
      ? await keyring.getAccountsWithBrand()
      : await keyring.getAccounts();
    const account = accounts[index < 0 ? index + accounts.length : index];

    if (!account) {
      throw new Error(t('background.error.emptyAccount'));
    }

    const _account = {
      address: typeof account === 'string' ? account : account.address,
      type: keyring.type,
      brandName: typeof account === 'string' ? keyring.type : account.brandName,
    };
    preferenceService.setCurrentAccount(_account);

    return [_account];
  }

  getHighlightedAddresses = () => {
    return preferenceService.getHighlightedAddresses();
  };

  updateHighlightedAddresses = (list: IHighlightedAddress[]) => {
    return preferenceService.updateHighlightedAddresses(list);
  };

  getHighlightWalletList = () => {
    return preferenceService.getWalletSavedList();
  };

  updateHighlightWalletList = (list) => {
    return preferenceService.updateWalletSavedList(list);
  };

  getAlianName = (address: string) => {
    const contact = contactBookService.getContactByAddress(address);
    if (contact?.isAlias) return contact.name;
    return undefined;
  };

  updateAlianName = (address: string, name: string, cexId?: string) => {
    contactBookService.updateAlias({
      name,
      address,
      cexId,
    });
  };

  getCexId = (address: string) => {
    const contact = contactBookService.getContactByAddress(address);
    if (contact?.cexId) return contact.cexId;
    return undefined;
  };

  updateCexId = (address: string, cexId: string) => {
    contactBookService.updateCexId(address, cexId);
  };

  getAllAlianNameByMap = () => {
    return contactBookService.listAlias().reduce((res, item) => {
      if (!item.address) return res;
      return {
        ...res,
        [item.address]: item,
      };
    }, {});
  };

  getAllAlianName = () => {
    return contactBookService.listAlias();
  };

  generateCacheAliasNames = async ({
    addresses,
    keyringType,
  }: {
    addresses: string[];
    keyringType: string;
  }) => {
    if (addresses.length <= 0)
      throw new Error(t('background.error.generateCacheAliasNames'));
    const firstAddress = addresses[0];
    const keyrings = await this.getTypedAccounts(keyringType);
    const keyring = await keyringService.getKeyringForAccount(
      firstAddress,
      keyringType
    );
    if (!keyring) {
      const aliases: { address: string; alias: string }[] = [];
      for (let i = 0; i < addresses.length; i++) {
        const alias = generateAliasName({
          keyringType,
          keyringCount: keyrings.length,
          addressCount: i,
        });
        aliases.push({
          address: addresses[i],
          alias,
        });
      }
      aliases.forEach(({ address, alias }) => {
        contactBookService.updateCacheAlias({ address, name: alias });
      });
    } else {
      // TODO: add index property into eth-hd-keyring
    }
  };

  updateCacheAlias = contactBookService.updateCacheAlias;

  getCacheAlias = contactBookService.getCacheAlias;

  async generateAliasCacheForFreshMnemonic(
    keyringId: keyof typeof stashKeyrings,
    ids: number[]
  ) {
    const keyring = stashKeyrings[keyringId];
    if (!keyring) {
      throw new Error(
        'failed to generateAliasCacheForFreshMnemonic, no keyring found.'
      );
    }

    const importedAccounts = await (keyring as any).getAccounts();
    const addressIndexStart = importedAccounts.length ?? 0;

    const accounts = ids
      .sort((a, b) => a - b)
      .map((id, index) => {
        const address = keyring._addressFromIndex(id)[0];
        const alias = generateAliasName({
          keyringType: KEYRING_TYPE.HdKeyring,
          keyringCount: keyring.index,
          addressCount: addressIndexStart + index,
        });
        contactBookService.updateCacheAlias({
          address: address,
          name: alias,
        });
        return {
          address: address,
          id,
          alias,
        };
      });
    return accounts;
  }

  async generateAliasCacheForExistedMnemonic(
    mnemonic: string,
    addresses: string[]
  ) {
    const keyring = keyringService.keyrings.find((item) => {
      return item.type === KEYRING_CLASS.MNEMONIC && item.mnemonic === mnemonic;
    });
    if (!keyring) {
      throw new Error(
        'failed to generateAliasCacheForExistedMnemonic, no keyring found.'
      );
    }

    const importedAccounts = await (keyring as any).getAccounts();
    const adressIndexStart = importedAccounts.length;

    for (let i = 0; i < addresses.length; i++) {
      const alias = generateAliasName({
        keyringType: KEYRING_CLASS.MNEMONIC,
        keyringCount: keyring.index,
        addressCount: adressIndexStart + i,
      });

      contactBookService.updateCacheAlias({
        address: addresses[i],
        name: alias,
      });
    }
  }

  getInitAlianNameStatus = () => preferenceService.getInitAlianNameStatus();
  updateInitAlianNameStatus = () =>
    preferenceService.changeInitAlianNameStatus();
  getLastTimeGasSelection = (
    ...[chainId]: Parameters<typeof preferenceService.getLastTimeGasSelection>
  ) => {
    return preferenceService.getLastTimeGasSelection(chainId);
  };

  updateLastTimeGasSelection = (
    ...[chainId, gas]: Parameters<
      typeof preferenceService.updateLastTimeGasSelection
    >
  ) => {
    return preferenceService.updateLastTimeGasSelection(chainId, gas);
  };
  getIsFirstOpen = () => {
    return preferenceService.getIsFirstOpen();
  };
  getIsNewUser = () => {
    return preferenceService.getIsNewUser();
  };
  updateIsFirstOpen = () => {
    return preferenceService.updateIsFirstOpen();
  };
  listChainAssets = async (address: string) => {
    return await openapiService.listChainAssets(address);
  };

  /**
   * @deprecated use preferenceService.getCustomizedToken instead
   */
  getAddedToken = (address: string) => {
    const tokens = preferenceService.getCustomizedToken();
    return tokens.map((item) => {
      return `${item.chain}:${item.address}`;
    });
  };

  /**
   * @deprecated
   */
  updateAddedToken = (address: string, tokenList: string[]) => {
    return preferenceService.updateAddedToken(address, tokenList);
  };

  getCustomizedToken = preferenceService.getCustomizedToken;

  addCustomizedToken = preferenceService.addCustomizedToken;

  removeCustomizedToken = preferenceService.removeCustomizedToken;

  getBlockedToken = preferenceService.getBlockedToken;

  addBlockedToken = preferenceService.addBlockedToken;

  removeBlockedToken = preferenceService.removeBlockedToken;

  getCollectionStarred = preferenceService.getCollectionStarred;

  addCollectionStarred = preferenceService.addCollectionStarred;

  removeCollectionStarred = preferenceService.removeCollectionStarred;

  reportStats = (
    name: string,
    params: Record<string, string | number | boolean>
  ) => {
    stats.report(name, params);
  };
  getNeedSwitchWalletCheck = preferenceService.getNeedSwitchWalletCheck;

  updateNeedSwitchWalletCheck = preferenceService.updateNeedSwitchWalletCheck;

  revoke = async ({ list }: { list: ApprovalSpenderItemToBeRevoked[] }) => {
    const queue = new PQueue({
      autoStart: true,
      concurrency: 1,
      timeout: undefined,
    });

    const abortRevoke = new AbortController();

    const revokeSummary = summarizeRevoke(list);

    const revokeList: (() => Promise<void>)[] = [
      ...Object.entries(revokeSummary.permit2Revokes).map(
        ([permit2Key, item]) => async () => {
          try {
            const { chainServerId, permit2ContractId } = decodePermit2GroupKey(
              permit2Key
            );
            if (!permit2ContractId) return;
            if (chainServerId !== item.chainServerId) {
              console.warn(`chainServerId ${chainServerId} not match`, item);
              return;
            }

            await this.lockdownPermit2({
              id: permit2ContractId,
              chainServerId: item.chainServerId,
              tokenSpenders: item.tokenSpenders,
            });
          } catch (error) {
            abortRevoke.abort();
            if (!appIsProd) console.error(error);
            console.error('batch revoke permit2 error', item);
          }
        }
      ),
      ...revokeSummary.generalRevokes.map((e) => async () => {
        try {
          if ('nftTokenId' in e) {
            await this.revokeNFTApprove(e);
          } else {
            await this.approveToken(e.chainServerId, e.id, e.spender, 0, {
              ga: {
                category: 'Security',
                source: 'tokenApproval',
              },
            });
          }
        } catch (error) {
          abortRevoke.abort();
          if (!appIsProd) console.error(error);
          console.error('revoke error', e);
        }
      }),
    ];

    const waitAbort = new Promise<void>((resolve) => {
      const onAbort = () => {
        queue.clear();
        resolve();

        abortRevoke.signal.removeEventListener('abort', onAbort);
      };
      abortRevoke.signal.addEventListener('abort', onAbort);
    });

    try {
      await Promise.race([queue.addAll(revokeList), waitAbort]);
    } catch (error) {
      console.log('revoke error', error);
    }
  };

  revokeEIP7702 = async ({ chainList }: { chainList: CHAINS_ENUM[] }) => {
    const queue = new PQueue({
      autoStart: true,
      concurrency: 1,
      timeout: undefined,
    });

    const abortRevoke = new AbortController();

    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));

    const revokeList: (() => Promise<void>)[] = chainList.map(
      (chain) => async () => {
        try {
          const chainId = findChain({
            enum: chain,
          })?.id;
          if (!chainId) throw new Error(t('background.error.invalidChainId'));

          const _nonce = await this.getRecommendNonce({
            from: account.address,
            chainId,
          });

          const nonce = fromHex(_nonce as `0x${string}`, 'number') + 1;

          const tx: any = {
            from: account.address,
            to: account.address,
            chainId: chainId,
            type: 4,
            nonce: _nonce,
          };
          await this.sendRequest({
            $ctx: {
              eip7702Revoke: true,
              eip7702RevokeAuthorization: [[chainId, zeroAddress, nonce]],
            },
            method: 'eth_sendTransaction',
            params: [tx],
          });
        } catch (error) {
          abortRevoke.abort();
          if (!appIsProd) console.error(error);
          console.error(`batch revoke ${chain} 7702 error`);
        }
      }
    );

    const waitAbort = new Promise<void>((resolve) => {
      const onAbort = () => {
        queue.clear();
        resolve();

        abortRevoke.signal.removeEventListener('abort', onAbort);
      };
      abortRevoke.signal.addEventListener('abort', onAbort);
    });

    try {
      await Promise.race([queue.addAll(revokeList), waitAbort]);
    } catch (error) {
      console.log('revoke error', error);
    }
  };

  getSecurityEngineRules = () => {
    return securityEngineService.getRules();
  };

  getSecurityEngineUserData = () => {
    return securityEngineService.getUserData();
  };

  executeSecurityEngine = (actionData: ContextActionData) => {
    return securityEngineService.execute(actionData);
  };

  updateUserData = (data: UserData) => {
    securityEngineService.updateUserData(data);
  };

  addContractWhitelist = (contract: ContractAddress) => {
    securityEngineService.removeContractBlacklistFromAllChains(contract);
    securityEngineService.addContractWhitelist(contract);
  };

  addContractBlacklist = (contract: ContractAddress) => {
    securityEngineService.removeContractWhitelist(contract);
    securityEngineService.addContractBlacklist(contract);
  };

  removeContractWhitelist = (contract: ContractAddress) => {
    securityEngineService.removeContractWhitelist(contract);
  };

  removeContractBlacklist = (contract: ContractAddress) => {
    securityEngineService.removeContractBlacklistFromAllChains(contract);
  };

  addAddressWhitelist = (address: string) => {
    securityEngineService.removeAddressBlacklist(address);
    securityEngineService.addAddressWhitelist(address);
  };

  addAddressBlacklist = (address: string) => {
    securityEngineService.removeAddressWhitelist(address);
    securityEngineService.addAddressBlacklist(address);
  };

  removeAddressWhitelist = (address: string) => {
    securityEngineService.removeAddressWhitelist(address);
  };

  removeAddressBlacklist = (address: string) => {
    securityEngineService.removeAddressBlacklist(address);
  };

  addOriginWhitelist = (origin: string) => {
    securityEngineService.removeOriginBlacklist(origin);
    securityEngineService.addOriginWhitelist(origin);
  };

  addOriginBlacklist = (origin: string) => {
    securityEngineService.removeOriginWhitelist(origin);
    securityEngineService.addOriginBlacklist(origin);
  };

  removeOriginWhitelist = (origin: string) => {
    securityEngineService.removeOriginWhitelist(origin);
  };

  removeOriginBlacklist = (origin: string) => {
    securityEngineService.removeOriginBlacklist(origin);
  };

  ruleEnableStatusChange = (id: string, value: boolean) => {
    if (value) {
      securityEngineService.enableRule(id);
    } else {
      securityEngineService.disableRule(id);
    }
  };

  initQRHardware = async (brand: string) => {
    let keyring;
    let stashKeyringId: number | null = null;
    const keyringType = KEYRING_CLASS.HARDWARE.KEYSTONE;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const keystoneKeyring = keyringService.getKeyringClassForType(
        keyringType
      );
      keyring = new keystoneKeyring({
        bridge: await getKeyringBridge(keyringType),
      });
      stashKeyringId = this.addKeyringToStash(keyring);
    }

    await keyring.setCurrentBrand(brand);
    return stashKeyringId;
  };

  checkQRHardwareAllowImport = async (brand: string) => {
    try {
      const keyring = this._getKeyringByType(KEYRING_CLASS.HARDWARE.KEYSTONE);

      if (!keyring) {
        return {
          allowed: true,
        };
      }

      return keyring.checkAllowImport(brand);
    } catch (e) {
      return {
        allowed: true,
      };
    }
  };

  coboSafeGetAccountAddress = async ({
    chainServerId,
    coboSafeAddress,
  }: {
    chainServerId: string;
    coboSafeAddress: string;
  }) => {
    const provider = await getWeb3Provider({
      chainServerId,
      account: {
        address: '0x0',
        type: 'coboSafe',
        brandName: 'cobo',
      },
    });
    const coboSafe = new CoboSafeAccount(coboSafeAddress, provider);
    return await coboSafe.getAddress();
  };

  coboSafeGetAllDelegates = async ({
    chainServerId,
    coboSafeAddress,
  }: {
    chainServerId: string;
    coboSafeAddress: string;
  }) => {
    const provider = await getWeb3Provider({ chainServerId });
    const coboSafe = new CoboSafeAccount(coboSafeAddress, provider);
    return await coboSafe.getAllDelegates();
  };

  coboSafeBuildTransaction = async ({
    tx,
    chainServerId,
    coboSafeAddress,
    account,
  }: {
    tx: Tx;
    chainServerId: string;
    coboSafeAddress: string;
    account;
  }): Promise<Tx> => {
    await preferenceService.saveCurrentCoboSafeAddress();
    await preferenceService.setCurrentAccount(account);
    const provider = await getWeb3Provider({ chainServerId, account });
    const coboSafe = new CoboSafeAccount(coboSafeAddress, provider);
    const res = await coboSafe.execRawTransaction(
      tx,
      account.address,
      chainServerId
    );
    return res as any;
  };

  coboSafeResetCurrentAccount = async () => {
    preferenceService.resetCurrentCoboSafeAddress();
  };

  coboSafeImport = async ({
    address,
    safeModuleAddress,
    networkId,
  }: {
    address: string;
    networkId: string;
    safeModuleAddress: string;
  }) => {
    let keyring: CoboArgusKeyring, isNewKey;
    const keyringType = KEYRING_CLASS.CoboArgus;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const CoboArgusKeyring = keyringService.getKeyringClassForType(
        keyringType
      );
      keyring = new CoboArgusKeyring({});
      isNewKey = true;
    }

    keyring.setAccountToAdd(address);
    keyring.setAccountDetail(address, {
      address,
      safeModules: [
        {
          networkId,
          address: safeModuleAddress,
        },
      ],
    });
    await keyringService.addNewAccount(keyring);
    if (isNewKey) {
      await keyringService.addKeyring(keyring);
    }

    return this._setCurrentAccountFromKeyring(keyring, -1);
  };

  coboSafeGetAccountDetail = async (address: string) => {
    const keyring = this._getKeyringByType(
      KEYRING_CLASS.CoboArgus
    ) as CoboArgusKeyring;
    if (!keyring) {
      return;
    }
    const detail = await keyring.getAccountDetail(address);
    const networkId = detail.safeModules[0].networkId;
    const safeModuleAddress = detail.safeModules[0].address;

    const provider = await getWeb3Provider({
      chainServerId: networkId,
    });
    const cobo = new CoboSafeAccount(address, provider);
    const isModuleEnabled = await cobo.checkIsModuleEnabled({
      safeAddress: address,
      coboSafeAddress: safeModuleAddress,
    });

    return {
      safeModuleAddress,
      networkId,
      address: detail.address,
      isModuleEnabled,
    };
  };

  updateNotificationWinProps = notificationService.updateNotificationWinProps;

  checkNeedDisplayBlockedRequestApproval =
    notificationService.checkNeedDisplayBlockedRequestApproval;

  checkNeedDisplayCancelAllApproval =
    notificationService.checkNeedDisplayCancelAllApproval;

  blockedDapp = () => {
    notificationService.blockedDapp();
    this.rejectAllApprovals();
  };

  walletConnectScanAccount = async () => {
    let keyring: WalletConnectKeyring, isNewKey;
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const WalletConnect = keyringService.getKeyringClassForType(keyringType);
      keyring = new WalletConnect(GET_WALLETCONNECT_CONFIG());
      isNewKey = true;
    }

    if (isNewKey) {
      this.addKeyringToStash(keyring);
    }

    keyring.on('scanAccount', (payload) => {
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.WALLETCONNECT.SCAN_ACCOUNT,
        params: payload,
      });
    });

    return await keyring.scanAccount();
  };

  setStatsData = (data: any) => {
    notificationService.setStatsData(data);
  };

  getStatsData = () => {
    return notificationService.getStatsData();
  };

  _currentCoinbaseStashId?: undefined | null | number;

  connectCoinbase = async () => {
    let keyring: CoinbaseKeyring, isNewKey;
    const keyringType = KEYRING_CLASS.Coinbase;
    const curStashId = this._currentCoinbaseStashId;
    try {
      if (curStashId !== null && curStashId !== undefined) {
        keyring = stashKeyrings[curStashId];
        isNewKey = false;
      } else {
        keyring = this._getKeyringByType(keyringType);
      }
    } catch {
      const CoinbaseKeyring = keyringService.getKeyringClassForType(
        keyringType
      );
      keyring = new CoinbaseKeyring();
      isNewKey = true;
    }

    let stashId = curStashId;
    if (isNewKey) {
      stashId = this.addKeyringToStash(keyring);

      eventBus.addEventListener(
        EVENTS.WALLETCONNECT.INIT,
        ({ address, type }) => {
          if (type !== KEYRING_CLASS.Coinbase) {
            return;
          }
          const uri = keyring.connect({
            address,
          });

          eventBus.emit(EVENTS.broadcastToUI, {
            method: EVENTS.WALLETCONNECT.INITED,
            params: { uri },
          });
        }
      );

      keyring.on('message', (data) => {
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

    const uri = await keyring.connect();

    this._currentCoinbaseStashId = stashId;
    return { uri };
  };

  importCoinbase = async (address: string) => {
    let keyring: CoinbaseKeyring, isNewKey;
    const keyringType = KEYRING_CLASS.Coinbase;
    const stashId = this._currentCoinbaseStashId;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      if (stashId !== null && stashId !== undefined) {
        keyring = stashKeyrings[stashId];
      } else {
        const coinbaseKeyring = keyringService.getKeyringClassForType(
          keyringType
        );
        keyring = new coinbaseKeyring();
      }
      isNewKey = true;
    }

    keyring.setAccountToAdd(address);

    if (isNewKey) {
      await keyringService.addKeyring(keyring);
    }

    await keyringService.addNewAccount(keyring);
    return this._setCurrentAccountFromKeyring(keyring, -1);
  };

  /**
   * disable some functions when Rabby server is busy
   * disable approval management and transaction history when level is 1
   * disable total balance refresh and level 1 content when level is 2
   */
  getAPIConfig = cached(
    'getAPIConfig',
    async () => {
      interface IConfig {
        data: {
          level: number;
          authorized: {
            enable: boolean;
          };
          balance: {
            enable: boolean;
          };
          history: {
            enable: boolean;
          };
        };
      }
      try {
        const config = await fetch(
          'https://static.debank.com/rabby/config.json'
        );
        const { data } = (await config.json()) as IConfig;
        return data.level;
      } catch (e) {
        return 0;
      }
    },
    { timeout: 10000, maxSize: 0 }
  ).fn;

  rabbyPointVerifyAddress = async (params?: {
    code?: string;
    claimSnapshot?: boolean;
    claimNumber?: number;
    // text: string;
  }) => {
    const { code, claimSnapshot } = params || {};
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    let claimText = '';
    let verifyText = '';

    if (claimSnapshot) {
      claimText = (
        await wallet.openapi.getRabbyClaimTextV2({
          id: account?.address,
          invite_code: code,
        })
      )?.text; //`${account?.address} Claims Rabby Points`;
    } else {
      verifyText = (
        await wallet.openapi.getRabbySignatureTextV2({
          id: account?.address,
        })
      )?.text; //`Rabby Wallet wants you to sign in with your address:\n${account?.address}`;
    }

    const msg = `0x${Buffer.from(
      claimSnapshot ? claimText : verifyText,
      'utf-8'
    ).toString('hex')}`;

    const signature = await this.sendRequest<string>({
      method: 'personal_sign',
      params: [msg, account.address],
    });

    this.setRabbyPointsSignature(account.address, signature);
    if (claimSnapshot) {
      try {
        await wallet.openapi.claimRabbyPointsSnapshotV2({
          id: account?.address,
          invite_code: code,
          signature,
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      this.setPageStateCache({
        path: '/rabby-points',
        params: {},
        states: {},
      });
    }
    return signature;
  };

  /**
   * 执行Gas Account登录的核心流程
   * @param account 账户信息
   * @returns 登录结果，包含签名和是否成功
   */
  private async executeGasAccountLogin(
    account: Account
  ): Promise<{
    signature: string;
    success: boolean;
    result?: any;
  }> {
    const currentAccount = await preferenceService.getCurrentAccount();
    if (!currentAccount) {
      throw new Error(t('background.error.noCurrentAccount'));
    }

    const resumeAccount = async () => {
      await this.changeAccount(currentAccount);
    };

    if (
      currentAccount.address !== account.address ||
      currentAccount.type !== account.type ||
      currentAccount.brandName !== account.brandName
    ) {
      await this.changeAccount(account);
    }

    const { text } = await wallet.openapi.getGasAccountSignText(
      account.address
    );
    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.GAS_ACCOUNT.CLOSE_WINDOW,
    });
    const signature = await this.sendRequest<string>({
      method: 'personal_sign',
      params: [text, account.address],
    });

    if (!signature) {
      await resumeAccount();
      return { signature: '', success: false };
    }

    const result = await pRetry(
      async () =>
        wallet.openapi.loginGasAccount({
          sig: signature,
          account_id: account.address,
        }),
      {
        retries: 2,
      }
    );
    await resumeAccount();
    return { signature, success: result?.success || false, result };
  }

  private async saveGasAccountLoginState(signature: string, account: Account) {
    await gasAccountService.setGasAccountSig(signature, account);
    await pageStateCacheService.clear();
    await pageStateCacheService.set({
      path: '/gas-account',
      states: {},
    });
  }

  signGasAccount = async (account: Account, isClaimGift: boolean = false) => {
    const { signature, success } = await this.executeGasAccountLogin(account);
    if (success && signature) {
      await this.saveGasAccountLoginState(signature, account);
    }
    if (isClaimGift) {
      await this.claimGasAccountGift(account.address);
    }
    this.markGiftAsClaimed();
    return signature;
  };

  topUpGasAccount = async ({
    to,
    chainServerId,
    tokenId,
    rawAmount,
    amount,
  }: {
    to: string;
    chainServerId: string;
    tokenId: string;
    rawAmount: string;
    amount: number;
  }) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));

    const { sig, accountId } = this.getGasAccountSig();

    await this.sendToken({
      to,
      chainServerId,
      tokenId,
      rawAmount,
      $ctx: {
        ga: {
          category: 'GasAccount',
          action: 'deposit',
          rechargeGasAccount: {
            amount,
            sig: sig!,
            account_id: accountId!,
            user_addr: account?.address,
            chain_id: chainServerId,
          },
        },
      },
    });
  };

  addCustomTestnet = async (
    chain: Parameters<typeof customTestnetService.add>[0],
    ctx?: {
      ga?: {
        source?: string;
      };
    }
  ) => {
    const source = ctx?.ga?.source || 'setting';

    const res = await customTestnetService.add(chain);
    if (!('error' in res)) {
      matomoRequestEvent({
        category: 'Custom Network',
        action: 'Success Add Network',
        label: `${source}_${String(chain.id)}`,
      });

      ga4.fireEvent('Add_CustomNetwork', {
        event_category: 'Custom Network',
      });
    }
    return res;
  };
  updateCustomTestnet = customTestnetService.update;
  removeCustomTestnet = (chainId: number) => {
    const chain = findChain({
      id: chainId,
    });
    if (chain?.enum) {
      RPCService.removeCustomRPC(chain.enum);
    }
    customTestnetService.remove(chainId);
  };
  getCustomTestnetList = customTestnetService.getList;

  getCustomTestnetNonce = async ({
    address,
    chainId,
  }: {
    address: string;
    chainId: number;
  }) => {
    const count = await customTestnetService.getTransactionCount({
      address,
      chainId,
      blockTag: 'latest',
    });
    const localNonce = (await wallet.getNonceByChain(address, chainId)) || 0;
    return BigNumber.max(count, localNonce).toNumber();
  };

  estimateCustomTestnetGas = customTestnetService.estimateGas;

  getCustomTestnetGasPrice = customTestnetService.getGasPrice;

  getCustomBlockGasLimit = customTestnetService.getBlockGasLimit;

  getCustomTestnetGasMarket = customTestnetService.getGasMarket;

  getCustomTestnetToken = customTestnetService.getToken;
  removeCustomTestnetToken = customTestnetService.removeToken;
  addCustomTestnetToken = customTestnetService.addToken;
  getCustomTestnetTokenList = customTestnetService.getTokenList;
  isAddedCustomTestnetToken = customTestnetService.hasToken;
  getCustomTestnetTx = customTestnetService.getTx;
  getCustomTestnetTxReceipt = customTestnetService.getTransactionReceipt;
  getCustomTestnetLogos = customTestnetService.fetchLogos;
  // getCustomTestnetTokenListWithBalance = customTestnetService.getTokenListWithBalance;

  getUsedCustomTestnetChainList = async () => {
    const ids = new Set<number>();
    Object.values(transactionHistoryService.store.transactions).forEach(
      (item) => {
        Object.values(item).forEach((txGroup) => {
          ids.add(txGroup.chainId);
        });
      }
    );
    const chainList = Array.from(ids).filter(
      (id) =>
        !findChain({
          id,
        })
    );
    const res = await openapiService.getChainListByIds({
      ids: chainList.join(','),
    });
    return res;
  };

  parseCustomNetworkTx = customTestnetService.parseTx;

  hasPrivateKeyInWallet = async (address: string) => {
    let pk: any = null;
    try {
      pk = await keyringService.getKeyringForAccount(
        address,
        KEYRING_TYPE.SimpleKeyring
      );
    } catch (e) {
      // just ignore the error
    }
    let mnemonic: any = null;
    try {
      mnemonic = await keyringService.getKeyringForAccount(
        address,
        KEYRING_TYPE.HdKeyring
      );
    } catch (e) {
      // just ignore the error
    }
    if (!pk && !mnemonic) return false;
    return pk?.type || mnemonic?.type;
  };

  syncMainnetChainList = syncChainService.syncMainnetChainList;

  tryUnlock = async () => {
    await keyringService.tryUnlock();
    this.syncPopupIcon();
  };

  syncPopupIcon = () => {
    if (!this.isBooted()) {
      setPopupIcon('default');
    } else if (this.isUnlocked()) {
      const hasOtherProvider = preferenceService.getHasOtherProvider();
      const isDefaultWallet = preferenceService.getIsDefaultWallet();
      if (!hasOtherProvider) {
        setPopupIcon('default');
      } else {
        setPopupIcon(isDefaultWallet ? 'rabby' : 'metamask');
      }
    } else {
      setPopupIcon('locked');
    }
  };
  setIsHideEcologyNoticeDict = preferenceService.setIsHideEcologyNoticeDict;

  getRecommendGas = getRecommendGas;
  getRecommendNonce = getRecommendNonce;
  ethSendTransaction = async (
    ...args: Parameters<typeof providerController.ethSendTransaction>
  ) => {
    try {
      const res = await providerController.ethSendTransaction(...args);
      return res;
    } catch (e) {
      const signingTxId = args?.[0]?.approvalRes?.signingTxId;
      if (signingTxId != null) {
        this.removeSigningTx(signingTxId);
      }

      throw e;
    }
  };
  ethPersonalSign = async (
    ...args: Parameters<typeof providerController.personalSign>
  ) => {
    return providerController.personalSign(...args);
  };

  ethSignTypedDataV4 = async (
    ...args: Parameters<typeof providerController.ethSignTypedDataV4>
  ) => {
    return providerController.ethSignTypedDataV4(...args);
  };

  tryOpenOrActiveUserGuide = async () => {
    if (this.isBooted()) {
      return false;
    }
    await userGuideService.activeUserGuide();
    return true;
  };

  uninstalledSyncStatus = uninstalledService.syncStatus;

  gasMarketV2 = async (
    params:
      | {
          chain: Chain;
          tx: Tx;
          customGas?: number;
        }
      | {
          chainId: string;
          customGas?: number;
        }
  ) => {
    let chainId: string;
    let tx: Tx | undefined;

    if ('tx' in params) {
      chainId = params.chain.serverId;

      if (params?.chain && params?.chain.enum === CHAINS_ENUM.LINEA) {
        if (params.tx.nonce === undefined) {
          params.tx.nonce = await this.getRecommendNonce({
            from: params.tx.from,
            chainId: params.chain.id,
          });
        }

        if (params.tx.gasPrice === undefined || params.tx.gasPrice === '') {
          params.tx.gasPrice = '0x0';
        }
        if (params.tx.gas === undefined || params.tx.gas === '') {
          params.tx.gas = '0x0';
        }
        if (params.tx.data === undefined || params.tx.data === '') {
          params.tx.data = '0x';
        }
        tx = {
          chainId: params.tx.chainId,
          data: params.tx.data,
          from: params.tx.from,
          gas: params.tx.gas,
          nonce: params.tx.nonce,
          to: params.tx.to,
          value: params.tx.value,
          gasPrice: params.tx.gasPrice,
        };
      }
    } else {
      chainId = params.chainId;
    }

    return openapiService.gasMarketV2({
      customGas: params.customGas,
      chainId,
      tx,
    });
  };

  changeDappProvider = ({
    origin,
    name,
    icon,
    rdns,
  }: {
    origin: string;
    name: string;
    icon: string;
    rdns: string;
  }) => {
    const site = permissionService.getSite(origin);
    if (site) {
      permissionService.setSite({
        ...site,
        rdns,
        isConnected: false,
      });
    } else {
      permissionService.setSite({
        origin,
        name,
        icon,
        chain: CHAINS_ENUM.ETH,
        isSigned: false,
        isConnected: false,
        isTop: false,
        rdns,
      });
    }
    sessionService.broadcastEvent(
      'rabby:providerChanged',
      {
        rdns,
      },
      origin,
      true
    );
  };
  savedUnencryptedKeyringData = async () =>
    keyringService.savedUnencryptedKeyringData();

  hasEncryptedKeyringData = async () =>
    keyringService.hasEncryptedKeyringData();

  hasUnencryptedKeyringData = async () =>
    keyringService.hasUnencryptedKeyringData();

  resetPassword = async (password: string) =>
    keyringService.resetPassword(password);

  resetBooted = async () => keyringService.resetBooted();

  getUnencryptedKeyringTypes = async () =>
    keyringService.getUnencryptedKeyringTypes();

  getSyncDataString = async (filteredAccounts: Account[]) => {
    const { vault, accounts } = await keyringService.getSyncVault(
      filteredAccounts
    );
    const whitelist = await this.getWhitelist();
    const highligtedAddresses = await this.getHighlightedAddresses();
    const alianNames = await this.getAllAlianName();

    const filteredWhitelist = whitelist.filter((item) => {
      return accounts.some((account) => isSameAddress(account, item));
    });
    const filteredHighligtedAddresses = highligtedAddresses.filter((item) => {
      return accounts.some((account) => isSameAddress(account, item.address));
    });
    const filteredAlianNames = alianNames.filter((item) => {
      return accounts.some(
        (account) => item.address && isSameAddress(account, item.address)
      );
    });

    return JSON.stringify({
      vault: JSON.parse(vault),
      whitelist: filteredWhitelist,
      highligtedAddresses: filteredHighligtedAddresses,
      alianNames: filteredAlianNames,
    });
  };

  setRateGuideLastExposure: typeof preferenceService.setRateGuideLastExposure = async (
    ...args
  ) => {
    return preferenceService.setRateGuideLastExposure(...args);
  };

  /**
   * 领取gift奖励
   * @param address 地址
   * @returns 是否成功领取
   */
  claimGasAccountGift = async (address: string): Promise<boolean> => {
    try {
      // 获取gas account的签名信息
      const { sig, accountId } = this.getGasAccountSig();
      if (!sig || !accountId) {
        console.error('Gas account not logged in, cannot claim gift');
        return false;
      }

      // 调用API领取gift
      const result = await this.openapi.claimGasAccountGift({
        sig,
        id: accountId,
      });
      if (result.success) {
        // 标记为已领取
        this.markGiftAsClaimed();
        this.setHasAnyAccountClaimedGift(true);
        return true;
      } else {
        console.error('API returned success: false for gift claim');
        return false;
      }
    } catch (error) {
      console.error('Failed to claim gas account gift:', error);
      return false;
    }
  };

  /**
   * 标记地址已领取gift（内部使用）
   */
  markGiftAsClaimed = () => {
    gasAccountService.markGiftAsClaimed();
  };

  /**
   * 获取全局标记：是否有任何账号已经领取过gift
   * @returns 是否有任何账号已经领取过gift
   */
  getHasAnyAccountClaimedGift = () => {
    return gasAccountService.getHasAnyAccountClaimedGift();
  };

  /**
   * 设置全局标记：是否有任何账号已经领取过gift
   * @param hasClaimed 是否有任何账号已经领取过gift
   */
  setHasAnyAccountClaimedGift = (hasClaimed: boolean) => {
    gasAccountService.setHasAnyAccountClaimedGift(hasClaimed);
  };

  createPerpsAgentWallet = async (masterWallet: string) => {
    return perpsService.createAgentWallet(masterWallet);
  };
  setPerpsCurrentAccount = perpsService.setCurrentAccount;
  getPerpsCurrentAccount = perpsService.getCurrentAccount;
  getPerpsLastUsedAccount = perpsService.getLastUsedAccount;
  getAgentWalletPreference = async (masterWallet: string) => {
    return perpsService.getAgentWalletPreference(masterWallet);
  };
  getPerpsFavoritedCoins = perpsService.getPerpsFavoritedCoins;
  updatePerpsAgentWalletPreference = perpsService.updateAgentWalletPreference;
  setSendApproveAfterDeposit = perpsService.setSendApproveAfterDeposit;
  getSendApproveAfterDeposit = async (masterAddress: string) => {
    return perpsService.getSendApproveAfterDeposit(masterAddress);
  };
  setHasDoneNewUserProcess = perpsService.setHasDoneNewUserProcess;
  getHasDoneNewUserProcess = perpsService.getHasDoneNewUserProcess;
  getPerpsAgentWallet = async (masterWallet: string) => {
    return perpsService.getAgentWallet(masterWallet);
  };
  getOrCreatePerpsAgentWallet = async (masterWallet: string) => {
    const res = await perpsService.getAgentWallet(masterWallet);
    if (!res) {
      const resp = await this.createPerpsAgentWallet(masterWallet);
      return {
        vault: resp.vault,
        agentAddress: resp.agentAddress,
      };
    } else {
      return {
        vault: res.vault,
        agentAddress: res.preference.agentAddress,
      };
    }
  };
  getPerpsInviteConfig = perpsService.getInviteConfig;
  setPerpsInviteConfig = perpsService.setInviteConfig;

  signPerpsSendSetReferrer = async ({
    address,
    typedData,
    nonce,
    action,
  }: {
    address: string;
    typedData: Record<string, any>;
    action: Record<string, any>;
    nonce: number;
  }) => {
    const signature = await wallet.sendRequest<string>({
      method: 'eth_signTypedData_v4',
      params: [address, JSON.stringify(typedData)],
    });
    if (!signature) {
      throw new Error('User rejected signing');
    }
    const sdk = getPerpsSDK();
    sdk.initAccount(address);
    return sdk.exchange?.sendSetReferrer({
      action: action,
      nonce: nonce,
      signature: signature,
    });
  };

  signTextCreateHistory = (
    params: Parameters<typeof signTextHistoryService.createHistory>[0]
  ) => {
    signTextHistoryService.createHistory(params);
  };

  emitEvent = (method: string, params?: any) => {
    eventBus.emit(EVENTS.broadcastToUI, {
      method: method,
      params,
    });
  };

  setReportGasLevel = miscService.setCurrentGasLevel;
  getReportGasLevel = miscService.getCurrentGasLevel;
  checkIsApprovedForAll = async ({
    owner,
    operator,
    contractAddress,
    chainId,
  }: {
    owner: string;
    operator: string;
    contractAddress: string;
    chainId: number;
  }) => {
    const chain = findChain({ id: chainId });
    if (!chain) {
      throw new Error('wrong chain');
    }
    const encodedData = encodeFunctionData({
      abi: ERC721ABI,
      functionName: 'isApprovedForAll',
      args: [owner as `0x${string}`, operator as `0x${string}`],
    });
    const res = await this.requestETHRpc(
      {
        method: 'eth_call',
        params: [
          {
            data: encodedData,
            to: contractAddress,
          },
          'latest',
        ],
      },
      chain.serverId
    );

    const value = decodeFunctionResult({
      abi: ERC721ABI,
      functionName: 'isApprovedForAll',
      data: res,
    });

    return value;
  };

  buildSetApprovedForAllTx = async ({
    from,
    chainId,
    operator,
    contractAddress,
  }: {
    from: string;
    chainId: number;
    operator: string;
    contractAddress: string;
  }) => {
    const encodedData = encodeFunctionData({
      abi: ERC721ABI,
      functionName: 'setApprovalForAll',
      args: [operator as `0x${string}`, true],
    });

    return {
      from,
      chainId,
      data: encodedData,
      to: contractAddress,
    };
  };

  getSeaportCounter = async ({
    chainId,
    address,
  }: {
    chainId: number;
    address: string;
  }) => {
    const chain = findChain({ id: chainId });
    if (!chain) {
      throw new Error('wrong chain');
    }
    const data = encodeFunctionData({
      abi: SeaportABI,
      functionName: 'getCounter',
      args: [address as `0x${string}`],
    });

    const res = await this.requestETHRpc(
      {
        method: 'eth_call',
        params: [
          {
            data: data,
            to: CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
          },
          'latest',
        ],
      },
      chain.serverId
    );

    const value = decodeFunctionResult({
      abi: SeaportABI,
      functionName: 'getCounter',
      data: res,
    });
    return Number(value);
  };

  buildCancelNFTListTx = ({
    address,
    chainId,
    orders,
  }: {
    address: string;
    chainId: number;
    orders: OrderComponents[];
  }) => {
    try {
      const data = encodeFunctionData({
        abi: SeaportABI,
        functionName: 'cancel',
        args: [orders as any],
      });

      return {
        chainId,
        from: address,
        to: CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
        data,
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  buildCreateListingTypedData = async (
    parmas: Parameters<typeof buildCreateListingTypedData>[0]
  ) => {
    const counter =
      parmas.counter ||
      (await this.getSeaportCounter({
        chainId: parmas.chainId,
        address: parmas.sellerAddress,
      }));
    return buildCreateListingTypedData({ ...parmas, counter });
  };

  buildAcceptNFTOfferTx = async ({
    address,
    chainId,
    order,
    collectionId,
    innerId,
    quantity,
    isIncludeCreatorFee,
  }: {
    address: string;
    chainId: number;
    collectionId: string;
    innerId: string;
    order: NonNullable<NFTDetail['best_offer_order']>;
    quantity?: number;
    isIncludeCreatorFee?: boolean;
  }) => {
    const chain = findChain({
      id: chainId,
    });
    if (!chain) {
      throw new Error('chain not found');
    }
    const res = await this.openapi.prepareAcceptNFTOffer({
      chain_id: chain?.serverId,
      order_hash: order.order_hash,
      fulfiller: address,
      collection_id: collectionId,
      inner_id: innerId,
      quantity,
      include_optional_creator_fees: isIncludeCreatorFee,
    });
    const fulfillmentData = res.data;
    const transaction = fulfillmentData.fulfillment_data.transaction;
    const inputData = transaction.input_data;
    const FULFILL_BASIC_ORDER_ALIAS = 'fulfillBasicOrder_efficient_6GL6yc';
    // Extract function name and build parameters array in correct order
    const rawFunctionName = transaction.function.split('(')[0];
    const functionName =
      rawFunctionName === FULFILL_BASIC_ORDER_ALIAS
        ? 'fulfillBasicOrder'
        : rawFunctionName;
    let params: unknown[];

    // Order parameters based on the function being called
    if (
      functionName === 'fulfillAdvancedOrder' &&
      'advancedOrder' in inputData
    ) {
      params = [
        inputData.advancedOrder,
        inputData.criteriaResolvers || [],
        inputData.fulfillerConduitKey ||
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        inputData.recipient,
      ];
    } else if (
      (functionName === 'fulfillBasicOrder' ||
        rawFunctionName === FULFILL_BASIC_ORDER_ALIAS) &&
      'basicOrderParameters' in inputData
    ) {
      params = [inputData.basicOrderParameters];
    } else if (functionName === 'fulfillOrder' && 'order' in inputData) {
      params = [
        inputData.order,
        inputData.fulfillerConduitKey ||
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        inputData.recipient,
      ];
    } else {
      // Fallback: try to use values in object order
      params = Object.values(inputData);
    }
    try {
      const encodedData = encodeFunctionData({
        abi: SeaportABI,
        functionName: functionName as any,
        args: params as any,
      });

      // todo check this
      return {
        chainId,
        from: address,
        to: transaction.to,
        value: transaction.value,
        data: encodedData,
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  getRpcTxReceipt = transactionHistoryService.getRpcTxReceipt;

  resetPerpsStore = perpsService.resetStore;

  fetchRemoteConfig = async (): Promise<{
    switches?: {
      isPerpsInviteDisabled?: boolean;
    };
  }> => {
    const url = appIsProd
      ? 'https://download.rabby.io/downloads/wallet-config/rabby-extension.json'
      : 'https://download.rabby.io/downloads/wallet-config-reg/rabby-extension.json';

    return http.get(url).then((res) => res.data);
  };
}

const wallet = new WalletController();
autoLockService.onAutoLock = async () => {
  await wallet.lockWallet();
};
// check if wallet needs to lock after sw re-active
autoLockService.syncAutoLockAt();

export default wallet;
