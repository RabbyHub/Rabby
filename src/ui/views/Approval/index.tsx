import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet, useApproval } from 'ui/utils';
import * as ApprovalComponent from './components';
import './style.less';

const Approval = () => {
  const history = useHistory();
  // const [account, setAccount] = useState('');
  const wallet = useWallet();
  const [getApproval, , rejectApproval] = useApproval();
  const [approval, setApproval] = useState<any>(null);

  const init = async () => {
    const approval = await getApproval();
    if (!approval) {
      history.replace('/');
      return null;
    }
    setApproval(approval);
    if (approval.origin || approval.params.origin) {
      document.title = approval.origin || approval.params.origin;
    }
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
  const { approvalComponent, params, origin, requestDefer } = approval;
  const CurrentApprovalComponent = ApprovalComponent[approvalComponent];

  return (
    <div className="approval">
      {approval && (
        <CurrentApprovalComponent
          params={params}
          origin={origin}
          requestDefer={requestDefer}
        />
      )}
    </div>
  );
};

export default Approval;
