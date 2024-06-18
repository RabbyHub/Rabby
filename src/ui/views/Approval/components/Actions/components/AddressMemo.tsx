import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { Popup } from 'ui/component';
import IconEdit from 'ui/assets/editpen.svg';
import { useApprovalUtils } from '../../../hooks/useApprovalUtils';
import clsx from 'clsx';
import { Divide } from '../../Divide';

const AddressMemo = ({ address }: { address: string }) => {
  const { alias } = useApprovalUtils();
  const addressAlias = alias.accountMap[address]?.alias;
  const inputRef = useRef<Input>(null);
  const [form] = useForm();
  const { t } = useTranslation();

  useEffect(() => {
    alias.add(address);
  }, [address]);

  const updateAddressMemo = (
    alias: string | undefined,
    update: (addr: string, memo: string) => void
  ) => {
    form.setFieldsValue({
      memo: alias,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    const { destroy } = Popup.info({
      title: t('component.Contact.EditModal.title'),
      isSupportDarkMode: true,
      height: 224,
      isNew: true,
      bodyStyle: {
        padding: '0 20px',
      },
      content: (
        <div className="mt-16">
          <Form
            form={form}
            onFinish={async () => {
              form
                .validateFields()
                .then((values) => {
                  return update(address, values.memo);
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
                className="popup-input h-[52px] bg-r-neutral-card-1"
                size="large"
                placeholder="Please input address note"
                autoFocus
                allowClear
                spellCheck={false}
                autoComplete="off"
                maxLength={50}
              ></Input>
            </Form.Item>
            <Divide className="bg-r-neutral-line absolute left-0" />
            <div className="text-center flex gap-x-16 mt-20">
              <Button
                size="large"
                type="ghost"
                onClick={() => destroy()}
                className={clsx(
                  'w-[200px]',
                  'text-blue-light',
                  'border-blue-light',
                  'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
                  'before:content-none'
                )}
              >
                {t('global.Cancel')}
              </Button>
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
      onClick={() => updateAddressMemo(addressAlias, alias.update)}
    >
      <span className="mr-6">{addressAlias || '-'}</span>
      <img src={IconEdit} className="icon-edit-alias icon w-[13px]" />
    </div>
  );
};

export default AddressMemo;
