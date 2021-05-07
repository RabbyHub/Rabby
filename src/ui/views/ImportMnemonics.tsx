import React from 'react';
import { Form, Input } from 'antd'
import { Footer, Header } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const ImportMnemonic = () => {
  const [form] = Form.useForm();
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();

  const onSubmit = async ({ mnemonics }) => {
    try {
      await wallet.importMnemonics(mnemonics.trim());

      resolveApproval();
    } catch (err) {
      console.error('err', err);
    }
  };

  return (
    <>
      <Header
        title="Import Mnemonics"
        subTitle="Please input your mnemonics below"
      />
      <Form onFinish={onSubmit} form={form}>
        <Form.Item name="mnemonics" rules={[{ required: true, message: 'Please input Mnemonics' }]}>
          <Input.TextArea placeholder="Mnemonics" />
        </Form.Item>
        <Footer.Nav />
      </Form>
    </>
  );
};

export default ImportMnemonic;
