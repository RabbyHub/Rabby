import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Form, Button, InputRef } from 'antd';
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
import { ReactComponent as BiometricsSVG } from '@/ui/assets/unlock/biometrics.svg';
import { ReactComponent as PasswordSwitchSVG } from '@/ui/assets/dashboard/settings/password.svg';
import { ReactComponent as BiometricSwitchSVG } from '@/ui/assets/dashboard/settings/biometric.svg';
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
import { useMemoizedFn, useUnmount } from 'ahooks';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { EVENTS } from '@/constant';
import { ga4 } from '@/utils/ga4';

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
const BiometricsImage = styled.div`
  margin-top: 45px;
  display: flex;
  justify-content: center;
`;

const UnlockMethodSwitch = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 10.5px;
  border: 0;
  border-radius: 8px;
  background: #ccd2ff;
  color: var(--r-blue-default);
  font-size: 13px;
  font-weight: 500;

  &:hover {
    background: #b8c1ff;
  }
`;

const Unlock = () => {
  type UnlockType = 'Biometrics' | 'Password';
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  const [form] = Form.useForm();
  const inputEl = useRef<InputRef>(null);
  const autoBiometricTriggeredRef = useRef(false);
  const pendingUnlockTypeRef = useRef<UnlockType | null>(null);
  const UiType = getUiType();
  const { t } = useTranslation();
  const history = useHistory();
  const isUnlockingRef = useRef(false);
  const [hasForgotPassword, setHasForgotPassword] = React.useState(false);
  const [biometricSupported, setBiometricSupported] = React.useState(false);
  const [biometricUnlocking, setBiometricUnlocking] = React.useState(false);
  const [biometricSetupOpening, setBiometricSetupOpening] = React.useState(
    false
  );
  const [showPasswordUnlock, setShowPasswordUnlock] = useState(false);
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
  const hasUnlockedOnce = useRabbySelector(
    (state) => state.app.hasUnlockedOnce
  );
  const query = useMemo(() => {
    return qs.parse(location.search, {
      ignoreQueryPrefix: true,
    });
  }, [location.search]);
  const dispatch = useRabbyDispatch();

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

  const handleUnlockSuccess = useMemoizedFn(async () => {
    const unlockType = pendingUnlockTypeRef.current;
    pendingUnlockTypeRef.current = null;
    if (unlockType) {
      ga4.fireEvent(`Unlock_Act_${unlockType}`, {
        event_category: 'Unlock_Wallet',
      });
    }

    dispatch.app.setField({
      hasUnlockedOnce: true,
    });
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
  });

  const [run] = useWalletRequest(wallet.unlock, {
    onSuccess: handleUnlockSuccess,
    onError(err) {
      pendingUnlockTypeRef.current = null;
      console.log('error', err);
      setInputError(err?.message || t('page.unlock.password.error'));
      form.validateFields(['password']);
    },
  });

  const handleSubmit = async ({ password }: { password: string }) => {
    if (isUnlockingRef.current) return;
    isUnlockingRef.current = true;
    pendingUnlockTypeRef.current = 'Password';
    await run(password);
    isUnlockingRef.current = false;
  };

  useEventBusListener(EVENTS.UNLOCK_WALLET, () => {
    handleUnlockSuccess();
  });

  const biometricConfigured =
    biometricUnlockEnabled &&
    !!biometricUnlockCredentialId &&
    !!biometricUnlockEncryptedPassword &&
    !!biometricUnlockIv;
  const biometricAvailable = biometricSupported && biometricConfigured;
  const showBiometricSwitch =
    biometricSupported && (UiType.isTab || UiType.isPop || UiType.isDesktop);

  useEffect(() => {
    setShowPasswordUnlock(!biometricAvailable);
  }, [biometricAvailable]);

  useEffect(() => {
    if (!showPasswordUnlock) return;
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, [showPasswordUnlock]);

  const handleBiometricUnlock = useMemoizedFn(async () => {
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
      });
      pendingUnlockTypeRef.current = 'Biometrics';
      await run(password);
    } catch (error: any) {
      pendingUnlockTypeRef.current = null;
      const errorMessage = error?.message || t('page.unlock.biometricFailed');
      if (!String(errorMessage).toLowerCase().includes('canceled')) {
        setInputError(errorMessage);
        form.validateFields(['password']);
      }
    } finally {
      isUnlockingRef.current = false;
      setBiometricUnlocking(false);
    }
  });

  const handleBiometricEntry = useMemoizedFn(async () => {
    if (!biometricSupported) return;
    if (biometricAvailable) {
      handleBiometricUnlock();
      return;
    }

    if (biometricSetupOpening || biometricUnlocking) return;
    setBiometricSetupOpening(true);
    try {
      await wallet.openBiometricUnlockSetupWindow({ from: 'unlock' });
      if (UiType.isPop) {
        window.close();
      }
    } finally {
      setBiometricSetupOpening(false);
    }
  });

  useEffect(() => {
    if (!biometricAvailable) return;
    if (showPasswordUnlock) return;
    if (hasUnlockedOnce) return;
    if (autoBiometricTriggeredRef.current) return;

    autoBiometricTriggeredRef.current = true;
    handleBiometricUnlock();
  }, [
    biometricAvailable,
    showPasswordUnlock,
    hasUnlockedOnce,
    handleBiometricUnlock,
  ]);

  useEffect(() => {
    wallet.savedUnencryptedKeyringData().then(setHasForgotPassword);
  }, []);

  useEffect(() => {
    if (UiType.isTab || UiType.isDesktop) {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const { isDarkTheme } = useThemeMode();

  useUnmount(() => {
    if (isDarkTheme && !document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
  });

  return (
    <FullscreenContainer isUnlock>
      <div className="unlock page-has-ant-input relative h-full min-h-[550px]">
        <BackgroundSVG className="absolute inset-0 z-[-1]" />
        <div className="pt-80">
          {showBiometricSwitch && (
            <div className="w-full absolute top-32 left-0 right-0 flex justify-center z-10">
              {showPasswordUnlock ? (
                <UnlockMethodSwitch
                  type="button"
                  onClick={() => setShowPasswordUnlock(false)}
                >
                  <BiometricSwitchSVG className="w-[18px] h-[18px]" />
                  {t('page.unlock.btn.biometric')}
                </UnlockMethodSwitch>
              ) : (
                <UnlockMethodSwitch
                  type="button"
                  onClick={() => setShowPasswordUnlock(true)}
                >
                  <PasswordSwitchSVG className="w-[18px] h-[18px]" />
                  {t('page.unlock.btn.unlockWithPassword')}
                </UnlockMethodSwitch>
              )}
            </div>
          )}
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
        {showBiometricSwitch && !showPasswordUnlock ? (
          <>
            <BiometricsImage>
              <BiometricsSVG />
            </BiometricsImage>

            <footer className="absolute bottom-32 left-0 right-0 text-center">
              <div className="mx-20 mb-20">
                <Button
                  block
                  className={clsx(
                    'w-full py-18 h-auto rounded-[12px] border-none',
                    'text-[17px] leading-[20px] font-normal'
                  )}
                  htmlType="button"
                  type="primary"
                  size="large"
                  loading={biometricUnlocking || biometricSetupOpening}
                  onClick={handleBiometricEntry}
                >
                  {t('page.unlock.btn.biometric')}
                </Button>
              </div>
            </footer>
          </>
        ) : (
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
        )}
      </div>
    </FullscreenContainer>
  );
};

export default Unlock;
