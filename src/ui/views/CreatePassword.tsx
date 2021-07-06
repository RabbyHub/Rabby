import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import { Input, Form } from 'antd';
import { useWallet, useWalletRequest } from 'ui/utils';

const PASSWORD_LENGTH = [8, 20];

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
      header={{
        title: t('Set Unlock Password'),
      }}
      onSubmit={({ password }) => run(password.trim())}
      form={form}
      formProps={{
        validateTrigger: 'onBlur',
      }}
      spinning={loading}
    >
      <Form.Item
        className="mb-0 h-60 overflow-hidden"
        name="password"
        help=""
        rules={[
          {
            required: true,
            message: t('Please input Password'),
          },
          {
            min: PASSWORD_LENGTH[0],
            message: (
              <Trans
                i18nKey="passwordMinimumLengthAlert"
                values={{ length: PASSWORD_LENGTH[0] }}
              />
            ),
          },
          {
            max: PASSWORD_LENGTH[1],
            message: (
              <Trans
                i18nKey="passwordMaximumLengthAlert"
                values={{ length: PASSWORD_LENGTH[1] }}
              />
            ),
          },
        ]}
      >
        <Input size="large" placeholder={t('Password')} type="password" />
      </Form.Item>
      <Form.Item
        className="mb-0 h-[56px] overflow-hidden"
        name="confirmPassword"
        help=""
        rules={[
          { required: true, message: t('Please confirm Password') },
          ({ getFieldValue }) => ({
            validator(_, value: string) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error(t('Two inputs do not match')));
            },
          }),
        ]}
      >
        <Input
          size="large"
          placeholder={t('Repeat Password')}
          type="password"
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
    </StrayPageWithButton>
  );
};

export default CreatePassword;
