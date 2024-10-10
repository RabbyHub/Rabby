import { getActionTypeTextByType } from '@/ui/views/Approval/components/Actions/utils';
import { PendingTxItem } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';

export const TransactionActionType = ({ data }: { data: PendingTxItem }) => {
  return (
    <div className="text-r-neutral-title-1 font-medium">
      {getActionTypeTextByType(data.action_type)}
    </div>
  );
};
