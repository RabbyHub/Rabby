import React from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from 'ui/utils';
import { Button } from 'antd';
import { ArrowLink, PageHeader, Field } from 'ui/component';
import IconAddressManagement from 'ui/assets/address-management.svg';
import IconChainManagement from 'ui/assets/chain-management.svg';
import IconConnectSitesManagement from 'ui/assets/connect-sites-management.svg';
import IconOpenapiManagement from 'ui/assets/openapi-management.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import './style.less';

const Settings = () => {
  const wallet = useWallet();
  const history = useHistory();

  const lockWallet = async () => {
    await wallet.lockWallet();
    history.push('/unlock');
  };

  return (
    <div className="settings" style={{ backgroundColor: '#F0F2F5' }}>
      <PageHeader>Settings</PageHeader>
      <Button
        block
        className="rounded-full mb-4 text-base"
        onClick={lockWallet}
      >
        Lock wallet
      </Button>
      <Field
        leftIcon={
          <img
            src={IconAddressManagement}
            className="icon icon-address-management"
          />
        }
        rightIcon={
          <img src={IconArrowRight} className="icon icon-arrow-right" />
        }
      >
        Address Management
      </Field>
      <ArrowLink className="mt-6 font-semibold" to="/settings/address">
        Address management
      </ArrowLink>
      <ArrowLink className="mt-5 font-semibold" to="/settings/sites">
        Connect sites
      </ArrowLink>
      <ArrowLink className="mt-5 font-semibold" to="/import">
        import
      </ArrowLink>
    </div>
  );
};

export default Settings;
