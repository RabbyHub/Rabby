import React from 'react';
import { useTranslation } from 'react-i18next';

import { ensureSuffix } from '@/utils/string';
import type { AssetApprovalItem } from '../../hooks/useManageApprovalsPage';
import { AssetAvatar } from '../AssetAvatar';

function formatBalance(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(numericValue);
  }

  return String(value);
}

type ApprovalCardAssetProps = {
  assetItem: AssetApprovalItem;
};

export const ApprovalCardAsset: React.FC<ApprovalCardAssetProps> = ({
  assetItem,
}) => {
  const { t } = useTranslation();

  const { assetName, nftTypeBadge, displayBalanceText } = React.useMemo(() => {
    if (assetItem.type === 'nft') {
      const badge = assetItem.nftContract ? 'Collection' : 'NFT';

      if (assetItem.nftToken) {
        return {
          assetName: ensureSuffix(
            assetItem.name || 'Unknown',
            ` #${assetItem.nftToken.inner_id}`
          ),
          nftTypeBadge: badge,
          displayBalanceText: assetItem.nftToken.amount,
        };
      }

      return {
        assetName: assetItem.nftContract?.contract_name || 'Unknown',
        nftTypeBadge: badge,
        displayBalanceText: assetItem.nftContract?.amount || '',
      };
    }

    return {
      assetName: assetItem.name || 'Unknown',
      nftTypeBadge: '',
      displayBalanceText: formatBalance(assetItem.balance),
    };
  }, [assetItem]);

  return (
    <div className="shrink-0 rounded-[20px] bg-r-neutral-card1 px-[16px] py-[16px]">
      <div className="flex min-w-0 items-center justify-center gap-[8px]">
        <AssetAvatar chain={assetItem.chain} logo={assetItem.logo_url} />

        <div className="min-w-0">
          <div className="truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
            {assetName}
          </div>
          {nftTypeBadge ? (
            <div className="mt-[4px] inline-flex rounded-[6px] border border-r-neutral-line px-[4px] py-[2px] text-[12px] leading-[12px] text-r-neutral-foot">
              {nftTypeBadge}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-[16px] h-[0.5px] bg-rabby-neutral-line" />

      <div className="mt-[16px] flex items-center justify-between gap-[12px]">
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          All Approvals
        </div>
        <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
          {assetItem.list.length}
        </div>
      </div>

      {displayBalanceText ? (
        <div className="mt-[12px] flex items-center justify-between gap-[12px]">
          <div className="text-[13px] leading-[16px] text-r-neutral-foot">
            My Balance
          </div>
          <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
            {displayBalanceText}
          </div>
        </div>
      ) : null}
    </div>
  );
};
