import React from 'react';
import { AssetApprovalSpenderWithStatus } from './useBatchRevokeTask';
import ApprovalsNameAndAddr from '../NameAndAddr';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { openScanLinkFromChainItem } from '../../utils';
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
  const asset = record.$assetParent;
  if (!asset) return null;

  const chainItem = findChainByServerID(asset.chain as Chain['serverId']);

  return (
    <div>
      {record.$status?.txHash ? (
        <ApprovalsNameAndAddr
          address={record.$status?.txHash}
          copyIcon={false}
          addressSuffix={
            <ThemeIcon
              onClick={(evt) => {
                evt.stopPropagation();
                openInTab(
                  getTxScanLink(chainItem!.scanLink, record.$status!.txHash!),
                  false
                );
              }}
              src={RcIconExternal}
              className={clsx(
                'ml-4 w-[16px] h-[16px] cursor-pointer text-r-neutral-foot'
              )}
            />
          }
        />
      ) : (
        '-'
      )}
    </div>
  );
};
