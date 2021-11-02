import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Switch, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { PageHeader, Field, Modal, AddressViewer } from 'ui/component';
import { INITIAL_OPENAPI_URL, WALLET_BRAND_CONTENT } from 'consts';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { SvgIconCross } from 'ui/assets';
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

  const init = async () => {
    const currentHost = await wallet.openapi.getHost();

    form.setFieldsValue({
      host: currentHost,
    });
  };

  const handleSubmit = async ({ host }: { host: string }) => {
    await wallet.openapi.setHost(host);
    onFinish();
  };

  const restoreInitial = () => {
    form.setFieldsValue({
      host: INITIAL_OPENAPI_URL,
    });
  };

  useEffect(() => {
    init();
  }, []);

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
              pattern: /^((https|http)?:\/\/)[^\s]+\.[^\s]+/,
              message: t('Please check your host'),
            },
          ]}
        >
          <Input placeholder="Host" size="large" autoFocus spellCheck={false} />
        </Form.Item>
        {form.getFieldValue('host') !== INITIAL_OPENAPI_URL && (
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
  const [isDefaultWallet, setIsDefaultWallet] = useState(false);
  const [wcConnections, setWcConnections] = useState<
    { address: string; brandName: string }[]
  >([]);

  const getConnections = async () => {
    const connections = await wallet.getWalletConnectConnectors();

    setWcConnections(connections);
  };

  const handleDefaultWalletChange = (value: boolean) => {
    wallet.setIsDefaultWallet(value);
    setIsDefaultWallet(value);
  };

  const handleRemoveConnection = async (connector: {
    address: string;
    brandName: string;
  }) => {
    await wallet.killWalletConnectConnector(
      connector.address,
      connector.brandName
    );
    getConnections();
    message.success(t('WalletConnect Disconnected'));
  };

  const init = async () => {
    setIsDefaultWallet(await wallet.isDefaultWallet());
    await getConnections();
  };

  useEffect(() => {
    init();
  }, []);

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
          checked={isDefaultWallet}
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
      {wcConnections.length > 0 && (
        <div className="mt-28">
          <p className="text-12 mb-12 text-black">
            {t('Connected WalletConnect Address')}
          </p>
          {wcConnections.map((connection) => (
            <Field
              className="border border-white walletconnect-connector"
              key={`${connection.brandName}-${connection.address}`}
              leftIcon={
                <div className="icon icon-site">
                  <img src={WALLET_BRAND_CONTENT[connection.brandName].image} />
                </div>
              }
              rightIcon={
                <SvgIconCross
                  className="cross-icon w-8 fill-current text-gray-comment cursor-pointer"
                  onClick={() => handleRemoveConnection(connection)}
                />
              }
            >
              <div className="flex items-center">
                <p className="text-13 font-medium text-gray-title mb-0">
                  <AddressViewer
                    address={connection.address}
                    showArrow={false}
                  />
                </p>
              </div>
            </Field>
          ))}
        </div>
      )}
      <OpenApiModal
        visible={showOpenApiModal}
        onFinish={() => setShowOpenApiModal(false)}
        onCancel={() => setShowOpenApiModal(false)}
      />
    </div>
  );
};

export default AdvancedSettings;
