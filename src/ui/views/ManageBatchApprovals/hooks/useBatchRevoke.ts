import React from 'react';
import { useMemoizedFn } from 'ahooks';
import { useHistory } from 'react-router-dom';

import type { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';
import { AssetApprovalSpender } from '@/utils/approval';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { findIndexRevokeList } from '../../ManageApprovals/utils';
import { getBatchRevokeAccountMode } from './useBatchRevokeTask';
import { useRevokeOne } from './useRevokeOne';
import { message } from 'antd';

export const useBatchRevoke = ({
  account: currentAccount,
  batchRevokePath,
  loadApprovals,
}: {
  account: Account | null;
  batchRevokePath: string;
  loadApprovals: () => Promise<any>;
}) => {
  const history = useHistory();
  const wallet = useWallet();
  const handleRevokeOne = useRevokeOne({
    account: currentAccount!,
  });

  const accountMode = React.useMemo(
    () => getBatchRevokeAccountMode(currentAccount?.type),
    [currentAccount?.type]
  );
  const canUseDirectBatchRevoke = accountMode !== 'legacy';

  return useMemoizedFn(
    async (
      revokeList: ApprovalSpenderItemToBeRevoked[],
      dataSource: AssetApprovalSpender[]
    ) => {
      if (!revokeList.length) {
        return false;
      }

      const filteredDataSource = dataSource.filter((record) => {
        return (
          findIndexRevokeList(revokeList, {
            item: record.$assetContract!,
            spenderHost: record.$assetToken!,
            assetApprovalSpender: record,
          }) > -1
        );
      });

      if (revokeList.length > 1 && canUseDirectBatchRevoke) {
        history.push({
          pathname: batchRevokePath,
          state: {
            revokeList,
            dataSource: filteredDataSource,
          },
        });
        return true;
      }

      if (revokeList.length === 1 && canUseDirectBatchRevoke) {
        try {
          await handleRevokeOne(revokeList[0]);
          message.success('Approval Revoked');
          await loadApprovals();
        } catch (e) {
          console.error('Revoke failed', e);
          // message.error('Revoke failed');
        }
        return false;
      }

      await wallet.revoke({ list: revokeList });
      await loadApprovals();
      return false;
    }
  );
};
