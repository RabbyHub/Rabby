import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import {
  ContractApprovalItem,
  compareContractApprovalItemByRiskLevel,
} from '@/utils/approval';
import { SorterResult } from 'antd/lib/table/interface';

export function formatTimeFromNow(time?: Date | number) {
  if (!time) return '';

  const obj = dayjs(time);
  if (!obj.isValid()) return '';

  return dayjs(time).fromNow();
}

export function isRiskyContract(contract: ContractApprovalItem) {
  return ['danger', 'warning'].includes(contract.risk_level);
}

export function checkCompareContractItem(
  a: ContractApprovalItem,
  b: ContractApprovalItem,
  sortedInfo: SorterResult<ContractApprovalItem>,
  columnKey: string
) {
  const comparison = compareContractApprovalItemByRiskLevel(a, b);

  const isColumnAsc =
    sortedInfo.columnKey === columnKey && sortedInfo.order === 'ascend';

  return {
    comparison,
    shouldEarlyReturn: !!comparison,
    keepRiskFirstReturnValue: isColumnAsc ? -comparison : comparison,
  };
}
