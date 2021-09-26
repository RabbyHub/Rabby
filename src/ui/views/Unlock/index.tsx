import React, { useEffect, useRef } from 'react';
import { Input, Form, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet, useApproval, useWalletRequest } from 'ui/utils';

import './style.less';

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [form] = Form.useForm();
  const inputEl = useRef<Input>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, []);

  const [run] = useWalletRequest(wallet.unlock, {
    onSuccess() {
      resolveApproval();
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

  return (
    <div className="unlock">
      <div className="header">
        <img src="./images/unlock-image.png" className="image" />
        <p className="slogan">{t('appDescription')}</p>
      </div>
      <Form
        autoComplete="off"
        className="bg-gray-bg flex-1"
        form={form}
        onFinish={({ password }) => run(password)}
      >
        <Form.Item
          className="mt-[34px] mx-28"
          name="password"
          rules={[
            {
              required: true,
              message: t('Please input Password'),
            },
          ]}
        >
          <Input
            placeholder={t('Password')}
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
