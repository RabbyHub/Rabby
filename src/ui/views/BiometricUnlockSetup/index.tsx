import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, message } from 'antd';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import browser from 'webextension-polyfill';

import { ReactComponent as BackgroundSVG } from '@/ui/assets/unlock/background.svg';
import { ReactComponent as BiometricsSVG } from '@/ui/assets/unlock/biometrics.svg';
import { useWallet } from '@/ui/utils';
import { useRabbyDispatch } from '@/ui/store';
import {
  createBiometricUnlockPayload,
  isBiometricUserCanceledError,
  isBiometricUnlockSupported,
} from '@/ui/utils/biometric';

const Container = styled.div`
  box-sizing: border-box;
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 52px 20px 0;
`;

const Heading = styled.h1`
  font-size: 20px;
  line-height: 1;
  font-weight: 500;
  color: var(--r-neutral-title-1);
  margin-bottom: 8px;
  margin-top: 24px;
`;

const Desc = styled.p`
  line-height: 1;
  color: var(--r-neutral-foot);
  margin-bottom: 16px;
`;

const InputWrap = styled.div`
  width: 100%;

  .biometric-pwd-input {
    border-radius: 8px;
    background: var(--r-neutral-card1, #fff) !important;
    border: 1px solid var(--r-neutral-line) !important;
    height: 56px;
    padding: 18px;
  }

  .biometric-pwd-input:focus,
  .biometric-pwd-input.ant-input-focused {
    border: 1px solid var(--r-blue-default, #4c65ff) !important;
  }
`;

const Footer = styled.footer`
  padding: 18px 20px;
  border-top: 0.5px solid var(--r-neutral-line, #e0e5ec);
  display: flex;
  gap: 16px;
  margin-top: 48px;
`;

export const BiometricUnlockSetup = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<Input>(null);
  const disableSubmit = !password || loading;

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
      const payload = await createBiometricUnlockPayload(password);
      await dispatch.preference.setBiometricUnlock({
        enabled: true,
        credentialId: payload.credentialId,
        encryptedPassword: payload.encryptedPassword,
        iv: payload.iv,
      });
      message.success(t('page.dashboard.settings.biometricUnlockEnabled'));
      const currentWindow = await browser.windows.getCurrent();
      await wallet.finishBiometricUnlockSetup(currentWindow?.id);
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
    <Container className="page-has-ant-input">
      <BackgroundSVG className="absolute inset-0 z-[-1]" />
      <Body>
        <BiometricsSVG className="w-[100]" />

        <Heading>
          {t('page.dashboard.settings.biometricUnlockSetupTitle')}
        </Heading>
        <Desc>{t('page.dashboard.settings.biometricUnlockSetupDesc')}</Desc>

        <InputWrap>
          <Input
            ref={inputRef}
            type="password"
            spellCheck={false}
            value={password}
            className="biometric-pwd-input"
            placeholder={t(
              'page.dashboard.settings.biometricUnlockPasswordPlaceholder'
            )}
            onChange={(e) => setPassword(e.target.value || '')}
            onPressEnter={handleConfirm}
          />
        </InputWrap>
      </Body>

      <Footer>
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
      </Footer>
    </Container>
  );
};

export default BiometricUnlockSetup;
