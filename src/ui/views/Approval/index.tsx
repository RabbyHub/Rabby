import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet, useApproval } from 'ui/utils';
import * as ApprovalComponent from './components';
import './style.less';

const Approval = () => {
  const history = useHistory();
  // const [account, setAccount] = useState('');
  const wallet = useWallet();
  const [approval, , rejectApproval] = useApproval();
  if (!approval) {
    history.replace('/');
    return null;
  }

  const init = async () => {
    if (approval.origin || approval.params.origin) {
      document.title = approval.origin || approval.params.origin;
    }
    const account = await wallet.getCurrentAccount();
    if (!account) {
      rejectApproval();
      return;
    }
    // setAccount(account.address);
  };

  useEffect(() => {
    init();
  }, []);

  const { approvalComponent, params, origin, requestDefer } = approval;
  const CurrentApprovalComponent = ApprovalComponent[approvalComponent];

  return (
    <div className="approval">
      {/* <header>
        <p className="text-12">Current account</p>
        <p className="text-13 font-medium">{account}</p>
      </header> */}
      <CurrentApprovalComponent
        params={params}
        origin={origin}
        requestDefer={requestDefer}
      />
    </div>
  );
};

export default Approval;
