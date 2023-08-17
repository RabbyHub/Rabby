import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { Popup } from 'ui/component';
import { useAlias } from '@/ui/utils';
import IconEdit from 'ui/assets/editpen.svg';

const AddressMemo = ({ address }: { address: string }) => {
  const [addressAlias, updateAlias] = useAlias(address);
  const inputRef = useRef<Input>(null);
  const [form] = useForm();
  const { t } = useTranslation();

  const updateAddressMemo = (
    alias: string | undefined,
    update: (memo: string) => void
  ) => {
    form.setFieldsValue({
      memo: alias,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    const { destroy } = Popup.info({
      title: t('component.Contact.EditModal.title'),
      height: 215,
      content: (
        <div className="pt-[4px]">
          <Form
            form={form}
            onFinish={async () => {
              form
                .validateFields()
                .then((values) => {
                  return update(values.memo);
                })
                .then(() => {
                  destroy();
                });
            }}
            initialValues={{
              memo: alias,
            }}
          >
            <Form.Item
              name="memo"
              className="h-[80px] mb-0"
              rules={[{ required: true, message: 'Please input address note' }]}
            >
              <Input
                ref={inputRef}
                className="popup-input h-[48px]"
                size="large"
                placeholder="Please input address note"
                autoFocus
                allowClear
                spellCheck={false}
                autoComplete="off"
                maxLength={50}
              ></Input>
            </Form.Item>
            <div className="text-center">
              <Button
                type="primary"
                size="large"
                className="w-[200px]"
                htmlType="submit"
              >
                {t('global.confirm')}
              </Button>
            </div>
          </Form>
        </div>
      ),
    });
  };

  return (
    <div
      className="inline-flex cursor-pointer"
      onClick={() => updateAddressMemo(addressAlias, updateAlias)}
    >
      <span className="mr-6">{addressAlias || '-'}</span>
      <img src={IconEdit} className="icon-edit-alias icon w-[13px]" />
    </div>
  );
};

export default AddressMemo;
