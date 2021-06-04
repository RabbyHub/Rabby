import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton } from 'ui/component';
import { useWallet } from 'ui/utils';

const ImportWatchAddress = () => {
  const history = useHistory();
  const wallet = useWallet();

  const onSubmit = async ({ address }) => {
    try {
      const accounts = await wallet.importWatchAddress(address);
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          title: 'Successfully created',
        },
      });
    } catch (err) {
      console.error('err', err);
    }
  };

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Watch Mode',
        subTitle: 'Enter an address without providing private key',
      }}
      onSubmit={onSubmit}
      hasBack
      hasDivider
    >
      <Form.Item
        name="address"
        rules={[{ required: true, message: 'Please input address' }]}
        className="mt-[56px]"
      >
        <Input placeholder="Address" size="large" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportWatchAddress;
