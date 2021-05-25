import React, { useEffect, useState } from 'react';
import { SecurityCheckDecision } from 'background/service/openapi';
import { Chain } from 'background/service/chain';
import { Button } from 'antd';
import { ChainSelector, Spin } from 'ui/component';
import SecurityCheckBar from './SecurityCheckBar';
import { useApproval, useWallet } from 'ui/utils';
import { CHAINS_ENUM } from 'consts';

interface ConnectProps {
  params: any;
  onChainChange(chain: CHAINS_ENUM): void;
  defaultChain: CHAINS_ENUM;
}

const Connect = ({ params: { icon, origin, name } }: ConnectProps) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const [defaultChain, setDefaultChain] = useState(CHAINS_ENUM.ETH);
  const [isLoading, setIsLoading] = useState(true);
  const [
    securityCheckStatus,
    setSecurityCheckStatus,
  ] = useState<SecurityCheckDecision>('loading');
  const [securityCheckAlert, setSecurityCheckAlert] = useState('Checking...');

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    const recommendChains = await wallet.openapi.getRecommendChains(
      account!.address,
      origin
    );
    const check = await wallet.openapi.checkOrigin(account!.address, origin);
    setSecurityCheckStatus(check.decision);
    setSecurityCheckAlert(check.alert);
    const enableChains = wallet.getEnableChains();
    setIsLoading(false);
    let targetChain: Chain | undefined;
    for (let i = 0; i < recommendChains.length; i++) {
      targetChain = enableChains.find(
        (c) => c.serverId === recommendChains[i].id
      );
      if (targetChain) break;
    }
    setDefaultChain(targetChain ? targetChain.enum : CHAINS_ENUM.ETH);
    setIsLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  const handleCancel = () => {
    rejectApproval('user reject');
  };

  const handleAllow = async () => {
    resolveApproval({
      defaultChain,
    });
  };

  const handleChainChange = (val: CHAINS_ENUM) => {
    setDefaultChain(val);
  };

  return (
    <Spin spinning={isLoading}>
      <div className="approval-connect">
        <div className="font-medium text-20 text-center">
          Request for connection
        </div>
        <div className="connect-card">
          <div className="site-info">
            <img src={icon} className="site-info__icon" />
            <div className="site-info__text">
              <p className="text-15 font-medium">{origin}</p>
              <p className="text-14 text-gray-content">{name}</p>
            </div>
          </div>
          <div className="site-chain">
            <p className="mb-0 text-12 text-gray-content">
              On this site use chain
            </p>
            <ChainSelector value={defaultChain} onChange={handleChainChange} />
          </div>
        </div>
      </div>

      <footer className="connect-footer">
        <SecurityCheckBar
          status={securityCheckStatus}
          alert={securityCheckAlert}
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
    </Spin>
  );
};

export default Connect;
