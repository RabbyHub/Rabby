import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Approval } from 'background/service/notification';
import { useWallet, useApproval } from 'ui/utils';
import { IExtractFromPromise } from '@/ui/utils/type';

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
    const account = await wallet.getCurrentAccount();
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
  const { approvalComponent, params, origin } = data;
  const CurrentApprovalComponent = ApprovalComponent[approvalComponent];

  return (
    <div className={clsx('approval', className)}>
      {approval && (
        <CurrentApprovalComponent
          params={params}
          origin={origin}
          // requestDefer={requestDefer}
        />
      )}
    </div>
  );
};

export default Approval;
