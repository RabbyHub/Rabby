import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';

const ImportPrivateKey = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const [run, loading] = useWalletRequest(wallet.importPrivateKey, {
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
          name: 'key',
          errors: [err?.message || t('Not a valid private key')],
        },
      ]);
    },
  });

  return (
    <StrayPageWithButton
      header={{
        secondTitle: t('Enter Your  Private Key'),
      }}
      spinning={loading}
      form={form}
      onSubmit={({ key }) => run(key)}
      hasBack
      hasDivider
    >
      <Form.Item
        name="key"
        rules={[{ required: true, message: t('Please input Private key') }]}
      >
        <Input placeholder={t('Private key')} size="large" />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportPrivateKey;
