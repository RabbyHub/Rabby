/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect } from 'react';

import { Button, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import Popup from '../Popup';

import './style.less';
import { getContainerByScreen, useWallet } from '@/ui/utils';

export const PwdForNonWhitelistedTxModal = ({
  visible: propVisible,
  onFinish,
  onCancel,
}: {
  height?: number;
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  const [{ passwordText, errorText }, setFormState] = React.useState<{
    passwordText: string;
    errorText: string;
  }>({ passwordText: '', errorText: '' });
  const wallet = useWallet();

  const isEnabledPwdForNonWhitelistedTx = useRabbySelector(
    (state) => state.preference.isEnabledPwdForNonWhitelistedTx
  );
  const needPwdCheck = isEnabledPwdForNonWhitelistedTx;
  const height = needPwdCheck ? 291 : 195;

  const disableSubmit = needPwdCheck && !passwordText;
  const handleSubmit = useCallback(async () => {
    if (disableSubmit) return;
    if (needPwdCheck) {
      try {
        await wallet.verifyPassword(passwordText);
      } catch (err) {
        const message = (err as Error)?.message || '';
        if (message) {
          setFormState((s) => ({
            ...s,
            errorText:
              message ||
              t('page.dashboard.settings.PwdForNonWhitelistedTx.wrongPassword'),
          }));
          return;
        }
      }
    }

    dispatch.preference.enablePwdForNonWhitelistedTx(
      !isEnabledPwdForNonWhitelistedTx
    );
    setFormState({ passwordText: '', errorText: '' });
    onFinish?.();
  }, [
    disableSubmit,
    passwordText,
    dispatch,
    onFinish,
    t,
    wallet,
    needPwdCheck,
    isEnabledPwdForNonWhitelistedTx,
  ]);

  const handleCancel = useCallback(() => {
    setFormState({ passwordText: '', errorText: '' });
    onCancel();
  }, [onCancel]);

  const inputRef = React.useRef<Input>(null);
  useEffect(() => {
    setTimeout(() => {
      if (propVisible && isEnabledPwdForNonWhitelistedTx) {
        inputRef.current?.focus();
      }
    }, 100);
  }, [propVisible, isEnabledPwdForNonWhitelistedTx]);

  return (
    <Popup
      visible={propVisible}
      onClose={handleCancel}
      height={height}
      // bodyStyle={{ height: '100%', padding: '14px 20px 0 20px' }}
      destroyOnClose
      className="pwd-for-non-whitelisted-tx-popup-wrapper"
      isSupportDarkMode
    >
      <div
        className={clsx(
          'non-whitelisted-tx-modal h-full flex flex-col justify-between',
          {
            show: propVisible,
            // hidden: !propVisible,
          }
        )}
      >
        <div className="page-header leading-[19px] mb-[20px]">
          <span className="header-content text-[20px]">
            {isEnabledPwdForNonWhitelistedTx
              ? t('page.dashboard.settings.PwdForNonWhitelistedTx.titleDisable')
              : t('page.dashboard.settings.PwdForNonWhitelistedTx.titleEnable')}
          </span>
        </div>
        {!needPwdCheck ? (
          <div className="flex-1">
            <div className="text-r-neutral-body text-[13px] leading-[18px] text-center mb-[20px]">
              {t('page.dashboard.settings.PwdForNonWhitelistedTx.descEnable')}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="text-r-neutral-body text-[13px] leading-[18px] text-center mb-[20px]">
              {t('page.dashboard.settings.PwdForNonWhitelistedTx.descDisable')}
            </div>

            <Input
              ref={inputRef}
              className="whitelist-pwd-input h-[56px] p-[18px]"
              type="password"
              value={passwordText}
              onKeyDown={(evt) => {
                if (evt.key === 'Enter') {
                  handleSubmit();
                }
              }}
              onChange={(evt) => {
                setFormState((s) => ({
                  ...s,
                  errorText: '',
                  passwordText: evt.target.value || '',
                }));
              }}
              placeholder={t(
                'page.dashboard.settings.PwdForNonWhitelistedTx.inputPlaceholder'
              )}
            />

            {errorText && (
              <div className="mt-[6px]">
                <span className="text-r-red-default text-[13px] font-normal">
                  {errorText}
                </span>
              </div>
            )}
          </div>
        )}
        <footer className="fixed-footer flex justify-between items-center gap-[16px]">
          <Button
            type="primary"
            ghost
            block
            className="rabby-btn-ghost h-[48px] rounded-[8px] text-[16px]"
            onClick={handleCancel}
          >
            {t('global.Cancel')}
          </Button>
          <Button
            disabled={disableSubmit}
            type="primary"
            block
            className="h-[48px] rounded-[8px] text-[16px]"
            onClick={handleSubmit}
          >
            {t('global.Confirm')}
          </Button>
        </footer>
      </div>
    </Popup>
  );
};

export const VerifyPwdForNonWhitelisted = ({
  visible: propVisible,
  onFinish,
  onCancel,
}: {
  height?: number;
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  const [{ passwordText, errorText }, setFormState] = React.useState<{
    passwordText: string;
    errorText: string;
  }>({ passwordText: '', errorText: '' });
  const wallet = useWallet();

  const isEnabledPwdForNonWhitelistedTx = useRabbySelector(
    (state) => state.preference.isEnabledPwdForNonWhitelistedTx
  );
  const disableSubmit = !passwordText;
  const handleSubmit = useCallback(async () => {
    if (disableSubmit) return;
    try {
      await wallet.verifyPassword(passwordText);
    } catch (err) {
      const message = (err as Error)?.message || '';
      if (message) {
        setFormState((s) => ({
          ...s,
          errorText:
            message ||
            t('page.dashboard.settings.PwdForNonWhitelistedTx.wrongPassword'),
        }));
        return;
      }
    }

    setFormState({ passwordText: '', errorText: '' });
    onFinish?.();
  }, [disableSubmit, passwordText, onFinish, t, wallet]);

  const handleCancel = useCallback(() => {
    setFormState({ passwordText: '', errorText: '' });
    onCancel();
  }, [onCancel]);

  const inputRef = React.useRef<Input>(null);
  useEffect(() => {
    setTimeout(() => {
      if (propVisible && isEnabledPwdForNonWhitelistedTx) {
        inputRef.current?.focus();
      }
    }, 100);
  }, [propVisible, isEnabledPwdForNonWhitelistedTx]);

  return (
    <Popup
      visible={propVisible}
      onClose={handleCancel}
      height={230}
      // bodyStyle={{ height: '100%', padding: '14px 20px 0 20px' }}
      destroyOnClose
      className="verify-whitelisted-item-popup-wrapper"
      getContainer={getContainerByScreen}
      isSupportDarkMode
    >
      <div
        className={clsx(
          'non-whitelisted-tx-modal h-full flex flex-col justify-between',
          {
            show: propVisible,
            // hidden: !propVisible,
          }
        )}
      >
        <div className="page-header leading-[19px] mb-[20px]">
          <span className="header-content text-[20px]">
            {t('page.whitelist.verifyPwd.title')}
          </span>
        </div>
        <div className="flex-1">
          <Input
            ref={inputRef}
            className="whitelist-pwd-input h-[56px] p-[18px]"
            type="password"
            value={passwordText}
            onKeyDown={(evt) => {
              if (evt.key === 'Enter') {
                handleSubmit();
              }
            }}
            onChange={(evt) => {
              setFormState((s) => ({
                ...s,
                errorText: '',
                passwordText: evt.target.value || '',
              }));
            }}
            placeholder={t('page.whitelist.verifyPwd.inputPlaceholder')}
          />

          {errorText && (
            <div className="mt-[6px]">
              <span className="text-r-red-default text-[13px] font-normal">
                {errorText}
              </span>
            </div>
          )}
        </div>
        <footer className="fixed-footer flex justify-between items-center gap-[16px]">
          <Button
            type="primary"
            ghost
            block
            className="rabby-btn-ghost h-[48px] rounded-[8px] text-[16px]"
            onClick={handleCancel}
          >
            {t('global.Cancel')}
          </Button>
          <Button
            disabled={disableSubmit}
            type="primary"
            block
            className="h-[48px] rounded-[8px] text-[16px]"
            onClick={handleSubmit}
          >
            {t('global.Confirm')}
          </Button>
        </footer>
      </div>
    </Popup>
  );
};
