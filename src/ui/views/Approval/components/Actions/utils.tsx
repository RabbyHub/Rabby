import { WalletControllerType, isSameAddress, useWallet } from '@/ui/utils';
import {
  ExplainTxResponse,
  TokenItem,
  ParseTxResponse,
  SwapAction,
  SendAction,
  ContractDesc,
} from '@debank/rabby-api/dist/types';
import {
  ContextActionData,
  UserData,
} from '@debank/rabby-security-engine/dist/rules';
import BigNumber from 'bignumber.js';
import { useState, useCallback, useEffect } from 'react';

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
      actualReceiveToken ? actualReceiveToken.amount : 0,
      receiveToken.min_amount || 0
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
}

export type ActionRequireData = SwapRequireData | SendRequireData | null;

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
    try {
      const isScam = await wallet.openapi.isScamToken(
        actionData.swap.receiveToken.id,
        chainId
      );
      result.receiveTokenIsScam = isScam.is_scam;
    } catch (e) {
      // NOTHING
    }
    try {
      const credit = await wallet.openapi.getContractCredit(id, chainId);
      result.rank = credit.rank_at;
    } catch (error) {
      // NOTHING
    }

    try {
      const { desc } = await wallet.openapi.addrDesc(id);
      result.bornAt = desc.born_at;
    } catch (error) {
      // NOTHING
    }

    try {
      const hasInteraction = await wallet.openapi.hasInteraction(
        address,
        chainId,
        id
      );
      result.hasInteraction = hasInteraction.has_interaction;
    } catch (error) {
      // NOTHING
    }
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
    };
    try {
      const { has_transfer } = await wallet.openapi.hasTransfer(
        chainId,
        address,
        actionData.send.to
      );
      result.hasTransfer = has_transfer;
    } catch (e) {
      //
    }
    try {
      const { desc } = await wallet.openapi.addrDesc(actionData.send.to);
      if (desc.cex) {
        result.cex = {
          id: desc.cex.id,
          logo: desc.cex.logo_url,
          name: desc.cex.name,
          bornAt: desc.born_at,
          isDeposit: desc.cex.is_deposit,
        };
      }
      if (desc.contract) {
        result.contract = desc.contract;
      }
      if (!desc.cex && !desc.contract) {
        result.eoa = {
          id: actionData.send.to,
          bornAt: desc.born_at,
        };
      }
    } catch (e) {
      //
    }
    if (result.cex) {
      try {
        const { cex_list } = await wallet.openapi.depositCexList(
          actionData.send.token.id,
          chainId
        );
        if (cex_list.some((cex) => cex.id === result.cex!.id)) {
          result.cex.supportToken = true;
        } else {
          result.cex.supportToken = false;
        }
      } catch (e) {
        //
      }
    }
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
