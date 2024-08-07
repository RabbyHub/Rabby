import React from 'react';
import {
  AssetApprovalSpenderWithStatus,
  FailReason,
} from './useBatchRevokeTask';
import { ReactComponent as SuccessSVG } from '@/ui/assets/approval/success.svg';
import { ReactComponent as FailSVG } from '@/ui/assets/approval/fail.svg';
import { ReactComponent as LoadingSVG } from '@/ui/assets/approval/loading.svg';

interface Props {
  record: AssetApprovalSpenderWithStatus;
}

export const StatusRow: React.FC<Props> = ({ record }) => {
  return (
    <div className="flex gap-x-6 flex-nowrap whitespace-nowrap items-center">
      {record.$status?.status === 'pending' && (
        <LoadingSVG className="text-blue-light" />
      )}
      {record.$status?.status === 'success' && <SuccessSVG />}
      {record.$status?.status === 'fail' && (
        <>
          <FailSVG />
          <span className="text-r-red-default text-14 font-medium">
            {FailReason[record.$status.failedCode]}
          </span>
        </>
      )}
      {!record.$status?.status && <span>-</span>}
    </div>
  );
};
