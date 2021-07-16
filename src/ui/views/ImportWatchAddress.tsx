import React from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import WatchLogo from 'ui/assets/watch-logo.svg';

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
      onSubmit={({ address }) => run(address)}
      spinning={loading}
      form={form}
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
        <img
          className="unlock-logo w-[128px] h-[128px] mx-auto"
          src={WatchLogo}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t('Watch Mode')}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t('Enter an address without providing private key')}
        </p>
        <img src="/images/watch-mask.png" className="mask" />
      </header>
      <Form.Item
        className="pt-32 px-20"
        name="address"
        rules={[{ required: true, message: t('Please input address') }]}
      >
        <Input
          placeholder={t('Address')}
          size="large"
          maxLength={44}
          autoFocus
        />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default ImportWatchAddress;
