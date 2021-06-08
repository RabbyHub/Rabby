import React from 'react';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { Input, Form } from 'antd';
import { useWallet } from 'ui/utils';

const PASSWORD_LENGTH = [8, 20];

const CreatePassword = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
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
      form={form}
    >
      <Form.Item
        className="mb-0 h-[56px] overflow-hidden"
        name="password"
        help=""
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
        className="mb-0 h-[56px] overflow-hidden"
        name="confirmPassword"
        help=""
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
      <Form.Item shouldUpdate className="text-red-light">
        {() => (
          <Form.ErrorList
            errors={form
              .getFieldsError()
              .map((x) => x.errors)
              .reduce((m, n) => m.concat(n), [])}
          />
        )}
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default CreatePassword;
