import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';

const ImportWatchAddress = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();

  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
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
          name: 'address',
          errors: [err?.message || 'Not a valid address'],
        },
      ]);
    },
  });

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Watch Mode',
        subTitle: 'Enter an address without providing private key',
      }}
      onSubmit={({ address }) => run(address)}
      spinning={loading}
      form={form}
      hasBack
      hasDivider
    >
      <Form.Item
        name="address"
        rules={[{ required: true, message: 'Please input address' }]}
      >
        <Input.TextArea
          className="h-[124px]"
          placeholder="Address"
          size="large"
          maxLength={44}
          autoSize={false}
        />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportWatchAddress;
