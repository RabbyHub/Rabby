import React from 'react';
import { CHAINS } from 'consts';

interface AddChainProps {
  data: {
    chainId: string;
  }[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const AddChain = ({ params }: { params: AddChainProps }) => {
  const {
    data: [{ chainId }],
    session,
  } = params;

  const chain = Object.values(CHAINS).find((value) => value.hex === chainId);

  if (!chain) {
    return 'This chain is not supported by Rabby yet.';
  }

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
      <h1 className="text-center mb-24">Want to Enable a Chain</h1>
      <div className="text-center">
        <img className="w-[64px] h-[64px] mx-auto" src={chain.logo} />
        <div className="mb-8 text-20 text-gray-title">{chain.name}</div>
        <div className="mb-24 text-14 text-gray-content">
          Chain ID: {chain.id}
        </div>
      </div>
      <div className="text-center text-14 text-gray-content">
        After enabling this chain, you will be able to initiate transactions on
        the change chain.
      </div>
    </div>
  );
};

export default AddChain;
