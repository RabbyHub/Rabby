import React, { useEffect } from 'react';
import { useState, useRef } from 'react';
import { Input, Form, Button } from 'antd';
import { useWallet, useApproval } from 'ui/utils';

import './style.less';

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [error, setErr] = useState('');
  const [form] = Form.useForm();
  const inputEl = useRef<Input>(null);

  useEffect(() => {
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, []);

  const onSubmit = async ({ password }) => {
    try {
      await wallet.unlock(password);
      resolveApproval();
    } catch (err) {
      setErr(err?.message || 'incorrect password');
    }
  };

  return (
    <div className="unlock">
      <div className="header" />
      <Form className="bg-gray-bg flex-1" form={form} onFinish={onSubmit}>
        <Form.Item
          className="mt-[34px] mx-28"
          name="password"
          rules={[
            {
              required: true,
              message: 'Please input Password',
            },
          ]}
          validateStatus={error ? 'error' : undefined}
          help={error}
        >
          <Input
            placeholder="Password"
            size="large"
            type="password"
            ref={inputEl}
          />
        </Form.Item>
        <Button
          htmlType="submit"
          type="primary"
          size="large"
          className="w-[200px] block mx-auto mt-24"
        >
          Unlock
        </Button>
      </Form>
    </div>
  );
};

export default Unlock;
