import React, { useRef } from 'react';
import { useState } from 'react';
import { Input, Button, Form } from 'antd';
import { Footer } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';
import './style.less';

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [error, setErr] = useState('');

  const onSubmit = async ({ password }) => {
    if (!password) {
      setErr('Please input Password');
      return;
    }
    try {
      await wallet.unlock(password);
      resolveApproval();
    } catch (err) {
      setErr(err?.message || 'incorrect password');
    }
  };

  return (
    <div className="unlock">
      <div className="header"></div>
      <div className="content">
        <h1>Welcome back</h1>
        <p className="subtitle">input your password to unlock</p>
        <Form onFinish={onSubmit}>
          <Form.Item
            className="mb-0"
            name="password"
            validateStatus={error ? 'error' : undefined}
            help={error}
          >
            <Input placeholder="Password" size="large" />
          </Form.Item>
          <div className="flex justify-center unlock-footer">
            <Button type="primary" htmlType="submit" size="large">
              Unlock
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Unlock;
