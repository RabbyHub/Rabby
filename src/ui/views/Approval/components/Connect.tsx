import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { Chain } from 'background/service/chain';
import { ChainSelector, Spin, FallbackSiteLogo } from 'ui/component';
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

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    try {
      const recommendChains = await wallet.openapi.getRecommendChains(
        account!.address,
        origin
      );
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
    } catch (e) {
      console.log(e);
    }
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
          Website Wants to Connect
        </div>
        <div className="connect-card">
          <div className="site-info">
            <div className="site-info__icon">
              <FallbackSiteLogo
                url={icon}
                origin={origin}
                width="44px"
                height="44px"
                style={{
                  borderRadius: '4px',
                }}
              />
            </div>
            <div className="site-info__text">
              <p className="text-15 font-medium">{origin}</p>
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
        <div className="action-buttons flex justify-between mt-4">
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
            onClick={() => handleAllow()}
          >
            Allow
          </Button>
        </div>
      </footer>
    </Spin>
  );
};

export default Connect;
