import React, { useEffect } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import PrivatekeyIcon from 'ui/assets/privatekey-icon.svg';

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

  const handleLoadCache = () => {
    const cache = wallet.getPageStateCache();
    if (cache && cache.path === history.location.pathname) {
      form.setFieldsValue(cache.states);
    }
  };

  const handleValuesChange = (states) => {
    wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states,
    });
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };

  useEffect(() => {
    if (wallet.hasPageStateCache()) handleLoadCache();

    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <StrayPageWithButton
      spinning={loading}
      form={form}
      onSubmit={({ key }) => run(key)}
      hasBack
      hasDivider
      noPadding
      formProps={{
        onValuesChange: handleValuesChange,
      }}
      onBackClick={handleClickBack}
      backDisabled={false}
    >
      <header className="create-new-header create-password-header h-[234px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <img
          className="unlock-logo w-[128px] h-[128px] mx-auto"
          src={PrivatekeyIcon}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t('Enter Your Private Key')}
        </p>
        <img src="/images/private-mask.png" className="mask" />
      </header>
      <div className="pt-32 px-20">
        <Form.Item
          name="key"
          rules={[{ required: true, message: t('Please input Private key') }]}
        >
          <Input
            placeholder={t('Private key')}
            size="large"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>
      </div>
    </StrayPageWithButton>
  );
};

export default ImportPrivateKey;
