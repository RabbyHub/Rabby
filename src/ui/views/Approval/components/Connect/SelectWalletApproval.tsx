import { IExtractFromPromise } from '@/ui/utils/type';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useApproval, useWallet } from 'ui/utils';
// import { ApprovalUtilsProvider } from './hooks/useApprovalUtils';

import clsx from 'clsx';
import Connect from '.';
import { ApprovalUtilsProvider } from '../../hooks/useApprovalUtils';
import '../../style.less';

export const ConnectApproval: React.FC<{
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
  };

  useEffect(() => {
    init();
  }, []);

  if (!approval) return <></>;
  const { data } = approval;
  const { approvalComponent, params, origin } = data;

  return (
    <div className={clsx('approval', className)}>
      {approval && (
        <ApprovalUtilsProvider>
          <Connect params={params} />
        </ApprovalUtilsProvider>
      )}
    </div>
  );
};
