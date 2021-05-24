import React, { useState, useEffect } from 'react';
import { useWallet } from '../../utils';
import { Switch, message } from 'antd';
import { PageHeader, Field } from '../../component';
import { Chain } from 'background/service/chain';
import { CHAINS, CHAINS_ENUM } from 'consts';
import './style.less';

const ChainManagement = () => {
  const wallet = useWallet();
  const [enableChains, setEnableChains] = useState<Chain[]>([]);
  const chains = wallet.getSupportChains();

  useEffect(() => {
    setEnableChains(wallet.getEnableChains());
  }, []);

  const handleSwitchChain = (chainEnum: CHAINS_ENUM, checked: boolean) => {
    if (checked) {
      setEnableChains([...enableChains, CHAINS[chainEnum]]);
      wallet.enableChain(chainEnum);
    } else {
      if (enableChains.length > 1) {
        setEnableChains(
          enableChains.filter((chain) => chain.enum !== chainEnum)
        );
        wallet.disableChain(chainEnum);
      } else {
        message.error('Keep at least one chain enabled.');
      }
    }
  };

  return (
    <div className="chain-management">
      <PageHeader>Chain Management</PageHeader>
      {chains.map((chain) => (
        <Field
          key={chain.enum}
          leftIcon={<img src={chain.logo} className="icon icon-chain" />}
          rightIcon={
            <Switch
              checked={!!enableChains.find((c) => c.enum === chain.enum)}
              onChange={(checked) => handleSwitchChain(chain.enum, checked)}
            />
          }
        >
          <div className="chain-info">
            <p className="text-13">{chain.name}</p>
            <p className="text-12">Chain ID: {chain.id}</p>
          </div>
        </Field>
      ))}
      <div className="tip text-12 text-gray-comment text-center">
        More chains will be added in the future...
      </div>
    </div>
  );
};

export default ChainManagement;
