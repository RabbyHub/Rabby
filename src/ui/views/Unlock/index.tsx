import React, { useEffect, useRef } from 'react';
import { Input, Form, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useWallet, useApproval, useWalletRequest, getUiType } from 'ui/utils';

import './style.less';

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [form] = Form.useForm();
  const inputEl = useRef<Input>(null);
  const UiType = getUiType();
  const { t } = useTranslation();
  const history = useHistory();
  const isUnlockingRef = useRef(false);

  useEffect(() => {
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, []);

  const [run] = useWalletRequest(wallet.unlock, {
    onSuccess() {
      if (UiType.isNotification) {
        resolveApproval();
      } else {
        history.replace('/');
      }
      wallet.syncGnosisNetworks();
    },
    onError(err) {
      form.setFields([
        {
          name: 'password',
          errors: [err?.message || t('incorrect password')],
        },
      ]);
    },
  });

  const handleSubmit = async ({ password }: { password: string }) => {
    if (isUnlockingRef.current) return;
    isUnlockingRef.current = true;
    await run(password);
    isUnlockingRef.current = false;
  };

  return (
    <div className="unlock">
      <div className="header">
        <img src="./images/welcome-image.svg" className="image" />
      </div>
      <Form
        autoComplete="off"
        className="bg-gray-bg flex-1"
        form={form}
        onFinish={handleSubmit}
      >
        <Form.Item
          className="mt-[34px] mx-28"
          name="password"
          rules={[
            {
              required: true,
              message: t('Enter the Password to Unlock'),
            },
          ]}
        >
          <Input
            placeholder={t('Enter the Password to Unlock')}
            size="large"
            type="password"
            ref={inputEl}
            spellCheck={false}
          />
        </Form.Item>
        <Form.Item className="mx-28 mt-18">
          <Button
            className="w-full block"
            htmlType="submit"
            type="primary"
            size="large"
          >
            {t('Unlock')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Unlock;
