import i18n from '@/i18n';
import { WalletControllerType, isSameAddress, useWallet } from '@/ui/utils';
import {
  ExplainTxResponse,
  TokenItem,
  ParseTxResponse,
  SwapAction,
  SendAction,
  ContractDesc,
  AddrDescResponse,
  ApproveAction,
  UsedChain,
  NFTItem,
  SendNFTAction,
  ApproveNFTAction,
  RevokeNFTAction,
  ApproveNFTCollectionAction,
  RevokeNFTCollectionAction,
  NFTCollection,
  CollectionWithFloorPrice,
  Tx,
  RevokeTokenApproveAction,
  WrapTokenAction,
  UnWrapTokenAction,
  PushMultiSigAction,
  CrossTokenAction,
  CrossSwapAction,
  RevokePermit2Action,
  SwapOrderAction,
} from '@rabby-wallet/rabby-api/dist/types';
import {
  ContextActionData,
  UserData,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import BigNumber from 'bignumber.js';
import { useState, useCallback, useEffect } from 'react';
import PQueue from 'p-queue';
import { getTimeSpan } from 'ui/utils/time';
import { ALIAS_ADDRESS, CHAINS, KEYRING_TYPE } from 'consts';
import { TransactionGroup } from '@/background/service/transactionHistory';
import { findChain, isTestnet } from '@/utils/chain';
import { findChainByServerID } from '@/utils/chain';
import { ReceiverData } from './components/ViewMorePopup/ReceiverPopup';
import {
  ContractRequireData,
  fetchContractRequireData,
} from '../TypedDataActions/utils';

export interface ReceiveTokenItem extends TokenItem {
  min_amount: number;
  min_raw_amount: string;
}

export interface ParsedActionData {
  swap?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    minReceive: TokenItem;
    slippageTolerance: number | null;
    receiver: string;
    usdValueDiff: string | null;
    usdValuePercentage: number | null;
    balanceChange: {
      support: boolean;
      success: boolean;
    };
  };
  crossToken?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    receiver: string;
    usdValueDiff: string;
    usdValuePercentage: number;
  };
  crossSwapToken?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    receiver: string;
    usdValueDiff: string;
    usdValuePercentage: number;
  };
  send?: {
    to: string;
    token: TokenItem;
  };
  approveToken?: {
    spender: string;
    token: TokenItem;
  };
  sendNFT?: {
    to: string;
    nft: NFTItem;
  };
  approveNFT?: {
    spender: string;
    nft: NFTItem;
  };
  revokeNFT?: {
    spender: string;
    nft: NFTItem;
  };
  approveNFTCollection?: {
    spender: string;
    collection: NFTCollection;
  };
  revokeNFTCollection?: {
    spender: string;
    collection: NFTCollection;
  };
  revokeToken?: {
    spender: string;
    token: TokenItem;
    gasUsed: number;
  };
  revokePermit2?: {
    spender: string;
    token: TokenItem;
  };
  wrapToken?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    slippageTolerance: number;
    receiver: string;
  };
  unWrapToken?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    slippageTolerance: number;
    receiver: string;
  };
  deployContract?: Record<string, never>;
  contractCall?: object;
  cancelTx?: {
    nonce: string;
  };
  pushMultiSig?: PushMultiSigAction;
  assetOrder?: {
    payTokenList: TokenItem[];
    payNFTList: NFTItem[];
    receiveTokenList: TokenItem[];
    receiveNFTList: NFTItem[];
    takers: string[];
    receiver: string | null;
    expireAt: string | null;
  };
  common?: {
    title: string;
    desc: string;
    is_asset_changed: boolean;
    is_involving_privacy: boolean;
    receiver?: string;
    from: string;
  };
}

export const getProtocol = (
  protocolMap: AddrDescResponse['desc']['protocol'],
  chainId: string
) => {
  if (!protocolMap) return null;
  if (protocolMap[chainId]) return protocolMap[chainId];
  return null;
};

export const calcSlippageTolerance = (base: string, actual: string) => {
  const baseBn = new BigNumber(base);
  const actualBn = new BigNumber(actual);
  if (baseBn.eq(0) && actualBn.eq(0)) return 0;
  if (baseBn.eq(0)) return 1;
  if (actualBn.eq(0)) return -1;
  return baseBn.minus(actualBn).div(baseBn).toNumber();
};

export const calcUSDValueChange = (pay: string, receive: string) => {
  const payBn = new BigNumber(pay);
  const receiveBn = new BigNumber(receive);
  if (payBn.eq(0) && receiveBn.eq(0)) return 0;
  if (payBn.eq(0)) return 1;
  if (receiveBn.eq(0)) return -1;
  return receiveBn.minus(payBn).div(payBn).toNumber();
};

