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
    },
    onError(err) {
      console.log('error', err);
      form.setFields([
        {
          name: 'password',
          errors: [err?.message || t('page.unlock.password.error')],
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
    <div className="unlock page-has-ant-input">
      <div className="header">
        <img src="./images/welcome-image.svg" className="image" />
      </div>
      <Form
        autoComplete="off"
        className="bg-r-neutral-bg-2 flex-1"
        form={form}
        onFinish={handleSubmit}
      >
        <Form.Item
          className="mt-[34px] mx-28"
          name="password"
          rules={[
            {
              required: true,
              message: t('page.unlock.password.required'),
            },
          ]}
        >
          <Input
            placeholder={t('page.unlock.password.placeholder')}
            className="bg-r-neutral-card-1 hover:border-rabby-blue-default focus:border-rabby-blue-default"
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
            {t('page.unlock.btn.unlock')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Unlock;
