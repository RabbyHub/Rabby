import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { Approval } from 'background/service/notification';
import { useWallet } from 'ui/utils';
import {
  ApprovalScopeContext,
  createApprovalScope,
} from '@/ui/approval/context';

import clsx from 'clsx';
import Connect from '.';
import { ApprovalUtilsProvider } from '../../hooks/useApprovalUtils';
import '../../style.less';

export const ConnectApproval: React.FC<{
  className?: string;
}> = ({ className }) => {
  const history = useHistory();
  const wallet = useWallet();
  const [approval, setApproval] = useState<Approval | null>(null);

  const init = async () => {
    const approval = await wallet.getCurrentApproval();
    if (!approval) {
      history.replace('/');
      return null;
    }
    setApproval(approval);
    document.title = 'Rabby Wallet Notification';
  };

  useEffect(() => {
    init();
  }, []);

  if (!approval) return <></>;
  const { params } = approval.data;
  const scope = createApprovalScope(approval);

  return (
    <div className={clsx('approval', className)}>
      {approval && (
        <ApprovalScopeContext.Provider value={scope}>
          <ApprovalUtilsProvider>
            <Connect key={approval.id} params={params} />
          </ApprovalUtilsProvider>
        </ApprovalScopeContext.Provider>
      )}
    </div>
  );
};