export const parseAction = (
  data: ParseTxResponse['action'],
  balanceChange: ExplainTxResponse['balance_change'],
  tx: Tx,
  preExecVersion: 'v0' | 'v1' | 'v2',
  gasUsed: number
): ParsedActionData => {
  if (data?.type === 'swap_token') {
    const {
      pay_token: payToken,
      receive_token: receiveToken,
      receiver,
    } = data.data as SwapAction;
    const balanceChangeSuccess = balanceChange.success;
    const supportBalanceChange = preExecVersion !== 'v0';
    const actualReceiveToken = balanceChange.receive_token_list.find((token) =>
      isSameAddress(token.id, receiveToken.id)
    );
    const receiveTokenAmount = actualReceiveToken
      ? actualReceiveToken.amount
      : 0;
    const slippageTolerance =
      balanceChangeSuccess && supportBalanceChange
        ? calcSlippageTolerance(
            actualReceiveToken ? actualReceiveToken.raw_amount || '0' : '0',
            receiveToken.min_raw_amount || '0'
          )
        : null;
    const receiveTokenUsdValue = new BigNumber(receiveTokenAmount).times(
      receiveToken.price
    );
    const payTokenUsdValue = new BigNumber(payToken.amount).times(
      payToken.price
    );
    const hasReceiver = !isSameAddress(receiver, tx.from);
    const usdValueDiff =
      hasReceiver || !balanceChangeSuccess || !supportBalanceChange
        ? null
        : receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
    const usdValuePercentage =
      hasReceiver || !balanceChangeSuccess || !supportBalanceChange
        ? null
        : calcUSDValueChange(
            payTokenUsdValue.toFixed(),
            receiveTokenUsdValue.toFixed()
          );
    const minReceive = {
      ...receiveToken,
      amount: receiveToken.min_amount || 0,
    };
    return {
      swap: {
        payToken,
        receiveToken: {
          ...receiveToken,
          amount: receiveTokenAmount,
        },
        minReceive,
        slippageTolerance,
        receiver,
        usdValueDiff,
        usdValuePercentage,
        balanceChange: {
          success: balanceChangeSuccess,
          support: supportBalanceChange,
        },
      },
    };
  }
  if (data?.type === 'cross_token') {
    const {
      pay_token: payToken,
      receive_token: receiveToken,
      receiver,
    } = data.data as CrossTokenAction;
    const receiveTokenUsdValue = new BigNumber(receiveToken.min_amount).times(
      receiveToken.price
    );
    const payTokenUsdValue = new BigNumber(payToken.amount).times(
      payToken.price
    );
    const usdValueDiff = receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
    const usdValuePercentage = calcUSDValueChange(
      payTokenUsdValue.toFixed(),
      receiveTokenUsdValue.toFixed()
    );
    return {
      crossToken: {
        payToken,
        receiveToken,
        receiver,
        usdValueDiff,
        usdValuePercentage,
      },
    };
  }
  if (data?.type === 'cross_swap_token') {
    const {
      pay_token: payToken,
      receive_token: receiveToken,
      receiver,
    } = data.data as CrossSwapAction;
    const receiveTokenUsdValue = new BigNumber(receiveToken.min_raw_amount)
      .div(10 ** receiveToken.decimals)
      .times(receiveToken.price);
    const payTokenUsdValue = new BigNumber(payToken.raw_amount || '0')
      .div(10 ** payToken.decimals)
      .times(payToken.price);
    const usdValueDiff = receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
    const usdValuePercentage = calcUSDValueChange(
      payTokenUsdValue.toFixed(),
      receiveTokenUsdValue.toFixed()
    );

    return {
      crossSwapToken: {
        payToken,
        receiveToken,
        receiver,
        usdValueDiff,
        usdValuePercentage,
      },
    };
  }
  if (data?.type === 'send_token') {
    return {
      send: data.data as SendAction,
    };
  }
  if (data?.type === 'approve_token') {
    const { spender, token } = data.data as ApproveAction;
    return {
      approveToken: {
        spender,
        token,
      },
    };
  }
  if (data?.type === 'revoke_token') {
    const { spender, token } = data.data as RevokeTokenApproveAction;
    return {
      revokeToken: {
        spender,
        token,
        gasUsed,
      },
    };
  }
  if (data?.type === 'permit2_revoke_token') {
    const { spender, token } = data.data as RevokePermit2Action;
    return {
      revokePermit2: {
        spender,
        token,
      },
    };
  }
  if (data?.type === 'wrap_token') {
    const { pay_token, receive_token, receiver } = data.data as WrapTokenAction;
    const slippageTolerance = calcSlippageTolerance(
      pay_token.raw_amount || '0',
      receive_token.min_raw_amount || '0'
    );
    return {
      wrapToken: {
        payToken: pay_token,
        receiveToken: receive_token,
        slippageTolerance,
        receiver,
      },
    };
  }
  if (data?.type === 'unwrap_token') {
    const {
      pay_token,
      receive_token,
      receiver,
    } = data.data as UnWrapTokenAction;
    const slippageTolerance = calcSlippageTolerance(
      pay_token.raw_amount || '0',
      receive_token.min_raw_amount || '0'
    );
    return {
      unWrapToken: {
        payToken: pay_token,
        receiveToken: receive_token,
        slippageTolerance,
        receiver,
      },
    };
  }
  if (data?.type === 'send_nft') {
    return {
      sendNFT: data.data as SendNFTAction,
    };
  }
  if (data?.type === 'approve_nft') {
    return {
      approveNFT: data.data as ApproveNFTAction,
    };
  }
  if (data?.type === 'revoke_nft') {
    return {
      revokeNFT: data.data as RevokeNFTAction,
    };
  }

  if (data?.type === 'approve_collection') {
    return {
      approveNFTCollection: data.data as ApproveNFTCollectionAction,
    };
  }

  if (data?.type === 'revoke_collection') {
    return {
      revokeNFTCollection: data.data as RevokeNFTCollectionAction,
    };
  }
  if (data?.type === 'deploy_contract') {
    return {
      deployContract: {},
    };
  }
  if (data?.type === 'cancel_tx') {
    return {
      cancelTx: {
        nonce: tx.nonce,
      },
    };
  }
  if (data?.type === 'push_multisig') {
    return {
      pushMultiSig: data.data as PushMultiSigAction,
    };
  }
  if (data?.type === null) {
    return {
      common: {
        from: tx.from,
        ...(data as any),
      },
    };
  }
  if (data?.type === 'swap_order') {
    const {
      pay_token_list,
      pay_nft_list,
      receive_nft_list,
      receive_token_list,
      receiver,
      takers,
      expire_at,
    } = data.data as SwapOrderAction;
    return {
      assetOrder: {
        payTokenList: pay_token_list,
        payNFTList: pay_nft_list,
        receiveNFTList: receive_nft_list,
        receiveTokenList: receive_token_list,
        receiver,
        takers,
        expireAt: expire_at,
      },
    };
  }
  return {
    contractCall: {},
  };
};

