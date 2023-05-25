import { WalletControllerType, isSameAddress, useWallet } from '@/ui/utils';
import {
  ExplainTxResponse,
  TokenItem,
  ParseTxResponse,
  SwapAction,
  SendAction,
  ContractDesc,
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
} from '@debank/rabby-api/dist/types';
import {
  ContextActionData,
  UserData,
} from '@debank/rabby-security-engine/dist/rules';
import BigNumber from 'bignumber.js';
import { useState, useCallback, useEffect } from 'react';
import PQueue from 'p-queue';
import { getTimeSpan } from 'ui/utils/time';
import { CHAINS } from 'consts';
import { TransactionGroup } from '@/background/service/transactionHistory';

export interface ReceiveTokenItem extends TokenItem {
  min_amount: number;
  min_raw_amount: string;
}

export interface ActionData {
  swap?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    receiver: string;
  };
}

export interface ParsedActionData {
  swap?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    minReceive: TokenItem;
    slippageTolerance: number;
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
  };
  wrapToken?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    slippageTolerance: number;
  };
  unWrapToken?: {
    payToken: TokenItem;
    receiveToken: ReceiveTokenItem;
    slippageTolerance: number;
  };
  deployContract?: Record<string, never>;
  contractCall?: object;
  cancelTx?: {
    nonce: string;
  };
}

const calcSlippageTolerance = (base: string, actual: string) => {
  const baseBn = new BigNumber(base);
  const actualBn = new BigNumber(actual);
  if (baseBn.eq(0) && actualBn.eq(0)) return 0;
  if (baseBn.eq(0)) return 1;
  if (actualBn.eq(0)) return -1;
  return actualBn.minus(baseBn).div(baseBn).toNumber();
};

