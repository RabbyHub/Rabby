import React from 'react';
import { Input, Form } from 'antd';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const ImportPrivateKey = () => {
  const [form] = Form.useForm();
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();

  const onSubmit = async ({ key }) => {
    try {
      await wallet.importPrivateKey(key);

      resolveApproval();
    } catch (err) {
      console.error('err', err);
    }
  };
  console.log(form.getFieldsError());
  return (
    <StrayPageWithButton
      header={{
        title: 'Import Private Key',
        subTitle: 'Please input your private key below',
      }}
      onSubmit={onSubmit}
    >
      <Form.Item
        name="key"
        rules={[{ required: true, message: 'Please input Private key' }]}
      >
        <Input placeholder="Private key" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportPrivateKey;
