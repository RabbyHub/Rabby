import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CHAINS_ENUM, HARDWARE_KEYRING_TYPES } from 'consts';
import { APPROVAL_STATE } from 'consts';
import cloneDeep from 'lodash/cloneDeep';
import { useWallet, useApproval } from 'ui/utils';
import { Connect, SignText, SignTx, Footer, Hardware } from './components';
import { Account } from 'background/service/preference';
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
      case APPROVAL_STATE.SIGN:
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

  return (
    <div className="approval">
      <header>
        <p className="text-12">Current account</p>
        <p className="text-13 font-medium">{account}</p>
      </header>
      {approval?.state === APPROVAL_STATE.CONNECT && (
        <Connect
          params={approval.params}
          onChainChange={handleChainChange}
          defaultChain={defaultChain}
        />
      )}
      {approval?.state !== APPROVAL_STATE.CONNECT &&
        (approval?.state === APPROVAL_STATE.SIGN && approval?.params.gas ? (
          <SignTx params={approval.params} origin={approval.origin} />
        ) : (
          <SignText params={approval.params} />
        ))}
      <Footer
        state={approval.state}
        onCancel={handleCancel}
        onConfirm={handleAllow}
      />
    </div>
  );
};

export default Approval;
