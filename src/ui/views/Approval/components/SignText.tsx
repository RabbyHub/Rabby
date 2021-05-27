import React, { useState } from 'react';
import { Button } from 'antd';
import { useApproval, useWallet } from 'ui/utils';
import { hexToUtf8 } from 'web3-utils';
import {
  SecurityCheckResponse,
  SecurityCheckDecision,
} from 'background/service/openapi';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';

interface SignTextProps {
  data: string[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const SignText = ({ params }: { params: SignTextProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const { data, session } = params;
  const [hexData] = data;
  const signText = hexToUtf8(hexData);
  const [showSecurityCheckDetail, setShowSecurityCheckDetail] = useState(false);
  const [
    securityCheckStatus,
    setSecurityCheckStatus,
  ] = useState<SecurityCheckDecision>('pending');
  const [securityCheckAlert, setSecurityCheckAlert] = useState('Checking...');
  const [
    securityCheckDetail,
    setSecurityCheckDetail,
  ] = useState<SecurityCheckResponse | null>(null);

  const handleSecurityCheck = async () => {
    setSecurityCheckStatus('loading');
    const currentAccount = await wallet.getCurrentAccount();
    const check = await wallet.openapi.checkText(
      currentAccount!.address,
      session.origin,
      hexData
    );
    setSecurityCheckStatus(check.decision);
    setSecurityCheckAlert(check.alert);
    setSecurityCheckDetail(check);
  };

  const handleCancel = () => {
    rejectApproval('user reject');
  };

  const handleAllow = async () => {
    resolveApproval({});
  };

  return (
    <>
      <div className="approval-text">
        <div className="site-card">
          <img className="icon icon-site" src={session.icon} />
          <div className="site-info">
            <p className="font-medium text-gray-subTitle mb-0 text-13">
              {session.origin}
            </p>
            <p className="text-12 text-gray-content mb-0">{session.name}</p>
          </div>
        </div>
        <h1 className="text-center">Request for Sign text</h1>
        <div className="text-detail text-14 text-gray-subTitle">{signText}</div>
      </div>
      <footer>
        <SecurityCheckBar
          status={securityCheckStatus}
          alert={securityCheckAlert}
          onClick={() => setShowSecurityCheckDetail(true)}
          onCheck={handleSecurityCheck}
        />
        <div className="action-buttons flex justify-between">
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={handleAllow}
          >
            Allow
          </Button>
        </div>
      </footer>
      {securityCheckDetail && (
        <SecurityCheckDetail
          visible={showSecurityCheckDetail}
          onCancel={() => setShowSecurityCheckDetail(false)}
          data={securityCheckDetail}
          onOk={handleAllow}
          okText="Connect"
        />
      )}
    </>
  );
};

export default SignText;
