import React from 'react';
import { Chain } from '@debank/common';
import { findChainByServerID } from '@/utils/chain';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { ensureSuffix } from '@/utils/string';
import { AssetApprovalSpender } from '@/utils/approval';
import { Tooltip } from 'antd';

export const AssetRow: React.FC<{
  asset: AssetApprovalSpender['$assetParent'];
  iconSize?: number;
  hideChainIcon?: boolean;
}> = ({ asset, iconSize = 24, hideChainIcon = false }) => {
  if (!asset) return null;

  const chainItem = findChainByServerID(asset.chain as Chain['serverId']);
  if (!chainItem?.enum) return null;

  const fullName =
    asset.type === 'nft' && asset.nftToken
      ? ensureSuffix(asset.name || 'Unknown', ` #${asset.nftToken.inner_id}`)
      : asset.name || 'Unknown';

  return (
    <div className="flex items-center font-[500]">
      <IconWithChain
        width={iconSize + 'px'}
        height={iconSize + 'px'}
        hideChainIcon={hideChainIcon}
        hideConer
        iconUrl={asset?.logo_url || IconUnknown}
        chainServerId={asset.chain}
        noRound={false}
      />
      <Tooltip
        overlayClassName="J-table__tooltip disable-ant-overwrite"
        overlay={fullName}
      >
        <span className="ml-[8px] asset-name">{fullName}</span>
      </Tooltip>
    </div>
  );
};
