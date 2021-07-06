import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';

const ImportWatchAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();

  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
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
          name: 'address',
          errors: [err?.message || t('Not a valid address')],
        },
      ]);
    },
  });

  return (
    <StrayPageWithButton
      header={{
        secondTitle: t('Watch Mode'),
        subTitle: t('Enter an address without providing private key'),
      }}
      onSubmit={({ address }) => run(address)}
      spinning={loading}
      form={form}
      hasBack
      hasDivider
    >
      <Form.Item
        name="address"
        rules={[{ required: true, message: t('Please input address') }]}
      >
        <Input placeholder={t('Address')} size="large" maxLength={44} />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportWatchAddress;
