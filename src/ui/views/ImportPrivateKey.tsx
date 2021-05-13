import React from 'react';
import { Input, Form } from 'antd';
import { Footer } from 'ui/component';
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
    <>
      <h4 className="font-bold">Import Private Key</h4>
      <p className="text-xs mt-2">Please input your private key below</p>
      <Form onFinish={onSubmit}>
        <Form.Item
          name="key"
          rules={[{ required: true, message: 'Please input Private key' }]}
        >
          <Input placeholder="Private key" />
        </Form.Item>
        <Footer.Nav />
      </Form>
    </>
  );
};

export default ImportPrivateKey;
