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
} from '@debank/rabby-api/dist/types';
import {
  ContextActionData,
  UserData,
} from '@debank/rabby-security-engine/dist/rules';
import BigNumber from 'bignumber.js';
import { useState, useCallback, useEffect } from 'react';
import PQueue from 'p-queue';
import { getTimeSpan } from 'ui/utils/time';

export interface ReceiveTokenItem extends TokenItem {
  min_amount: number;
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
}

const calcSlippageTolerance = (base: number, actual: number) => {
  if (base === 0 && actual === 0) return 0;
  if (base === 0) return 1;
  if (actual === 0) return -1;
  return (actual - base) / base;
};

export const parseAction = (
  data: ParseTxResponse['action'],
  balanceChange: ExplainTxResponse['balance_change']
): ParsedActionData => {
  if (data.type === 'swap_token') {
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
      receiveToken.min_amount || 0,
      actualReceiveToken ? actualReceiveToken.amount : 0
    );
    const receiveTokenUsdValue = new BigNumber(receiveTokenAmount).times(
      receiveToken.price
    );
    const payTokenUsdValue = new BigNumber(payToken.amount).times(
      payToken.price
    );
    const usdValueDiff = receiveTokenUsdValue.minus(payTokenUsdValue).toFixed();
    const usdValuePercentage = calcSlippageTolerance(
      Number(payTokenUsdValue),
      Number(receiveTokenUsdValue)
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
  if (data.type === 'send_token') {
    return {
      send: data.data as SendAction,
    };
  }
  if (data.type === 'approve_token') {
    const { spender, token } = data.data as ApproveAction;
    return {
      approveToken: {
        spender,
        token,
      },
    };
  }
  return {};
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
  receiveTokenIsScam: boolean;
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
}

export interface ApproveTokenRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  tokenBalance: string;
}

export type ActionRequireData =
  | SwapRequireData
  | ApproveTokenRequireData
  | SendRequireData
  | null;

const waitQueueFinished = (q: PQueue) => {
  return new Promise((resolve) => {
    q.on('empty', () => {
      if (q.pending <= 0) resolve(null);
    });
  });
};

export const fetchActionRequiredData = async ({
  actionData,
  contractCall,
  chainId,
  address,
  wallet,
}: {
  actionData: ParsedActionData;
  contractCall: ParseTxResponse['contract_call'];
  chainId: string;
  address: string;
  wallet: WalletControllerType;
}): Promise<ActionRequireData> => {
  const { id, protocol } = contractCall.contract;
  const queue = new PQueue();
  if (actionData.swap) {
    const result: SwapRequireData = {
      id,
      protocol: protocol,
      bornAt: 0,
      hasInteraction: false,
      rank: null,
      receiveTokenIsScam: false,
      sender: address,
    };
    queue.add(async () => {
      const isScam = await wallet.openapi.isScamToken(
        actionData.swap!.receiveToken.id,
        chainId
      );
      result.receiveTokenIsScam = isScam.is_scam;
    });
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
    await waitQueueFinished(queue);
    return result;
  }
  if (actionData.approveToken) {
    const result: ApproveTokenRequireData = {
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
    const { spender, token } = actionData.approveToken;
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
      result.tokenBalance = t.raw_amount_hex_str || '0';
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
    const { receiveTokenIsScam, sender, id } = data;
    return {
      swap: {
        receiveTokenIsScam,
        receiveTokenIsFake: !receiveToken.is_verified,
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
