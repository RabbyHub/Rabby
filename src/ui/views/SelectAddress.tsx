import React from 'react';
import { Form, Input } from 'antd';
import { StrayPageWithButton } from 'ui/component';
import { useWallet } from 'ui/utils';

const SelectAddress = () => {
  const wallet = useWallet();

  const onSubmit = async ({ mnemonics }) => {
    try {
      await wallet.importMnemonics(mnemonics.trim());
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
      hasBack
      hasDivider
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

export default SelectAddress;
