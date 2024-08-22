import {
  TokenItem,
  NFTItem,
  RevokeTokenApproveAction,
  PushMultiSigAction,
  ApproveNFTAction,
  BatchSellNFTOrderAction,
  BuyNFTOrderAction,
  CreateCoboSafeAction,
  CreateKeyAction,
  SellNFTOrderAction,
  SendAction,
  SignMultiSigActions,
  SubmitDelegatedAddressModificationAction,
  SubmitSafeRoleModificationAction,
  SubmitTokenApprovalModificationAction,
  VerifyAddressAction,
  BatchPermit2Action,
  Permit2Action,
  PermitAction,
  RevokeNFTAction,
  SendNFTAction,
  ApproveAction,
  ApproveNFTCollectionAction,
  RevokeNFTCollectionAction,
  RevokePermit2Action,
} from '@rabby-wallet/rabby-api/dist/types';
import { ActionType } from './parseAction';

export interface ReceiveTokenItem extends TokenItem {
  min_amount: number;
  min_raw_amount: string;
}

interface PermitActionData extends PermitAction {
  expire_at: number | undefined;
}

interface Permit2ActionData extends Permit2Action {
  sig_expire_at: number | undefined;
}

interface BatchPermit2ActionData extends BatchPermit2Action {
  sig_expire_at: number | undefined;
}

type ParsedTransactionActionData = {
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
  approveToken?: ApproveAction;
  sendNFT?: SendNFTAction;
  revokeNFT?: RevokeNFTAction;
  approveNFTCollection?: ApproveNFTCollectionAction;
  revokeNFTCollection?: RevokeNFTCollectionAction;
  revokeToken?: {
    spender: string;
    token: TokenItem;
    gasUsed: number;
  };
  revokePermit2?: RevokePermit2Action;
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
  cancelTx?: {
    nonce: string;
  };
  pushMultiSig?: PushMultiSigAction;
  permit2BatchRevokeToken?: {
    permit2_id: string;
    revoke_list: RevokeTokenApproveAction[];
  };
  approveNFT?: ApproveNFTAction;
  send?: SendAction;
  contractCall?: object;
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
};

type ParsedTypedDataActionData = {
  chainId?: string;
  brand?: {
    logo_url: string;
    name: string;
  };
  contractId?: string;
  sender: string;
  actionType: string | null;
  sellNFT?: SellNFTOrderAction;
  batchSellNFT?: BatchSellNFTOrderAction;
  signMultiSig?: SignMultiSigActions;
  buyNFT?: BuyNFTOrderAction;
  permit?: PermitActionData;
  permit2?: Permit2ActionData;
  batchPermit2?: BatchPermit2ActionData;
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
  coboSafeCreate?: CreateCoboSafeAction;
  coboSafeModificationDelegatedAddress?: SubmitSafeRoleModificationAction;
  coboSafeModificationRole?: SubmitDelegatedAddressModificationAction;
  coboSafeModificationTokenApproval?: SubmitTokenApprovalModificationAction;
  revokePermit?: RevokeTokenApproveAction;
  approveNFT?: ApproveNFTAction;
  send?: SendAction;
  contractCall?: object;
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
};

export type ParsedTextActionData = {
  sender: string;
  createKey?: CreateKeyAction;
  verifyAddress?: VerifyAddressAction;
  common?: {
    desc: string;
    title: string;
    is_asset_changed: boolean;
    is_involving_privacy: boolean;
  };
};

export type ParsedActionData<
  T extends ActionType | undefined = undefined
> = T extends 'typed_data'
  ? ParsedTypedDataActionData
  : T extends 'transaction'
  ? ParsedTransactionActionData
  : T extends 'text'
  ? ParsedTextActionData
  :
      | ParsedTransactionActionData
      | ParsedTypedDataActionData
      | ParsedTextActionData;
