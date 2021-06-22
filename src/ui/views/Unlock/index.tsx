import React, { useEffect, useRef } from 'react';
import { Input, Form, Button } from 'antd';
import { useWallet, useApproval, useWalletRequest } from 'ui/utils';

import './style.less';

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [form] = Form.useForm();
  const inputEl = useRef<Input>(null);

  useEffect(() => {
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, []);

  const [run, loading] = useWalletRequest(wallet.unlock, {
    onSuccess() {
      resolveApproval();
    },
    onError(err) {
      form.setFields([
        {
          name: 'password',
          errors: [err?.message || 'incorrect password'],
        },
      ]);
    },
  });

  return (
    <div className="unlock">
      <div className="header">
        <div className="image" />
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
              message: 'Please input Password',
            },
          ]}
        >
          <Input
            placeholder="Password"
            size="large"
            type="password"
            ref={inputEl}
          />
        </Form.Item>
        <Form.Item>
          <Button
            className="w-[200px] block mx-auto mt-18"
            htmlType="submit"
            type="primary"
            size="large"
          >
            Unlock
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Unlock;
