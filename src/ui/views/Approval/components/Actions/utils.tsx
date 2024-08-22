import i18n from '@/i18n';
import { WalletControllerType } from '@/ui/utils';
import {
  TokenItem,
  ParseTxResponse,
  ContractDesc,
  AddrDescResponse,
  UsedChain,
  NFTItem,
  NFTCollection,
  CollectionWithFloorPrice,
  RevokeTokenApproveAction,
  PushMultiSigAction,
} from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import { TransactionGroup } from '@/background/service/transactionHistory';
import { ReceiverData } from './components/ViewMorePopup/ReceiverPopup';
import { ContractRequireData } from '../TypedDataActions/utils';

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
  permit2BatchRevokeToken?: {
    permit2_id: string;
    revoke_list: RevokeTokenApproveAction[];
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

export type BatchRevokePermit2RequireData = Record<
  string,
  Omit<ApproveTokenRequireData, 'token'>
>;
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
  | Record<string, any>
  | ContractCallRequireData
  | CancelTxRequireData
  | WrapTokenRequireData
  | PushMultiSigRequireData
  | AssetOrderRequireData
  | BatchRevokePermit2RequireData
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
    const contractInfo = await apiProvider.getContractInfo(spender, chainId);
    if (!contractInfo) {
      result.isEOA = true;
      result.rank = null;
    } else {
      result.rank = contractInfo.credit.rank_at;
      result.riskExposure = contractInfo.top_nft_spend_usd_value;
      result.bornAt = contractInfo.create_at;
      result.isDanger =
        contractInfo.is_danger.auto || contractInfo.is_danger.edit;
      result.protocol = contractInfo.protocol;
    }
  });
  if (result.isEOA) {
    queue.add(async () => {
      const { desc } = await apiProvider.addrDesc(spender);
      result.bornAt = desc.born_at;
    });
  }
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
  if (data.permit2BatchRevokeToken) {
    return t('page.signTx.batchRevokePermit2.title');
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
    permit2_batch_revoke_token: t('page.signTx.batchRevokePermit2.title'),
  };

  return dict[type] || t('page.signTx.unknownAction');
};
