import React from 'react';
import { Chain } from '@debank/common';
import { findChainByServerID } from '@/utils/chain';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { ensureSuffix } from '@/utils/string';
import { AssetApprovalSpender } from '@/utils/approval';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

export const AssetRow: React.FC<{
  asset: AssetApprovalSpender['$assetParent'];
}> = ({ asset }) => {
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
        width="24px"
        height="24px"
        hideConer
        iconUrl={asset?.logo_url || IconUnknown}
        chainServerId={asset.chain}
        noRound={false}
      />

      <TooltipWithMagnetArrow
        overlayClassName="J-table__tooltip disable-ant-overwrite"
        overlay={fullName}
      >
        <span className="ml-[8px] asset-name">{fullName}</span>
      </TooltipWithMagnetArrow>
    </div>
  );
};
