import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';

const ImportPrivateKey = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();

  const [run, loading] = useWalletRequest(wallet.importPrivateKey, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          title: 'Successfully created',
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'key',
          errors: [err?.message || 'Not a valid private key'],
        },
      ]);
    },
  });

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Enter Your  Private Key',
      }}
      spinning={loading}
      form={form}
      onSubmit={({ key }) => run(key)}
      hasBack
      hasDivider
    >
      <Form.Item
        name="key"
        rules={[{ required: true, message: 'Please input Private key' }]}
        className="mt-56"
      >
        <Input placeholder="Private key" size="large" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportPrivateKey;
