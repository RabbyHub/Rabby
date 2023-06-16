import PQueue from 'p-queue';
import {
  ParseTypedDataResponse,
  SellNFTOrderAction,
  SignMultiSigActions,
  ContractDesc,
  BuyNFTOrderAction,
  PermitAction,
  Permit2Action,
  TokenItem,
  SwapTokenOrderAction,
  CreateKeyAction,
  VerifyAddressAction,
} from '@debank/rabby-api/dist/types';
import { ContextActionData } from '@rabby-wallet/rabby-security-engine/dist/rules';
import BigNumber from 'bignumber.js';
import { WalletControllerType, getTimeSpan } from '@/ui/utils';
import {
  waitQueueFinished,
  getProtocol,
  calcUSDValueChange,
} from '../Actions/utils';
import { CHAINS } from 'consts';
import { Chain } from 'background/service/openapi';

interface PermitActionData extends PermitAction {
  expire_at: number | undefined;
}

interface Permit2ActionData extends Permit2Action {
  sig_expire_at: number | undefined;
}

export interface TypedDataActionData {
  chainId?: string;
  contractId?: string;
  sender: string;
  sellNFT?: SellNFTOrderAction;
  signMultiSig?: SignMultiSigActions;
  buyNFT?: BuyNFTOrderAction;
  permit?: PermitActionData;
  permit2?: Permit2ActionData;
  swapTokenOrder?: {
    payToken: TokenItem;
    receiveToken: TokenItem;
    receiver: string;
    usdValueDiff: string;
    usdValuePercentage: number;
    expireAt: number | null;
  };
  createKey?: CreateKeyAction;
  verifyAddress?: VerifyAddressAction;
  contractCall?: object;
}

export const parseAction = (
  data: ParseTypedDataResponse,
  typedData: null | Record<string, any>,
  sender: string
): TypedDataActionData => {
  const result: TypedDataActionData = {
    sender,
  };
  if (typedData?.domain) {
    if (typedData.domain.verifyingContract) {
      result.contractId = typedData.domain.verifyingContract;
    }
    if (typedData.domain.chainId) {
      result.chainId = typedData.domain.chainId;
    }
  }
  switch (data.action?.type) {
    case 'sell_nft_order': {
      const actionData = data.action.data as SellNFTOrderAction;
      result.sellNFT = actionData;
      return result;
    }
    case 'buy_nft_order': {
      const actionData = data.action.data as BuyNFTOrderAction;
      result.buyNFT = actionData;
      return result;
    }
    case 'permit1_approve_token': {
      const actionData = data.action.data as PermitAction;
      result.permit = {
        ...actionData,
        expire_at: data.action.expire_at,
      };
      return result;
    }
    case 'permit2_approve_token': {
      const actionData = data.action.data as Permit2Action;
      result.permit2 = {
        ...actionData,
        sig_expire_at: data.action.expire_at,
      };
      return result;
    }
    case 'sign_multisig': {
      const actionData = data.action.data as SignMultiSigActions;
      result.signMultiSig = actionData;
      return result;
    }
    case 'swap_token_order': {
      const actionData = data.action.data as SwapTokenOrderAction;
      const receiveTokenUsdValue = new BigNumber(
        actionData.receive_token.raw_amount || '0'
      )
        .div(10 ** actionData.receive_token.decimals)
        .times(actionData.receive_token.price);
      const payTokenUsdValue = new BigNumber(
        actionData.pay_token.raw_amount || '0'
      )
        .div(10 ** actionData.pay_token.decimals)
        .times(actionData.pay_token.price);
      const usdValueDiff = receiveTokenUsdValue
        .minus(payTokenUsdValue)
        .toFixed();
      const usdValuePercentage = calcUSDValueChange(
        payTokenUsdValue.toFixed(),
        receiveTokenUsdValue.toFixed()
      );
      result.swapTokenOrder = {
        payToken: actionData.pay_token,
        receiveToken: actionData.receive_token,
        receiver: actionData.receiver,
        usdValueDiff,
        usdValuePercentage,
        expireAt: actionData.expire_at,
      };
      return result;
    }
    case 'create_key':
      result.createKey = data.action.data as CreateKeyAction;
      return result;
    case 'verify_address':
      result.verifyAddress = data.action.data as VerifyAddressAction;
      return result;
    default:
      break;
  }
  if (result.chainId && result.contractId) {
    result.contractCall = {};
  }
  return result;
};

export interface ContractRequireData {
  id: string;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  bornAt: number;
  hasInteraction: boolean;
  rank: number | null;
}

const fetchContractRequireData = async (
  id: string,
  chainId: string,
  sender: string,
  wallet: WalletControllerType
) => {
  const queue = new PQueue();
  const result: ContractRequireData = {
    id,
    protocol: null,
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
    } else {
      result.bornAt = desc.born_at;
    }
    result.protocol = getProtocol(desc.protocol, chainId);
  });
  queue.add(async () => {
    const hasInteraction = await wallet.openapi.hasInteraction(
      sender,
      chainId,
      id
    );
    result.hasInteraction = hasInteraction.has_interaction;
  });
  await waitQueueFinished(queue);
  return result;
};

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
    result.protocol = getProtocol(desc.protocol, chainId);
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

export interface MultiSigRequireData {
  id: string;
  contract: Record<string, ContractDesc> | null;
}

