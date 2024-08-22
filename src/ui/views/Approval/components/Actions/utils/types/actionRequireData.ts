import {
  ContractDesc,
  UsedChain,
  CollectionWithFloorPrice,
  TokenItem,
  ParseTxResponse,
  Chain,
} from '@rabby-wallet/rabby-api/dist/types';
import { TransactionGroup } from './walletProvider';

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

export type RevokeTokenApproveRequireData = ApproveTokenRequireData;

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

export type ApproveNFTRequireData = Omit<ApproveTokenRequireData, 'token'> & {
  tokenBalance: string;
};

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

export interface ReceiverData {
  title?: string;
  address: string;
  chain: Chain;
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
  hasTransfer: boolean;
  isTokenContract: boolean;
  name: string | null;
  onTransferWhitelist: boolean;
  token?: TokenItem;
  isLabelAddress?: boolean;
  labelAddressLogo?: string;
  hasReceiverMnemonicInWallet?: boolean;
  hasReceiverPrivateKeyInWallet?: boolean;
  rank?: number;
}

export interface ContractRequireData {
  id: string;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  bornAt: number;
  hasInteraction: boolean;
  rank: number | null;
  unexpectedAddr: ReceiverData | null;
  receiverInWallet: boolean;
}

export interface AssetOrderRequireData extends ContractRequireData {
  sender: string;
}

export interface MultiSigRequireData {
  id: string;
  contract: Record<string, ContractDesc> | null;
}

export interface SwapTokenOrderRequireData extends ContractRequireData {
  sender: string;
}

export type BatchApproveTokenRequireData = Omit<
  ApproveTokenRequireData,
  'token'
> & {
  tokens: TokenItem[];
};

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
  | SwapTokenOrderRequireData
  | ContractRequireData
  | MultiSigRequireData
  | BatchApproveTokenRequireData
  | null;
