import React, { useCallback, useState } from 'react';
import { Input, Form, message, Button } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import IconSuccess from 'ui/assets/success.svg';
import { Navbar, StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { clearClipboard, copyTextToClipboard } from 'ui/utils/clipboard';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconCopy } from 'ui/assets/component/icon-copy-cc.svg';
import { unSuffix } from '../../../utils/string';

const NarvalConnectionForm = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [credentialPrivateKey, setCredentialPrivateKey] = useState('');
  const [credentialAddress, setCredentialAddress] = useState('');
  const isWide = useMedia('(min-width: 401px)');

  const [run, loading] = useWalletRequest(wallet.connectNarvalAccount, {
    async onSuccess({ accounts, connectionId }) {
      clearClipboard();

      history.push({
        pathname: '/import/narval/accounts',
        state: { accounts, connectionId, selectedAccounts: [] },
      });
    },
    async onError(err) {
      if (['FORBIDDEN', 'FAILED'].includes(err?.message)) {
        history.replace({
          pathname: '/import/narval/pending-permissions',
        });
        return;
      }

      if (err?.message?.includes('The private key is invalid')) {
        form.setFields([
          {
            name: 'credentialPrivateKey',
            errors: [
              err?.message ||
                t('page.newAddress.privateKey.notAValidPrivateKey'),
            ],
          },
        ]);
      }
    },
  });

  const onSubmit = (values: any) => {
    run({
      ...values,
      authHost: unSuffix(values.authHost),
      vaultHost: unSuffix(values.vaultHost),
    });
  };

  const onCredentialAddressCopy = useCallback(() => {
    copyTextToClipboard(credentialAddress).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
    });
  }, [credentialAddress]);

  const onCredentialPrivateKeyCopy = useCallback(() => {
    copyTextToClipboard(credentialPrivateKey).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
    });
  }, [credentialPrivateKey]);

  const onPasteClear = () => {
    clearClipboard();
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.newAddress.seedPhrase.pastedAndClear'),
      duration: 2,
    });
  };

  const onBack = async () => {
    history.replace('/dashboard');
  };

  return (
    <StrayPageWithButton
      custom={isWide}
      spinning={loading}
      form={form}
      onSubmit={onSubmit}
      hasBack={false}
      hasDivider
      noPadding
      className={clsx(isWide && 'rabby-stray-page')}
      NextButtonContent="Confirm"
      onBackClick={onBack}
      backDisabled={false}
    >
      <Navbar onBack={onBack}>New Connection</Navbar>
      <div className="rabby-container widget-has-ant-input">
        <div className="px-20 pt-24">
          <div className="flex flex-col gap-8 mb-32">
            <div className="flex items-center gap-4">
              <Form.Item
                className="mb-0"
                name="credentialPrivateKey"
                rules={[
                  {
                    required: true,
                    message: 'Credential private key is required',
                  },
                ]}
              >
                <Input
                  className={'h-[52px] p-16 border-bright-on-active'}
                  placeholder="Credential private key"
                  autoFocus
                  spellCheck={false}
                  type="password"
                  onPaste={onPasteClear}
                />
              </Form.Item>
              {credentialPrivateKey && (
                <Button
                  htmlType="button"
                  onClick={onCredentialPrivateKeyCopy}
                  type="primary"
                  size="large"
                >
                  Copy
                </Button>
              )}
              <Button
                htmlType="button"
                onClick={() => {
                  const privateKey = generatePrivateKey();
                  const account = privateKeyToAccount(privateKey);

                  setCredentialPrivateKey(privateKey);
                  setCredentialAddress(account.address);

                  form.setFieldsValue({
                    credentialPrivateKey: privateKey,
                  });
                }}
                type="primary"
                size="large"
              >
                Generate
              </Button>
            </div>
            {credentialAddress && (
              <div className="flex flex-col gap-4 mb-4">
                <div className="font-bold underline">Credential Address:</div>
                <div className="flex items-center gap-6">
                  <div className="truncate">{credentialAddress}</div>
                  <ThemeIcon
                    src={RcIconCopy}
                    className="w-[16px] h-[16px] text-r-neutral-body cursor-pointer"
                    onClick={onCredentialAddressCopy}
                  />
                </div>
              </div>
            )}
          </div>

          <Form.Item
            name="authHost"
            rules={[
              {
                required: true,
                message: 'Auth server URL is required',
              },
            ]}
            initialValue={'https://auth.armory.narval.xyz'}
          >
            <Input
              className={'h-[52px] p-16 border-bright-on-active'}
              placeholder="Auth server URL"
              spellCheck={false}
              type="url"
            />
          </Form.Item>

          <Form.Item
            name="authClientId"
            rules={[
              {
                required: true,
                message: 'Auth Client ID is required',
              },
            ]}
          >
            <Input
              className={'h-[52px] p-16 border-bright-on-active'}
              placeholder="Auth Client ID"
              spellCheck={false}
              type="text"
            />
          </Form.Item>

          <Form.Item
            name="vaultHost"
            rules={[
              {
                required: true,
                message: 'Vault URL is required',
              },
            ]}
            initialValue={'https://vault.armory.narval.xyz'}
          >
            <Input
              className={'h-[52px] p-16 border-bright-on-active'}
              placeholder="Vault URL"
              spellCheck={false}
              type="url"
            />
          </Form.Item>

          <Form.Item
            name="vaultClientId"
            rules={[
              {
                required: true,
                message: 'Vault Client ID is required',
              },
            ]}
          >
            <Input
              className={'h-[52px] p-16 border-bright-on-active'}
              placeholder="Vault Client ID"
              spellCheck={false}
              type="text"
            />
          </Form.Item>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default NarvalConnectionForm;
