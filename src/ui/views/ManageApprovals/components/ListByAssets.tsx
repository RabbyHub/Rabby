import React from 'react';

import {
  getAssetApprovalPrimaryText,
  parseApprovalSpenderSelection,
  useApprovalsPage,
} from '../hooks/useManageApprovalsPage';
import { ApprovalCard } from './ApprovalCard';
import { EmptyState } from './EmptyState';
import { SkeletonLoading } from './SkeletonLoading';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();

  if (isLoading) {
    return <SkeletonLoading />;
  }

  if (!displaySortedAssetApprovalList.length) {
    return (
      <EmptyState
        text={
          assetEmptyStatus === 'none'
            ? t('page.manageApprovals.ListByAssets.noApprovals')
            : t('page.manageApprovals.ListByAssets.notMatched')
        }
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
            isNFT={assetApproval.type === 'nft'}
            badge={
              assetApproval.type === 'nft' ? (
                <div className="mt-[2px] text-[12px] leading-[13px] text-r-neutral-foot">
                  {assetApproval.nftToken ? 'NFT' : 'Collection'}
                </div>
              ) : null
            }
          />
        );
      })}
    </div>
  );
};
