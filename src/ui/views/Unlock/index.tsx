import React, { useEffect, useMemo, useRef } from 'react';
import { Input, Form, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import {
  useWallet,
  useApproval,
  useWalletRequest,
  getUiType,
  openInternalPageInTab,
  isSameAddress,
} from 'ui/utils';
import rabbyLogo from '@/ui/assets/unlock/rabby.svg';
import { ReactComponent as BackgroundSVG } from '@/ui/assets/unlock/background.svg';
import clsx from 'clsx';
import styled from 'styled-components';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import qs from 'qs';
import { isString } from 'lodash';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import {
  decryptBiometricUnlockPassword,
  isBiometricUnlockSupported,
} from '@/ui/utils/biometric';

const InputFormStyled = styled(Form.Item)`
  .ant-form-item-explain {
    font-size: 13px;
    line-height: 16px;
    margin-top: 16px;
    margin-bottom: 24px;
    min-height: 0px;
    color: var(--r-red-default);
    font-weight: 500;
  }
`;

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [form] = Form.useForm();
  const inputEl = useRef<Input>(null);
  const UiType = getUiType();
  const { t } = useTranslation();
  const history = useHistory();
  const isUnlockingRef = useRef(false);
  const autoBiometricTriggeredRef = useRef(false);
  const [hasForgotPassword, setHasForgotPassword] = React.useState(false);
  const [biometricSupported, setBiometricSupported] = React.useState(false);
  const [biometricUnlocking, setBiometricUnlocking] = React.useState(false);
  const location = useLocation();
  const [inputError, setInputError] = React.useState('');
  const biometricUnlockEnabled = useRabbySelector(
    (state) => state.preference.biometricUnlockEnabled
  );
  const biometricUnlockCredentialId = useRabbySelector(
    (state) => state.preference.biometricUnlockCredentialId
  );
  const biometricUnlockEncryptedPassword = useRabbySelector(
    (state) => state.preference.biometricUnlockEncryptedPassword
  );
  const biometricUnlockIv = useRabbySelector(
    (state) => state.preference.biometricUnlockIv
  );
  const biometricUnlockPrfSalt = useRabbySelector(
    (state) => state.preference.biometricUnlockPrfSalt
  );
  const query = useMemo(() => {
    return qs.parse(location.search, {
      ignoreQueryPrefix: true,
    });
  }, [location.search]);
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, []);

  useEffect(() => {
    let mounted = true;
    isBiometricUnlockSupported().then((supported) => {
      if (mounted) {
        setBiometricSupported(supported);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const [run] = useWalletRequest(wallet.unlock, {
    async onSuccess() {
      if (UiType.isNotification) {
        if (query.from === '/connect-approval') {
          history.replace('/approval?ignoreOtherWallet=1');
        } else {
          resolveApproval();
        }
      } else if (UiType.isTab || UiType.isDesktop) {
        const account = query.address
          ? await wallet
              .getAccountByAddress(query.address as string)
              .catch(() => null)
          : null;
        const currentAccount = await wallet.getCurrentAccount();
        if (
          account &&
          !isSameAddress(account?.address || '', currentAccount?.address || '')
        ) {
          dispatch.account.changeAccountAsync(account);
        } else {
          dispatch.account.getCurrentAccountAsync();
        }

        history.replace(
          query.from && isString(query.from)
            ? query.from
            : UiType.isDesktop
            ? '/desktop/profile'
            : '/'
        );
      } else {
        history.replace('/');
      }
    },
    onError(err) {
      console.log('error', err);
      setInputError(err?.message || t('page.unlock.password.error'));
      form.validateFields(['password']);
    },
  });

  const handleSubmit = async ({ password }: { password: string }) => {
    if (isUnlockingRef.current) return;
    isUnlockingRef.current = true;
    await run(password);
    isUnlockingRef.current = false;
  };

  const biometricAvailable =
    biometricSupported &&
    biometricUnlockEnabled &&
    !!biometricUnlockCredentialId &&
    !!biometricUnlockEncryptedPassword &&
    !!biometricUnlockIv &&
    !!biometricUnlockPrfSalt;

  const handleBiometricUnlock = async () => {
    if (!biometricAvailable) return;
    if (isUnlockingRef.current || biometricUnlocking) return;
    isUnlockingRef.current = true;
    setBiometricUnlocking(true);
    setInputError('');
    try {
      const password = await decryptBiometricUnlockPassword({
        credentialId: biometricUnlockCredentialId!,
        encryptedPassword: biometricUnlockEncryptedPassword!,
        iv: biometricUnlockIv!,
        prfSalt: biometricUnlockPrfSalt!,
      });
      await run(password);
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        t('page.unlock.biometricFailed', 'Biometric unlock failed.');
      if (!String(errorMessage).toLowerCase().includes('canceled')) {
        setInputError(errorMessage);
        form.validateFields(['password']);
      }
    } finally {
      isUnlockingRef.current = false;
      setBiometricUnlocking(false);
    }
  };

  useEffect(() => {
    if (!biometricAvailable) return;
    if (autoBiometricTriggeredRef.current) return;
    autoBiometricTriggeredRef.current = true;
    handleBiometricUnlock();
  }, [biometricAvailable]);

  useEffect(() => {
    wallet.savedUnencryptedKeyringData().then(setHasForgotPassword);
  }, []);

  useEffect(() => {
    if (UiType.isTab || UiType.isDesktop) {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <FullscreenContainer isUnlock>
      <div className="unlock page-has-ant-input relative h-full min-h-[550px]">
        <BackgroundSVG className="absolute inset-0 z-[-1]" />
        <div className="pt-80">
          <img src={rabbyLogo} className="m-auto w-[100px] h-[100px]" />
          <h1
            className={clsx(
              'text-[24px] font-semibold',
              'text-r-neutral-title1',
              'mt-12',
              'text-center'
            )}
          >
            {t('page.unlock.title')}
          </h1>
          <p
            className={clsx(
              'text-[14px] font-normal leading-[20px]',
              'text-r-neutral-foot',
              'mt-12 mx-[52px]',
              'text-center'
            )}
          >
            {t('page.unlock.description')}
          </p>
        </div>
        <Form autoComplete="off" form={form} onFinish={handleSubmit}>
          <InputFormStyled
            className="mt-[34px] mx-20"
            name="password"
            rules={[
              {
                required: true,
                message: t('page.unlock.password.required'),
              },
              {
                validator: (_, value) => {
                  if (inputError) {
                    return Promise.reject(
                      <div>
                        <span>{inputError}</span>
                        {hasForgotPassword && (
                          <button
                            className={clsx(
                              'text-r-blue-default font-medium',
                              'underline',
                              'ml-[8px]'
                            )}
                            onClick={() =>
                              openInternalPageInTab('forgot-password')
                            }
                          >
                            {t('page.unlock.btnForgotPassword')}
                          </button>
                        )}
                      </div>
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder={t('page.unlock.password.placeholder')}
              className={clsx(
                'bg-r-neutral-card1 hover:border-rabby-blue-default focus:border-rabby-blue-default placeholder-r-neutral-foot',
                'h-[56px]',
                'text-13',
                'rounded-[8px]'
              )}
              size="large"
              type="password"
              ref={inputEl}
              spellCheck={false}
              onChange={() => {
                setInputError('');
              }}
            />
          </InputFormStyled>

          <footer className="absolute bottom-32 left-0 right-0 text-center">
            <Form.Item className="mx-20 mb-20">
              <Button
                block
                className={clsx(
                  'w-full py-18 h-auto rounded-[8px] border-none',
                  'text-[17px] leading-[20px]',
                  'font-medium'
                )}
                htmlType="submit"
                type="primary"
                size="large"
              >
                {t('page.unlock.btn.unlock')}
              </Button>
            </Form.Item>
            {biometricAvailable && (
              <Form.Item className="mx-20 mb-16">
                <Button
                  block
                  type="default"
                  htmlType="button"
                  className={clsx(
                    'w-full py-18 h-auto rounded-[8px]',
                    'text-[15px] leading-[20px]',
                    'font-medium'
                  )}
                  loading={biometricUnlocking}
                  onClick={handleBiometricUnlock}
                >
                  {t('page.unlock.btn.biometric', 'Unlock with biometrics')}
                </Button>
              </Form.Item>
            )}

            {hasForgotPassword && (
              <button
                className={clsx(
                  'text-r-neutral-body',
                  'text-13 leading-[16px] font-medium',
                  'hover:underline'
                )}
                onClick={() => openInternalPageInTab('forgot-password')}
              >
                {t('page.unlock.btnForgotPassword')}
              </button>
            )}
          </footer>
        </Form>
      </div>
    </FullscreenContainer>
  );
};

export default Unlock;
