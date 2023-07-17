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
  $contractRiskEvaluation: ComputedRiskEvaluation;
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
    readonly $assetToken?: TokenApproval;
    readonly $assetContract?: ContractApprovalItem;
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
    readonly $assetToken?: NFTApproval | NFTApprovalContract;
    readonly $assetContract?: ContractApprovalItem;
  })[];
  chain: string;
  $riskAboutValues: ComputedRiskAboutValues;
};

export type ComputedRiskAboutValues = {
  risk_exposure_usd_value: number;
  is_exposure_usd_value_unknown: boolean;
  approve_user_count: number;
  revoke_user_count: number;
  last_approve_at: number;
};

export type ApprovalRiskLevel = 'safe' | 'warning' | 'danger';
export const RiskNumMap = {
  unknown: 0,
  safe: 1,
  warning: 10,
  danger: 100,
} as const;
type RiskLevelScore = typeof RiskNumMap[ApprovalRiskLevel];

export type ComputedRiskEvaluation = {
  serverRiskScore: RiskLevelScore;
  clientMaxRiskScore: RiskLevelScore;
  clientTotalRiskScore: number;

  extra: {
    serverRiskLevel: ApprovalRiskLevel;

    clientExposureLevel: ApprovalRiskLevel;
    clientExposureScore: RiskLevelScore;

    clientApprovalLevel: ApprovalRiskLevel;
    clientApprovalScore: RiskLevelScore;
  };
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
      is_exposure_usd_value_unknown:
        spender?.exposure_nft_usd_value === null ||
        typeof spender?.exposure_nft_usd_value !== 'number',
      approve_user_count: coerceInteger(spender?.approve_user_count, 0),
      revoke_user_count: coerceInteger(spender?.revoke_user_count, 0),
      last_approve_at: coerceInteger(spender?.last_approve_at, 0),
    };
  }

  return {
    risk_exposure_usd_value: coerceFloat(spender?.exposure_usd_value, 0),
    is_exposure_usd_value_unknown:
      spender?.exposure_usd_value === null ||
      typeof spender?.exposure_usd_value !== 'number',
    approve_user_count: coerceInteger(spender?.approve_user_count, 0),
    revoke_user_count: coerceInteger(spender?.revoke_user_count, 0),
    last_approve_at: coerceInteger(spender?.last_approve_at, 0),
  };
}

export function getContractRiskEvaluation(
  risk_level: ApprovalRiskLevel | string,
  riskValues: ComputedRiskAboutValues
): ComputedRiskEvaluation {
  const serverRiskLevel = risk_level as ApprovalRiskLevel;
  const serverRiskScore = coerceInteger(
    RiskNumMap[serverRiskLevel],
    0
  ) as RiskLevelScore;

  const exposureValue = coerceFloat(riskValues.risk_exposure_usd_value);
  const clientExposureLevel: ApprovalRiskLevel = riskValues?.is_exposure_usd_value_unknown
    ? 'safe'
    : exposureValue < 1e4
    ? 'danger'
    : exposureValue < 1e5
    ? 'warning'
    : 'safe';
  const clientExposureScore = coerceInteger(
    RiskNumMap[clientExposureLevel],
    0
  ) as RiskLevelScore;

  const approve_user_count = coerceInteger(
    riskValues.approve_user_count
  ) as RiskLevelScore;
  const revoke_user_count = coerceInteger(
    riskValues.revoke_user_count
  ) as RiskLevelScore;

  const clientApprovalLevel: ApprovalRiskLevel =
    revoke_user_count < 10
      ? 'safe'
      : revoke_user_count > approve_user_count * 4
      ? 'danger'
      : revoke_user_count > approve_user_count * 2
      ? 'warning'
      : 'safe';

  const clientApprovalScore = coerceInteger(
    RiskNumMap[clientApprovalLevel],
    0
  ) as RiskLevelScore;

  const allClientScores = [clientExposureScore, clientApprovalScore];

  const clientMaxRiskScore = Math.max(...allClientScores) as RiskLevelScore;

  const clientTotalRiskScore = allClientScores.reduce(
    (acc, cur) => (acc + cur) as RiskLevelScore,
    0
  );

  return {
    serverRiskScore,
    clientTotalRiskScore,
    clientMaxRiskScore,

    extra: {
      serverRiskLevel,

      clientExposureLevel,
      clientExposureScore,

      clientApprovalLevel,
      clientApprovalScore,
    },
  };
}

/**
 * @description compare contract approval item by risk score,
 * it's supposed to make descending order
 *
 * if a's risk score greater than b's, return 1
 * if a's risk score less than b's, return -1
 * if a's risk score equal to b's, return 0
 *
 * @param a
 * @param b
 */
export function compareContractApprovalItemByRiskLevel(
  a: ContractApprovalItem,
  b: ContractApprovalItem
) {
  const aRisk =
    a.$contractRiskEvaluation ||
    getContractRiskEvaluation(a.risk_level, a.$riskAboutValues);
  const bRisk =
    b.$contractRiskEvaluation ||
    getContractRiskEvaluation(b.risk_level, a.$riskAboutValues);

  if (aRisk.serverRiskScore !== bRisk.serverRiskScore) {
    return aRisk.serverRiskScore > bRisk.serverRiskScore ? 1 : -1;
  }

  if (aRisk.clientTotalRiskScore !== bRisk.clientTotalRiskScore) {
    return aRisk.clientTotalRiskScore > bRisk.clientTotalRiskScore ? 1 : -1;
  }

  if (aRisk.clientMaxRiskScore !== bRisk.clientMaxRiskScore) {
    return aRisk.clientMaxRiskScore > bRisk.clientMaxRiskScore ? 1 : -1;
  }

  return 0;
}

export function markParentForAssetItemSpender(
  spender: Spender,
  parent: AssetApprovalItem,
  assetContract: ContractApprovalItem,
  assetToken: TokenApproval | NFTApproval | NFTApprovalContract
) {
  Object.defineProperty(spender, '$assetParent', {
    enumerable: false,
    configurable: process.env.NODE_ENV === 'production',
    get() {
      return parent;
    },
  });
  Object.defineProperty(spender, '$assetContract', {
    enumerable: false,
    configurable: process.env.NODE_ENV === 'production',
    get() {
      return assetContract;
    },
  });
  Object.defineProperty(spender, '$assetToken', {
    enumerable: false,
    configurable: process.env.NODE_ENV === 'production',
    get() {
      return assetToken;
    },
  });

  return spender;
}

export function getSpenderApprovalAmount(spender: AssetApprovalSpender) {
  let absValue = spender.value || 0;
  const bigValue = new BigNumber(absValue);

  const isUnlimited = bigValue.gte(10 ** 9);
  const stepNumberText = splitNumberByStep(bigValue.toFixed(2));
  let displayText = stepNumberText;

  if (spender.$assetParent?.type === 'nft') {
    if (spender.$assetParent?.nftContract?.is_erc721) {
      absValue = 1;
      displayText = '1 Collection';
    } else if (spender.$assetParent?.nftToken) {
      // TODO: is that right?
      absValue = 1;
      displayText = '1 NFT';
    }
  }

  return {
    bigValue,
    isUnlimited,
    stepNumberText,
    displayText,
  };
}
