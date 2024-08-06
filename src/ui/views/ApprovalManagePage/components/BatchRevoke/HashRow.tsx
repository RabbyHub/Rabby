import React from 'react';
import { AssetApprovalSpenderWithStatus } from './useBatchRevokeTask';

interface Props {
  record: AssetApprovalSpenderWithStatus;
}

export const HashRow: React.FC<Props> = ({ record }) => {
  return <div>{record.$status?.txHash || '-'}</div>;
};
