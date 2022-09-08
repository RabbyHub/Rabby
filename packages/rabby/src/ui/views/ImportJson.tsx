import React, { useState } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton, Uploader } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import clsx from 'clsx';
import { useMedia } from 'react-use';

const ImportJson = () => {
  const history = useHistory();
  const [form] = Form.useForm();
  const wallet = useWallet();
  const [isUpload, setUpload] = useState(false);
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');

  const [run, loading] = useWalletRequest(wallet.importJson, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          title: t('Imported Successfully'),
          editing: true,
          importedAccount: true,
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
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      onSubmit={({ keyStore, password }) => run(keyStore, password)}
      form={form}
      spinning={loading}
      hasBack
      hasDivider
      noPadding
      nextDisabled={!isUpload}
    >
      <header className="create-new-header create-password-header h-[264px]">
        <div className="rabby-container">
          <img
            className="rabby-logo"
            src="/images/logo-white.svg"
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
        </div>
      </header>
      <div className="rabby-container">
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
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('Please input Password') }]}
          >
            <Input
              placeholder={t('Password')}
              type="password"
              size="large"
              spellCheck={false}
            />
          </Form.Item>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default ImportJson;
