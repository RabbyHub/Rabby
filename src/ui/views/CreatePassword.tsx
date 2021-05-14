import React from 'react';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { Input, Form } from 'antd';
import { useWallet } from 'ui/utils';

const MIN_PASSWORD_LENGTH = 3;

const CreatePassword = () => {
  const history = useHistory();
  const wallet = useWallet();

  const onSubmit = ({
    password,
  }: {
    password: string;
    confirmPassword: string;
  }) => {
    wallet.boot(password.trim());
    history.push('/no-address');
  };

  return (
    <StrayPageWithButton
      header={{
        title: 'Create Password',
        subTitle: 'this password will be used to unlock your wallet',
      }}
      onSubmit={onSubmit}
    >
      <div className="mt-40">
        <Form.Item
          name="password"
          rules={[
            {
              required: true,
              message: 'Please input Password',
            },
            {
              min: MIN_PASSWORD_LENGTH,
              message: '*Password is too short',
            },
          ]}
        >
          <Input size="large" placeholder="Password" type="password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          rules={[
            { required: true, message: '*Please confirm Password' },
            ({ getFieldValue }) => ({
              validator(_, value: string) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('*The two passwords are inconsistent')
                );
              },
            }),
          ]}
        >
          <Input size="large" placeholder="Repeat Password" type="password" />
        </Form.Item>
      </div>
    </StrayPageWithButton>
  );
};

export default CreatePassword;
