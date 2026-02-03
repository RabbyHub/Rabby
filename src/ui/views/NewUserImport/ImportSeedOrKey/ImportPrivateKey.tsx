import { Card } from '@/ui/component/NewUserImport';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Form, Input, message } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { useNewUserGuideStore } from '../hooks/useNewUserGuideStore';
import { clearClipboard } from '@/ui/utils/clipboard';
import IconSuccess from 'ui/assets/success.svg';
import styled from 'styled-components';
import { useWallet } from '@/ui/utils';

const Container = styled.div`
  .ant-input {
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);
    font-size: 16px;
    &:not(:placeholder-shown) {
      font-size: 24px;
    }
    &::placeholder {
      color: var(--r-neutral-foot, #6a7587);
      font-weight: 400;
    }
  }

  .ant-input:focus,
  .ant-input-focused {
    border-color: var(--r-blue-default, #7084ff);
  }

  .ant-form-item-has-error .ant-input {
    border: 1px solid var(--r-red-default, #e34935);
  }
  .ant-form-item-explain.ant-form-item-explain-error {
    font-size: 14px !important;
  }
`;

export const ImportPrivateKey = () => {
  const { t } = useTranslation();
  const { setStore, clearStore } = useNewUserGuideStore();
  const [value, setValue] = useState('');

  const history = useHistory();
  const wallet = useWallet();

  const [form] = Form.useForm<{
    privateKey: string;
  }>();

  const handleSubmit = useMemoizedFn(async () => {
    const { privateKey } = await form.validateFields();
    setStore({
      privateKey: privateKey,
    });
    history.push('/new-user/import/private-key/set-password');
  });

  const { runAsync: privateKeyValidator, error, loading } = useRequest(
    async (_, value: string) => {
      if (!value) {
        throw new Error('Please input Private key');
      }
      return wallet.validatePrivateKey(value);
    },
    {
      manual: true,
    }
  );

  return (
    <Container className="flex flex-col flex-1">
      <div className="flex-1">
        <Form form={form} className="mt-[20px]">
          <Form.Item
            name="privateKey"
            rules={[
              {
                validator: privateKeyValidator,
              },
            ]}
          >
            <Input
              className="h-[52px]"
              type="password"
              autoFocus
              spellCheck={false}
              placeholder="Input private key"
              onChange={(e) => {
                setValue(e.target.value);
              }}
              onPaste={() => {
                clearClipboard();
                message.success({
                  icon: <img src={IconSuccess} className="icon icon-success" />,
                  content: t(
                    'page.newUserImport.importPrivateKey.pasteCleared'
                  ),
                  duration: 2,
                });
              }}
            />
          </Form.Item>
        </Form>
      </div>

      <footer className="mt-auto">
        <div className="text-[13px] leading-[16px] text-r-neutral-foot mb-[16px]">
          Don't have seed phrase or private key yet?{' '}
          <Link to="/new-user/create-wallet" className="text-r-blue-default">
            Create a wallet
          </Link>
        </div>
        <Button
          onClick={handleSubmit}
          block
          type="primary"
          disabled={!!error || loading || !value}
          className={clsx(
            'mt-auto h-[52px] shadow-none rounded-[8px]',
            'text-[15px] leading-[18px] font-medium'
          )}
        >
          {t('global.next')}
        </Button>
      </footer>
    </Container>
  );
};
