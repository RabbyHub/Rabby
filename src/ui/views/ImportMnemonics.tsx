import React, { useEffect } from 'react';
import { Form, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { KEYRING_TYPE } from 'consts';
import MnemonicLogo from 'ui/assets/mnemonic-icon.svg';

const ImportMnemonic = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const [run, loading] = useWalletRequest(wallet.generateKeyringWithMnemonic, {
    onSuccess(stashKeyringId) {
      history.push({
        pathname: '/popup/import/select-address',
        state: {
          keyring: KEYRING_TYPE.HdKeyring,
          keyringId: stashKeyringId,
          isMnemonics: true,
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'mnemonics',
          errors: [err?.message || t('Not a valid mnemonic')],
        },
      ]);
    },
  });

  const handleLoadCache = async () => {
    const cache = await wallet.getPageStateCache();
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

  const init = async () => {
    if (await wallet.hasPageStateCache()) handleLoadCache();
  };

  useEffect(() => {
    init();

    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <StrayPageWithButton
      spinning={loading}
      form={form}
      formProps={{
        onValuesChange: handleValuesChange,
      }}
      onSubmit={({ mnemonics }) => run(mnemonics)}
      hasBack
      hasDivider
      noPadding
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
          src={MnemonicLogo}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t('Enter Your Mnemonic')}
        </p>
        <img src="/images/mnemonic-mask.png" className="mask" />
      </header>
      <div className="pt-32 px-20">
        <Form.Item
          name="mnemonics"
          rules={[{ required: true, message: t('Please input Mnemonics') }]}
        >
          <Input.TextArea
            className="h-[124px] p-16"
            placeholder={t('Mnemonics words')}
            spellCheck={false}
          />
        </Form.Item>
      </div>
    </StrayPageWithButton>
  );
};

export default ImportMnemonic;
