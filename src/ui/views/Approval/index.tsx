import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CHAINS_ENUM } from 'consts';
import { useWallet, useApproval } from 'ui/utils';
import * as ApprovalComponent from './components';
import './style.less';

const Approval = () => {
  const history = useHistory();
  const [account, setAccount] = useState('');
  // const [accountType, setAccountType] = useState('');
  const [defaultChain, setDefaultChain] = useState(CHAINS_ENUM.ETH);
  // const [waitingForHardware, setWaitingForHardware] = useState(false);
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
    // setAccountType(account.type);
  };

  useEffect(() => {
    init();
  }, []);

  const handleChainChange = (val: CHAINS_ENUM) => {
    setDefaultChain(val);
  };

  const { aporovalComponent, params, origin } = approval;
  const CurrentApprovalComponent = ApprovalComponent[aporovalComponent];

  return (
    <div className="approval">
      <header>
        <p className="text-12">Current account</p>
        <p className="text-13 font-medium">{account}</p>
      </header>
      <CurrentApprovalComponent
        params={params}
        onChainChange={handleChainChange}
        defaultChain={defaultChain}
        origin={origin}
      />
    </div>
  );
};

export default Approval;
