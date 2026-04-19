import React from 'react';
import { AssetAvatar } from './AssetAvatar';

type ApprovalAvatarProps = {
  chainServerId?: string;
  logoUrl?: string | null;
};

function getApprovalAvatar(logoUrl?: string | null) {
  return logoUrl || '';
}

export const ApprovalAvatar: React.FC<ApprovalAvatarProps> = ({
  chainServerId,
  logoUrl,
}) => {
  return (
    <AssetAvatar chain={chainServerId} logo={getApprovalAvatar(logoUrl)} />
  );
};
