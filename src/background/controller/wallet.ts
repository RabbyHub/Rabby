import * as ethUtil from 'ethereumjs-util';
import Wallet, { thirdparty } from 'ethereumjs-wallet';
import { ethErrors } from 'eth-rpc-errors';
import * as bip39 from 'bip39';
import { ethers, Contract, constants } from 'ethers';
import { groupBy } from 'lodash';
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
  widgetService,
} from 'background/service';
import buildinProvider from 'background/utils/buildinProvider';
import { ContactBookItem } from '../service/contactBook';
import { openIndexPage } from 'background/webapi/tab';
import { CacheState } from 'background/service/pageStateCache';
import i18n from 'background/service/i18n';
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
  RABBY_SWAP_ROUTER,
  SWAP_FEE_PRECISION,
} from 'consts';
import { ERC1155ABI, ERC20ABI, ERC721ABI, RABBY_SWAP_ABI } from 'consts/abi';
import { Account, IHighlightedAddress } from '../service/preference';
import { ConnectedSite } from '../service/permission';
import { ExplainTxResponse, TokenItem } from '../service/openapi';
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
import { addHexPrefix, intToHex, unpadHexString } from 'ethereumjs-util';

const stashKeyrings: Record<string | number, any> = {};

const MAX_UNSIGNED_256_INT = new BigNumber(2).pow(256).minus(1).toString(10);

export class WalletController extends BaseController {
  openapi = openapiService;

  /* wallet */
  boot = (password) => keyringService.boot(password);
  isBooted = () => keyringService.isBooted();
  verifyPassword = (password: string) =>
    keyringService.verifyPassword(password);

  requestETHRpc = (data: { method: string; params: any }, chainId: string) => {
    return providerController.ethRpc(
      {
        data,
        session: {
          name: 'Rabby',
          origin: INTERNAL_REQUEST_ORIGIN,
          icon: './images/icon-128.png',
        },
      },
      chainId
    );
  };

  sendRequest = (data) => {
    return provider({
      data,
      session: {
        name: 'Rabby',
        origin: INTERNAL_REQUEST_ORIGIN,
        icon: './images/icon-128.png',
      },
    });
  };

  getApproval = notificationService.getApproval;
  resolveApproval = notificationService.resolveApproval;
  rejectApproval = (err?: string, stay = false, isInternal = false) => {
    return notificationService.rejectApproval(err, stay, isInternal);
  };

  getERC20Allowance = async (
    chainServerId,
    erc20Address: string,
    contractAddress: string
  ): Promise<string> => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const chainId = Object.values(CHAINS)
      .find((chain) => chain.serverId === chainServerId)
      ?.id.toString();
    if (!chainId) throw new Error('invalid chain id');

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

  getSwapFeeRatio = async (chainEnum: CHAINS_ENUM) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const chainId = CHAINS?.[chainEnum]?.id.toString();
    if (!chainId) throw new Error('invalid chain id');

    buildinProvider.currentProvider.currentAccount = account.address;
    buildinProvider.currentProvider.currentAccountType = account.type;
    buildinProvider.currentProvider.currentAccountBrand = account.brandName;
    buildinProvider.currentProvider.chainId = chainId;

    const provider = new ethers.providers.Web3Provider(
      buildinProvider.currentProvider
    );
    if (!RABBY_SWAP_ROUTER[chainEnum]) {
      if (!chainId) throw new Error('invalid rabby swap router');
    }
    const swapContract = new Contract(
      RABBY_SWAP_ROUTER[chainEnum],
      RABBY_SWAP_ABI,
      provider
    );
    const feeRatio = await swapContract.feeRatio();

