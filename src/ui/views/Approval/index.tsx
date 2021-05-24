import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CHAINS_ENUM } from 'consts';
import { APPROVAL_STATE } from 'consts';
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
  const [approval, resolveApproval, rejectApproval] = useApproval();
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

  const handleCancel = () => {
    rejectApproval('user reject');
  };

  const handleAllow = async () => {
    switch (approval.state) {
      case APPROVAL_STATE.CONNECT:
        resolveApproval({
          defaultChain,
        });
        break;
      case APPROVAL_STATE.APPROVAL:
        // if (
        //   Object.keys(HARDWARE_KEYRING_TYPES)
        //     .map((key) => HARDWARE_KEYRING_TYPES[key].type)
        //     .includes(accountType)
        // ) {
        //   setWaitingForHardware(true);
        // }
        resolveApproval();
        break;
    }
  };

  const handleChainChange = (val: CHAINS_ENUM) => {
    setDefaultChain(val);
  };

  const { type, params, origin } = approval;
  const CurrentApproval = ApprovalComponent[type];

  return (
    <div className="approval">
      <header>
        <p className="text-12">Current account</p>
        <p className="text-13 font-medium">{account}</p>
      </header>
      <CurrentApproval
        params={params}
        onChainChange={handleChainChange}
        defaultChain={defaultChain}
        origin={origin}
      />
      <ApprovalComponent.Footer
        state={approval.state}
        onCancel={handleCancel}
        onConfirm={handleAllow}
      />
    </div>
  );
};

export default Approval;
