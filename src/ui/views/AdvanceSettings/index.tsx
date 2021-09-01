import React, { useState } from 'react';
import { Form, Input, Button, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { PageHeader, Field, Modal } from 'ui/component';
import { INITIAL_OPENAPI_URL } from 'consts';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
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
  const currentHost = wallet.openapi.getHost();

  form.setFieldsValue({
    host: currentHost,
  });

  const handleSubmit = async ({ host }: { host: string }) => {
    await wallet.openapi.setHost(host);
    onFinish();
  };

  const restoreInitial = () => {
    form.setFieldsValue({
      host: INITIAL_OPENAPI_URL,
    });
  };

  return (
    <Modal
      title={t('Backend Service URL')}
      visible={visible}
      onCancel={onCancel}
      className="openapi-modal"
    >
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
          <Input placeholder="Host" size="large" autoFocus spellCheck={false} />
        </Form.Item>
        {currentHost !== INITIAL_OPENAPI_URL && (
          <div className="flex justify-end">
            <Button type="link" onClick={restoreInitial} className="restore">
              {t('Restore initial setting')}
            </Button>
          </div>
        )}
        <div className="flex justify-center mt-24">
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

const AdvancedSettings = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [isDefaultWallet, setIsDefaultWallet] = useState(
    wallet.isDefaultWallet()
  );

  const handleDefaultWalletChange = (value: boolean) => {
    wallet.setIsDefaultWallet(value);
    setIsDefaultWallet(value);
  };

  const renderData = [
    {
      content: t('Backend Service URL'),
      onClick: () => setShowOpenApiModal(true),
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
    },
    {
      content: t('Set Rabby as default wallet'),
      rightIcon: (
        <Switch
          defaultChecked={isDefaultWallet}
          onChange={handleDefaultWalletChange}
        />
      ),
    },
  ];

  return (
    <div className="settings">
      <PageHeader>{t('Advanced Options')}</PageHeader>
      {renderData.map((data) => (
        <Field
          key={data.content}
          rightIcon={data.rightIcon}
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

export default AdvancedSettings;
