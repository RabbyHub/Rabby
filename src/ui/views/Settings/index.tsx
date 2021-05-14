import React from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from 'ui/utils';
import { PageHeader, Field } from 'ui/component';
import IconAddressManagement from 'ui/assets/address-management.svg';
import IconChainManagement from 'ui/assets/chain-management.svg';
import IconConnectSitesManagement from 'ui/assets/connect-sites-management.svg';
import IconOpenapiManagement from 'ui/assets/openapi-management.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import './style.less';

const Settings = () => {
  const wallet = useWallet();
  const history = useHistory();
  const renderData = [
    {
      leftIcon: IconAddressManagement,
      content: 'Address management',
      onClick: () => history.push('/settings/address'),
    },
    {
      leftIcon: IconChainManagement,
      content: 'Chain management',
    },
    {
      leftIcon: IconConnectSitesManagement,
      content: 'Connected sites',
      onClick: () => history.push('/settings/sites'),
    },
    {
      leftIcon: IconOpenapiManagement,
      content: 'Change OpenAPI',
    },
  ];

  const lockWallet = async () => {
    await wallet.lockWallet();
    history.push('/unlock');
  };

  return (
    <div className="settings">
      <PageHeader>Settings</PageHeader>
      <div className="field lock-wallet" onClick={lockWallet}>
        Lock wallet
      </div>
      {renderData.map((data) => (
        <Field
          key={data.content}
          leftIcon={<img src={data.leftIcon} className="icon" />}
          rightIcon={
            <img src={IconArrowRight} className="icon icon-arrow-right" />
          }
          onClick={data.onClick}
        >
          {data.content}
        </Field>
      ))}
    </div>
  );
};

export default Settings;
