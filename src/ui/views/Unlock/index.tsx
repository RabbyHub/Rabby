import React from 'react';
import { useState } from 'react';
import { Input, Form } from 'antd';
import { useWallet, useApproval } from 'ui/utils';
import { StrayPageWithButton } from 'ui/component';

import './style.less';

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [error, setErr] = useState('');
  const [form] = Form.useForm();

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
      <div className="header"></div>
      <StrayPageWithButton
        header={{
          title: 'Welcome back',
          subTitle: 'input your password to unlock',
        }}
        onSubmit={onSubmit}
        NextButtonText="Unlock"
        form={form}
      >
        <Form.Item
          className="mb-0"
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
          <Input placeholder="Password" size="large" type="password" />
        </Form.Item>
      </StrayPageWithButton>
    </div>
  );
};

export default Unlock;
