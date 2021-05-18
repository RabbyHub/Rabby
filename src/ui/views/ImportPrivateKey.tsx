import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { useWallet } from 'ui/utils';

const ImportPrivateKey = () => {
  const history = useHistory();
  const wallet = useWallet();

  const onSubmit = async ({ key }) => {
    try {
      await wallet.importPrivateKey(key);
      history.push('/dashboard');
    } catch (err) {
      console.error('err', err);
    }
  };

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Import Private Key',
        subTitle: 'Please input your private key below',
      }}
      onSubmit={onSubmit}
      hasBack
      hasDivider
    >
      <Form.Item
        name="key"
        rules={[{ required: true, message: 'Please input Private key' }]}
      >
        <Input placeholder="Private key" size="large" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportPrivateKey;
