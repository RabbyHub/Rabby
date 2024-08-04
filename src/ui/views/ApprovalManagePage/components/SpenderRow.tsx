import React from 'react';
import { Tooltip } from 'antd';
import { Chain } from '@debank/common';
import { findChainByServerID } from '@/utils/chain';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { AssetApprovalSpender, SpenderInTokenApproval } from '@/utils/approval';
import ApprovalsNameAndAddr from './NameAndAddr';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { openScanLinkFromChainItem } from '../utils';
import { ReactComponent as RcIconExternal } from '../icons/icon-share-cc.svg';
import clsx from 'clsx';
import { Permit2Badge } from './Badges';

export const SpenderRow: React.FC<{
  spender: AssetApprovalSpender;
}> = ({ spender }) => {
  const asset = spender.$assetParent;
  if (!asset) return null;
  const chainItem = findChainByServerID(asset.chain as Chain['serverId']);
  // if (!chainItem) return null;

  // it maybe null
  const protocol = spender.protocol;

  const protocolName = protocol?.name || 'Unknown';

  return (
    <div className="flex items-center">
      <IconWithChain
        width="18px"
        height="18px"
        hideConer
        hideChainIcon
        iconUrl={chainItem?.logo || IconUnknown}
        chainServerId={asset?.chain}
        noRound={asset.type === 'nft'}
      />
      <ApprovalsNameAndAddr
        className="ml-[6px]"
        addressClass=""
        address={spender.id || ''}
        chainEnum={chainItem?.enum}
        copyIconClass="text-r-neutral-body"
        addressSuffix={
          <>
            <Tooltip
              overlayClassName="J-table__tooltip disable-ant-overwrite"
              overlay={protocolName}
            >
              <span className="contract-name ml-[4px]">({protocolName})</span>
            </Tooltip>
            <ThemeIcon
              onClick={(evt) => {
                evt.stopPropagation();
                openScanLinkFromChainItem(chainItem?.scanLink, spender.id);
              }}
              src={RcIconExternal}
              className={clsx(
                'ml-6 w-[16px] h-[16px] cursor-pointer text-r-neutral-body'
              )}
            />
          </>
        }
        tooltipAliasName
        openExternal={false}
      />
      {spender.$assetContract?.type === 'contract' && (
        <Permit2Badge
          className="ml-[8px]"
          contractSpender={spender as SpenderInTokenApproval}
        />
      )}
    </div>
  );
};