export interface SwapTokenOrderRequireData extends ContractRequireData {
  sender: string;
}

export type TypedDataRequireData =
  | SwapTokenOrderRequireData
  | ContractRequireData
  | MultiSigRequireData
  | ApproveTokenRequireData
  | null;

export const fetchRequireData = async (
  actionData: TypedDataActionData,
  sender: string,
  wallet: WalletControllerType
): Promise<TypedDataRequireData> => {
  let chain: Chain | undefined;
  if (actionData.chainId) {
    chain = Object.values(CHAINS).find(
      (item) => item.id === Number(actionData.chainId)
    );
  }
  if (actionData.sellNFT) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        wallet
      );
      return contractRequireData;
    }
  }
  if (actionData.buyNFT) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        wallet
      );
      return contractRequireData;
    }
  }
  if (actionData.signMultiSig) {
    const result: MultiSigRequireData = {
      contract: null,
      id: actionData.signMultiSig.multisig_id,
    };
    const { desc } = await wallet.openapi.addrDesc(
      actionData.signMultiSig.multisig_id
    );
    if (desc.contract) {
      result.contract = desc.contract;
    }
    return result;
  }
  if (actionData.swapTokenOrder) {
    if (chain && actionData.contractId) {
      const contractRequireData = await fetchContractRequireData(
        actionData.contractId,
        chain.serverId,
        sender,
        wallet
      );
      return contractRequireData;
    }
  }
  if (actionData.permit || actionData.permit2) {
    const data = (actionData.permit || actionData.permit2)!;
    if (chain && actionData.contractId) {
      const tokenApproveRequireData = await fetchTokenApproveRequireData({
        spender: data.spender,
        token: data.token,
        address: sender,
        chainId: chain.serverId,
        wallet,
      });
      return tokenApproveRequireData;
    }
  }
  if (chain && actionData.contractId) {
    return await fetchContractRequireData(
      actionData.contractId,
      chain.serverId,
      sender,
      wallet
    );
  }
  return null;
};

export const getActionTypeText = (data: TypedDataActionData) => {
  if (data.permit) {
    return 'Permit Token Approval';
  }
  if (data.permit2) {
    return 'Permit2 Token Approval';
  }
  if (data.swapTokenOrder) {
    return 'Token Order';
  }
  if (data.buyNFT || data.sellNFT) {
    return 'NFT Order';
  }
  if (data.signMultiSig) {
    return 'Confirm Transaction';
  }
  if (data.createKey) {
    return 'Create Key';
  }
  if (data.verifyAddress) {
    return 'Verify Address';
  }
  if (data.contractCall) {
    return 'Contract Call';
  }
  return '';
};

export const formatSecurityEngineCtx = ({
  actionData,
  requireData,
}: {
  actionData: TypedDataActionData;
  requireData: TypedDataRequireData;
}): ContextActionData => {
  if (actionData?.permit) {
    const data = requireData as ApproveTokenRequireData;
    return {
      permit: {
        spender: actionData.permit.spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
      },
    };
  }
  if (actionData?.permit2) {
    const data = requireData as ApproveTokenRequireData;
    return {
      permit2: {
        spender: actionData.permit2.spender,
        isEOA: data.isEOA,
        riskExposure: data.riskExposure,
        deployDays: getTimeSpan(Math.floor(Date.now() / 1000) - data.bornAt).d,
        hasInteracted: data.hasInteraction,
        isDanger: !!data.isDanger,
      },
    };
  }
  if (actionData?.buyNFT) {
    const receiveNFTIsFake =
      actionData.buyNFT.receive_nft.collection?.is_verified === false;
    const receiveNFTIsScam = receiveNFTIsFake
      ? false
      : !!actionData.buyNFT.receive_nft.collection?.is_suspicious;
    return {
      buyNFT: {
        from: actionData.sender,
        receiver: actionData.buyNFT.receiver,
        receiveNFTIsFake,
        receiveNFTIsScam,
      },
    };
  }
  if (actionData?.sellNFT) {
    const receiveTokenIsFake =
      actionData.sellNFT.receive_token.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!actionData.sellNFT.receive_token.is_suspicious;
    return {
      sellNFT: {
        specificBuyer: actionData.sellNFT.takers[0],
        from: actionData.sender,
        receiver: actionData.sellNFT.receiver,
        receiveTokenIsFake,
        receiveTokenIsScam,
      },
    };
  }
  if (actionData?.swapTokenOrder) {
    const receiveTokenIsFake =
      actionData.swapTokenOrder.receiveToken.is_verified === false;
    const receiveTokenIsScam = receiveTokenIsFake
      ? false
      : !!actionData.swapTokenOrder.receiveToken.is_suspicious;
    return {
      swapTokenOrder: {
        receiveTokenIsFake,
        receiveTokenIsScam,
        receiver: actionData.swapTokenOrder.receiver,
        from: actionData.sender,
        usdValuePercentage: actionData.swapTokenOrder.usdValuePercentage,
      },
    };
  }
  if (actionData?.createKey) {
    return {
      createKey: {
        allowOrigins: actionData.createKey.allow_origins,
        origin,
      },
    };
  }
  if (actionData?.verifyAddress) {
    return {
      verifyAddress: {
        allowOrigins: actionData.verifyAddress.allow_origins,
        origin,
      },
    };
  }
  return {};
};
