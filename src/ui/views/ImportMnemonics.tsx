import React from 'react';
import { Form, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';

const ImportMnemonic = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();

  const [run, loading] = useWalletRequest(wallet.generateKeyringWithMnemonic, {
    onSuccess(keyring) {
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring,
          isMnemonics: true,
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'mnemonics',
          errors: [err?.message || 'Not a valid mnemonic'],
        },
      ]);
    },
  });

  return (
    <StrayPageWithButton
      header={{
        title: 'Enter Your Mnemonic',
      }}
      spinning={loading}
      form={form}
      onSubmit={({ mnemonics }) => run(mnemonics)}
      hasBack
      hasDivider
    >
      <Form.Item
        name="mnemonics"
        rules={[{ required: true, message: 'Please input Mnemonics' }]}
        className="mt-56"
      >
        <Input.TextArea className="h-[124px]" placeholder="Mnemonics words" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportMnemonic;
