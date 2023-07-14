import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import { coerceFloat, coerceInteger } from '@/ui/utils';
import {
  ApprovalItem,
  AssetApprovalItem,
  ComputedRiskAboutValues,
  ContractApprovalItem,
  isContractType,
} from '@/utils/approval';
import { Chain } from '@debank/common';
import { Spender } from '@rabby-wallet/rabby-api/dist/types';

export function getAssetApprovalItemApprovedAmount(row: AssetApprovalItem) {
  return row.list.reduce((accu, item) => {
    switch (row.type) {
      default:
      case 'nft':
      case 'token': {
        return accu + coerceFloat(item.value);
      }
    }
  }, 0);
}

export function formatTimeFromNow(time?: Date | number) {
  if (!time) return '';

  const obj = dayjs(time);
  if (!obj.isValid()) return '';

  return dayjs(time).fromNow();
}

export function makeContractApprovalItem(
  chainServerId: Chain['serverId'],
  spender: Spender,
  options?: {
    fallbackLogoUrl?: string;
  }
) {
  return {
    list: [],
    chain: chainServerId,
    risk_level: spender.risk_level,
    risk_alert: spender.risk_alert,
    risk_exposure_nft_usd_value: spender.exposure_nft_usd_value || 0,
    approve_user_count: spender.approve_user_count || 0,
    revoke_user_count: spender.revoke_user_count || 0,
    id: spender.id,
    name: spender?.protocol?.name || 'Unknown Contract',
    logo_url: spender.protocol?.logo_url || options?.fallbackLogoUrl || '',
    type: 'contract',
  } as const;
}

export function accumulateRiskAboutValues(
  contractFor: ContractApprovalItem['contractFor'],
  accu: ComputedRiskAboutValues,
  spender?: Spender
) {
  if (contractFor === 'nft' || contractFor === 'nft-contract') {
    accu.risk_exposure_usd_value += coerceFloat(
      spender?.exposure_nft_usd_value,
      0
    );
  } else if (contractFor === 'token') {
    accu.risk_exposure_usd_value += coerceFloat(spender?.exposure_usd_value, 0);
  }

  accu.approve_user_count += coerceInteger(spender?.approve_user_count, 0);
  accu.revoke_user_count += coerceInteger(spender?.revoke_user_count, 0);

  accu.last_approve_at = Math.max(
    accu.last_approve_at,
    coerceFloat(spender?.last_approve_at, 0)
  );
}

export function getRiskAboutValues(
  approvalItem: ApprovalItem
): ComputedRiskAboutValues {
  const result = {
    risk_exposure_usd_value: 0,
    approve_user_count: 0,
    revoke_user_count: 0,
    last_approve_at: 0,
  };

  if (approvalItem.type === 'contract') {
    const aItem = approvalItem as ContractApprovalItem;

    if (isContractType(aItem, 'nft') || isContractType(aItem, 'nft-contract')) {
      aItem.list?.forEach((item) => {
        accumulateRiskAboutValues(aItem.contractFor, result, item?.spender);
      });
    } else if (isContractType(aItem, 'token')) {
      aItem.list?.forEach((item) => {
        item.spenders?.forEach((spender) => {
          accumulateRiskAboutValues(aItem.contractFor, result, spender);
        });
      });
    }
  }

  return result;
}

export function isRiskyContract(contract: ContractApprovalItem) {
  return ['danger', 'warning'].includes(contract.risk_level);
}
