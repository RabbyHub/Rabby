import React from 'react';
import { Form, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { useWallet } from 'ui/utils';

const ImportMnemonic = () => {
  const history = useHistory();
  const wallet = useWallet();

  const onSubmit = async ({ mnemonics }) => {
    try {
      const keyring = wallet.generateKeyringWithMnemonic(mnemonics.trim());
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring,
        },
      });
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
        className="mt-[56px]"
      >
        <Input.TextArea className="h-[124px]" placeholder="Import Mnemonics" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportMnemonic;
