import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Approval } from 'background/service/notification';
import { useWallet, useApproval } from 'ui/utils';
import { IExtractFromPromise } from '@/ui/utils/type';
import { ApprovalUtilsProvider } from './hooks/useApprovalUtils';
import * as ApprovalComponent from './components';

import './style.less';
import clsx from 'clsx';

const Approval: React.FC<{
  className?: string;
}> = ({ className }) => {
  const history = useHistory();
  // const [account, setAccount] = useState('');
  const wallet = useWallet();
  const [getApproval, , rejectApproval] = useApproval();
  type IApproval = Exclude<
    IExtractFromPromise<ReturnType<typeof getApproval>>,
    void
  >;
  const [approval, setApproval] = useState<IApproval | null>(null);

  const init = async () => {
    const approval = await getApproval();
    if (!approval) {
      history.replace('/');
      return null;
    }
    setApproval(approval);
    document.title = 'Rabby Wallet Notification';
    const account = approval.data.account || (await wallet.getCurrentAccount());
    if (!account) {
      rejectApproval();
      return;
    }
  };

  useEffect(() => {
    init();
  }, []);

  if (!approval) return <></>;
  const { data } = approval;
  const { approvalComponent, params, origin, account } = data;
  const CurrentApprovalComponent = ApprovalComponent[approvalComponent];

  return (
    <div className={clsx('approval', className)}>
      {approval && (
        <ApprovalUtilsProvider>
          <CurrentApprovalComponent
            params={params}
            origin={origin}
            account={account}
            // requestDefer={requestDefer}
          />
        </ApprovalUtilsProvider>
      )}
    </div>
  );
};

export default Approval;
