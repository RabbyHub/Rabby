import React from 'react';
import { Form, Input } from 'antd';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const ImportMnemonic = () => {
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
    <StrayPageWithButton
      header={{
        title: 'Import Mnemonics',
        subTitle: 'Please input your mnemonics below',
      }}
      onSubmit={onSubmit}
    >
      <Form.Item
        name="mnemonics"
        rules={[{ required: true, message: 'Please input Mnemonics' }]}
      >
        <Input.TextArea placeholder="Mnemonics" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportMnemonic;
