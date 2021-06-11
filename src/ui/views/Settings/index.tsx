import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Modal, Form, Input, Button } from 'antd';
import { useWallet } from 'ui/utils';
import { PageHeader, Field } from 'ui/component';
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
  form.setFieldsValue({
    host: wallet.openapi.getHost(),
  });
  const handleSubmit = async ({ host }: { host: string }) => {
    await wallet.openapi.setHost(host);
    onFinish();
  };

  return (
    <Modal
      title="Backend Service URL"
      footer={null}
      visible={visible}
      onCancel={onCancel}
      centered
    >
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="host"
          rules={[
            { required: true, message: 'Please input openapi host' },
            {
              pattern: /^((https|http)?:\/\/)[^\s]+/,
              message: 'Please check your host',
            },
          ]}
        >
          <Input placeholder="Host" />
        </Form.Item>
        <div className="flex justify-center">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className="w-[200px]"
          >
            Confirm
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

const Settings = () => {
  const wallet = useWallet();
  const history = useHistory();
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const renderData = [
    {
      leftIcon: IconAddressManagement,
      content: 'Address management',
      onClick: () => history.push('/settings/address'),
    },
    {
      leftIcon: IconChainManagement,
      content: 'Chain management',
      onClick: () => history.push('/settings/chain'),
    },
    {
      leftIcon: IconConnectSitesManagement,
      content: 'Connected websites',
      onClick: () => history.push('/settings/sites'),
    },
    {
      leftIcon: IconOpenapiManagement,
      content: 'Backend Service URL',
      onClick: () => setShowOpenApiModal(true),
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
        <img src={IconLock} className="icon icon-lock" /> Lock
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
      <OpenApiModal
        visible={showOpenApiModal}
        onFinish={() => setShowOpenApiModal(false)}
        onCancel={() => setShowOpenApiModal(false)}
      />
    </div>
  );
};

export default Settings;
