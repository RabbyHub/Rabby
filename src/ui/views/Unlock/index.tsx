import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Form, Button, InputRef, Modal } from 'antd';
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
import unlockBackground from '@/ui/assets/unlock/background.svg';
import { ReactComponent as BiometricsSVG } from '@/ui/assets/unlock/biometrics.svg';
import { ReactComponent as PasswordSwitchSVG } from '@/ui/assets/dashboard/settings/password.svg';
import { ReactComponent as BiometricSwitchSVG } from '@/ui/assets/dashboard/settings/biometric.svg';
import clsx from 'clsx';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import qs from 'qs';
import { isString } from 'lodash';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import {
  cleanupBiometricCredential,
  decryptBiometricUnlockPassword,
  isBiometricUnlockSupported,
} from '@/ui/utils/biometric';
import { useMemoizedFn, useUnmount } from 'ahooks';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { EVENTS } from '@/constant';
import { useWalletStatusStore } from '@/ui/state/walletStatus';
import styles from './index.module.css';

const Unlock = () => {
  type UnlockType = 'Biometrics' | 'Password';
  const wallet = useWallet();
  // A plain unlock is not consent to any pending sign/approval. Bind an Unlock
  // approval only after its unlock event has been observed.
  const [pendingUnlockApproval, setPendingUnlockApproval] = useState<{
    approvalId: string;
    approvalComponent: 'Unlock';
  } | null>(null);
  const [getApproval, resolveApproval] = useApproval(pendingUnlockApproval);
  const [form] = Form.useForm();
  const inputEl = useRef<InputRef>(null);
  const pendingUnlockTypeRef = useRef<UnlockType | null>(null);
  const UiType = getUiType();
  const { t } = useTranslation();
  const history = useHistory();
  const isUnlockingRef = useRef(false);
  const [hasForgotPassword, setHasForgotPassword] = React.useState(false);
  const [biometricSupported, setBiometricSupported] = React.useState(false);
  const [biometricUnlocking, setBiometricUnlocking] = React.useState(false);
  // Biometric unlock is being sunset: password is always the default method.
  const [showPasswordUnlock, setShowPasswordUnlock] = useState(true);
  const [
    biometricSunsetModalVisible,
    setBiometricSunsetModalVisible,
  ] = useState(false);
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
  const query = useMemo(() => {
    return qs.parse(location.search, {
      ignoreQueryPrefix: true,
    });
  }, [location.search]);
  const dispatch = useRabbyDispatch();
  const inputErrorNode = useMemo(() => {
    if (!inputError) return null;

    return (
      <div>
        <span>{inputError}</span>
        {hasForgotPassword && (
          <button
            type="button"
            className={clsx(
              'text-r-blue-default font-medium',
              'underline',
              'ml-[8px]'
            )}
            onClick={() => openInternalPageInTab('forgot-password')}
          >
            {t('page.unlock.btnForgotPassword')}
          </button>
        )}
      </div>
    );
  }, [hasForgotPassword, inputError, t]);

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

  useEffect(() => {
    if (!pendingUnlockApproval) return;
    void resolveApproval(undefined, false, false);
    // Binding changes are the only settlement trigger. resolveApproval is recreated
    // by useApproval on every render and must not retrigger this effect.
  }, [pendingUnlockApproval]);

  // Biometric unlock is being sunset. A successful password unlock initiated in
  // this window disables it and clears the stored biometric data. Only the
  // local pendingUnlockTypeRef counts: UNLOCK_WALLET is broadcast to every
  // window and also fires after a biometric unlock.
  const disableBiometricAfterPasswordUnlock = useMemoizedFn(async () => {
    try {
      const credentialId = biometricUnlockCredentialId;
      if (credentialId) {
        // Best effort, never blocks disabling.
        await cleanupBiometricCredential(credentialId).catch((e) => {
          console.error(e);
          return false;
        });
      }
      await dispatch.preference.setBiometricUnlock({ enabled: false });
    } catch (e) {
      console.error('[Unlock] failed to disable biometric unlock', e);
    }
  });

  const handleUnlockSuccess = useMemoizedFn(async () => {
    const unlockType = pendingUnlockTypeRef.current;
    pendingUnlockTypeRef.current = null;
    if (unlockType) {
      try {
        await dispatch.preference.setUnlockPreferredMethod(
          unlockType === 'Biometrics' ? 'biometric' : 'password'
        );
      } catch (e) {
        console.error(e);
      }
    }
    if (unlockType === 'Password' && biometricUnlockEnabled) {
      await disableBiometricAfterPasswordUnlock();
    }

    useWalletStatusStore.setState({
      hasUnlockedOnce: true,
    });
    if (UiType.isNotification) {
      if (query.from === '/connect-approval') {
        history.replace('/approval?ignoreOtherWallet=1');
      } else {
        // Read the approval after the unlock event, then bind its identity before
        // resolving. The approval hook performs the authoritative re-check.
        const approval = await getApproval();
        if (!approval) {
          history.replace('/');
        } else if (String(approval.data.approvalComponent) === 'Unlock') {
          setPendingUnlockApproval((current) =>
            current?.approvalId === approval.id
              ? current
              : { approvalId: approval.id, approvalComponent: 'Unlock' }
          );
        } else {
          history.replace('/approval');
        }
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
    onError(err) {
      pendingUnlockTypeRef.current = null;
      console.log('error', err);
      setInputError(err?.message || t('page.unlock.password.error'));
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
  // Only users who already enabled biometric unlock keep the switch entry. It
  // is shown in every window type, including the notification (signing) popup,
  // since biometric unlock is no longer triggered automatically there.
  const showBiometricSwitch = biometricAvailable;

  useEffect(() => {
    if (!biometricAvailable) {
      setShowPasswordUnlock(true);
    }
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
      }
    } finally {
      isUnlockingRef.current = false;
      setBiometricUnlocking(false);
    }
  });

  // Biometric unlock is being sunset: remind the user before each biometric
  // unlock and offer to switch back to password.
  const handleBiometricEntry = useMemoizedFn(() => {
    if (!biometricAvailable) return;
    if (isUnlockingRef.current || biometricUnlocking) return;
    setBiometricSunsetModalVisible(true);
  });

  const handleSunsetUsePassword = useMemoizedFn(() => {
    setBiometricSunsetModalVisible(false);
    setShowPasswordUnlock(true);
  });

  const handleSunsetUseBiometric = useMemoizedFn(() => {
    setBiometricSunsetModalVisible(false);
    handleBiometricUnlock();
  });

  const switchToBiometricMode = useMemoizedFn(() => {
    form.resetFields(['password']);
    setInputError('');
    setShowPasswordUnlock(false);
  });

  useEffect(() => {
    wallet.savedUnencryptedKeyringData().then(setHasForgotPassword);
  }, [wallet]);

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
      <div
        className={clsx(
          styles.unlockPage,
          'unlock page-has-ant-input relative h-full min-h-[550px]'
        )}
        style={
          {
            '--unlock-bg-image': `url(${unlockBackground})`,
          } as React.CSSProperties
        }
      >
        <div className="pt-[124px]">
          {showBiometricSwitch && (
            <div className="w-full absolute top-32 left-0 right-0 flex justify-center z-10">
              {showPasswordUnlock ? (
                <button
                  type="button"
                  className={styles.unlockMethodSwitch}
                  onClick={switchToBiometricMode}
                >
                  <BiometricSwitchSVG className="w-[18px] h-[18px]" />
                  {t('page.unlock.btn.biometric')}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.unlockMethodSwitch}
                  onClick={() => setShowPasswordUnlock(true)}
                >
                  <PasswordSwitchSVG className="w-[18px] h-[18px]" />
                  {t('page.unlock.btn.unlockWithPassword')}
                </button>
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
            <div className="mt-28 flex justify-center">
              <BiometricsSVG />
            </div>

            <footer className="absolute bottom-[68px] left-0 right-0 text-center">
              <div className="mx-20">
                <Button
                  block
                  className={clsx(
                    'w-full py-18 h-auto rounded-[12px] border-none',
                    'text-[17px] leading-[20px] font-normal'
                  )}
                  htmlType="button"
                  type="primary"
                  size="large"
                  loading={biometricUnlocking}
                  onClick={handleBiometricEntry}
                >
                  {t('page.unlock.btn.biometric')}
                </Button>
              </div>
            </footer>

            <Modal
              visible={biometricSunsetModalVisible}
              onCancel={() => setBiometricSunsetModalVisible(false)}
              className="modal-support-darkmode"
              bodyStyle={{
                padding: 0,
                background: 'var(--r-neutral-bg1, #FFF)',
              }}
              width={360}
              footer={null}
              closable={false}
              centered
              destroyOnClose
            >
              <div className="pt-[30px] px-[20px] text-center">
                <div className="text-r-neutral-title1 text-[16px] font-medium leading-[20px]">
                  {t('page.unlock.biometricSunsetTitle')}
                </div>
                <div className="mt-[12px] text-r-neutral-body text-[14px] font-normal leading-[20px]">
                  {t('page.unlock.biometricSunsetTip')}
                </div>
              </div>
              <div className="flex items-stretch gap-[12px] p-[20px]">
                <Button
                  type="primary"
                  size="large"
                  ghost
                  className="rabby-btn-ghost flex-1 min-w-0 h-auto min-h-[44px] whitespace-normal leading-[18px]"
                  onClick={handleSunsetUseBiometric}
                >
                  {t('page.unlock.biometricSunsetUseBiometric')}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="flex-1 min-w-0 h-auto min-h-[44px] whitespace-normal leading-[18px]"
                  onClick={handleSunsetUsePassword}
                >
                  {t('page.unlock.biometricSunsetUsePassword')}
                </Button>
              </div>
            </Modal>
          </>
        ) : (
          <Form autoComplete="off" form={form} onFinish={handleSubmit}>
            <Form.Item
              className={clsx(styles.inputForm, 'mt-[34px] mx-20')}
              name="password"
              validateStatus={inputError ? 'error' : undefined}
              help={inputErrorNode}
              rules={[
                {
                  required: true,
                  message: t('page.unlock.password.required'),
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
            </Form.Item>

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