export interface SwapRequireData {
  id: string;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  bornAt: number;
  hasInteraction: boolean;
  rank: number | null;
  sender: string;
  receiverInWallet: boolean;
}

export interface SendRequireData {
  eoa: {
    id: string;
    bornAt: number;
  } | null;
  cex: {
    id: string;
    name: string;
    logo: string;
    bornAt: number;
    isDeposit: boolean;
    supportToken?: boolean;
  } | null;
  contract: Record<string, ContractDesc> | null;
  usd_value: number;
  protocol: {
    id: string;
    logo_url: string;
    name: string;
  } | null;
  hasTransfer: boolean;
  isTokenContract: boolean;
  usedChains: UsedChain[];
  name: string | null;
  onTransferWhitelist: boolean;
  whitelistEnable: boolean;
  receiverIsSpoofing: boolean;
  hasReceiverPrivateKeyInWallet: boolean;
  hasReceiverMnemonicInWallet: boolean;
}

export interface SendNFTRequireData extends SendRequireData {
  collection?: CollectionWithFloorPrice | null;
}

export interface ApproveTokenRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  token: TokenItem;
}

export interface RevokeTokenApproveRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  token: TokenItem;
}

export interface WrapTokenRequireData {
  id: string;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  bornAt: number;
  hasInteraction: boolean;
  rank: number | null;
  sender: string;
  receiverInWallet: boolean;
}

export interface ContractCallRequireData {
  id: string;
  contract: Record<string, ContractDesc> | null;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  call: NonNullable<ParseTxResponse['contract_call']>;
  payNativeTokenAmount: string;
  nativeTokenSymbol: string;
  unexpectedAddr: ReceiverData | null;
  receiverInWallet: boolean;
}

export interface ApproveNFTRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  tokenBalance: string;
}

export type RevokeNFTRequireData = ApproveNFTRequireData;
export interface CancelTxRequireData {
  pendingTxs: TransactionGroup[];
}

export interface PushMultiSigRequireData {
  contract: Record<string, ContractDesc> | null;
  id: string;
}

export interface AssetOrderRequireData extends ContractRequireData {
  sender: string;
}

export type ActionRequireData =
  | SwapRequireData
  | ApproveTokenRequireData
  | SendRequireData
  | ApproveNFTRequireData
  | RevokeNFTRequireData
  | ContractCallRequireData
  | Record<string, never>
  | ContractCallRequireData
  | CancelTxRequireData
  | WrapTokenRequireData
  | PushMultiSigRequireData
  | AssetOrderRequireData
  | null;

export const waitQueueFinished = (q: PQueue) => {
  return new Promise((resolve) => {
    q.on('empty', () => {
      if (q.pending <= 0) resolve(null);
    });
  });
};

export const fetchNFTApproveRequiredData = async ({
  spender,
  address,
  chainId,
  apiProvider,
}: {
  spender: string;
  address: string;
  chainId: string;
  apiProvider:
    | WalletControllerType['openapi']
    | WalletControllerType['testnetOpenapi'];
}) => {
  const queue = new PQueue();
  const result: ApproveNFTRequireData = {
    isEOA: false,
    contract: null,
    riskExposure: 0,
    rank: null,
    hasInteraction: false,
    bornAt: 0,
    protocol: null,
    isDanger: false,
    tokenBalance: '0',
  };

  queue.add(async () => {
    const credit = await apiProvider.getContractCredit(spender, chainId);
    result.rank = credit.rank_at;
  });

  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(spender);
    if (desc.contract && desc.contract[chainId]) {
      result.bornAt = desc.contract[chainId].create_at;
    }
    if (!desc.contract?.[chainId]) {
      result.isEOA = true;
      result.bornAt = desc.born_at;
    }
    result.protocol = getProtocol(desc.protocol, chainId);
    result.isDanger = desc.contract?.[chainId]?.is_danger || null;
  });
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      address,
      chainId,
      spender
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  queue.add(async () => {
    const { usd_value } = await apiProvider.getTokenNFTExposure(
      chainId,
      spender
    );
    result.riskExposure = usd_value;
  });
  await waitQueueFinished(queue);
  return result;
};

