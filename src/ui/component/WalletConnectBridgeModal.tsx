import React, { useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Modal } from 'ui/component';
import { INITIAL_OPENAPI_URL } from 'consts';

const OpenApiModal = ({
  value,
  defaultValue,
  visible,
  onChange,
  onCancel,
}: {
  value: string;
  defaultValue: string;
  visible: boolean;
  onChange(val: string): void;
  onCancel(): void;
}) => {
  const { useForm } = Form;
  const [form] = useForm<{ host: string }>();
  const { t } = useTranslation();

  const init = async () => {
    form.setFieldsValue({
      host: value,
    });
  };

  const handleSubmit = async ({ host }: { host: string }) => {
    onChange(host);
  };

  const restoreInitial = () => {
    form.setFieldsValue({
      host: defaultValue,
    });
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
    <Modal
      title={t('Bridge server URL')}
      visible={visible}
      onCancel={onCancel}
      className="openapi-modal"
    >
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="host"
          rules={[
            { required: true, message: t('Please input bridge server host') },
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
export default OpenApiModal;
