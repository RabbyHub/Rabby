import React from 'react';
import { useHistory } from 'react-router-dom';
import { Header } from 'ui/component';
import { Button, Input, Form } from 'antd'
import { useWallet } from 'ui/utils';

const CreatePassword = () => {
  const [form] = Form.useForm();
  const history = useHistory();
  const wallet = useWallet();

  const onSubmit = ({ password }: { password: string, confirmPassword: string }) => {
    wallet.setPassword(password.trim());
    history.push('/start');
  };

  return (
    <>
      <Header
        title="Create Password"
        subTitle="this password will be used to unlock your wallet"
      />
      <Form form={form} onFinish={onSubmit}>
        <Form.Item name="password" rules={[{ required: true, message: 'Please input Password' }]}>
          <Input placeholder="Password" type="password" />
        </Form.Item>
        <Form.Item name="confirmPassword" rules={[
          { required: true, message: 'Please confirm Password' },
          ({ getFieldValue }) => ({
            validator(_, value: string) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }
              return Promise.reject(new Error('Passwords not match'))
            }
          })
        ]}>
          <Input placeholder="Repeat Password" type="password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
        >
          Next
        </Button>
      </Form>
    </>
  );
};

export default CreatePassword;