export const parseAction = (
  data: ParseTxResponse['action'],
  balanceChange: ExplainTxResponse['balance_change'],
  tx: Tx
): ParsedActionData => {
  if (data?.type === 'swap_token') {
    const {
      pay_token: payToken,
      receive_token: receiveToken,
      receiver,
    } = data.data as SwapAction;
    const actualReceiveToken = balanceChange.receive_token_list.find((token) =>
      isSameAddress(token.id, receiveToken.id)
    );
    const receiveTokenAmount = actualReceiveToken
      ? actualReceiveToken.amount
      : 0;
    const slippageTolerance = calcSlippageTolerance(
      receiveToken.min_raw_amount || '0',
      actualReceiveToken ? actualReceiveToken.raw_amount || '0' : '0'
    );
    const receiveTokenUsdValue = new BigNumber(receiveTokenAmount).times(
      receiveToken.price
    );
    const payTokenUsdValue = new BigNumber(payToken.amount).times(
      payToken.price
    );
    const usdValueDiff = receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
    const usdValuePercentage = calcSlippageTolerance(
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
    console.log(data);
    return {
      revokeToken: {
        spender,
        token,
      },
    };
  }
  if (data?.type === 'wrap_token') {
    const { pay_token, receive_token } = data.data as WrapTokenAction;
    const slippageTolerance = calcSlippageTolerance(
      receive_token.raw_amount || '0',
      pay_token.raw_amount || '0'
    );
    return {
      wrapToken: {
        payToken: pay_token,
        receiveToken: receive_token,
        slippageTolerance,
      },
    };
  }
  if (data?.type === 'unwrap_token') {
    const { pay_token, receive_token } = data.data as UnWrapTokenAction;
    const slippageTolerance = calcSlippageTolerance(
      receive_token.raw_amount || '0',
      pay_token.raw_amount || '0'
    );
    return {
      wrapToken: {
        payToken: pay_token,
        receiveToken: receive_token,
        slippageTolerance,
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
}

export interface ContractCallRequireData {
  contract: Record<string, ContractDesc> | null;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  call: NonNullable<ParseTxResponse['contract_call']>;
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
  | null;

const waitQueueFinished = (q: PQueue) => {
  return new Promise((resolve) => {
    q.on('empty', () => {
      if (q.pending <= 0) resolve(null);
    });
  });
};

const fetchNFTApproveRequiredData = async ({
  spender,
  address,
  chainId,
  wallet,
}: {
  spender: string;
  address: string;
  chainId: string;
  wallet: WalletControllerType;
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
    const credit = await wallet.openapi.getContractCredit(spender, chainId);
    result.rank = credit.rank_at;
  });

  queue.add(async () => {
    const { desc } = await wallet.openapi.addrDesc(spender);
    if (desc.contract && desc.contract[chainId]) {
      result.bornAt = desc.contract[chainId].create_at;
    }
    if (!desc.contract?.[chainId]) {
      result.isEOA = true;
      result.bornAt = desc.born_at;
    }
    if (desc.protocol?.[chainId]) {
      result.protocol = desc.protocol[chainId];
    }
    result.isDanger = desc.is_danger;
  });
  queue.add(async () => {
    const hasInteraction = await wallet.openapi.hasInteraction(
      address,
      chainId,
      spender
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  await waitQueueFinished(queue);
  return result;
};

const fetchTokenApproveRequireData = async ({
  spender,
  token,
  wallet,
  address,
  chainId,
}: {
  spender: string;
  token: TokenItem;
  address: string;
  chainId: string;
  wallet: WalletControllerType;
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
    const credit = await wallet.openapi.getContractCredit(spender, chainId);
    result.rank = credit.rank_at;
  });
  queue.add(async () => {
    const { usd_value } = await wallet.openapi.tokenApproveExposure(
      spender,
      chainId
    );
    result.riskExposure = usd_value;
  });
  queue.add(async () => {
    const t = await wallet.openapi.getToken(address, chainId, token.id);
    result.token = t;
  });
  queue.add(async () => {
    const { desc } = await wallet.openapi.addrDesc(spender);
    if (desc.contract && desc.contract[chainId]) {
      result.bornAt = desc.contract[chainId].create_at;
    }
    if (!desc.contract?.[chainId]) {
      result.isEOA = true;
      result.bornAt = desc.born_at;
    }
    result.isDanger = desc.is_danger;
    if (desc.protocol?.[chainId]) {
      result.protocol = desc.protocol[chainId];
    }
  });
  queue.add(async () => {
    const hasInteraction = await wallet.openapi.hasInteraction(
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
}: {
  actionData: ParsedActionData;
  contractCall?: ParseTxResponse['contract_call'] | null;
  chainId: string;
  address: string;
  wallet: WalletControllerType;
}): Promise<ActionRequireData> => {
  if (actionData.deployContract) {
    return {};
  }
  if (!contractCall) {
    return null;
  }
  const queue = new PQueue();
  if (actionData.swap) {
    const { id, protocol } = contractCall.contract;
    const result: SwapRequireData = {
      id,
      protocol: protocol,
      bornAt: 0,
      hasInteraction: false,
      rank: null,
      sender: address,
    };
    queue.add(async () => {
      const credit = await wallet.openapi.getContractCredit(id, chainId);
      result.rank = credit.rank_at;
    });
    queue.add(async () => {
      const { desc } = await wallet.openapi.addrDesc(id);
      if (desc.contract && desc.contract[chainId]) {
        result.bornAt = desc.contract[chainId].create_at;
      }
    });
    queue.add(async () => {
      const hasInteraction = await wallet.openapi.hasInteraction(
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
    const { id, protocol } = contractCall.contract;
    const result: WrapTokenRequireData = {
      id,
      protocol: protocol,
      bornAt: 0,
      hasInteraction: false,
      rank: null,
    };
    queue.add(async () => {
      const credit = await wallet.openapi.getContractCredit(id, chainId);
      result.rank = credit.rank_at;
    });
    queue.add(async () => {
      const { desc } = await wallet.openapi.addrDesc(id);
      if (desc.contract && desc.contract[chainId]) {
        result.bornAt = desc.contract[chainId].create_at;
      }
    });
    queue.add(async () => {
      const hasInteraction = await wallet.openapi.hasInteraction(
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
    };
    queue.add(async () => {
      const { has_transfer } = await wallet.openapi.hasTransfer(
        chainId,
        address,
        actionData.send!.to
      );
      result.hasTransfer = has_transfer;
    });
    queue.add(async () => {
      const { desc } = await wallet.openapi.addrDesc(actionData.send!.to);
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
        const { cex_list } = await wallet.openapi.depositCexList(
          actionData.send!.token.id,
          chainId
        );
        if (cex_list.some((cex) => cex.id === result.cex!.id)) {
          result.cex.supportToken = true;
        } else {
          result.cex.supportToken = false;
        }
      }
      if (result.contract) {
        const { is_token } = await wallet.openapi.isTokenContract(
          chainId,
          actionData.send!.to
        );
        result.isTokenContract = is_token;
      }
      result.name = desc.name;
    });
    queue.add(async () => {
      const usedChainList = await wallet.openapi.addrUsedChainList(
        actionData.send!.to
      );
      result.usedChains = usedChainList;
    });
    const whitelist = await wallet.getWhitelist();
    result.onTransferWhitelist = whitelist.includes(
      actionData.send.to.toLowerCase()
    );
    await waitQueueFinished(queue);
    return result;
  }
  if (actionData.approveToken) {
    const { token, spender } = actionData.approveToken;
    return await fetchTokenApproveRequireData({
      wallet,
      chainId,
      address,
      token,
      spender,
    });
  }
  if (actionData.revokeToken) {
    const { token, spender } = actionData.revokeToken;
    return await fetchTokenApproveRequireData({
      wallet,
      chainId,
      address,
      token,
      spender,
    });
  }
  if (actionData.cancelTx) {
    const chain = Object.values(CHAINS).find(
      (chain) => chain.serverId === chainId
    );
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
    };
    queue.add(async () => {
      const { has_transfer } = await wallet.openapi.hasTransfer(
        chainId,
        address,
        actionData.sendNFT!.to
      );
      result.hasTransfer = has_transfer;
    });
    queue.add(async () => {
      const { desc } = await wallet.openapi.addrDesc(actionData.sendNFT!.to);
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
        const { cex_list } = await wallet.openapi.depositCexList(
          actionData.sendNFT!.nft.contract_id,
          chainId
        );
        if (cex_list.some((cex) => cex.id === result.cex!.id)) {
          result.cex.supportToken = true;
        } else {
          result.cex.supportToken = false;
        }
      }
      if (result.contract) {
        const { is_token } = await wallet.openapi.isTokenContract(
          chainId,
          actionData.sendNFT!.to
        );
        result.isTokenContract = is_token;
      }
    });
    queue.add(async () => {
      const usedChainList = await wallet.openapi.addrUsedChainList(
        actionData.sendNFT!.to
      );
      result.usedChains = usedChainList;
    });

    await waitQueueFinished(queue);
    return result;
  }
  if (actionData.approveNFT) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      wallet,
      spender: actionData.approveNFT.spender,
    });
  }
  if (actionData.revokeNFT) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      wallet,
      spender: actionData.revokeNFT.spender,
    });
  }
  if (actionData.approveNFTCollection) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      wallet,
      spender: actionData.approveNFTCollection.spender,
    });
  }
  if (actionData.revokeNFTCollection) {
    return fetchNFTApproveRequiredData({
      address,
      chainId,
      wallet,
      spender: actionData.revokeNFTCollection.spender,
    });
  }
  if (actionData.contractCall && contractCall) {
    const result: ContractCallRequireData = {
      contract: null,
      rank: null,
      hasInteraction: false,
      bornAt: 0,
      protocol: contractCall.contract.protocol,
      call: contractCall,
    };
    queue.add(async () => {
      const credit = await wallet.openapi.getContractCredit(
        contractCall.contract.id,
        chainId
      );
      result.rank = credit.rank_at;
    });
    queue.add(async () => {
      const { desc } = await wallet.openapi.addrDesc(contractCall.contract.id);
      if (desc.contract) {
        result.contract = desc.contract;
        if (desc.contract[chainId]) {
          result.bornAt = desc.contract[chainId].create_at;
        }
      }
    });
    queue.add(async () => {
      const hasInteraction = await wallet.openapi.hasInteraction(
        address,
        chainId,
        contractCall.contract.id
      );
      result.hasInteraction = hasInteraction.has_interaction;
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
  if (actionData.swap) {
    const data = requireData as SwapRequireData;
    const {
      receiver,
      receiveToken,
      slippageTolerance,
      usdValuePercentage,
    } = actionData.swap;
    const { sender, id } = data;
    return {
      swap: {
        receiveTokenIsScam: !!receiveToken.is_suspicious,
        receiveTokenIsFake: receiveToken.is_verified === false,
        receiver,
        from: sender,
        chainId,
        contractAddress: id,
        slippageTolerance,
        usdValuePercentage,
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
        onTransferWhitelist: data.onTransferWhitelist,
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
