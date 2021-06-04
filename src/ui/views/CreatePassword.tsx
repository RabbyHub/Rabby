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
        title: 'Set Unlock Password',
      }}
      onSubmit={onSubmit}
    >
      <div className="mt-40">
        <Form.Item
          name="password"
          rules={[
            {
              required: true,
              message: 'Please input Password.',
            },
            {
              min: PASSWORD_LENGTH[0],
              message: `Password can’t be less than ${PASSWORD_LENGTH[0]} letters`,
            },
            {
              max: PASSWORD_LENGTH[1],
              message: `Password can’t be more than ${PASSWORD_LENGTH[1]} letters`,
            },
          ]}
        >
          <Input size="large" placeholder="Password" type="password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          rules={[
            { required: true, message: 'Please confirm Password.' },
            ({ getFieldValue }) => ({
              validator(_, value: string) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Two inputs do not match'));
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
