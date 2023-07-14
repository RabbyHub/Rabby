import {
  NFTApproval,
  NFTApprovalContract,
  Spender,
  TokenApproval,
} from '@/background/service/openapi';
import { coerceFloat, coerceInteger, splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';

export type ApprovalItem =
  | ContractApprovalItem
  | TokenApprovalItem
  | NftApprovalItem;

export type AssetApprovalItem = TokenApprovalItem | NftApprovalItem;
export type AssetApprovalSpender =
  | TokenApprovalItem['list'][number]
  | NftApprovalItem['list'][number];

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

  list: (Spender & {
    readonly $assetParent?: TokenApprovalItem;
  })[];
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

  list: (Spender & {
    readonly $assetParent?: NftApprovalItem;
  })[];
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

export type ApprovalRiskLevel = 'safe' | 'warning' | 'danger';
const RiskNumMap = {
  safe: 1,
  warning: 10,
  danger: 100,
} as const;
function getContractRiskInfo(contract: ContractApprovalItem) {
  const serverRiskLevel = contract.risk_level;
  const serverRiskScore = RiskNumMap[serverRiskLevel];

  const exposureValue = coerceFloat(
    contract.$riskAboutValues.risk_exposure_usd_value
  );
  const clientExposureLevel =
    exposureValue < 1e4 ? 'danger' : exposureValue < 1e6 ? 'warning' : 'safe';
  const clientExposureScore = RiskNumMap[clientExposureLevel];

  const approve_user_count = coerceInteger(
    contract.$riskAboutValues.approve_user_count
  );
  const revoke_user_count = coerceInteger(
    contract.$riskAboutValues.revoke_user_count
  );

  const clientApprovalLevel =
    revoke_user_count > approve_user_count * 2
      ? 'danger'
      : revoke_user_count > approve_user_count / 2
      ? 'warning'
      : 'safe';
  ('safe');
  const clientApprovalScore = RiskNumMap[clientApprovalLevel];

  const clientRiskScore = Math.max(clientExposureScore, clientApprovalScore);

  return {
    serverRiskScore,
    clientRiskScore,

    extra: {
      serverRiskLevel,

      clientExposureLevel,
      clientExposureScore,

      clientApprovalLevel,
      clientApprovalScore,
    },
  };
}

export function sortContractApprovalItems(
  contractItems: ContractApprovalItem[]
) {
  return contractItems.sort((a, b) => {
    const aRisk = getContractRiskInfo(a);
    const bRisk = getContractRiskInfo(b);

    if (aRisk.serverRiskScore !== bRisk.serverRiskScore) {
      return aRisk.serverRiskScore - bRisk.serverRiskScore;
    }

    if (aRisk.clientRiskScore !== bRisk.clientRiskScore) {
      return aRisk.clientRiskScore - bRisk.clientRiskScore;
    }

    return 0;
  });
}

export function markParentForAssetItemSpender(
  spender: Spender,
  parent: AssetApprovalItem
) {
  Object.defineProperty(spender, '$assetParent', {
    enumerable: false,
    configurable: process.env.NODE_ENV === 'production',
    get() {
      return parent;
    },
  });

  return spender;
}

export function getSpenderApprovalValue(spender: AssetApprovalSpender) {
  const bigValue = new BigNumber(spender.value || 0);
  const isUnlimited = bigValue.gte(10 ** 9);
  const stepValue = splitNumberByStep(bigValue.toFixed(2));

  return {
    bigValue,
    isUnlimited,
    stepValue,
  };
}
