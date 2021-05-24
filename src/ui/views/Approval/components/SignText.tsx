import React from 'react';
import { Button } from 'antd';
import { useApproval } from 'ui/utils';
import { hexToUtf8 } from 'web3-utils';

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
  const { data, session } = params;
  const [hexData] = data;
  const signText = hexToUtf8(hexData);

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
        <div className="risk-info"></div>
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
    </>
  );
};

export default SignText;
