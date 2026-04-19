import React from 'react';
import { Spin } from 'antd';

import {
  parseApprovalSpenderSelection,
  useApprovalsPage,
} from '../hooks/useManageApprovalsPage';
import { ApprovalCard } from './ApprovalCard';
import { EmptyState } from './EmptyState';
import { SkeletonLoading } from './SkeletonLoading';
import { useTranslation } from 'react-i18next';

export const ListByContracts: React.FC = () => {
  const {
    isLoading,
    displaySortedContractList,
    contractRevokeMap,
    contractEmptyStatus,
    searchKw,
    setSearchKw,
    toggleContractSelection,
    openContractDetail,
  } = useApprovalsPage();

  const { t } = useTranslation();

  if (isLoading) {
    return <SkeletonLoading />;
  }

  if (!displaySortedContractList.length) {
    return (
      <EmptyState
        text={
          contractEmptyStatus === 'none'
            ? t('page.manageApprovals.ListByContracts.noApprovals')
            : t('page.manageApprovals.ListByContracts.notMatched')
        }
        onReset={searchKw ? () => setSearchKw('') : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {displaySortedContractList.map((contract) => {
        const selection = parseApprovalSpenderSelection(contract, 'contract', {
          curAllSelectedMap: contractRevokeMap,
        });

        return (
          <ApprovalCard
            key={`${contract.chain}-${contract.id}`}
            selected={selection.isSelectedAll}
            partial={selection.isSelectedPartial}
            title={contract.name}
            logoUrl={contract.logo_url}
            chainServerId={contract.chain}
            count={contract.list.length}
            riskyText={
              ['danger', 'warning'].includes(contract.risk_level)
                ? contract.risk_alert
                : undefined
            }
            selectedBackground={
              selection.isSelectedAll || selection.isSelectedPartial
            }
            onToggle={() => toggleContractSelection(contract)}
            onOpenDetail={() => openContractDetail(contract)}
          />
        );
      })}
    </div>
  );
};
