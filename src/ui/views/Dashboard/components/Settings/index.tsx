import { Button, DrawerProps, Form, Input, message } from 'antd';
import clsx from 'clsx';
import { INITIAL_OPENAPI_URL } from 'consts';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconConflict from 'ui/assets/dashboard/conflict.svg';
import { ReactComponent as IconCheckbox } from 'ui/assets/dashboard/checkbox.svg';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.png';
import IconRabby from 'ui/assets/dashboard/rabby.svg';
import IconAddressManagement from 'ui/assets/icon-user.svg';
import IconLock from 'ui/assets/lock.svg';
import LogoRabby from 'ui/assets/logo-rabby-large.svg';
import IconReset from 'ui/assets/reset-account.svg';
import IconServer from 'ui/assets/server.svg';
import IconSuccess from 'ui/assets/success.svg';
import { Field, PageHeader, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';

interface SettingsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const OpenApiModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const { useForm } = Form;
  const [isVisible, setIsVisible] = useState(false);
  const [form] = useForm<{ host: string }>();
  const wallet = useWallet();
  const { t } = useTranslation();

  const init = async () => {
    const currentHost = await wallet.openapi.getHost();

    form.setFieldsValue({
      host: currentHost,
    });
  };

  const handleSubmit = async ({ host }: { host: string }) => {
    await wallet.openapi.setHost(host);
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  const restoreInitial = () => {
    form.setFieldsValue({
      host: INITIAL_OPENAPI_URL,
    });
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('openapi-modal', { show: isVisible, hidden: !visible })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Backend Service URL')}
      </PageHeader>
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="host"
          rules={[
            { required: true, message: t('Please input openapi host') },
            {
              pattern: /^((https|http)?:\/\/)[^\s]+\.[^\s]+/,
              message: t('Please check your host'),
            },
          ]}
        >
          <Input
            className="popup-input"
            placeholder="Host"
            size="large"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>
        {form.getFieldValue('host') !== INITIAL_OPENAPI_URL && (
          <div className="flex justify-end">
            <Button type="link" onClick={restoreInitial} className="restore">
              {t('Restore initial setting')}
            </Button>
          </div>
        )}
        <div className="flex justify-center mt-24 popup-footer">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className="w-[200px]"
          >
            {t('Save')}
          </Button>
        </div>
      </Form>
    </div>
  );
};

const ResolveConflictModal = ({
  visible,
  onCancel,
}: {
  visible: boolean;
  onCancel(): void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const wallet = useWallet();
  const { t } = useTranslation();
  const [isDefaultWallet, setIsDefaultWallet] = useState(false);

  const handleDefaultWalletChange = (value: boolean) => {
    if (isDefaultWallet === value) {
      return;
    }
    wallet.setIsDefaultWallet(value);
    setIsDefaultWallet(value);
    message.success({
      icon: <span></span>,
      content: <span className="text-white">Please refresh the page</span>,
    });
  };

  const init = async () => {
    setIsDefaultWallet(await wallet.isDefaultWallet());
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('resolve-conflict-modal', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Resolve conflict with MetaMask')}
      </PageHeader>
      <Field
        className="mb-[20px]"
        onClick={() => handleDefaultWalletChange(true)}
        leftIcon={
          <IconCheckbox
            className={clsx(isDefaultWallet ? 'checked' : null)}
          ></IconCheckbox>
        }
        rightIcon={null}
      >
        <div className="field-main">
          <div className="field-title">
            Prefer Rabby <img src={IconRabby} alt="" />
          </div>
          <div className="field-desc">
            Use Rabby to connect DApps and submit transactions.
          </div>
        </div>
      </Field>
      <Field
        className="metamask"
        onClick={() => handleDefaultWalletChange(false)}
        leftIcon={
          <IconCheckbox
            className={clsx(!isDefaultWallet ? 'checked' : null)}
          ></IconCheckbox>
        }
        rightIcon={null}
      >
        <div className="field-main">
          <div className="field-title">
            Prefer MetaMask <img src={IconMetamask} alt="" />
          </div>
          <div className="field-desc">
            Use MetaMask to connect DApps and submit transactions. Rabby's
            pre-sign features will not be available.
          </div>
        </div>
      </Field>
      {!isDefaultWallet && (
        <div className="tips">
          *Choosing this will prevent Rabby's pre-sign features from working
        </div>
      )}
    </div>
  );
};

const ResetAccountModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const wallet = useWallet();
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleResetAccount = async () => {
    const currentAddress = (await wallet.getCurrentAccount()).address;
    await wallet.clearAddressPendingTransactions(currentAddress);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Reset success'),
      duration: 0.5,
    });
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('reset-account-modal', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Reset Account')}
      </PageHeader>
      <div>
        <p className="reset-account-content mb-16">
          {t('ResetAccountDescription1')}
        </p>
        <p className="reset-account-content">{t('ResetAccountDescription2')}</p>
        <p className="reset-account-warn">{t('ResetAccountWarn')}</p>
        <div className="flex justify-center mt-24 popup-footer">
          <Button
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={handleResetAccount}
          >
            {t('Confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Settings = ({ visible, onClose }: SettingsProps) => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [showResolveConflictModal, setShowResolveConflictModal] = useState(
    false
  );
  const [isDefaultWallet, setIsDefaultWallet] = useState(false);
  const [showResetAccountModal, setShowResetAccountModal] = useState(false);

  const init = async () => {
    setIsDefaultWallet(await wallet.isDefaultWallet());
  };

  const renderData = [
    {
      leftIcon: IconAddressManagement,
      content: t('AddressManagement'),
      onClick: () => history.push('/settings/address'),
    },
    {
      leftIcon: IconServer,
      content: t('Backend Service URL'),
      onClick: () => setShowOpenApiModal(true),
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
    },
    {
      className: clsx({ 'default-wallet-field': !isDefaultWallet }),
      leftIcon: IconConflict,
      onClick: () => setShowResolveConflictModal(true),
      content: (
        <div>
          <span className="flex default-wallet-title">
            {t('Resolve conflict with MetaMask')}
          </span>
          {!isDefaultWallet && (
            <p className="not-default-tip">
              {t('Rabby is currently not working properly')}
            </p>
          )}
        </div>
      ),
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
    },
    {
      leftIcon: IconReset,
      content: t('Reset Account'),
      onClick: () => setShowResetAccountModal(true),
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
    },
  ];

  const lockWallet = async () => {
    await wallet.lockWallet();
    history.push('/unlock');
  };

  const handleClose: DrawerProps['onClose'] = (e) => {
    setShowOpenApiModal(false);
    setShowResolveConflictModal(false);
    setShowResetAccountModal(false);
    onClose && onClose(e);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <Popup
        visible={visible}
        onClose={handleClose}
        height={460}
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
            {renderData.map((data, index) => (
              <Field
                key={index}
                leftIcon={<img src={data.leftIcon} className="icon" />}
                rightIcon={
                  data.rightIcon || (
                    <img
                      src={IconArrowRight}
                      className="icon icon-arrow-right"
                    />
                  )
                }
                onClick={data.onClick}
                className={data.className}
              >
                {data.content}
              </Field>
            ))}
          </div>
          <footer className="footer">
            <img src={LogoRabby} alt="" />
            <div>{process.env.version}</div>
          </footer>
          <OpenApiModal
            visible={showOpenApiModal}
            onFinish={() => setShowOpenApiModal(false)}
            onCancel={() => setShowOpenApiModal(false)}
          />
          <ResolveConflictModal
            visible={showResolveConflictModal}
            onCancel={() => {
              init();
              setShowResolveConflictModal(false);
            }}
          />
          <ResetAccountModal
            visible={showResetAccountModal}
            onFinish={() => setShowResetAccountModal(false)}
            onCancel={() => setShowResetAccountModal(false)}
          />
        </div>
      </Popup>
    </>
  );
};

export default Settings;
