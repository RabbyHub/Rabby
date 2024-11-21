import { Card } from '@/ui/component/NewUserImport';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Form, Input, message } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { clearClipboard } from '@/ui/utils/clipboard';
import IconSuccess from 'ui/assets/success.svg';
import styled from 'styled-components';
import { useWallet } from '@/ui/utils';

const Container = styled.div`
  .ant-input {
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);
  }

  .ant-input:focus,
  .ant-input-focused {
    border-color: var(--r-blue-default, #7084ff);
  }

  .ant-form-item-has-error .ant-input {
    border: 1px solid var(--r-red-default, #e34935);
  }
`;

export const NewUserImportPrivateKey = () => {
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
    <Container>
      <Card
        onBack={() => {
          history.goBack();
          clearStore();
        }}
        step={1}
        className="flex flex-col"
      >
        <div className="flex-1 mt-[18px]">
          <div className="text-r-neutral-title1 text-center text-[20px] font-semibold leading-[24px]">
            {t('page.newUserImport.importPrivateKey.title')}
          </div>
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
                placeholder="input private key"
                onChange={(e) => {
                  setValue(e.target.value);
                }}
                onPaste={() => {
                  clearClipboard();
                  message.success({
                    icon: (
                      <img src={IconSuccess} className="icon icon-success" />
                    ),
                    content: t('page.newAddress.seedPhrase.pastedAndClear'),
                    duration: 2,
                  });
                }}
              />
            </Form.Item>
          </Form>
        </div>

        <Button
          onClick={handleSubmit}
          block
          type="primary"
          disabled={!!error || loading || !value}
          className={clsx(
            'mt-[48px] h-[56px] shadow-none rounded-[8px]',
            'text-[17px] font-medium'
          )}
        >
          {t('global.Confirm')}
        </Button>
      </Card>
    </Container>
  );
};
