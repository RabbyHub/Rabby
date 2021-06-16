import React from 'react';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { Input, Form } from 'antd';
import { useWallet, useWalletRequest } from 'ui/utils';

const PASSWORD_LENGTH = [8, 20];

const CreatePassword = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();

  const [run, loading] = useWalletRequest(wallet.boot, {
    onSuccess() {
      history.replace('/start-chain-management');
    },
    onError(err) {
      form.setFields([
        {
          name: 'password',
          errors: [err?.message || 'Wrong password'],
        },
      ]);
    },
  });

  return (
    <StrayPageWithButton
      header={{
        title: 'Set Unlock Password',
      }}
      onSubmit={({ password }) => run(password.trim())}
      form={form}
      formProps={{
        validateTrigger: 'onBlur',
      }}
      spinning={loading}
    >
      <Form.Item
        className="mb-0 h-60 overflow-hidden"
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
      <Form.Item shouldUpdate className="text-red-light text-12">
        {() => (
          <Form.ErrorList
            errors={[
              form
                .getFieldsError()
                .map((x) => x.errors)
                .reduce((m, n) => m.concat(n), [])[0],
            ]}
          />
        )}
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default CreatePassword;
