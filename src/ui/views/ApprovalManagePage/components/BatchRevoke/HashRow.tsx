import React from 'react';
import { AssetApprovalSpenderWithStatus } from './useBatchRevokeTask';
import ApprovalsNameAndAddr from '../NameAndAddr';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconExternal } from '../../icons/icon-share-cc.svg';
import clsx from 'clsx';
import { findChainByServerID } from '@/utils/chain';
import { Chain } from '@debank/common';
import { openInTab } from '@/ui/utils';
import { getTxScanLink } from '@/utils';

interface Props {
  record: AssetApprovalSpenderWithStatus;
}

export const HashRow: React.FC<Props> = ({ record }) => {
  if (record.$status?.status === 'fail') {
    return null;
  }

  if (!record.$status || record.$status.status === 'pending') {
    return <div>-</div>;
  }

  const asset = record.$assetParent;
  if (!asset) return null;

  const chainItem = findChainByServerID(asset.chain as Chain['serverId']);
  const txHash = record.$status.txHash;

  return (
    <div>
      <ApprovalsNameAndAddr
        address={txHash}
        copyIcon={false}
        addressSuffix={
          <ThemeIcon
            onClick={(evt) => {
              evt.stopPropagation();
              openInTab(getTxScanLink(chainItem!.scanLink, txHash), false);
            }}
            src={RcIconExternal}
            className={clsx(
              'ml-4 w-[16px] h-[16px] cursor-pointer text-r-neutral-foot'
            )}
          />
        }
      />
    </div>
  );
};
