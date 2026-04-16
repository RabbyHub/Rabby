import React from 'react';
import { Spin } from 'antd';

import {
  getAssetApprovalPrimaryText,
  parseApprovalSpenderSelection,
  useApprovalsPage,
} from '../hooks/useManageApprovalsPage';
import { ApprovalCard } from './ApprovalCard';
import { EmptyState } from './EmptyState';

export const ListByAssets: React.FC = () => {
  const {
    isLoading,
    displaySortedAssetApprovalList,
    assetRevokeMap,
    assetEmptyStatus,
    searchKw,
    setSearchKw,
    toggleAssetSelection,
    openAssetDetail,
  } = useApprovalsPage();

  if (isLoading) {
    return (
      <div className="py-[48px] text-center">
        <Spin />
      </div>
    );
  }

  if (!displaySortedAssetApprovalList.length) {
    return (
      <EmptyState
        text={assetEmptyStatus === 'none' ? 'No approvals' : 'Not Matched'}
        onReset={searchKw ? () => setSearchKw('') : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {displaySortedAssetApprovalList.map((assetApproval) => {
        const selection = parseApprovalSpenderSelection(
          assetApproval,
          'assets',
          {
            curAllSelectedMap: assetRevokeMap,
          }
        );

        return (
          <ApprovalCard
            key={`${assetApproval.type}-${assetApproval.chain}-${assetApproval.id}`}
            selected={selection.isSelectedAll}
            partial={selection.isSelectedPartial}
            title={getAssetApprovalPrimaryText(assetApproval)}
            logoUrl={assetApproval.logo_url}
            chainServerId={assetApproval.chain}
            count={assetApproval.list.length}
            selectedBackground={
              selection.isSelectedAll || selection.isSelectedPartial
            }
            onToggle={() => toggleAssetSelection(assetApproval)}
            onOpenDetail={() => openAssetDetail(assetApproval)}
            badge={
              assetApproval.type === 'nft' ? (
                <span className="inline-flex items-center rounded-full bg-r-neutral-bg-3 px-[8px] py-[2px] text-[12px] text-r-neutral-body">
                  {assetApproval.nftToken ? 'NFT' : 'Collection'}
                </span>
              ) : null
            }
          />
        );
      })}
    </div>
  );
};
