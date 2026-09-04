import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Approval } from 'background/service/notification';
import { useWallet } from 'ui/utils';
import {
  createApprovalScope,
  ApprovalScopeContext,
} from '@/ui/approval/context';
import { getCurrentApproval } from '@/ui/approval/global';
import { ApprovalUtilsProvider } from './hooks/useApprovalUtils';
import { useSecurityEngineStore } from '@/ui/state/securityEngine';
import * as ApprovalComponent from './components';

import './style.less';
import clsx from 'clsx';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { EVENTS } from '@/constant';
import { toApprovalRef } from '@/utils/signingTypes';

const Approval: React.FC<{
  className?: string;
}> = ({ className }) => {
  const history = useHistory();
  // const [account, setAccount] = useState('');
  const wallet = useWallet();
  const [approval, setApproval] = useState<Approval | null>(null);
  const resetCurrentTx = useSecurityEngineStore(
    (state) => state.resetCurrentTx
  );

  const init = async () => {
    const approval = await getCurrentApproval(wallet);
    if (!approval) {
      history.replace('/');
      return null;
    }

    // "忽略所有" 只允许作用于当前审批, 不能在同窗口排队切换时残留到下一笔
    resetCurrentTx();
    setApproval(approval);
    document.title = 'Rabby Wallet Notification';
    const account = approval.data.account || (await wallet.getCurrentAccount());
    if (!account) {
      const result = await wallet.rejectApprovalFor({
        approval: toApprovalRef(approval.id, approval.data.approvalComponent),
      });
      if (result.accepted) history.replace('/');
      return;
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEventBusListener(EVENTS.RELOAD_APPROVAL, init);

  const scope = React.useMemo(
    () => (approval ? createApprovalScope(approval) : null),
    [approval]
  );

  if (!approval) return <></>;
  const { data } = approval;
  const { approvalComponent, params, origin, account } = data;
  const CurrentApprovalComponent = ApprovalComponent[approvalComponent];
  const renderedParams = scope?.signing
    ? {
        ...(params || {}),
        signing: scope.signing,
      }
    : params;

  return (
    <div className={clsx('approval', className)}>
      {approval && (
        <ApprovalScopeContext.Provider value={scope}>
          <ApprovalUtilsProvider>
            <CurrentApprovalComponent
              key={approval.id}
              params={renderedParams as any}
              origin={origin}
              account={account}
            />
          </ApprovalUtilsProvider>
        </ApprovalScopeContext.Provider>
      )}
    </div>
  );
};

export default Approval;
