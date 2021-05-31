import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { KEYRING_CLASS } from 'consts';
import { useApproval, useWallet } from 'ui/utils';
import { hex2Utf8 } from 'ui/utils';
import {
  SecurityCheckResponse,
  SecurityCheckDecision,
} from 'background/service/openapi';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import IconQuestionMark from 'ui/assets/question-mark-gray.svg';

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
  const signText = hex2Utf8(hexData);
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
  const [explain, setExplain] = useState('');

  const handleSecurityCheck = async () => {
    setSecurityCheckStatus('loading');
    const currentAccount = await wallet.getCurrentAccount();
    const check = await wallet.openapi.checkText(
      currentAccount!.address,
      session.origin,
      hexData
    );
    const serverExplain = await wallet.openapi.explainText(
      session.origin,
      currentAccount!.address,
      hexData
    );
    setExplain(serverExplain.comment);
    setSecurityCheckStatus(check.decision);
    setSecurityCheckAlert(check.alert);
    setSecurityCheckDetail(check);
  };

  const handleCancel = () => {
    rejectApproval('user reject');
  };

  const handleAllow = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    if (currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      resolveApproval({
        uiRequestComponent: 'HardwareWaiting',
        type: currentAccount.type,
      });
    } else {
      resolveApproval({});
    }
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
        <div className="text-detail-wrapper">
          <div className="text-detail text-14 text-gray-subTitle">
            {signText}
          </div>
          {explain && (
            <p className="text-explain">
              {explain}
              <Tooltip
                placement="top"
                title="This summary is provide by DeBank"
              >
                <img
                  src={IconQuestionMark}
                  className="icon icon-question-mark"
                />
              </Tooltip>
            </p>
          )}
        </div>
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
