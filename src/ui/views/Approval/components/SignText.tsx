import React from 'react';
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
  const { data, session } = params;
  const [hexData] = data;
  const signText = hexToUtf8(hexData);

  return (
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
  );
};

export default SignText;
