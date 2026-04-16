import React from 'react';

import { AssetApprovalSpenderWithStatus } from '../hooks/useBatchRevokeTask';
import { AssetAvatar } from '../../ManageApprovals/components/AssetAvatar';
import { Cell, CellText } from './Cell';

export const ListItemAsset: React.FC<{
  data: AssetApprovalSpenderWithStatus;
}> = ({ data }) => {
  const { $assetParent: asset } = data;

  if (!asset) {
    return null;
  }

  const fullName =
    asset.type === 'nft' && asset.nftToken
      ? `${asset.name || 'Unknown'} #${asset.nftToken.inner_id}`
      : asset.name || 'Unknown';

  return (
    <Cell>
      <AssetAvatar logo={asset.logo_url} size={20} />
      <CellText>{fullName}</CellText>
    </Cell>
  );
};
