import React from 'react';
import { AssetApprovalSpenderWithStatus } from './useBatchRevokeTask';
import { ReactComponent as SuccessSVG } from '@/ui/assets/approval/success.svg';
import { ReactComponent as FailSVG } from '@/ui/assets/approval/fail.svg';
import { ReactComponent as LoadingSVG } from '@/ui/assets/address/loading.svg';

interface Props {
  record: AssetApprovalSpenderWithStatus;
}

export const StatusRow: React.FC<Props> = ({ record }) => {
  return (
    <div>
      {record.$status?.status === 'pending' && (
        <LoadingSVG style={{ width: 16, height: 16 }} />
      )}
      {record.$status?.status === 'success' && (
        <SuccessSVG style={{ width: 16, height: 16 }} />
      )}
      {record.$status?.status === 'fail' && (
        <FailSVG style={{ width: 16, height: 16 }} />
      )}
      {!record.$status?.status && <span>-</span>}
    </div>
  );
};
