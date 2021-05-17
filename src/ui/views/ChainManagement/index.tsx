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
      {Object.keys(CHAINS).map((chainEnum) => (
        <Field
          key={chainEnum}
          leftIcon={
            <img src={CHAINS[chainEnum].logo} className="icon icon-chain" />
          }
          rightIcon={
            <Switch
              checked={
                !!enableChains.find(
                  (chain) => chain.enum.toString() === chainEnum
                )
              }
              onChange={(checked) =>
                handleSwitchChain(
                  (chainEnum as unknown) as CHAINS_ENUM,
                  checked
                )
              }
            />
          }
        >
          <div className="chain-info">
            <p className="text-13">{CHAINS[chainEnum].name}</p>
            <p className="text-12">Chain ID: {CHAINS[chainEnum].id}</p>
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
