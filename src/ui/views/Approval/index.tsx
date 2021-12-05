import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import eventBus from '@/eventBus';
import { Account } from 'background/service/preference';
import { EVENTS, INTERNAL_REQUEST_SESSION } from 'consts';
import { useWallet, useApproval } from 'ui/utils';
import * as ApprovalComponent from './components';
import './style.less';

const Approval = () => {
  const history = useHistory();
  // const [account, setAccount] = useState('');
  const wallet = useWallet();
  const [getApproval, , rejectApproval] = useApproval();
  const [approval, setApproval] = useState<any>(null);
  const [gnosisRPCData, setGnosisRPCData] = useState<{
    account: Account;
    data: {
      method: string;
      params: any;
    };
  } | null>(null);

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
    eventBus.addEventListener(EVENTS.GNOSIS.RPC, (data) => {
      setGnosisRPCData(data);
    });
    eventBus.once(EVENTS.GNOSIS.TX_BUILT, () => {
      setGnosisRPCData(null);
    });
    eventBus.addEventListener(EVENTS.GNOSIS.TX_CONFIRMED, (data) => {
      console.log(EVENTS.GNOSIS.TX_CONFIRMED, data);
      setGnosisRPCData(null);
    });
  }, []);

  if (!approval) return <></>;
  const { approvalComponent, params, origin, requestDefer } = approval;
  const CurrentApprovalComponent = ApprovalComponent[approvalComponent];

  if (gnosisRPCData) {
    switch (gnosisRPCData.data.method) {
      case 'personal_sign':
        return (
          <div className="approval">
            <ApprovalComponent.SignText
              params={{
                data: gnosisRPCData.data.params,
                session: INTERNAL_REQUEST_SESSION,
                isGnosis: true,
                account: gnosisRPCData.account,
              }}
            />
          </div>
        );
    }
  }

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
