import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CHAINS_ENUM } from 'consts';
import { APPROVAL_STATE } from 'consts';
import { useWallet, useApproval } from 'ui/utils';
import { Connect, SignText, SignTx, Footer } from './components';
import './style.less';

const Approval = () => {
  const history = useHistory();
  const [account, setAccount] = useState('');
  const [defaultChain, setDefaultChain] = useState(CHAINS_ENUM.ETH);
  const wallet = useWallet();
  const [approval, resolveApproval, rejectApproval] = useApproval();
  if (!approval) {
    history.replace('/');
    return null;
  }

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    setAccount(account.address);
  };

  useEffect(() => {
    init();
  }, [account]);

  const handleCancel = () => {
    rejectApproval('user reject');
  };

  const handleAllow = () => {
    switch (approval.state) {
      case APPROVAL_STATE.CONNECT:
        resolveApproval({
          defaultChain,
        });
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
        (approval?.state === APPROVAL_STATE.SIGN ? (
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
