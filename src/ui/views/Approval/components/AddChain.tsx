import React from 'react';
import { Button, Modal } from 'antd';
import { CHAINS } from 'consts';
import { useWallet, useApproval } from 'ui/utils';

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
  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();

  const {
    data: [{ chainId }],
    session,
  } = params;

  const supportChains = wallet.getSupportChains();
  const showChain = supportChains.find((chain) => chain.hex === chainId);

  if (!showChain) {
    Modal.error({
      title: 'Error',
      content: 'The requested chain is not supported by Rabby yet.',
      onOk: () => rejectApproval(),
    });
    return;
  }

  const enableChains = wallet.getEnableChains();
  const { chain: defaultChain } = wallet.getConnectedSite(session.origin)!;

  let title;
  let content;
  if (!enableChains.some((chain) => chain.hex === chainId)) {
    title = 'Wants to Enable a Chain';
    content = 'By enabling a chain, you’ll be able to make transactions on it';
  } else if (CHAINS[defaultChain].hex !== chainId) {
    title = 'Wants to Switch to the Chain';
    content =
      'The next time you visit, this site will be connected to Ethereum';
  }

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
        <h1 className="text-center mb-24">{title}</h1>
        <div className="text-center">
          <img className="w-[64px] h-[64px] mx-auto" src={showChain.logo} />
          <div className="mb-8 text-20 text-gray-title">{showChain.name}</div>
          <div className="mb-24 text-14 text-gray-content">
            Chain ID: {showChain.id}
          </div>
        </div>
        <div className="text-center text-14 text-gray-content">{content}</div>
      </div>
      <footer className="connect-footer">
        <div className="risk-info"></div>
        <div className="action-buttons flex justify-between">
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={rejectApproval}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={resolveApproval}
          >
            Change
          </Button>
        </div>
      </footer>
    </>
  );
};

export default AddChain;