const fetchTokenApproveRequireData = async ({
  spender,
  token,
  apiProvider,
  address,
  chainId,
}: {
  spender: string;
  token: TokenItem;
  address: string;
  chainId: string;
  apiProvider:
    | WalletControllerType['openapi']
    | WalletControllerType['testnetOpenapi'];
}) => {
  const queue = new PQueue();
  const result: ApproveTokenRequireData = {
    isEOA: false,
    contract: null,
    riskExposure: 0,
    rank: null,
    hasInteraction: false,
    bornAt: 0,
    protocol: null,
    isDanger: false,
    token: {
      ...token,
      amount: 0,
      raw_amount_hex_str: '0x0',
    },
  };
  queue.add(async () => {
    const credit = await apiProvider.getContractCredit(spender, chainId);
    result.rank = credit.rank_at;
  });
  queue.add(async () => {
    const { usd_value } = await apiProvider.tokenApproveExposure(
      spender,
      chainId
    );
    result.riskExposure = usd_value;
  });
  queue.add(async () => {
    const t = await apiProvider.getToken(address, chainId, token.id);
    result.token = t;
  });
  queue.add(async () => {
    const { desc } = await apiProvider.addrDesc(spender);
    if (desc.contract && desc.contract[chainId]) {
      result.bornAt = desc.contract[chainId].create_at;
    }
    if (!desc.contract?.[chainId]) {
      result.isEOA = true;
      result.bornAt = desc.born_at;
    }
    result.isDanger = desc.contract?.[chainId]?.is_danger || null;
    result.protocol = getProtocol(desc.protocol, chainId);
  });
  queue.add(async () => {
    const hasInteraction = await apiProvider.hasInteraction(
      address,
      chainId,
      spender
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  await waitQueueFinished(queue);
  return result;
};

export const fetchActionRequiredData = async ({
  actionData,
  contractCall,
  chainId,
  address,
  wallet,
  tx,
  origin,
}: {
  actionData: ParsedActionData;
  contractCall?: ParseTxResponse['contract_call'] | null;
  chainId: string;
  address: string;
  wallet: WalletControllerType;
  tx: Tx;
  origin?: string;
}): Promise<ActionRequireData> => {
  if (actionData.deployContract) {
    return {};
  }
  const isTestnetTx = isTestnet(chainId);
  const apiProvider = isTestnetTx ? wallet.testnetOpenapi : wallet.openapi;
  const queue = new PQueue();
  if (actionData.swap || actionData.crossToken || actionData.crossSwapToken) {
    const data = (actionData.swap ||
      actionData.crossToken ||
      actionData.crossSwapToken)!;
    const receiverInWallet = await wallet.hasAddress(data.receiver);
    const id = tx.to;
    const result: SwapRequireData = {
      id,
      protocol: null,
      bornAt: 0,
      hasInteraction: false,
      rank: null,
      sender: address,
      receiverInWallet,
    };
    queue.add(async () => {
      const credit = await apiProvider.getContractCredit(id, chainId);
      result.rank = credit.rank_at;
    });
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(id);
      if (desc.contract && desc.contract[chainId]) {
        result.bornAt = desc.contract[chainId].create_at;
      } else {
        result.bornAt = desc.born_at;
      }
      result.protocol = getProtocol(desc.protocol, chainId);
    });
    queue.add(async () => {
      const hasInteraction = await apiProvider.hasInteraction(
        address,
        chainId,
        id
      );
      result.hasInteraction = hasInteraction.has_interaction;
    });
    await waitQueueFinished(queue);
    return result;
  }
  if (actionData.wrapToken || actionData.unWrapToken) {
    const id = tx.to;
    const data = (actionData.wrapToken || actionData.unWrapToken)!;
    const receiverInWallet = await wallet.hasAddress(data.receiver);
    const result: WrapTokenRequireData = {
      id,
      protocol: null,
      bornAt: 0,
      hasInteraction: false,
      rank: null,
      sender: address,
      receiverInWallet,
    };
    queue.add(async () => {
      const credit = await apiProvider.getContractCredit(id, chainId);
      result.rank = credit.rank_at;
    });
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(id);
      if (desc.contract && desc.contract[chainId]) {
        result.bornAt = desc.contract[chainId].create_at;
      } else {
        result.bornAt = desc.born_at;
      }
      result.protocol = getProtocol(desc.protocol, chainId);
    });
    queue.add(async () => {
      const hasInteraction = await apiProvider.hasInteraction(
        address,
        chainId,
        id
      );
      result.hasInteraction = hasInteraction.has_interaction;
    });
    await waitQueueFinished(queue);
    return result;
  }
  if (actionData.send) {
    const result: SendRequireData = {
      eoa: null,
      cex: null,
      contract: null,
      usd_value: 0,
      protocol: null,
      hasTransfer: false,
      usedChains: [],
      isTokenContract: false,
      name: null,
      onTransferWhitelist: false,
      whitelistEnable: false,
      receiverIsSpoofing: false,
      hasReceiverPrivateKeyInWallet: false,
      hasReceiverMnemonicInWallet: false,
    };
    const hasPrivateKeyInWallet = await wallet.hasPrivateKeyInWallet(
      actionData.send.to
    );
    if (hasPrivateKeyInWallet) {
      result.hasReceiverPrivateKeyInWallet =
        hasPrivateKeyInWallet === KEYRING_TYPE.SimpleKeyring;
      result.hasReceiverMnemonicInWallet =
        hasPrivateKeyInWallet === KEYRING_TYPE.HdKeyring;
    }
    queue.add(async () => {
      const { has_transfer } = await apiProvider.hasTransfer(
        chainId,
        address,
        actionData.send!.to
      );
      result.hasTransfer = has_transfer;
    });
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(actionData.send!.to);
      if (desc.cex?.id) {
        result.cex = {
          id: desc.cex.id,
          logo: desc.cex.logo_url,
          name: desc.cex.name,
          bornAt: desc.born_at,
          isDeposit: desc.cex.is_deposit,
        };
      }
      if (desc.contract && Object.keys(desc.contract).length > 0) {
        result.contract = desc.contract;
      }
      if (!result.cex && !result.contract) {
        result.eoa = {
          id: actionData.send!.to,
          bornAt: desc.born_at,
        };
      }
      result.usd_value = desc.usd_value;
      if (result.cex) {
        const { support } = await apiProvider.depositCexSupport(
          actionData.send!.token.id,
          actionData.send!.token.chain,
          result.cex.id
        );
        result.cex.supportToken = support;
      }
      if (result.contract) {
        const { is_token } = await apiProvider.isTokenContract(
          chainId,
          actionData.send!.to
        );
        result.isTokenContract = is_token;
      }
      result.name = desc.name;
      if (ALIAS_ADDRESS[actionData.send!.to.toLowerCase()]) {
        result.name = ALIAS_ADDRESS[actionData.send!.to.toLowerCase()];
      }
    });
    queue.add(async () => {
      const usedChainList = await apiProvider.addrUsedChainList(
        actionData.send!.to
      );
      result.usedChains = usedChainList;
    });
    queue.add(async () => {
      const { is_spoofing } = await apiProvider.checkSpoofing({
        from: address,
        to: actionData.send!.to,
      });
      result.receiverIsSpoofing = is_spoofing;
    });
    const whitelist = await wallet.getWhitelist();
    const whitelistEnable = await wallet.isWhitelistEnabled();
    result.whitelistEnable = whitelistEnable;
    result.onTransferWhitelist = whitelist.includes(
      actionData.send.to.toLowerCase()
    );
    await waitQueueFinished(queue);
    return result;
  }
  if (actionData.approveToken) {
    const { token, spender } = actionData.approveToken;
    return await fetchTokenApproveRequireData({
      apiProvider,
      chainId,
      address,
      token,
      spender,
    });
  }
  if (actionData.revokePermit2) {
    const { token, spender } = actionData.revokePermit2;
    return await fetchTokenApproveRequireData({
      apiProvider,
      chainId,
      address,
      token,
      spender,
    });
  }
  if (actionData.revokeToken) {
    const { token, spender } = actionData.revokeToken;
    return await fetchTokenApproveRequireData({
      apiProvider,
      chainId,
      address,
      token,
      spender,
    });
  }
  if (actionData.cancelTx) {
    const chain = findChain({
      serverId: chainId,
    });
    if (chain) {
      const pendingTxs = await wallet.getPendingTxsByNonce(
        address,
        chain.id,
        Number(actionData.cancelTx.nonce)
      );
      return {
        pendingTxs,
      };
    } else {
      return {
        pendingTxs: [],
      };
    }
  }
  if (actionData.sendNFT) {
    const result: SendNFTRequireData = {
      eoa: null,
      cex: null,
      contract: null,
      usd_value: 0,
      protocol: null,
      hasTransfer: false,
      usedChains: [],
      isTokenContract: false,
      name: null,
      onTransferWhitelist: false,
      whitelistEnable: false,
      receiverIsSpoofing: false,
      hasReceiverPrivateKeyInWallet: false,
      hasReceiverMnemonicInWallet: false,
    };
    const hasPrivateKeyInWallet = await wallet.hasPrivateKeyInWallet(
      actionData.sendNFT.to
    );
    if (hasPrivateKeyInWallet) {
      result.hasReceiverPrivateKeyInWallet =
        hasPrivateKeyInWallet === KEYRING_TYPE.SimpleKeyring;
      result.hasReceiverMnemonicInWallet =
        hasPrivateKeyInWallet === KEYRING_TYPE.HdKeyring;
    }
    queue.add(async () => {
      const { has_transfer } = await apiProvider.hasTransfer(
        chainId,
        address,
        actionData.sendNFT!.to
      );
      result.hasTransfer = has_transfer;
    });
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(actionData.sendNFT!.to);
      if (desc.cex?.id) {
        result.cex = {
          id: desc.cex.id,
          logo: desc.cex.logo_url,
          name: desc.cex.name,
          bornAt: desc.born_at,
          isDeposit: desc.cex.is_deposit,
        };
      }
      if (desc.contract && Object.keys(desc.contract).length > 0) {
        result.contract = desc.contract;
      }
      if (!result.cex && !result.contract) {
        result.eoa = {
          id: actionData.sendNFT!.to,
          bornAt: desc.born_at,
        };
      }
      result.usd_value = desc.usd_value;
      if (result.cex) {
        const { support } = await apiProvider.depositCexSupport(
          actionData.sendNFT!.nft.contract_id,
          chainId,
          result.cex.id
        );
        result.cex.supportToken = support;
      }
      if (result.contract) {
        const { is_token } = await apiProvider.isTokenContract(
          chainId,
          actionData.sendNFT!.to
        );
        result.isTokenContract = is_token;
      }
    });
    queue.add(async () => {
      const usedChainList = await apiProvider.addrUsedChainList(
        actionData.sendNFT!.to
      );
      result.usedChains = usedChainList;
    });
    queue.add(async () => {
      const { is_spoofing } = await apiProvider.checkSpoofing({
        from: address,
        to: actionData.sendNFT!.to,
      });
      result.receiverIsSpoofing = is_spoofing;
    });
    const whitelist = await wallet.getWhitelist();
    const whitelistEnable = await wallet.isWhitelistEnabled();
    result.whitelistEnable = whitelistEnable;
    result.onTransferWhitelist = whitelist.includes(
      actionData.sendNFT.to.toLowerCase()
    );
    await waitQueueFinished(queue);
    return result;
  }
  if (actionData.approveNFT) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      apiProvider,
      spender: actionData.approveNFT.spender,
    });
  }
  if (actionData.revokeNFT) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      apiProvider,
      spender: actionData.revokeNFT.spender,
    });
  }
  if (actionData.approveNFTCollection) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      apiProvider,
      spender: actionData.approveNFTCollection.spender,
    });
  }
  if (actionData.revokeNFTCollection) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      apiProvider,
      spender: actionData.revokeNFTCollection.spender,
    });
  }
  if (actionData.pushMultiSig) {
    const result: PushMultiSigRequireData = {
      contract: null,
      id: actionData.pushMultiSig.multisig_id,
    };
    const { desc } = await apiProvider.addrDesc(
      actionData.pushMultiSig.multisig_id
    );
    if (desc.contract) {
      result.contract = desc.contract;
    }
    return result;
  }

  if (actionData.assetOrder) {
    const requireData = await fetchContractRequireData(
      tx.to,
      chainId,
      address,
      apiProvider
    );
    return {
      ...requireData,
      sender: address,
    };
  }
  if ((actionData.contractCall || actionData.common) && contractCall) {
    const chain = findChainByServerID(chainId);
    const result: ContractCallRequireData = {
      contract: null,
      rank: null,
      hasInteraction: false,
      bornAt: 0,
      protocol: null,
      call: contractCall,
      id: contractCall.contract.id,
      payNativeTokenAmount: tx.value || '0x0',
      nativeTokenSymbol: chain?.nativeTokenSymbol || 'ETH',
      unexpectedAddr: null,
      receiverInWallet: false,
    };
    queue.add(async () => {
      const credit = await apiProvider.getContractCredit(
        contractCall.contract.id,
        chainId
      );
      result.rank = credit.rank_at;
    });
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(contractCall.contract.id);
      if (desc.contract) {
        result.contract = desc.contract;
        if (desc.contract[chainId]) {
          result.bornAt = desc.contract[chainId].create_at;
        }
      }
      result.protocol = getProtocol(desc.protocol, chainId);
    });
    queue.add(async () => {
      const hasInteraction = await apiProvider.hasInteraction(
        address,
        chainId,
        contractCall.contract.id
      );
      result.hasInteraction = hasInteraction.has_interaction;
    });
    queue.add(async () => {
      let addr = actionData.common?.receiver;

      if (!addr) {
        const unexpectedAddrList = await apiProvider.unexpectedAddrList({
          chainId,
          tx,
          origin: origin || '',
          addr: address,
        });
        addr = unexpectedAddrList[0]?.id;
      }

      if (addr) {
        result.receiverInWallet = await wallet.hasAddress(addr);
        const receiverData: ReceiverData = {
          address: addr,
          chain: chain!,
          eoa: null,
          cex: null,
          contract: null,
          usd_value: 0,
          hasTransfer: false,
          isTokenContract: false,
          name: null,
          onTransferWhitelist: false,
        };

        const { has_transfer } = await apiProvider.hasTransfer(
          chainId,
          address,
          addr
        );
        receiverData.hasTransfer = has_transfer;

        const { desc } = await apiProvider.addrDesc(addr);
        if (desc.cex?.id) {
          receiverData.cex = {
            id: desc.cex.id,
            logo: desc.cex.logo_url,
            name: desc.cex.name,
            bornAt: desc.born_at,
            isDeposit: desc.cex.is_deposit,
          };
        }
        if (desc.contract && Object.keys(desc.contract).length > 0) {
          receiverData.contract = desc.contract;
        }
        if (!receiverData.cex && !receiverData.contract) {
          receiverData.eoa = {
            id: addr,
            bornAt: desc.born_at,
          };
        }
        receiverData.usd_value = desc.usd_value;
        if (result.contract) {
          const { is_token } = await apiProvider.isTokenContract(chainId, addr);
          receiverData.isTokenContract = is_token;
        }
        receiverData.name = desc.name;
        if (ALIAS_ADDRESS[addr.toLowerCase()]) {
          receiverData.name = ALIAS_ADDRESS[addr.toLowerCase()];
        }

        const whitelist = await wallet.getWhitelist();
        receiverData.onTransferWhitelist = whitelist.includes(
          addr.toLowerCase()
        );
        result.unexpectedAddr = receiverData;
      }
    });
    await waitQueueFinished(queue);
    return result;
  }
  return null;
};

