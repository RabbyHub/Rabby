import React, { useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Modal } from 'ui/component';
import { INITIAL_OPENAPI_URL } from 'consts';
import Popup from './Popup';
import { useMedia } from 'react-use';

const OpenApiModal = ({
  value,
  visible,
  onChange,
  onCancel,
}: {
  value: string;
  visible: boolean;
  onChange(val: string): void;
  onCancel(): void;
}) => {
  const { useForm } = Form;
  const [form] = useForm<{ host: string }>();
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');
  const ModalComponent = isWide ? Modal : Popup;

  const init = async () => {
    form.setFieldsValue({
      host: value,
    });
  };

  const handleSubmit = async ({ host }: { host: string }) => {
    onChange(host);
  };

  const restoreInitial = () => {
    form.setFieldsValue({});
  };

  useEffect(() => {
    form.setFieldsValue({
      host: value,
    });
  }, [value]);

  useEffect(() => {
    init();
  }, []);

  return (
    <ModalComponent
      height={240}
      closable={false}
      title={t('component.WalletConnectBridgeModal.title')}
      visible={visible}
      onCancel={onCancel}
      className="openapi-modal rabby-modal"
    >
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          className="mb-12"
          name="host"
          rules={[
            {
              required: true,
              message: t('component.WalletConnectBridgeModal.requiredMsg'),
            },
            {
              pattern: /^((https|http)?:\/\/)[^\s]+\.[^\s]+/,
              message: t('component.WalletConnectBridgeModal.invalidMsg'),
            },
          ]}
        >
          <Input
            placeholder="Host"
            size="large"
            className="popup-input"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>
        {form.getFieldValue('host') !== INITIAL_OPENAPI_URL && (
          <div className="flex justify-end">
            <Button type="link" onClick={restoreInitial} className="restore">
              {t('component.WalletConnectBridgeModal.restore')}
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
            {t('global.Save')}
          </Button>
        </div>
      </Form>
    </ModalComponent>
  );
};
export default OpenApiModal;
