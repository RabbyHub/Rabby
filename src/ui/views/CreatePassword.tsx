import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { Input, Form } from 'antd';
import { useWallet, useWalletRequest } from 'ui/utils';
import UnlockLogo from 'ui/assets/unlock-logo.svg';
import UnlockMask from 'ui/assets/unlock-mask.svg';

const MINIMUM_PASSWORD_LENGTH = 8;

const CreatePassword = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();

  if (wallet.isBooted() && !wallet.isUnlocked()) {
    history.replace('/unlock');

    return null;
  }

  const [form] = Form.useForm();

  const [run, loading] = useWalletRequest(wallet.boot, {
    onSuccess() {
      history.replace('/start-chain-management');
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
      onSubmit={({ password }) => run(password.trim())}
      form={form}
      formProps={{
        validateTrigger: 'onBlur',
      }}
      spinning={loading}
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
          src={UnlockLogo}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t('Set Unlock Password')}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t('This password will be used to unlock your wallet')}
        </p>
        <img src="/images/create-password-mask.png" className="mask" />
      </header>
      <div className="p-32">
        <Form.Item
          className="mb-0 h-60 overflow-hidden"
          name="password"
          help=""
          validateTrigger="submit"
          rules={[
            {
              required: true,
              message: t('Please input Password'),
            },
            {
              min: MINIMUM_PASSWORD_LENGTH,
              message: (
                <Trans
                  i18nKey="passwordMinimumLengthAlert"
                  values={{ length: MINIMUM_PASSWORD_LENGTH }}
                />
              ),
            },
            ({ getFieldValue }) => ({
              validator(_, value: string) {
                if (!value || getFieldValue('confirmPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('Two inputs do not match')));
              },
            }),
          ]}
        >
          <Input
            size="large"
            placeholder={t('Password')}
            type="password"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>
        <Form.Item
          className="mb-0 h-[56px] overflow-hidden"
          name="confirmPassword"
          help=""
        >
          <Input
            size="large"
            placeholder={t('Repeat Password')}
            type="password"
            spellCheck={false}
          />
        </Form.Item>
        <Form.Item shouldUpdate className="text-red-light text-12">
          {() => (
            <Form.ErrorList
              errors={[
                form
                  .getFieldsError()
                  .map((x) => x.errors)
                  .reduce((m, n) => m.concat(n), [])[0],
              ]}
            />
          )}
        </Form.Item>
      </div>
    </StrayPageWithButton>
  );
};

export default CreatePassword;
