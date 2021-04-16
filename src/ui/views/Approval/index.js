import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { APPROVAL_STATE } from 'share';
import { Footer, Button } from 'ui/component';
import { useWallet, useApproval } from 'ui/helper';
import { Connect, SignText, SignTx } from './components';

const Approval = () => {
  const history = useHistory();
  const [account, setAccount] = useState('');
  const wallet = useWallet();
  const [approval, handleNext] = useApproval();

  const init = async () => {
    const account = await wallet.getAccount();
    setAccount(account);
  };

  useEffect(() => {
    init();
  }, [account]);

  const handleCancel = () => {
    handleNext('user reject');
  };

  const handleAllow = () => {
    handleNext(null, true);
  };

  const Content =
    approval?.state === APPROVAL_STATE.CONNECT
      ? Connect
      : approval?.state === APPROVAL_STATE.SIGN
      ? approval?.params.gas
        ? SignTx
        : SignText
      : null;

  return (
    <>
      <div className="absolute top-0 left-0 w-full py-2 px-4 bg-primary text-white">
        <div className="text-xs">Current account</div>
        <div>{account}</div>
      </div>
      {Content && <Content params={approval.params} origin={approval.origin} />}
      <Footer className="flex space-x-4">
        <Button block onClick={handleCancel}>
          Cancel
        </Button>
        <Button block onClick={handleAllow}>
          Allow
        </Button>
      </Footer>
    </>
  );
};

export default Approval;
