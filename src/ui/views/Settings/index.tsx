import React from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { PageHeader, Field } from 'ui/component';
import IconAddressManagement from 'ui/assets/address-management.svg';
import IconChainManagement from 'ui/assets/chain-management.svg';
import IconConnectSitesManagement from 'ui/assets/connect-sites-management.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconLock from 'ui/assets/lock.svg';
import IconAdvanceOption from 'ui/assets/advance-option.svg';
import './style.less';

const Settings = () => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const renderData = [
    {
      leftIcon: IconAddressManagement,
      content: t('AddressManagement'),
      onClick: () => history.push('/settings/address'),
    },
    // {
    //   leftIcon: IconChainManagement,
    //   content: t('ChainManagement'),
    //   onClick: () => history.push('/settings/chain'),
    // },
    {
      leftIcon: IconConnectSitesManagement,
      content: t('Connected websites'),
      onClick: () => history.push('/settings/sites'),
    },
    // {
    //   leftIcon: IconAdvanceOption,
    //   content: t('Advanced Options'),
    //   onClick: () => history.push('/settings/advanced'),
    // },
  ];

  const lockWallet = async () => {
    await wallet.lockWallet();
    history.push('/unlock');
  };

  return (
    <div className="settings">
      <PageHeader>{t('Settings')}</PageHeader>
      <Button
        block
        size="large"
        type="primary"
        className="flex justify-center items-center lock-wallet"
        onClick={lockWallet}
      >
        <img src={IconLock} className="icon icon-lock" /> {t('Lock')}
      </Button>
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
      <div className="text-12 text-gray-comment text-center absolute bottom-[50px] w-full left-0">
        {process.env.version}
      </div>
    </div>
  );
};

export default Settings;
