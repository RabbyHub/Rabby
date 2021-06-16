import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from 'ui/utils';
import { Switch, message, Modal } from 'antd';
import { PageHeader, Field, StrayPageWithButton } from 'ui/component';
import { Chain } from 'background/service/chain';
import { CHAINS, CHAINS_ENUM } from 'consts';
import './style.less';

export const ChainManagementList = ({ inStart = false }) => {
  const wallet = useWallet();
  const [enableChains, setEnableChains] = useState<Chain[]>(
    wallet.getEnableChains()
  );
  const chains = wallet.getSupportChains();

  const disableChain = (chainEnum: CHAINS_ENUM) => {
    setEnableChains(enableChains.filter((chain) => chain.enum !== chainEnum));
    wallet.disableChain(chainEnum);
  };

  const handleSwitchChain = (chainEnum: CHAINS_ENUM, checked: boolean) => {
    if (checked) {
      setEnableChains([...enableChains, CHAINS[chainEnum]]);
      wallet.enableChain(chainEnum);
    } else {
      if (enableChains.length > 1) {
        if (inStart) {
          disableChain(chainEnum);
          return;
        }

        Modal.confirm({
          centered: true,
          title:
            'After disabling a chain,  all websites connected using this chain will also be deleted',
          className: 'disable-chain',
          bodyStyle: {
            backgroundColor: 'transparent',
          },
          okText: 'Disable',
          cancelText: 'Cancel',
          width: '360px',
          onOk: () => {
            const sites = wallet.getSitesByDefaultChain(chainEnum);
            if (sites.length > 0) {
              sites.forEach((site) => {
                wallet.removeConnectedSite(site.origin);
              });
            }

            disableChain(chainEnum);
          },
        });
      } else {
        message.error('At least one enabled chain is required.');
      }
    }
  };

  return (
    <>
      {chains.map((chain) => (
        <Field
          key={chain.enum}
          leftIcon={<img src={chain.logo} className="icon icon-chain" />}
          rightIcon={
            <Switch
              defaultChecked={!!enableChains.find((c) => c.enum === chain.enum)}
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
    </>
  );
};

export const StartChainManagement = () => {
  const history = useHistory();

  const handleNextClick = () => {
    history.replace('/no-address');
  };

  return (
    <StrayPageWithButton
      NextButtonContent="OK"
      hasDivider
      onNextClick={handleNextClick}
      header={{
        title: 'Enable Chains',
        subTitle: 'Choose which chains you would like to use',
      }}
    >
      <div className="chain-management px-0 min-h-full">
        <ChainManagementList inStart />
      </div>
    </StrayPageWithButton>
  );
};

const ChainManagement = () => (
  <div className="chain-management">
    <PageHeader>Chain Management</PageHeader>
    <ChainManagementList />
  </div>
);

export default ChainManagement;
