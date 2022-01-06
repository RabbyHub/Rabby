import { Button, DrawerProps } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconAdvanceOption from 'ui/assets/icon-setting.svg';
import IconAddressManagement from 'ui/assets/icon-user.svg';
import IconLock from 'ui/assets/lock.svg';
import LogoRabby from 'ui/assets/logo-rabby-large.svg';
import { Field, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';

interface SettingsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const Settings = ({ visible, onClose }: SettingsProps) => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const renderData = [
    {
      leftIcon: IconAddressManagement,
      content: t('AddressManagement'),
      onClick: () => history.push('/settings/address'),
    },
    {
      leftIcon: IconAdvanceOption,
      content: t('Advanced Options'),
      onClick: () => history.push('/settings/advanced'),
    },
  ];

  const lockWallet = async () => {
    await wallet.lockWallet();
    history.push('/unlock');
  };

  return (
    <>
      <Popup
        visible={visible}
        onClose={onClose}
        height={320}
        bodyStyle={{ height: '100%' }}
      >
        <div className="popup-settings">
          <div className="content">
            <Button
              block
              size="large"
              type="primary"
              className="flex justify-center items-center lock-wallet"
              onClick={lockWallet}
            >
              <img src={IconLock} className="icon icon-lock" />{' '}
              {t('Lock Wallet')}
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
          </div>
          <footer className="footer">
            <img src={LogoRabby} alt="" />
            <div>{process.env.version}</div>
          </footer>
        </div>
      </Popup>
    </>
  );
};

export default Settings;