    return feeRatio.toString();
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
    if (!account) throw new Error('no current account');
    const chain = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainServerId
    );
    const chainId = chain?.id;
    if (!chainId) throw new Error('invalid chain id');
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

    return await this.sendRequest({
      method: 'eth_sendTransaction',
      params: [params],
      $ctx,
    });
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
    if (!account) throw new Error('no current account');
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

  rabbySwap = async (
    {
      chain_server_id,
      pay_token_id,
      pay_token_raw_amount,
      receive_token_id,
      slippage,
      receive_token_raw_amount,
      dex_swap_to,
      dex_approve_to,
      dex_swap_calldata,
      deadline,
      needApprove,
      feeRatio,
    }: {
      chain_server_id: string;
      pay_token_id: string;
      pay_token_raw_amount: string;
      receive_token_id: string;
      slippage: string;
      receive_token_raw_amount: number;
      dex_swap_to: string;
      dex_approve_to: string;
      dex_swap_calldata: string;
      deadline: number;
      needApprove: boolean;
      feeRatio: number | string;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const chain = Object.values(CHAINS).find(
      (item) => item.serverId === chain_server_id
    );
    if (!chain) throw new Error(`Can not find chain ${chain_server_id}`);
    if (!Object.keys(RABBY_SWAP_ROUTER).some((e) => e === chain.enum)) {
      throw new Error(`swap don't support chain ${chain.enum} now`);
    }

    if (needApprove && pay_token_id !== chain.nativeTokenAddress) {
      await this.approveToken(
        chain_server_id,
        pay_token_id,
        RABBY_SWAP_ROUTER[chain.enum],
        MAX_UNSIGNED_256_INT,
        {
          ga: {
            ...$ctx?.ga,
            source: 'approvalAndSwap|tokenApproval',
          },
        }
      );
    }

    const swapParam = {
      from: account.address,
      to: RABBY_SWAP_ROUTER[chain.enum],
      chainId: chain.id,
      data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
        {
          inputs: [
            {
              internalType: 'contract IERC20',
              name: 'srcToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'amount',
              type: 'uint256',
            },
            {
              internalType: 'contract IERC20',
              name: 'dstToken',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'minReturn',
              type: 'uint256',
            },
            {
              internalType: 'address',
              name: 'dexRouter',
              type: 'address',
            },
            {
              internalType: 'address',
              name: 'dexSpender',
              type: 'address',
            },
            {
              internalType: 'bytes',
              name: 'data',
              type: 'bytes',
            },
            {
              internalType: 'uint256',
              name: 'deadline',
              type: 'uint256',
            },
          ],
          name: 'swap',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
        [
          chain.nativeTokenAddress === pay_token_id
            ? constants.AddressZero
            : pay_token_id,
          '0x' + new BigNumber(pay_token_raw_amount).toString(16),
          chain.nativeTokenAddress === receive_token_id
            ? constants.AddressZero
            : receive_token_id,
          new BigNumber(receive_token_raw_amount)
            .times(
              new BigNumber(1).minus(
                new BigNumber(feeRatio).div(SWAP_FEE_PRECISION)
              )
            )
            .times(new BigNumber(1).minus(new BigNumber(slippage).div(100)))
            .toFixed(0, BigNumber.ROUND_FLOOR),
          dex_swap_to,
          dex_approve_to,
          dex_swap_calldata,
          deadline.toString(),
        ]
      ),
    };
    if (chain.nativeTokenAddress === pay_token_id) {
      swapParam['value'] =
        '0x' + new BigNumber(pay_token_raw_amount).toString(16);
    }

    await this.sendRequest({
      $ctx:
        needApprove && pay_token_id !== chain.nativeTokenAddress
          ? {
              ga: {
                ...$ctx?.ga,
                source: 'approvalAndSwap|swap',
              },
            }
          : $ctx,
      method: 'eth_sendTransaction',
      params: [swapParam],
    });
    this.clearPageStateCache();
  };

  approveToken = async (
    chainServerId: string,
    id: string,
    spender: string,
    amount: number | string,
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const chainId = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainServerId
    )?.id;
    if (!chainId) throw new Error('invalid chain id');
    await this.sendRequest({
      $ctx,
      method: 'eth_sendTransaction',
      params: [
        {
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
        },
      ],
    });
  };

  fetchEstimatedL1Fee = async (
    txMeta: Record<string, any> & {
      txParams: any;
    }
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    buildinProvider.currentProvider.currentAccount = account.address;
    buildinProvider.currentProvider.currentAccountType = account.type;
    buildinProvider.currentProvider.currentAccountBrand = account.brandName;
    buildinProvider.currentProvider.chainId = CHAINS['OP'].network;

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
    if (!account) throw new Error('no current account');
    const chainId = Object.values(CHAINS)
      .find((chain) => chain.serverId === chainServerId)
      ?.id.toString();
    if (!chainId) throw new Error('invalid chain id');
    buildinProvider.currentProvider.currentAccount = account.address;
    buildinProvider.currentProvider.currentAccountType = account.type;
    buildinProvider.currentProvider.currentAccountBrand = account.brandName;
    buildinProvider.currentProvider.chainId = chainId;
    buildinProvider.currentProvider.$ctx = $ctx;

    const provider = new ethers.providers.Web3Provider(
      buildinProvider.currentProvider
    );

    const signer = provider.getSigner();

    try {
      if (abi === 'ERC721') {
        const contract = new Contract(contractId, ERC721ABI, signer);
        await contract['safeTransferFrom(address,address,uint256)'](
          account.address,
          to,
          tokenId
        );
      } else if (abi === 'ERC1155') {
        const contract = new Contract(contractId, ERC1155ABI, signer);
        await contract.safeTransferFrom(
          account.address,
          to,
          tokenId,
          amount,
          []
        );
      } else {
        throw new Error('unknown contract abi');
      }
      buildinProvider.currentProvider.$ctx = undefined;
    } catch (e) {
      buildinProvider.currentProvider.$ctx = undefined;
      throw e;
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
      abi: 'ERC721' | 'ERC1155';
      isApprovedForAll: boolean;
      tokenId: string | null | undefined;
    },
    $ctx?: any
  ) => {
    const account = await preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const chainId = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainServerId
    )?.id;
    if (!chainId) throw new Error('invalid chain id');
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
      throw new Error('unknown contract abi');
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

  getAddressBalance = async (address: string) => {
    const data = await openapiService.getTotalBalance(address);
    preferenceService.updateAddressBalance(address, data);
    return data;
  };
  getAddressCacheBalance = (address: string | undefined) => {
    if (!address) return null;
    return preferenceService.getAddressBalance(address);
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
    permissionService.setSite(data);
    if (data.isConnected) {
      // rabby:chainChanged event must be sent before chainChanged event
      sessionService.broadcastEvent(
        'rabby:chainChanged',
        CHAINS[data.chain],
        data.origin
      );
      sessionService.broadcastEvent(
        'chainChanged',
        {
          chain: CHAINS[data.chain].hex,
          networkVersion: CHAINS[data.chain].network,
        },
        data.origin
      );
    }
  };
  updateConnectSite = (origin: string, data: ConnectedSite) => {
    permissionService.updateConnectSite(origin, data);
    // rabby:chainChanged event must be sent before chainChanged event
    sessionService.broadcastEvent(
      'rabby:chainChanged',
      CHAINS[data.chain],
      data.origin
    );
    sessionService.broadcastEvent(
      'chainChanged',
      {
        chain: CHAINS[data.chain].hex,
        networkVersion: CHAINS[data.chain].network,
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
  topConnectedSite = (origin: string) =>
    permissionService.topConnectedSite(origin);
  unpinConnectedSite = (origin: string) =>
    permissionService.unpinConnectedSite(origin);
  /* keyrings */

  clearKeyrings = () => keyringService.clearKeyrings();

  importGnosisAddress = async (address: string, networkId: string) => {
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
    keyring.setNetworkId(address, networkId);
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

  clearGnosisTransaction = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring.currentTransaction || keyring.safeInstance) {
      keyring.currentTransaction = null;
      keyring.safeInstance = null;
    }
  };

  getGnosisNetworkId = (address: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    const networkId = keyring.networkIdMap[address.toLowerCase()];
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
    tx
  ) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (keyring) {
      buildinProvider.currentProvider.currentAccount = account.address;
      buildinProvider.currentProvider.currentAccountType = account.type;
      buildinProvider.currentProvider.currentAccountBrand = account.brandName;
      await keyring.buildTransaction(
        safeAddress,
        tx,
        new ethers.providers.Web3Provider(buildinProvider.currentProvider)
      );
    } else {
      throw new Error('No Gnosis keyring found');
    }
  };

  postGnosisTransaction = () => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring || !keyring.currentTransaction) {
      throw new Error('No transaction in Gnosis keyring found');
    }
    return keyring.postTransaction();
  };

  getGnosisOwners = (
    account: Account,
    safeAddress: string,
    version: string
  ) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error('No Gnosis keyring found');
    buildinProvider.currentProvider.currentAccount = account.address;
    buildinProvider.currentProvider.currentAccountType = account.type;
    buildinProvider.currentProvider.currentAccountBrand = account.brandName;
    return keyring.getOwners(
      safeAddress,
      version,
      new ethers.providers.Web3Provider(buildinProvider.currentProvider)
    );
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

  gnosisAddConfirmation = async (address: string, signature: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error('No Gnosis keyring found');
    if (!keyring.currentTransaction) {
      throw new Error('No transaction in Gnosis keyring');
    }
    await keyring.addConfirmation(address, signature);
  };

  gnosisAddPureSignature = async (address: string, signature: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error('No Gnosis keyring found');
    if (!keyring.currentTransaction) {
      throw new Error('No transaction in Gnosis keyring');
    }
    await keyring.addPureSignature(address, signature);
  };

  gnosisAddSignature = async (address: string, signature: string) => {
    const keyring: GnosisKeyring = this._getKeyringByType(KEYRING_CLASS.GNOSIS);
    if (!keyring) throw new Error('No Gnosis keyring found');
    if (!keyring.currentTransaction) {
      throw new Error('No transaction in Gnosis keyring');
    }
    await keyring.addSignature(address, signature);
  };

  importWatchAddress = async (address) => {
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
    return this._setCurrentAccountFromKeyring(keyring, -1);
  };

  getWalletConnectStatus = (address: string, brandName: string) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      return keyring.getConnectorStatus(address, brandName);
    }
    return null;
  };

  initWalletConnect = async (brandName: string, bridge?: string) => {
    let keyring: WalletConnectKeyring, isNewKey;
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const WalletConnect = keyringService.getKeyringClassForType(keyringType);
      keyring = new WalletConnect({
        accounts: [],
        brandName: brandName,
        clientMeta: {
          description: i18n.t('appDescription'),
          url: 'https://rabby.io',
          icons: ['https://rabby.io/assets/images/logo.png'],
          name: 'Rabby',
        },
      });
      isNewKey = true;
    }
    const { uri } = await keyring.initConnector(brandName, bridge);
    let stashId: null | number = null;
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

  killWalletConnectConnector = async (address: string, brandName: string) => {
    const keyringType = KEYRING_CLASS.WALLETCONNECT;
    const keyring: WalletConnectKeyring = this._getKeyringByType(keyringType);
    if (keyring) {
      const connector =
        keyring.connectors[`${brandName}-${address.toLowerCase()}`];
      if (connector) {
        await keyring.closeConnector(connector.connector, address, brandName);
      }
    }
  };

  importWalletConnect = async (
    address: string,
    brandName: string,
    bridge?: string,
    stashId?: number
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
    });

    if (isNewKey) {
      await keyringService.addKeyring(keyring);
    }

    await keyringService.addNewAccount(keyring);
    this.clearPageStateCache();
    return this._setCurrentAccountFromKeyring(keyring, -1);
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

  clearAddressPendingTransactions = (address: string) => {
    return transactionHistoryService.clearPendingTransactions(address);
  };

  importPrivateKey = async (data) => {
    const privateKey = ethUtil.stripHexPrefix(data);
    const buffer = Buffer.from(privateKey, 'hex');

    const error = new Error(i18n.t('the private key is invalid'));
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
      throw new Error(i18n.t('the input file is invalid'));
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
    return this._setCurrentAccountFromKeyring(keyring);
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

  removeAddress = async (address: string, type: string, brand?: string) => {
    await keyringService.removeAccount(address, type, brand);
    if (!(await keyringService.hasAddress(address))) {
      contactBookService.removeAlias(address);
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

  generateKeyringWithMnemonic = async (mnemonic: string) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error(i18n.t('The seed phrase is invalid, please check!'));
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
    } else {
      result.isExistedKR = true;
    }

    return result;
  };

  addKeyringToStash = (keyring) => {
    const stashId = Object.values(stashKeyrings).length + 1;
    stashKeyrings[stashId] = keyring;

    return stashId;
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
      this._setCurrentAccountFromKeyring(keyring);
    } else {
      throw new Error('failed to addKeyring, keyring is undefined');
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
    try {
      keyring = this._getKeyringByType(type);
    } catch {
      const Keyring = keyringService.getKeyringClassForType(type);
      keyring = new Keyring();
      stashKeyringId = Object.values(stashKeyrings).length + 1;
      stashKeyrings[stashKeyringId] = keyring;
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

  submitQRHardwareCryptoHDKey = async (cbor: string) => {
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
      stashKeyringId = Object.values(stashKeyrings).length + 1;
      stashKeyrings[stashKeyringId] = keyring;
    }
    keyring.readKeyring();
    await keyring.submitCryptoHDKey(cbor);
    return stashKeyringId;
  };

  submitQRHardwareCryptoAccount = async (cbor: string) => {
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
      stashKeyringId = Object.values(stashKeyrings).length + 1;
      stashKeyrings[stashKeyringId] = keyring;
    }
    keyring.readKeyring();
    await keyring.submitCryptoAccount(cbor);
    return stashKeyringId;
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
    data: any;
    options?: any;
  }) => {
    const stripped = ethUtil.stripHexPrefix(data);
    const buff = Buffer.from(stripped, 'hex');
    data = JSON.parse(buff.toString('utf8'));
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

    return this._setCurrentAccountFromKeyring(keyringInstance);
  };

  getSignTextHistory = (address: string) => {
    return signTextHistoryService.getHistory(address);
  };

  addTxExplainCache = (params: {
    address: string;
    chainId: number;
    nonce: number;
    explain: ExplainTxResponse;
    calcSuccess: boolean;
    approvalId: number;
  }) => transactionHistoryService.addExplainCache(params);

  getExplainCache = ({
    address,
    chainId,
    nonce,
  }: {
    address: string;
    chainId: number;
    nonce: number;
  }) =>
    transactionHistoryService.getExplainCache({
      address,
      chainId,
      nonce,
    });

  getTxExplainCacheByApprovalId = (id: number) =>
    transactionHistoryService.getExplainCacheByApprovalId(id);

  getTransactionHistory = (address: string) =>
    transactionHistoryService.getList(address);
  comepleteTransaction = (params: {
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

  getPreference = (key?: string) => {
    return preferenceService.getPreference(key);
  };

  setIsDefaultWallet = (val: boolean) => {
    preferenceService.setIsDefaultWallet(val);
    const hasOtherProvider = preferenceService.getHasOtherProvider();
    if (hasOtherProvider) {
      sessionService.broadcastEvent(
        'defaultWalletChanged',
        val ? 'rabby' : 'metamask'
      );
      setPopupIcon(val ? 'rabby' : 'metamask');
    } else {
      setPopupIcon('default');
    }
  };
  isDefaultWallet = () => preferenceService.getIsDefaultWallet();

  private _getKeyringByType(type) {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw ethErrors.rpc.internal(`No ${type} keyring found`);
  }

  addContact = (data: ContactBookItem) => {
    contactBookService.addContact(data);
  };
  updateContact = (data: ContactBookItem) => {
    contactBookService.updateContact(data);
  };
  removeContact = (address: string) => {
    contactBookService.removeContact(address);
  };
  listContact = (includeAlias = true) => {
    const list = contactBookService.listContacts();
    if (includeAlias) {
      return list;
    } else {
      return list.filter((item) => !item.isAlias);
    }
  };
  getContactsByMap = () => contactBookService.getContactsByMap();
  getContactByAddress = (address: string) =>
    contactBookService.getContactByAddress(address);

  private async _setCurrentAccountFromKeyring(keyring, index = 0) {
    const accounts = keyring.getAccountsWithBrand
      ? await keyring.getAccountsWithBrand()
      : await keyring.getAccounts();
    const account = accounts[index < 0 ? index + accounts.length : index];

    if (!account) {
      throw new Error('the current account is empty');
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
    const contactName = contactBookService.getContactByAddress(address)?.name;
    return contactName;
  };

  updateAlianName = (address: string, name: string) => {
    contactBookService.updateAlias({
      name,
      address,
    });
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
      throw new Error('[GenerateCacheAliasNames]: need at least one address');
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

    const accounts = ids
      .sort((a, b) => a - b)
      .map((id, index) => {
        const address = keyring._addressFromIndex(id)[0];
        const alias = generateAliasName({
          keyringType: KEYRING_TYPE.HdKeyring,
          keyringCount: keyring.index,
          addressCount: index,
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
  getAddedToken = (address: string) => {
    return preferenceService.getAddedToken(address);
  };
  updateAddedToken = (address: string, tokenList: string[]) => {
    return preferenceService.updateAddedToken(address, tokenList);
  };
  getWidgets = () => {
    return widgetService.getWidgets();
  };
  enableWidget = (name: string) => {
    widgetService.enableWidget(name);
  };
  disableWidget = (name: string) => {
    widgetService.disableWidget(name);
  };

  reportStats = (
    name: string,
    params: Record<string, string | number | boolean>
  ) => {
    stats.report(name, params);
  };
  getNeedSwitchWalletCheck = preferenceService.getNeedSwitchWalletCheck;

  updateNeedSwitchWalletCheck = preferenceService.updateNeedSwitchWalletCheck;
}

export default new WalletController();
