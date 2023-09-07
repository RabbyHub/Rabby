import * as ethUtil from 'ethereumjs-util';
import Wallet, { thirdparty } from 'ethereumjs-wallet';
import { ethErrors } from 'eth-rpc-errors';
import * as bip39 from 'bip39';
import { ethers, Contract } from 'ethers';
import { groupBy, uniq } from 'lodash';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import * as optimismContracts from '@eth-optimism/contracts';
import {
  keyringService,
  preferenceService,
  notificationService,
  permissionService,
  sessionService,
  openapiService,
  pageStateCacheService,
  transactionHistoryService,
  contactBookService,
  signTextHistoryService,
  whitelistService,
  swapService,
  RPCService,
  unTriggerTxCounter,
  contextMenuService,
  securityEngineService,
} from 'background/service';
import buildinProvider, {
  EthereumProvider,
} from 'background/utils/buildinProvider';
import { openIndexPage } from 'background/webapi/tab';
import { CacheState } from 'background/service/pageStateCache';
import { KEYRING_CLASS, DisplayedKeryring } from 'background/service/keyring';
import providerController from './provider/controller';
import BaseController from './base';
import {
  KEYRING_WITH_INDEX,
  CHAINS,
  INTERNAL_REQUEST_ORIGIN,
  EVENTS,
  BRAND_ALIAN_TYPE_TEXT,
  WALLET_BRAND_CONTENT,
  CHAINS_ENUM,
  KEYRING_TYPE,
  GNOSIS_SUPPORT_CHAINS,
  INTERNAL_REQUEST_SESSION,
} from 'consts';
import { ERC20ABI } from 'consts/abi';
import { Account, IHighlightedAddress } from '../service/preference';
import { ConnectedSite } from '../service/permission';
import {
  TokenItem,
  TotalBalanceResponse,
  Tx,
  testnetOpenapiService,
} from '../service/openapi';
import {
  ContextActionData,
  ContractAddress,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import DisplayKeyring from '../service/keyring/display';
import provider from './provider';
import WalletConnectKeyring from '@rabby-wallet/eth-walletconnect-keyring';
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
import { generateAliasName } from '@/utils/account';
import buildUnserializedTransaction from '@/utils/optimism/buildUnserializedTransaction';
import BigNumber from 'bignumber.js';
import * as Sentry from '@sentry/browser';
import { addHexPrefix, unpadHexString } from 'ethereumjs-util';
import PQueue from 'p-queue';
import { ProviderRequest } from './provider/type';
import { QuoteResult } from '@rabby-wallet/rabby-swap/dist/quote';
import transactionWatcher from '../service/transactionWatcher';
import Safe from '@rabby-wallet/gnosis-sdk';
import { Chain } from '@debank/common';
import { isAddress } from 'web3-utils';
import { findChainByEnum } from '@/utils/chain';
import { cached } from '../utils/cache';
import { createSafeService } from '../utils/safe';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { autoLockService } from '../service/autoLock';
import { t } from 'i18next';
import { getWeb3Provider } from './utils';
import { CoboSafeAccount } from '@/utils/cobo-agrus-sdk/cobo-agrus-sdk';
import CoboArgusKeyring from '../service/keyring/eth-cobo-argus-keyring';

const stashKeyrings: Record<string | number, any> = {};

const MAX_UNSIGNED_256_INT = new BigNumber(2).pow(256).minus(1).toString(10);

export class WalletController extends BaseController {
  openapi = openapiService;
  testnetOpenapi = testnetOpenapiService;

  /* wallet */
  boot = (password) => keyringService.boot(password);
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

  removeWhitelist = async (password: string, address: string) => {
    await this.verifyPassword(password);
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

  requestETHRpc = (data: { method: string; params: any }, chainId: string) => {
    return providerController.ethRpc(
      {
        data,
        session: INTERNAL_REQUEST_SESSION,
      },
      chainId
    );
  };

  sendRequest = <T = any>(data: ProviderRequest['data']) => {
    return provider<T>({
      data,
      session: INTERNAL_REQUEST_SESSION,
    });
  };

  resendSign = () => {
    notificationService.callCurrentRequestDeferFn();
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
    const chainId = Object.values(CHAINS)
      .find((chain) => chain.serverId === chainServerId)
      ?.id.toString();
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
    const chain = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainServerId
    );
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
        unpadHexString(
          ((abiCoder as unknown) as AbiCoder).encodeParameter(
            'uint256',
            rawAmount
          )
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
    }: {
      chain: CHAINS_ENUM;
      quote: QuoteResult;
      needApprove: boolean;
      spender: string;
      pay_token_id: string;
      unlimited: boolean;
      gasPrice?: number;
      shouldTwoStepApprove: boolean;

      postSwapParams?: Omit<
        Parameters<OpenApiService['postSwap']>[0],
        'tx_id' | 'tx'
      >;
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
          { isSwap: true }
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
          unlimited ? MAX_UNSIGNED_256_INT : quote.fromTokenAmount,
          {
            ga: {
              ...$ctx?.ga,
              source: 'approvalAndSwap|tokenApproval',
            },
          },
          gasPrice,
          { isSwap: true }
        );
        unTriggerTxCounter.decrease();
      }

      if (postSwapParams) {
        swapService.addTx(chain, quote.tx.data, postSwapParams);
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
          },
        ],
      });
      unTriggerTxCounter.decrease();
    } catch (e) {
      unTriggerTxCounter.reset();
    }
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
    extra?: { isSwap: boolean }
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainId = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainServerId
    )?.id;
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
    await this.sendRequest({
      $ctx,
      method: 'eth_sendTransaction',
      params: [tx],
    });
  };

  fetchEstimatedL1Fee = async (
    txMeta: Record<string, any> & {
      txParams: any;
    },
    chain = CHAINS_ENUM.OP
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    buildinProvider.currentProvider.currentAccount = account.address;
    buildinProvider.currentProvider.currentAccountType = account.type;
    buildinProvider.currentProvider.currentAccountBrand = account.brandName;
    buildinProvider.currentProvider.chainId = CHAINS[chain].network;

    const provider = new ethers.providers.Web3Provider(
      buildinProvider.currentProvider
    );

    const signer = provider.getSigner();
    const OVMGasPriceOracle = optimismContracts
      .getContractFactory('OVM_GasPriceOracle')
      .attach(optimismContracts.predeploys.OVM_GasPriceOracle);
    const abi = JSON.parse(
      OVMGasPriceOracle.interface.format(
        ethers.utils.FormatTypes.json
      ) as string
    );

    const contract = new Contract(OVMGasPriceOracle.address, abi, signer);
    const serializedTransaction = buildUnserializedTransaction(
      txMeta
    ).serialize();

    const res = await contract.getL1Fee(serializedTransaction);
    return res.toHexString();
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
    const chainId = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainServerId
    )?.id;
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
              [account.address, to, tokenId] as any
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
      tokenId,
      isApprovedForAll,
    }: {
      chainServerId: string;
      contractId: string;
      spender: string;
      abi: 'ERC721' | 'ERC1155' | '';
      isApprovedForAll: boolean;
      tokenId: string | null | undefined;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error(t('background.error.noCurrentAccount'));
    const chainId = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainServerId
    )?.id;
    if (!chainId) throw new Error(t('background.error.invalidChainId'));
    if (abi === 'ERC721') {
      if (isApprovedForAll) {
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
        });
      } else {
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
                ['0x0000000000000000000000000000000000000000', tokenId] as any
              ),
            },
          ],
        });
      }
    } else if (abi === 'ERC1155') {
      await this.sendRequest({
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
      });
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
  };
  isUnlocked = () => keyringService.memStore.getState().isUnlocked;

  lockWallet = async () => {
    await keyringService.setLocked();
    sessionService.broadcastEvent('accountsChanged', []);
    sessionService.broadcastEvent('lock');
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

  setPopupOpen = (isOpen) => {
    preferenceService.setPopupOpen(isOpen);
  };
  openIndexPage = openIndexPage;

  hasPageStateCache = () => pageStateCacheService.has();
  getPageStateCache = () => {
    if (!this.isUnlocked()) return null;
    return pageStateCacheService.get();
  };
  clearPageStateCache = () => pageStateCacheService.clear();
  setPageStateCache = (cache: CacheState) => pageStateCacheService.set(cache);

  getIndexByAddress = (address: string, type: string) => {
    const hasIndex = KEYRING_WITH_INDEX.includes(type);
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

  private getTotalBalanceCached = cached(async (address) => {
    const data = await openapiService.getTotalBalance(address);
    preferenceService.updateAddressBalance(address, data);
    return data;
    // 3 mins
  });

  private getTestnetTotalBalanceCached = cached(async (address) => {
    const testnetData = await testnetOpenapiService.getTotalBalance(address);
    preferenceService.updateTestnetAddressBalance(address, testnetData);
    return testnetData;
  });

  getAddressBalance = async (
    address: string,
    force = false,
    isTestnet = false
  ) => {
    if (isTestnet) {
      return this.getTestnetTotalBalanceCached([address], address, force);
    }
    return this.getTotalBalanceCached([address], address, force);
  };

  getAddressCacheBalance = (address: string | undefined, isTestnet = false) => {
    if (!address) return null;
    if (isTestnet) {
      return preferenceService.getTestnetAddressBalance(address);
    }
    return preferenceService.getAddressBalance(address);
  };

  private getNetCurveCached = cached(async (address) => {
    return openapiService.getNetCurve(address);
  });

  getNetCurve = (address, force = false) => {
    return this.getNetCurveCached([address], address, force);
  };

  setHasOtherProvider = (val: boolean) =>
    preferenceService.setHasOtherProvider(val);
  getHasOtherProvider = () => preferenceService.getHasOtherProvider();

  getExternalLinkAck = () => preferenceService.getExternalLinkAck();

  setExternalLinkAck = (ack) => preferenceService.setExternalLinkAck(ack);

  getLocale = () => preferenceService.getLocale();
  setLocale = (locale: string) => preferenceService.setLocale(locale);

  getLastTimeSendToken = (address: string) =>
    preferenceService.getLastTimeSendToken(address);
  setLastTimeSendToken = (address: string, token: TokenItem) =>
    preferenceService.setLastTimeSendToken(address, token);

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

  getLastSelectedSwapChain = swapService.getSelectedChain;
  setLastSelectedSwapChain = swapService.setSelectedChain;
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

  setCustomRPC = RPCService.setRPC;
  removeCustomRPC = RPCService.removeCustomRPC;
  getAllCustomRPC = RPCService.getAllRPC;
  getCustomRpcByChain = RPCService.getRPCByChain;
  pingCustomRPC = RPCService.ping;
  setRPCEnable = RPCService.setRPCEnable;
  validateRPC = async (url: string, chainId: number) => {
    const chain = Object.values(CHAINS).find((item) => item.id === chainId);
    if (!chain) throw new Error(`ChainId ${chainId} is not supported`);
    const [_, rpcChainId] = await Promise.all([
      RPCService.ping(chain.enum),
      RPCService.request(url, 'eth_chainId', []),
    ]);
    return chainId === Number(rpcChainId);
  };

  /* chains */
  getSavedChains = () => preferenceService.getSavedChains();
  saveChain = (id: string) => preferenceService.saveChain(id);
  updateChain = (list: string[]) => preferenceService.updateChain(list);
  /* connectedSites */

  getConnectedSite = permissionService.getConnectedSite;
  getSite = permissionService.getSite;
  getConnectedSites = permissionService.getConnectedSites;
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
  setSite = (data: ConnectedSite) => {
    const chainItem = findChainByEnum(data.chain);
    if (!chainItem) {
      throw new Error(`[wallet::setSite] Chain ${data.chain} is not supported`);
    }

    permissionService.setSite(data);
    if (data.isConnected) {
      // rabby:chainChanged event must be sent before chainChanged event
      sessionService.broadcastEvent(
        'rabby:chainChanged',
        chainItem,
        data.origin
      );
      sessionService.broadcastEvent(
        'chainChanged',
        {
          chain: chainItem.hex,
          networkVersion: chainItem.network,
        },
        data.origin
      );
    }
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
    contextMenuService.createOrUpdate(site.origin);
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
    const chainItem = findChainByEnum(data.chain);

    if (!chainItem) {
      throw new Error(
        `[wallet::updateConnectSite] Chain ${data.chain} is not supported`
      );
    }

    permissionService.updateConnectSite(origin, data);
    // rabby:chainChanged event must be sent before chainChanged event
    sessionService.broadcastEvent('rabby:chainChanged', chainItem, data.origin);
    sessionService.broadcastEvent(
      'chainChanged',
      {
        chain: chainItem.hex,
        networkVersion: chainItem.network,
      },
      data.origin
    );
  };
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
  getPreferMetamaskSites = permissionService.getPreferMetamaskSites;
  topConnectedSite = (origin: string) =>
    permissionService.topConnectedSite(origin);
  unpinConnectedSite = (origin: string) =>
    permissionService.unpinConnectedSite(origin);
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
      GNOSIS_SUPPORT_CHAINS.map(async (chainEnum) => {
        const chain = CHAINS[chainEnum];
        try {
          const safe = await createSafeService({
            address,
            networkId: chain.network,
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
    keyring.setNetworkIds(
      address,
      uniq((networks || []).concat(chainList.map((chain) => chain.network)))
    );
  };

  clearGnosisTransaction = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction || keyring.safeInstance) {
      keyring.currentTransaction = null;
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
      buildinProvider.currentProvider.currentAccount = account.address;
      buildinProvider.currentProvider.currentAccountType = account.type;
      buildinProvider.currentProvider.currentAccountBrand = account.brandName;
      buildinProvider.currentProvider.chainId = networkId;
      await keyring.buildTransaction(
        safeAddress,
        tx,
        new ethers.providers.Web3Provider(buildinProvider.currentProvider),
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
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction && keyring.safeInstance) {
      buildinProvider.currentProvider.currentAccount = account.address;
      buildinProvider.currentProvider.currentAccountType = account.type;
      buildinProvider.currentProvider.currentAccountBrand = account.brandName;
      await keyring.execTransaction({
        safeAddress: keyring.safeInstance.safeAddress,
        transaction: keyring.currentTransaction,
        networkId: keyring.safeInstance.network,
        provider: new ethers.providers.Web3Provider(
          buildinProvider.currentProvider
        ),
      });
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
    const keyring = await this.addWatchAddressOnly(address);

    return this._setCurrentAccountFromKeyring(keyring, -1);
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

  resendWalletConnect = () => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      return keyring.resend();
    }
    return null;
  };

  getWalletConnectSessionStatus = (address: string, brandName: string) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
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
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
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

  initWalletConnect = async (brandName: string, curStashId?: number | null) => {
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
      keyring = new WalletConnect({
        accounts: [],
        brandName: brandName,
        // 1h
        maxDuration: 3600000,
        clientMeta: {
          description: t('global.appDescription'),
          url: 'https://rabby.io',
          icons: ['https://rabby.io/assets/images/logo.png'],
          name: 'Rabby',
        },
      });
      isNewKey = true;
    }
    const { uri } = await keyring.initConnector(brandName);
    let stashId = curStashId;
    if (isNewKey) {
      stashId = this.addKeyringToStash(keyring);
      eventBus.addEventListener(
        EVENTS.WALLETCONNECT.INIT,
        ({ address, brandName }) => {
          (keyring as WalletConnectKeyring).init(address, brandName);
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
    return {
      uri,
      stashId,
    };
  };

  getWalletConnectBridge = (address: string, brandName: string) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      const target = keyring.accounts.find(
        (account) =>
          account.address.toLowerCase() === address.toLowerCase() &&
          brandName === account.brandName
      );

      if (target) return target.bridge;

      return null;
    }
    return null;
  };

  getWalletConnectConnectors = () => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      const result: { address: string; brandName: string }[] = [];
      for (const key in keyring.connectors) {
        const target = keyring.connectors[key];
        result.push({
          address: key.split('-')[1],
          brandName: target.brandName,
        });
      }
      return result;
    }
    return [];
  };

  killWalletConnectConnector = async (
    address: string,
    brandName: string,
    resetConnect: boolean,
    silent?: boolean
  ) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      const connector =
        keyring.connectors[`${brandName}-${address.toLowerCase()}`];
      if (connector) {
        await keyring.closeConnector(
          connector.connector,
          address,
          brandName,
          silent
        );
        // reset onAfterConnect
        if (resetConnect) keyring.onAfterConnect = null;
      }
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
    let keyring: WalletConnectKeyring, isNewKey;
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    if (stashId !== null && stashId !== undefined) {
      keyring = stashKeyrings[stashId];
      isNewKey = true;
    } else {
      try {
        keyring = this._getKeyringByType(keyringType);
      } catch {
        const WalletConnectKeyring = keyringService.getKeyringClassForType(
          keyringType
        );
        keyring = new WalletConnectKeyring();
        isNewKey = true;
      }
    }

    keyring.setAccountToAdd({
      address,
      brandName,
      bridge,
      realBrandName,
      realBrandUrl,
    });

    if (isNewKey) {
      await keyringService.addKeyring(keyring);
    }

    await keyringService.addNewAccount(keyring);
    this.clearPageStateCache();
    return this._setCurrentAccountFromKeyring(keyring, -1);
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

    this._lastGetAddress = address;
    return seedWords;
  };

  _lastGetAddress = '';

  getLastGetAddress = () => {
    return this._lastGetAddress;
  };

  clearAddressPendingTransactions = (address: string) => {
    transactionHistoryService.clearPendingTransactions(address);
    transactionWatcher.clearPendingTx(address);
    return;
  };

  importPrivateKey = async (data) => {
    const privateKey = ethUtil.stripHexPrefix(data);
    const buffer = Buffer.from(privateKey, 'hex');

    const error = new Error(t('background.error.invalidPrivateKey'));
    try {
      if (!ethUtil.isValidPrivate(buffer)) {
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

    let wallet;
    try {
      wallet = thirdparty.fromEtherWallet(content, password);
    } catch (e) {
      wallet = await Wallet.fromV3(content, password, true);
    }

    const privateKey = wallet.getPrivateKeyString();
    const keyring = await keyringService.importPrivateKey(
      ethUtil.stripHexPrefix(privateKey)
    );
    return this._setCurrentAccountFromKeyring(keyring);
  };

  getPreMnemonics = () => keyringService.getPreMnemonics();
  generatePreMnemonic = () => keyringService.generatePreMnemonic();
  removePreMnemonics = () => keyringService.removePreMnemonics();
  createKeyringWithMnemonics = async (mnemonic) => {
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

  removeAddress = async (
    address: string,
    type: string,
    brand?: string,
    removeEmptyKeyrings?: boolean
  ) => {
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
      // contactBookService.removeAlias(address);
      whitelistService.removeWhitelist(address);
      transactionHistoryService.removeList(address);
      signTextHistoryService.removeList(address);
      preferenceService.removeHighlightedAddress({
        address,
        brandName: brand || type,
      });
    }
    preferenceService.removeAddressBalance(address);
    const current = preferenceService.getCurrentAccount();
    if (
      current?.address === address &&
      current.type === type &&
      current.brandName === brand
    ) {
      this.resetCurrentAccount();
    }
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
    mnemonic: string
  ): (DisplayedKeryring & { index: number }) | undefined => {
    return keyringService.keyrings.find((item) => {
      return item.type === KEYRING_CLASS.MNEMONIC && item.mnemonic === mnemonic;
    });
  };

  _getMnemonicKeyringByAddress = (address: string) => {
    return keyringService.keyrings.find((item) => {
      return (
        item.type === KEYRING_CLASS.MNEMONIC &&
        item.mnemonic &&
        Object.keys(item._index2wallet).some((key) => {
          return (
            item._index2wallet[key][0].toLowerCase() === address.toLowerCase()
          );
        })
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

  getMnemonicAddressIndex = async (address: string) => {
    const keyring = this._getMnemonicKeyringByAddress(address);
    if (!keyring) {
      throw new Error(t('background.error.notFoundKeyringByAddress'));
    }
    return await keyring.getIndexByAddress(address);
  };

  generateKeyringWithMnemonic = async (mnemonic: string) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error(t('background.error.invalidMnemonic'));
    }
    // If import twice use same kerying
    let keyring = this.getKeyringByMnemonic(mnemonic);
    const result = {
      keyringId: null as number | null,
      isExistedKR: false,
    };
    if (!keyring) {
      const Keyring = keyringService.getKeyringClassForType(
        KEYRING_CLASS.MNEMONIC
      );

      keyring = new Keyring({ mnemonic });
      keyringService.updateHdKeyringIndex(keyring);
      result.keyringId = this.addKeyringToStash(keyring);
      keyringService.addKeyring(keyring);
    } else {
      result.isExistedKR = true;
      result.keyringId = this.updateKeyringInStash(keyring);
    }

    return result;
  };

  addKeyringToStash = (keyring) => {
    const stashId = Object.values(stashKeyrings).length + 1;
    stashKeyrings[stashId] = keyring;

    return stashId;
  };

  updateKeyringInStash = (keyring) => {
    let keyringId = Object.keys(stashKeyrings).find((key) => {
      return stashKeyrings[key].mnemonic === keyring.mnemonic;
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

  isUseLedgerLive = () => {
    const keyring = keyringService.getKeyringByType(
      KEYRING_CLASS.HARDWARE.LEDGER
    );
    if (!keyring) return false;
    return !keyring.isWebHID;
  };

  authorizeLedgerHIDPermission = async () => {
    const keyring = keyringService.getKeyringByType(
      KEYRING_CLASS.HARDWARE.LEDGER
    );
    if (!keyring) return;
    await keyring.authorizeHIDPermission();
    await keyringService.persistAllKeyrings();
  };

  checkLedgerHasHIDPermission = () => {
    const keyring = keyringService.getKeyringByType(
      KEYRING_CLASS.HARDWARE.LEDGER
    );
    if (!keyring) return false;
    return keyring.hasHIDPermission;
  };

  updateUseLedgerLive = async (value: boolean) =>
    preferenceService.updateUseLedgerLive(value);

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
      keyring = new Keyring();
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
      await keyring.unlock();
    }

    if (keyring.useWebHID) {
      keyring.useWebHID(isWebHID);
    }

    if (
      type === KEYRING_CLASS.HARDWARE.LEDGER &&
      !isWebHID &&
      stashKeyringId !== null
    ) {
      keyring.updateTransportMethod &&
        (await keyring.updateTransportMethod(true));
    }

    return stashKeyringId;
  };

  acquireKeystoneMemStoreData = async () => {
    const keyringType = KEYRING_CLASS.QRCODE;
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
    const keyringType = KEYRING_CLASS.QRCODE;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(keyringType);
      } catch {
        const keystoneKeyring = keyringService.getKeyringClassForType(
          keyringType
        );
        keyring = new keystoneKeyring();
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
    const keyringType = KEYRING_CLASS.QRCODE;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(keyringType);
      } catch {
        const keystoneKeyring = keyringService.getKeyringClassForType(
          keyringType
        );
        keyring = new keystoneKeyring();
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
      KEYRING_CLASS.QRCODE
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

  signTypedData = async (
    type: string,
    from: string,
    data: string,
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
      const stripped = ethUtil.stripHexPrefix(data);
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

  requestKeyring = (
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
        keyring = new Keyring();
      }
    }
    if (keyring[methodName]) {
      return keyring[methodName].call(keyring, ...params);
    }
  };

  requestHDKeyringByMnemonics = (
    mnemonics: string,
    methodName: string,
    ...params: any[]
  ) => {
    const keyring = this.getKeyringByMnemonic(mnemonics);
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
    accountsToImport: Required<
      Pick<Account, 'address' | 'alianName' | 'index'>
    >[]
  ) => {
    const keyring = this.getKeyringByMnemonic(mnemonics);
    if (!keyring) {
      throw new Error(
        '[activeAndPersistAccountsByMnemonics] no keyring found.'
      );
    }
    await this.requestHDKeyringByMnemonics(
      mnemonics,
      'activeAccounts',
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

  getPreference = (key?: string) => {
    return preferenceService.getPreference(key);
  };

  setIsDefaultWallet = (val: boolean) => {
    preferenceService.setIsDefaultWallet(val);
    const hasOtherProvider = preferenceService.getHasOtherProvider();
    if (hasOtherProvider) {
      // todo: check is code
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
      setPopupIcon(val ? 'rabby' : 'metamask');
    } else {
      setPopupIcon('default');
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

  updateAlianName = (address: string, name: string) => {
    contactBookService.updateAlias({
      name,
      address,
    });
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

  revoke = async ({
    list,
  }: {
    list: import('@/utils/approval').ApprovalSpenderItemToBeRevoked[];
  }) => {
    const queue = new PQueue({
      autoStart: true,
      concurrency: 1,
      timeout: undefined,
    });

    const revokeList = list.map((e) => async () => {
      try {
        if ('tokenId' in e) {
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
        queue.clear();
        console.error('revoke error', e);
      }
    });

    try {
      await queue.addAll(revokeList);
    } catch (error) {
      console.log('revoke error', error);
    }
  };

  getRecommendNonce = async ({
    from,
    chainId,
  }: {
    from: string;
    chainId: number;
  }) => {
    const chain = Object.values(CHAINS).find((item) => item.id === chainId);
    if (!chain) {
      throw new Error(t('background.error.invalidChainId'));
    }
    const onChainNonce = await this.requestETHRpc(
      {
        method: 'eth_getTransactionCount',
        params: [from, 'latest'],
      },
      chain.serverId
    );
    const localNonce = (await this.getNonceByChain(from, chainId)) || 0;
    return `0x${BigNumber.max(onChainNonce, localNonce).toString(16)}`;
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
    const keyringType = KEYRING_CLASS.QRCODE;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const keystoneKeyring = keyringService.getKeyringClassForType(
        keyringType
      );
      keyring = new keystoneKeyring();
      stashKeyringId = this.addKeyringToStash(keyring);
    }

    await keyring.setCurrentBrand(brand);
    return stashKeyringId;
  };

  checkQRHardwareAllowImport = async (brand: string) => {
    try {
      const keyring = this._getKeyringByType(KEYRING_CLASS.QRCODE);

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
    const keyringType = KEYRING_CLASS.COBO_ARGUS;
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
      KEYRING_CLASS.COBO_ARGUS
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
}

const wallet = new WalletController();
autoLockService.onAutoLock = async () => {
  await wallet.lockWallet();
  eventBus.emit(EVENTS.broadcastToUI, {
    method: EVENTS.LOCK_WALLET,
  });
};
export default wallet;
