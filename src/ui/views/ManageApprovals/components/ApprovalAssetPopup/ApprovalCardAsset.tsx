import React from 'react';
import { useTranslation } from 'react-i18next';

import { ensureSuffix } from '@/utils/string';
import type { AssetApprovalItem } from '../../hooks/useManageApprovalsPage';
import { AssetAvatar } from '../AssetAvatar';
import { coerceFloat, formatAmount } from '@/ui/utils';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';

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
    const assetInfo = {
      assetName: '',
      nftType: null as null | 'collection' | 'nft',
      nftTypeBadge: '',
      balanceText: '',
    };
    let balance = 0 as number;

    if (assetItem?.type === 'nft') {
      assetInfo.nftType = assetItem.nftContract ? 'collection' : 'nft';
      assetInfo.nftTypeBadge =
        assetInfo.nftType === 'collection' ? 'Collection' : 'NFT';

      if (assetItem?.nftToken) {
        assetInfo.assetName = ensureSuffix(
          assetItem?.name || 'Unknown',
          ` #${assetItem?.nftToken.inner_id}`
        );
        assetInfo.balanceText = assetItem?.nftToken.amount;
      } else if (assetItem?.nftContract) {
        assetInfo.assetName = assetItem?.nftContract.contract_name || 'Unknown';
        assetInfo.balanceText = assetItem?.nftContract.amount;
      }
    } else {
      assetInfo.assetName = assetItem?.name || 'Unknown';
      balance = coerceFloat(assetItem?.balance);
      assetInfo.balanceText = formatAmount(balance);
    }

    return {
      assetName: assetInfo.assetName,
      nftTypeBadge: assetInfo.nftTypeBadge,
      displayBalanceText: assetInfo.balanceText,
    };
  }, [assetItem]);

  return (
    <div className="shrink-0 rounded-[20px] bg-r-neutral-card1 px-[16px] py-[16px]">
      <div className="flex min-w-0 items-center justify-center gap-[8px]">
        <AssetAvatar
          chain={assetItem.chain}
          logo={assetItem.logo_url}
          logoStyle={nftTypeBadge ? { borderRadius: 4 } : undefined}
        />

        <div className="min-w-0">
          <div className="truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
            {assetName}
          </div>
          {nftTypeBadge ? (
            <div className="mt-[2px] text-[12px] leading-[13px] text-r-neutral-foot">
              {nftTypeBadge}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-[16px] h-[0.5px] bg-rabby-neutral-line" />

      <div className="mt-[16px] flex items-center justify-between gap-[12px]">
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          {t('page.manageApprovals.ApprovalCardAssetPopup.allApprovals')}
        </div>
        <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
          {assetItem.list.length}
        </div>
      </div>

      {displayBalanceText ? (
        <div className="mt-[12px] flex items-center justify-between gap-[12px]">
          <div className="text-[13px] leading-[16px] text-r-neutral-foot">
            {t('page.manageApprovals.ApprovalCardAssetPopup.myBalance')}
          </div>
          <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
            {displayBalanceText}
          </div>
        </div>
      ) : null}
    </div>
  );
};