export const formatSecurityEngineCtx = ({
  actionData,
  requireData,
  chainId,
}: {
  actionData: ParsedActionData;
  requireData: ActionRequireData;
  chainId: string;
}): ContextActionData => {
  if (isTestnet(chainId)) {
    return {};
  }
  if (actionData.swap) {
    const data = requireData as SwapRequireData;
    const {
      receiver,
      receiveToken,
      slippageTolerance,
      usdValuePercentage,
    } = actionData.swap;
    const { sender, id } = data;
    const receiveTokenIsFake = receiveToken.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!receiveToken.is_suspicious;
    return {
      swap: {
        receiveTokenIsScam,
        receiveTokenIsFake,
        receiver,
        from: sender,
        chainId,
        id: data.id,
        contractAddress: id,
        slippageTolerance,
        usdValuePercentage,
        receiverInWallet: data.receiverInWallet,
      },
    };
  }
  if (actionData.crossToken) {
    const data = requireData as SwapRequireData;
    const {
      receiver,
      receiveToken,
      usdValuePercentage,
      usdValueDiff,
    } = actionData.crossToken;
    const { sender } = data;
    const receiveTokenIsFake = receiveToken.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!receiveToken.is_suspicious;
    return {
      crossToken: {
        receiveTokenIsScam,
        receiveTokenIsFake,
        receiver,
        from: sender,
        id: data.id,
        chainId,
        usdValuePercentage,
        usdValueChange: Number(usdValueDiff),
        receiverInWallet: data.receiverInWallet,
      },
    };
  }
  if (actionData.crossSwapToken) {
    const data = requireData as SwapRequireData;
    const {
      receiver,
      receiveToken,
      usdValuePercentage,
      usdValueDiff,
    } = actionData.crossSwapToken;
    const { sender } = data;
    const receiveTokenIsFake = receiveToken.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!receiveToken.is_suspicious;
    return {
      crossSwapToken: {
        receiveTokenIsScam,
        receiveTokenIsFake,
        receiver,
        from: sender,
        id: data.id,
        chainId,
        usdValuePercentage,
        usdValueChange: Number(usdValueDiff),
        receiverInWallet: data.receiverInWallet,
      },
    };
  }
  if (actionData.send) {
    const data = requireData as SendRequireData;
    const { to } = actionData.send;
    return {
      send: {
        to,
        contract: data.contract
          ? {
              chains: Object.keys(data.contract),
            }
          : null,
        cex: data.cex
          ? {
              id: data.cex.id,
              isDeposit: data.cex.isDeposit,
              supportToken: data.cex.supportToken,
            }
          : null,
        hasTransfer: data.hasTransfer,
        chainId,
        usedChainList: data.usedChains.map((item) => item.id),
        isTokenContract: data.isTokenContract,
        onTransferWhitelist: data.whitelistEnable
          ? data.onTransferWhitelist
          : false,
        receiverIsSpoofing: data.receiverIsSpoofing,
        hasReceiverMnemonicInWallet: data.hasReceiverMnemonicInWallet,
        hasReceiverPrivateKeyInWallet: data.hasReceiverPrivateKeyInWallet,
      },
    };
  }
  if (actionData.sendNFT) {
    const data = requireData as SendRequireData;
    const { to } = actionData.sendNFT;
    return {
      sendNFT: {
        to,
        contract: data.contract
          ? {
              chains: Object.keys(data.contract),
            }
          : null,
        cex: data.cex
          ? {
              id: data.cex.id,
              isDeposit: data.cex.isDeposit,
              supportToken: data.cex.supportToken,
            }
          : null,
        hasTransfer: data.hasTransfer,
        chainId,
        usedChainList: data.usedChains.map((item) => item.id),
        onTransferWhitelist: data.whitelistEnable
          ? data.onTransferWhitelist
          : false,
        receiverIsSpoofing: data.receiverIsSpoofing,
        hasReceiverMnemonicInWallet: data.hasReceiverMnemonicInWallet,
        hasReceiverPrivateKeyInWallet: data.hasReceiverPrivateKeyInWallet,
      },
    };
  }
  if (actionData.approveToken) {
    const data = requireData as ApproveTokenRequireData;
    const { spender } = actionData.approveToken;
    return {
      tokenApprove: {
        chainId,
        spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
      },
    };
  }
  if (actionData.approveNFT) {
    const data = requireData as ApproveNFTRequireData;
    const { spender } = actionData.approveNFT;
    return {
      nftApprove: {
        chainId,
        spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
      },
    };
  }
  if (actionData.revokeToken) {
    const { gasUsed } = actionData.revokeToken;
    return {
      revokeApprove: {
        gasUsed,
      },
    };
  }
  if (actionData.approveNFTCollection) {
    const data = requireData as ApproveNFTRequireData;
    const { spender } = actionData.approveNFTCollection;
    return {
      collectionApprove: {
        chainId,
        spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
      },
    };
  }
  if (actionData.wrapToken) {
    const { slippageTolerance, receiver } = actionData.wrapToken;
    const data = requireData as WrapTokenRequireData;
    return {
      wrapToken: {
        slippageTolerance,
        receiver,
        from: data.sender,
        chainId,
        id: data.id,
        receiverInWallet: data.receiverInWallet,
      },
      contractCall: {
        id: data.id,
        chainId,
      },
    };
  }
  if (actionData.unWrapToken) {
    const { slippageTolerance, receiver } = actionData.unWrapToken;
    const data = requireData as WrapTokenRequireData;
    return {
      unwrapToken: {
        slippageTolerance,
        receiver,
        from: data.sender,
        chainId,
        id: data.id,
        receiverInWallet: data.receiverInWallet,
      },
      contractCall: {
        id: data.id,
        chainId,
      },
    };
  }
  if (actionData.assetOrder) {
    const {
      takers,
      receiver,
      receiveNFTList,
      receiveTokenList,
    } = actionData.assetOrder;
    const data = requireData as AssetOrderRequireData;
    return {
      assetOrder: {
        specificBuyer: takers[0],
        from: data.sender,
        receiver: receiver || '',
        chainId,
        id: data.id,
        hasReceiveAssets: receiveNFTList.length + receiveTokenList.length > 0,
      },
    };
  }
  if (actionData.contractCall) {
    const data = requireData as ContractCallRequireData;
    return {
      contractCall: {
        chainId,
        id: data.id,
      },
    };
  }
  if (actionData.common) {
    return {
      common: {
        ...actionData.common,
        receiverInWallet: (requireData as ContractCallRequireData)
          .receiverInWallet,
      },
    };
  }
  return {};
};

