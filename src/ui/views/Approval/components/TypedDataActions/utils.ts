import PQueue from 'p-queue';
import {
  ParseTypedDataResponse,
  SellNFTOrderAction,
  SignMultiSigActions,
  ContractDesc,
} from '@debank/rabby-api/dist/types';
import { WalletControllerType, isSameAddress } from '@/ui/utils';
import { waitQueueFinished, getProtocol } from '../Actions/utils';
import { CHAINS } from 'consts';
import { Chain } from 'background/service/openapi';

export interface TypedDataActionData {
  chainId?: string;
  contractId?: string;
  sellNFT?: SellNFTOrderAction;
  signMultiSig?: SignMultiSigActions;
}

export const parseAction = (
  data: ParseTypedDataResponse,
  typedData: null | Record<string, any>
): TypedDataActionData => {
  const result: TypedDataActionData = {};
  if (typedData?.domain) {
    if (typedData.domain.verifyingContract) {
      result.contractId = typedData.domain.verifyingContract;
    }
    if (typedData.domain.chainId) {
      result.chainId = typedData.domain.chainId;
    }
  }
  switch (data.action.type) {
    case 'sell_nft_order': {
      const actionData = data.action.data as SellNFTOrderAction;
      result.sellNFT = actionData;
      break;
    }
    case 'sign_multisig': {
      const actionData = data.action.data as SignMultiSigActions;
      result.signMultiSig = actionData;
      break;
    }
  }
  return result;
};

interface ContractRequireData {
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

interface MultiSigRequireData {
  id: string;
  contract: Record<string, ContractDesc> | null;
}

type TypedDataRequireData = ContractRequireData | MultiSigRequireData | null;

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
  }
  return null;
};
