import React from 'react';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { Input, Form } from 'antd';
import { useWallet } from 'ui/utils';

const PASSWORD_LENGTH = [8, 20];

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
    history.push('/start-chain-management');
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
              min: PASSWORD_LENGTH[0],
              message: '*Password is too short',
            },
            {
              max: PASSWORD_LENGTH[1],
              message: '*Password is too long',
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