export const useUserData = () => {
  const wallet = useWallet();
  const [userData, setUserData] = useState<UserData>({
    originWhitelist: [],
    originBlacklist: [],
    contractWhitelist: [],
    contractBlacklist: [],
    addressWhitelist: [],
    addressBlacklist: [],
  });

  useEffect(() => {
    wallet.getSecurityEngineUserData().then(setUserData);
  }, []);

  const updateUserData = useCallback(
    async (userData: UserData) => {
      await wallet.updateUserData(userData);
      setUserData(userData);
    },
    [userData, wallet]
  );

  return [userData, updateUserData] as const;
};

export const getActionTypeText = (data: ParsedActionData) => {
  const t = i18n.t;

  if (data.swap) {
    return t('page.signTx.swap.title');
  }
  if (data.crossToken) {
    return t('page.signTx.crossChain.title');
  }
  if (data.crossSwapToken) {
    return t('page.signTx.swapAndCross.title');
  }
  if (data.wrapToken) {
    return t('page.signTx.wrapToken');
  }
  if (data.unWrapToken) {
    return t('page.signTx.unwrap');
  }
  if (data.send) {
    return t('page.signTx.send.title');
  }
  if (data.approveToken) {
    return t('page.signTx.tokenApprove.title');
  }
  if (data.revokeToken) {
    return t('page.signTx.revokeTokenApprove.title');
  }
  if (data.sendNFT) {
    return t('page.signTx.sendNFT.title');
  }
  if (data.approveNFT) {
    return t('page.signTx.nftApprove.title');
  }
  if (data.revokeNFT) {
    return t('page.signTx.revokeNFTApprove.title');
  }
  if (data.approveNFTCollection) {
    return t('page.signTx.nftCollectionApprove.title');
  }
  if (data.revokeNFTCollection) {
    return t('page.signTx.revokeNFTCollectionApprove.title');
  }
  if (data.deployContract) {
    return t('page.signTx.deployContract.title');
  }
  if (data.cancelTx) {
    return t('page.signTx.cancelTx.title');
  }
  if (data.pushMultiSig) {
    return t('page.signTx.submitMultisig.title');
  }
  if (data.contractCall) {
    return t('page.signTx.unknownAction');
  }
  if (data.revokePermit2) {
    return t('page.signTx.revokePermit2.title');
  }
  if (data.assetOrder) {
    return t('page.signTx.assetOrder.title');
  }
  if (data?.common) {
    return data.common.title;
  }
  return t('page.signTx.unknownAction');
};

