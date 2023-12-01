import React, { useState } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar, StrayPageWithButton, Uploader } from 'ui/component';
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
          title: t('page.newAddress.importedSuccessfully'),
          editing: true,
          importedAccount: true,
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'password',
          errors: [err?.message || t('page.newAddress.incorrectPassword')],
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
      hasBack={false}
      hasDivider
      noPadding
      nextDisabled={!isUpload}
      NextButtonContent={t('global.confirm')}
    >
      <Navbar
        onBack={() => {
          if (history.length > 1) {
            history.goBack();
          } else {
            history.replace('/');
          }
        }}
        desc={t('page.newAddress.keystore.description')}
      >
        {t('page.newAddress.importYourKeystore')}
      </Navbar>
      <div className="rabby-container widget-has-ant-input">
        <div className="px-20">
          <Form.Item
            className="mx-auto mt-[32px] mb-[24px]"
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
            rules={[
              {
                required: true,
                message: t('page.newAddress.keystore.password.required'),
              },
            ]}
          >
            <Input
              placeholder={t('page.newAddress.keystore.password.placeholder')}
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
