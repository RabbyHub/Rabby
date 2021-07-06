import React, { useState } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton, Uploader } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';

const ImportJson = () => {
  const history = useHistory();
  const [form] = Form.useForm();
  const wallet = useWallet();
  const [isUpload, setUpload] = useState(false);
  const { t } = useTranslation();

  const [run, loading] = useWalletRequest(wallet.importJson, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          title: t('Successfully created'),
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'password',
          errors: [err?.message || t('incorrect password')],
        },
      ]);
    },
  });

  return (
    <StrayPageWithButton
      header={{
        secondTitle: t('Import Your Keystore'),
        subTitle: t(
          'Select the keystore file you want to import and enter the corresponding password'
        ),
      }}
      onSubmit={({ keyStore, password }) => run(keyStore, password)}
      form={form}
      spinning={loading}
      hasBack
      hasDivider
    >
      <Form.Item className="mx-auto mt-24" name="keyStore" valuePropName="file">
        <Uploader
          className="mx-auto w-[260px] h-[128px]"
          onChange={({ file }) => {
            setUpload(true);
            const reader = new FileReader();
            reader.onload = (e) => {
              form.setFieldsValue({ keyStore: e.target?.result });
            };

            reader.readAsText(file);
          }}
        />
      </Form.Item>
      <div className="text-center text-14 text-gray-comment -mt-20 mb-[52px] h-14">
        {isUpload && t('Click to upload again')}
      </div>
      <Form.Item
        name="password"
        rules={[{ required: true, message: t('Please input Password') }]}
      >
        <Input placeholder={t('Password')} type="password" size="large" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportJson;
