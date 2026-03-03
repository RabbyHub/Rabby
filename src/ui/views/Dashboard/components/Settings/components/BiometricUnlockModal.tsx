import React, { useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { Button, Input, InputRef } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import Popup from '@/ui/component/Popup';
import { getContainerByScreen } from '@/ui/utils';
import { UI_TYPE } from '@/constant/ui';

interface BiometricUnlockModalProps {
  visible: boolean;
  loading?: boolean;
  onConfirm(password: string): Promise<void> | void;
  onCancel(): void;
}

const BiometricUnlockPopup = styled(Popup)`
  .ant-drawer-body {
    position: relative;
    padding: 20px 20px 24px;
    border-radius: 16px 16px 0 0;
    background: var(--r-neutral-bg2, #f2f4f7);
  }

  .page-header {
    padding-top: 0;
  }

  .biometric-pwd-input {
    border-radius: 8px;
    background: var(--r-neutral-card1, #fff) !important;
    border: 1px solid transparent;
  }

  .biometric-pwd-input:focus,
  .biometric-pwd-input.ant-input-focused {
    border: 1px solid var(--r-blue-default, #4c65ff);
  }

  .fixed-footer {
    position: absolute;
    padding: 18px 20px;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 0.5px solid var(--r-neutral-line, #e0e5ec);
  }
`;

export const BiometricUnlockModal = ({
  visible,
  loading,
  onConfirm,
  onCancel,
}: BiometricUnlockModalProps) => {
  const { t } = useTranslation();
  const [passwordText, setPasswordText] = React.useState('');

  const inputRef = React.useRef<InputRef>(null);

  const disableSubmit = !passwordText || loading;

  const handleSubmit = useCallback(async () => {
    if (disableSubmit) return;
    try {
      await onConfirm(passwordText);
    } catch {
      // Errors are handled by parent via toast and popup close.
    }
    setPasswordText('');
  }, [disableSubmit, onConfirm, passwordText]);

  const handleCancel = useCallback(() => {
    if (loading) return;
    setPasswordText('');
    onCancel();
  }, [loading, onCancel]);

  useEffect(() => {
    setTimeout(() => {
      if (visible) {
        inputRef.current?.focus();
      }
    }, 100);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setPasswordText('');
    }
  }, [visible]);

  return (
    <BiometricUnlockPopup
      visible={visible}
      onClose={handleCancel}
      height={230}
      push={false}
      destroyOnClose
      forceRender={UI_TYPE.isDesktop}
      className={clsx('biometric-unlock-popup-wrapper', !visible && 'hidden')}
      getContainer={getContainerByScreen}
      isSupportDarkMode
    >
      <div
        className={clsx(
          'biometric-unlock-modal h-full flex flex-col justify-between',
          {
            show: visible,
          }
        )}
      >
        <div className="page-header leading-[19px] mb-[15px]">
          <span className="header-content text-[20px]">
            {t('page.dashboard.settings.biometricUnlockSetupTitle')}
          </span>
        </div>

        <div className="flex-1">
          <Input
            ref={inputRef}
            className="biometric-pwd-input h-[56px] p-[18px]"
            type="password"
            value={passwordText}
            spellCheck={false}
            onKeyDown={(evt) => {
              if (evt.key === 'Enter') {
                handleSubmit();
              }
            }}
            onChange={(evt) => {
              setPasswordText(evt.target.value || '');
            }}
            placeholder={t(
              'page.dashboard.settings.biometricUnlockPasswordPlaceholder'
            )}
          />
        </div>

        <footer className="fixed-footer flex justify-between items-center gap-[16px]">
          <Button
            type="primary"
            ghost
            block
            disabled={!!loading}
            className="rabby-btn-ghost h-[48px] rounded-[8px] text-[16px]"
            onClick={handleCancel}
          >
            {t('global.Cancel')}
          </Button>
          <Button
            disabled={!!disableSubmit}
            loading={!!loading}
            type="primary"
            block
            className="h-[48px] rounded-[8px] text-[16px]"
            onClick={handleSubmit}
          >
            {t('global.Confirm')}
          </Button>
        </footer>
      </div>
    </BiometricUnlockPopup>
  );
};

export default BiometricUnlockModal;
