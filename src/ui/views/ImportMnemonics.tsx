import React from 'react';
import { Form, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import MnemonicLogo from 'ui/assets/mnemonic-icon.svg';

const ImportMnemonic = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const [run, loading] = useWalletRequest(wallet.generateKeyringWithMnemonic, {
    onSuccess(keyring) {
      history.push({
        pathname: '/popup/import/select-address',
        state: {
          keyring,
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

  return (
    <StrayPageWithButton
      spinning={loading}
      form={form}
      onSubmit={({ mnemonics }) => run(mnemonics)}
      hasBack
      hasDivider
      noPadding
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
            className="h-[124px]"
            placeholder={t('Mnemonics words')}
          />
        </Form.Item>
      </div>
    </StrayPageWithButton>
  );
};

export default ImportMnemonic;
