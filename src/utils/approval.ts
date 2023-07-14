import {
  NFTApproval,
  NFTApprovalContract,
  Spender,
  TokenApproval,
} from '@/background/service/openapi';
import { coerceFloat, coerceInteger } from '@/ui/utils';

export type ApprovalItem =
  | ContractApprovalItem
  | TokenApprovalItem
  | NftApprovalItem;

export type AssetApprovalItem = TokenApprovalItem | NftApprovalItem;

type ContractFor = 'nft' | 'nft-contract' | 'token';
type GetContractTypeByContractFor<T extends ContractFor> = T extends 'nft'
  ? NFTApproval
  : T extends 'nft-contract'
  ? NFTApprovalContract
  : T extends 'token'
  ? TokenApproval
  : unknown;

export type ContractApprovalItem<T extends ContractFor = ContractFor> = {
  name: string;
  logo_url: string;
  risk_level: string;
  risk_alert?: string;
  id: string;
  type: 'contract';
  contractFor: T;

  list: GetContractTypeByContractFor<T>[];
  chain: string;
  $riskAboutValues: ComputedRiskAboutValues;
};

export type TokenApprovalItem = {
  name: string;
  logo_url: string;
  risk_level: string;
  risk_alert?: string;
  id: string;
  type: 'token';
  balance: number;

  list: Spender[];
  chain: string;
  $riskAboutValues: ComputedRiskAboutValues;
};

export type NftApprovalItem = {
  nftContract?: NFTApprovalContract;
  nftToken?: NFTApproval;
} & {
  name: string;
  logo_url: string;
  risk_level: string;
  risk_alert?: string;
  id: string;
  type: 'nft';
  amount: string;

  list: Spender[];
  chain: string;
  $riskAboutValues: ComputedRiskAboutValues;
};

export type ComputedRiskAboutValues = {
  risk_exposure_usd_value: number;
  approve_user_count: number;
  revoke_user_count: number;
  last_approve_at: number;
};

export function isContractType(
  contract: ContractApprovalItem,
  type: 'nft'
): contract is ContractApprovalItem<'nft'>;
export function isContractType(
  contract: ContractApprovalItem,
  type: 'nft-contract'
): contract is ContractApprovalItem<'nft-contract'>;
export function isContractType(
  contract: ContractApprovalItem,
  type: 'token'
): contract is ContractApprovalItem<'token'>;
export function isContractType<T extends ContractFor>(
  contract: ContractApprovalItem,
  type: T
): boolean {
  return contract.contractFor === type;
}

export function makeComputedRiskAboutValues(
  contractFor: ContractFor,
  spender?: Spender
): ComputedRiskAboutValues {
  if (contractFor === 'nft' || contractFor === 'nft-contract') {
    return {
      risk_exposure_usd_value: coerceFloat(spender?.exposure_nft_usd_value, 0),
      approve_user_count: coerceInteger(spender?.approve_user_count, 0),
      revoke_user_count: coerceInteger(spender?.revoke_user_count, 0),
      last_approve_at: coerceInteger(spender?.last_approve_at, 0),
    };
  }

  return {
    risk_exposure_usd_value: coerceFloat(spender?.exposure_usd_value, 0),
    approve_user_count: coerceInteger(spender?.approve_user_count, 0),
    revoke_user_count: coerceInteger(spender?.revoke_user_count, 0),
    last_approve_at: coerceInteger(spender?.last_approve_at, 0),
  };
}
