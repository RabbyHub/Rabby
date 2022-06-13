import { Button, Form, Input, message } from 'antd';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import { useForm } from 'antd/lib/form/Form';
import { useHistory } from 'react-router-dom';
import { KEYRING_TYPE } from '@/constant';

type Props = {
  address: string;
  type: string;
  brandName?: string;
};
export const AddressBackup = ({ address, type }: Props) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();

  const [form] = useForm();
  const inputRef = useRef<Input>(null);

  if (![KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(type)) {
    return null;
  }

  const handleBackup = (path: 'mneonics' | 'private-key') => {
    form.resetFields();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    const { destroy } = Popup.info({
      title: 'Enter Password before backup',
      height: 280,
      content: (
        <div className="pt-[4px]">
          <Form
            form={form}
            onFinish={async () => {
              const { password } = await form.validateFields();
              try {
                await wallet.verifyPassword(password);
              } catch (e: any) {
                form.setFields([
                  {
                    name: 'password',
                    errors: [e?.message || t('incorrect password')],
                  },
                ]);
                throw e;
              }
              try {
                let data = '';
                if (path === 'private-key') {
                  data = await wallet.getPrivateKey(password, {
                    address,
                    type,
                  });
                } else if (path === 'mneonics') {
                  data = await wallet.getMnemonics(password, address);
                } else {
                  throw Error('Wrong path');
                }
                destroy();
                history.push({
                  pathname: `/settings/address-backup/${path}`,
                  state: {
                    data: data,
                  },
                });
              } catch (e) {
                message.error(e.message || 'Something wrong');
              }
            }}
          >
            <Form.Item
              name="password"
              className="h-[80px] mb-[58px]"
              rules={[{ required: true, message: t('Please input password') }]}
            >
              <Input
                ref={inputRef}
                className="popup-input h-[48px]"
                size="large"
                placeholder="Please input password"
                type="password"
                autoFocus
                spellCheck={false}
              ></Input>
            </Form.Item>
            <div className="flex gap-[16px]">
              <Button
                type="primary"
                size="large"
                className="w-[50%]"
                onClick={() => {
                  destroy();
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                className="rabby-btn-ghost w-[50%]"
                ghost
                size="large"
                htmlType="submit"
              >
                Confirm
              </Button>
            </div>
          </Form>
        </div>
      ),
    });
  };

  return (
    <div className="rabby-list">
      {type === KEYRING_TYPE.HdKeyring ? (
        <div
          className="rabby-list-item cursor-pointer"
          onClick={() => {
            handleBackup('mneonics');
          }}
        >
          <div className="rabby-list-item-content">
            <div className="rabby-list-item-label">Backup Seed Phrase</div>
            <div className="rabby-list-item-arrow">
              <IconArrowRight
                width={16}
                height={16}
                viewBox="0 0 12 12"
              ></IconArrowRight>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className="rabby-list-item cursor-pointer"
        onClick={() => {
          handleBackup('private-key');
        }}
      >
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">Backup Private Key</div>
          <div className="rabby-list-item-arrow">
            <IconArrowRight
              width={16}
              height={16}
              viewBox="0 0 12 12"
            ></IconArrowRight>
          </div>
        </div>
      </div>
    </div>
  );
};
