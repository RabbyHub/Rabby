import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { StrayPageWithButton, Uploader } from 'ui/component';
import { useWallet } from 'ui/utils';

const ImportJson = () => {
  const history = useHistory();
  const [form] = Form.useForm();
  const wallet = useWallet();

  const onSubmit = async ({ keyStore, password }) => {
    await wallet.importJson(keyStore, password);
    history.push('/dashboard');
  };

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Import Private Key',
        subTitle:
          'Please select the JSON file you want to import and enter the corresponding password',
      }}
      onSubmit={onSubmit}
      form={form}
      hasBack
      hasDivider
    >
      <Form.Item
        className="mx-auto mt-32 mb-[56px]"
        name="keyStore"
        valuePropName="file"
      >
        <Uploader
          className="mx-auto w-[260px] h-[128px]"
          onChange={({ file }) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              form.setFieldsValue({ keyStore: e.target?.result });
            };

            reader.readAsText(file);
          }}
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please input your password' }]}
      >
        <Input placeholder="Password" type="password" size="large" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportJson;
