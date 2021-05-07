import React from 'react';
import { useState } from 'react';
import { Input, Button, Form } from 'antd';
import { Footer } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [error, setErr] = useState();

  const onSubmit = async ({ password }) => {
    try {
      await wallet.unlock(password);
      resolveApproval();
    } catch (err) {
      setErr(err?.message || '密码错误');
    }
  };

  return (
    <>
      <h4 className="font-bold">Welcome back</h4>
      <p className="text-xs mt-2">input your password to unlock</p>
      <Form onFinish={onSubmit}>
        <Form.Item
          className="mb-0"
          name="password"
          rules={[{ required: true, message: 'Please input Password' }]}
        >
          <Input placeholder="Password" />
        </Form.Item>
        <div className="text-red-500">{error}</div>
        <Footer>
          <Button block htmlType="submit">
            Unlock
          </Button>
        </Footer>
      </Form>
    </>
  );
};

export default Unlock;
