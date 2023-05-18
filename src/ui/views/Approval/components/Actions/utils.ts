import { WalletControllerType, isSameAddress } from '@/ui/utils';
import {
  ExplainTxResponse,
  TokenItem,
  ParseTxResponse,
  SwapAction,
} from '@debank/rabby-api/dist/types';
import { ContextActionData } from '@debank/rabby-security-engine/dist/rules';
import BigNumber from 'bignumber.js';

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

export type ActionRequireData = SwapRequireData | null;

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
  return {};
};
