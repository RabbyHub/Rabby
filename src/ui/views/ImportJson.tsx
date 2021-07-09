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
      onSubmit={({ keyStore, password }) => run(keyStore, password)}
      form={form}
      spinning={loading}
      hasBack
      hasDivider
      noPadding
    >
      <header className="create-new-header create-password-header h-[264px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <p className="text-24 mb-4 mt-32 text-white text-center font-bold">
          {t('Import Your Keystore')}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t(
            'Select the keystore file you want to import and enter the corresponding password'
          )}
        </p>
      </header>
      <div className="px-20">
        <Form.Item
          className="mx-auto -mt-80"
          name="keyStore"
          valuePropName="file"
        >
          <Uploader
            className="mx-auto h-[172px]"
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
        <div className="text-center text-14 text-gray-comment -mt-20 mb-[20px] h-14">
          {isUpload && t('Click to upload again')}
        </div>
        <Form.Item
          name="password"
          rules={[{ required: true, message: t('Please input Password') }]}
        >
          <Input placeholder={t('Password')} type="password" size="large" />
        </Form.Item>
      </div>
    </StrayPageWithButton>
  );
};

export default ImportJson;
