import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CHAINS_ENUM } from 'consts';
import { useWallet, useApproval } from 'ui/utils';
import { Spin } from 'ui/component';
import * as ApprovalComponent from './components';
import './style.less';

const Approval = () => {
  const history = useHistory();
  const [account, setAccount] = useState('');
  const wallet = useWallet();
  const [approval, , rejectApproval] = useApproval();
  if (!approval) {
    history.replace('/');
    return null;
  }

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) {
      rejectApproval();
      return;
    }
    setAccount(account.address);
  };

  useEffect(() => {
    init();
  }, []);

  const { aporovalComponent, params, origin, requestDeffer } = approval;
  const CurrentApprovalComponent = ApprovalComponent[aporovalComponent];

  return (
    <div className="approval">
      <header>
        <p className="text-12">Current account</p>
        <p className="text-13 font-medium">{account}</p>
      </header>
      <CurrentApprovalComponent
        params={params}
        origin={origin}
        requestDeffer={requestDeffer}
      />
    </div>
  );
};

export default Approval;
