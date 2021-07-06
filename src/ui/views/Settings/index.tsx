import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Form, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { PageHeader, Field, Modal } from 'ui/component';
import IconAddressManagement from 'ui/assets/address-management.svg';
import IconChainManagement from 'ui/assets/chain-management.svg';
import IconConnectSitesManagement from 'ui/assets/connect-sites-management.svg';
import IconOpenapiManagement from 'ui/assets/openapi-management.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconLock from 'ui/assets/lock.svg';
import './style.less';

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
  const [form] = useForm<{ host: string }>();
  const wallet = useWallet();
  const { t } = useTranslation();
  form.setFieldsValue({
    host: wallet.openapi.getHost(),
  });
  const handleSubmit = async ({ host }: { host: string }) => {
    await wallet.openapi.setHost(host);
    onFinish();
  };

  return (
    <Modal title="Backend Service URL" visible={visible} onCancel={onCancel}>
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="host"
          rules={[
            { required: true, message: t('Please input openapi host') },
            {
              pattern: /^((https|http)?:\/\/)[^\s]+/,
              message: t('Please check your host'),
            },
          ]}
        >
          <Input placeholder="Host" size="large" />
        </Form.Item>
        <div className="flex justify-center">
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
    </Modal>
  );
};

const Settings = () => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const renderData = [
    {
      leftIcon: IconAddressManagement,
      content: t('Address management'),
      onClick: () => history.push('/settings/address'),
    },
    {
      leftIcon: IconChainManagement,
      content: t('Chain management'),
      onClick: () => history.push('/settings/chain'),
    },
    {
      leftIcon: IconConnectSitesManagement,
      content: t('Connected websites'),
      onClick: () => history.push('/settings/sites'),
    },
    {
      leftIcon: IconOpenapiManagement,
      content: t('Backend Service URL'),
      onClick: () => setShowOpenApiModal(true),
    },
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
      <div className="text-12 text-gray-comment text-center mt-40">
        {process.env.version}
      </div>
      <OpenApiModal
        visible={showOpenApiModal}
        onFinish={() => setShowOpenApiModal(false)}
        onCancel={() => setShowOpenApiModal(false)}
      />
    </div>
  );
};

export default Settings;
