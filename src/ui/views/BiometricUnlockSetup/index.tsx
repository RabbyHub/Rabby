import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, InputRef, message } from 'antd';
import { useTranslation } from 'react-i18next';
import browser from 'webextension-polyfill';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';

import { ReactComponent as BackgroundSVG } from '@/ui/assets/unlock/background.svg';
import { ReactComponent as BiometricsSVG } from '@/ui/assets/unlock/biometrics.svg';
import { useWallet } from '@/ui/utils';
import { useRabbyDispatch } from '@/ui/store';
import {
  createBiometricUnlockPayload,
  isBiometricUserCanceledError,
  isBiometricUnlockSupported,
} from '@/ui/utils/biometric';
import styles from './index.module.css';

export const BiometricUnlockSetup = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<InputRef>(null);
  const disableSubmit = !password || loading;
  const from = new URLSearchParams(location.search).get('from');
  const isFromSettings = from === 'settings';

  const closeCurrentWindowOnly = async () => {
    try {
      const currentWindow = await browser.windows.getCurrent();
      if (currentWindow?.id != null) {
        await browser.windows.remove(currentWindow.id);
        return;
      }
    } catch (e) {
      console.error('[BiometricUnlockSetup] close current window failed', e);
    }
    window.close();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let mounted = true;
    isBiometricUnlockSupported().then((supported) => {
      if (!mounted) return;
      if (!supported) {
        message.error(t('page.dashboard.settings.biometricUnlockUnsupported'));
        closeCurrentWindowOnly();
      }
    });

    return () => {
      mounted = false;
    };
  }, [t]);

  const handleConfirm = async () => {
    if (!password || loading) return;

    setLoading(true);
    try {
      await wallet.verifyPassword(password);
      if (!(await wallet.isUnlocked())) {
        await wallet.unlock(password);
      }
      setInputError('');
    } catch (error: any) {
      setInputError(
        error?.message || t('page.unlock.password.error', 'Incorrect password')
      );
      setLoading(false);
      return;
    }

    try {
      const payload = await createBiometricUnlockPayload(password);
      await dispatch.preference.setBiometricUnlock({
        enabled: true,
        credentialId: payload.credentialId,
        encryptedPassword: payload.encryptedPassword,
        iv: payload.iv,
      });
      await dispatch.preference.setUnlockPreferredMethod('biometric');
      message.success(t('page.dashboard.settings.biometricUnlockEnabled'));
      const currentWindow = await browser.windows.getCurrent();
      if (isFromSettings) {
        await wallet.finishBiometricUnlockSetup(currentWindow?.id);
      } else {
        await wallet.finishBiometricUnlockSetup(currentWindow?.id, {
          openSettings: false,
        });
      }
    } catch (error: any) {
      if (!isBiometricUserCanceledError(error)) {
        message.error(
          error?.message ||
            t('page.dashboard.settings.biometricUnlockEnableFailed')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-has-ant-input relative box-border flex min-h-[100vh] flex-col">
      <BackgroundSVG
        className="absolute inset-0 z-[-1] w-full h-full"
        preserveAspectRatio="none"
      />
      <div className="flex-1 flex flex-col items-center w-full pt-[52px] px-20 pb-0">
        <BiometricsSVG className="w-[100]" />

        <h1 className="text-20 leading-none font-medium text-r-neutral-title-1 mb-8 mt-24">
          {t('page.dashboard.settings.biometricUnlockSetupTitle')}
        </h1>
        <p className="leading-none text-r-neutral-foot mb-16">
          {t('page.dashboard.settings.biometricUnlockSetupDesc')}
        </p>

        <div className={styles.inputWrap}>
          <Input
            ref={inputRef}
            type="password"
            spellCheck={false}
            value={password}
            className={clsx('biometric-pwd-input', inputError && 'error')}
            placeholder={t(
              'page.dashboard.settings.biometricUnlockPasswordPlaceholder'
            )}
            onChange={(e) => {
              setPassword(e.target.value || '');
              if (inputError) {
                setInputError('');
              }
            }}
            onPressEnter={handleConfirm}
          />
          <div
            className="mt-8 text-r-red-default text-14 min-h-[18px]"
            style={{ visibility: inputError ? 'visible' : 'hidden' }}
          >
            {inputError || ' '}
          </div>
        </div>
      </div>

      <footer className="w-full shrink-0 py-18 px-20 border-t-[0.5px] border-t-r-neutral-line flex gap-16">
        <Button
          className="rabby-btn-ghost h-[48px] rounded-[8px] text-[16px]"
          type="primary"
          ghost
          block
          disabled={loading}
          onClick={() => {
            if (loading) return;
            closeCurrentWindowOnly();
          }}
        >
          {t('global.Cancel')}
        </Button>
        <Button
          className="h-[48px] rounded-[8px] text-[16px]"
          type="primary"
          block
          loading={loading}
          disabled={disableSubmit}
          onClick={handleConfirm}
        >
          {t('global.Confirm')}
        </Button>
      </footer>
    </div>
  );
};

export default BiometricUnlockSetup;