export const getActionTypeTextByType = (type: string) => {
  const t = i18n.t;

  const dict = {
    swap_token: t('page.signTx.swap.title'),
    cross_token: t('page.signTx.crossChain.title'),
    cross_swap_token: t('page.signTx.swapAndCross.title'),
    send_token: t('page.signTx.send.title'),
    approve_token: t('page.signTx.tokenApprove.title'),
    revoke_token: t('page.signTx.revokeTokenApprove.title'),
    permit2_revoke_token: t('page.signTx.revokePermit2.title'),
    wrap_token: t('page.signTx.wrapToken'),
    unwrap_token: t('page.signTx.unwrap'),
    send_nft: t('page.signTx.sendNFT.title'),
    approve_nft: t('page.signTx.nftApprove.title'),
    revoke_nft: t('page.signTx.revokeNFTApprove.title'),
    approve_collection: t('page.signTx.nftCollectionApprove.title'),
    revoke_collection: t('page.signTx.revokeNFTCollectionApprove.title'),
    deploy_contract: t('page.signTx.deployContract.title'),
    cancel_tx: t('page.signTx.cancelTx.title'),
    push_multisig: t('page.signTx.submitMultisig.title'),
    contract_call: t('page.signTx.contractCall.title'),
    swap_order: t('page.signTx.assetOrder.title'),
  };

  return dict[type] || t('page.signTx.unknownAction');
};
