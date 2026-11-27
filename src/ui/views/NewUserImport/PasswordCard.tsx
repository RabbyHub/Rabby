import { Card } from '@/ui/component/NewUserImport';
import { useHideScreenshotContextMenu } from '@/ui/hooks/useScreenshotContextMenuVisible';
import { openInTab, useWallet } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Input, Switch } from 'antd';
import clsx from 'clsx';
import { sum } from 'lodash';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as RcIconSuccessCC } from 'ui/assets/icon-checked-success-cc.svg';
import { ReactComponent as RcIconEyeCC } from 'ui/assets/new-user-import/eye-cc.svg';
import { ReactComponent as RcIconEyeCloseCC } from 'ui/assets/new-user-import/eye-close-cc.svg';
import styles from './PasswordCard.module.css';

const MINIMUM_PASSWORD_LENGTH = 8;

interface Props {
  onSubmit?(password: string): void;
  onBack?(): void;
  step?: 1 | 2;
  /**
   * Show the "Help improve Rabby" toggle and persist its value on submit.
   * Only for wallet initialization; resetting the password keeps the user's
   * existing data-collection choice.
   */
  showDataCollectionToggle?: boolean;
}

export const PasswordCard: React.FC<Props> = ({
  onSubmit,
  step,
  onBack,
  showDataCollectionToggle = false,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [enableDataCollection, setEnableDataCollection] = useState(true);

  const [form] = Form.useForm<{
    password: string;
    confirmPassword: string;
  }>();

  const handleSubmit = useMemoizedFn(async () => {
    try {
      await form.validateFields();
    } catch {
      // The form shows the error; the rejection carries both passwords.
      return;
    }
    if (showDataCollectionToggle) {
      await wallet.setUserDataTrackingOptOut(!enableDataCollection);
    }
    onSubmit?.(form.getFieldsValue().password);
  });

  const gotoTermsOfUse = useMemoizedFn(() => {
    openInTab('https://rabby.io/docs/terms-of-use', false);
  });

  const gotoPrivacy = useMemoizedFn(() => {
    openInTab('https://rabby.io/docs/privacy', false);
  });

  useHideScreenshotContextMenu();
  return (
    <div className={styles.container}>
      <Card
        onBack={onBack}
        step={step}
        className="flex flex-col"
        title={t('page.newUserImport.PasswordCard.title')}
      >
        <header className="mt-[14px] mb-[32px]">
          <div className="text-center text-r-neutral-foot text-[14px] leading-[16px]">
            {t('page.newUserImport.PasswordCard.desc')}
          </div>
        </header>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="flex flex-col flex-1"
        >
          <div className="flex-1">
            <Form.Item
              name="password"
              validateTrigger={['onChange', 'onSubmit']}
              label={''}
              rules={[
                {
                  required: true,
                  message: t(
                    'page.newUserImport.PasswordCard.form.password.required'
                  ),
                },
                {
                  min: MINIMUM_PASSWORD_LENGTH,
                  message: t(
                    'page.newUserImport.PasswordCard.form.password.min'
                  ),
                },
              ]}
            >
              <Input
                size="large"
                placeholder={t(
                  'page.newUserImport.PasswordCard.form.password.placeholder'
                )}
                type={isShowPassword ? 'text' : 'password'}
                autoFocus
                spellCheck={false}
                suffix={
                  <div className="flex items-center gap-[4px]">
                    <div className="icon-check text-r-green-default p-[6px]">
                      <RcIconSuccessCC />
                    </div>
                    <div
                      className="text-r-neutral-body p-[6px] cursor-pointer rounded-[4px] hover:bg-r-neutral-card-2"
                      onMouseDown={(e) => {
                        // Prevent focused state lost
                        e.preventDefault();
                      }}
                      onMouseUp={(e) => {
                        // Prevent caret position change
                        e.preventDefault();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsShowPassword((prev) => !prev);
                      }}
                    >
                      {isShowPassword ? <RcIconEyeCC /> : <RcIconEyeCloseCC />}
                    </div>
                  </div>
                }
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              validateTrigger={['onChange', 'onSubmit']}
              label={''}
              dependencies={['password']}
              rules={[
                {
                  required: true,
                  message: t(
                    'page.newUserImport.PasswordCard.form.confirmPassword.required'
                  ),
                },
                ({ getFieldValue }) => ({
                  validator(_, value: string) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        t(
                          'page.newUserImport.PasswordCard.form.confirmPassword.notMatch'
                        )
                      )
                    );
                  },
                }),
              ]}
            >
              <Input
                size="large"
                placeholder={t(
                  'page.newUserImport.PasswordCard.form.confirmPassword.placeholder'
                )}
                type={isShowPassword ? 'text' : 'password'}
                spellCheck={false}
                onKeyDown={(evt) => {
                  if (evt.key === 'Enter') {
                    handleSubmit();
                  }
                }}
                suffix={
                  <div className="flex items-center gap-[4px]">
                    <div className="icon-check text-r-green-default p-[6px]">
                      <RcIconSuccessCC />
                    </div>
                    <div
                      className="text-r-neutral-body p-[6px] cursor-pointer rounded-[4px] hover:bg-r-neutral-card-2"
                      onMouseDown={(e) => {
                        // Prevent focused state lost
                        e.preventDefault();
                      }}
                      onMouseUp={(e) => {
                        // Prevent caret position change
                        e.preventDefault();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsShowPassword((prev) => !prev);
                      }}
                    >
                      {isShowPassword ? <RcIconEyeCC /> : <RcIconEyeCloseCC />}
                    </div>
                  </div>
                }
              />
            </Form.Item>
            {showDataCollectionToggle && (
              <div className="rounded-[8px] bg-r-neutral-card2 px-[16px] py-[14px] flex flex-col gap-[6px]">
                <div className="flex items-center justify-between gap-[12px]">
                  <label
                    htmlFor="new-user-data-collection-switch"
                    className="text-[14px] leading-[17px] font-medium text-r-neutral-title1 cursor-pointer"
                  >
                    {t('page.newUserImport.PasswordCard.dataCollection.title')}
                  </label>
                  <Switch
                    id="new-user-data-collection-switch"
                    size="small"
                    checked={enableDataCollection}
                    onChange={setEnableDataCollection}
                  />
                </div>
                <div className="text-[12px] leading-[16px] text-r-neutral-foot">
                  {t('page.newUserImport.PasswordCard.dataCollection.desc')}
                </div>
              </div>
            )}
          </div>
          <Form.Item shouldUpdate noStyle>
            {(form) => {
              const isDisabled =
                !form.getFieldValue('confirmPassword') ||
                form.isFieldsValidating([['password'], ['confirmPassword']]) ||
                sum(form.getFieldsError().map((item) => item.errors.length)) >
                  0 ||
                !form.isFieldsTouched();
              return (
                <footer className="mt-auto pt-[20px]">
                  <Button
                    onClick={handleSubmit}
                    block
                    disabled={isDisabled}
                    type="primary"
                    className={clsx(
                      'h-[52px] shadow-none rounded-[8px]',
                      'text-[15px] leading-[18px] font-medium'
                    )}
                  >
                    {t('global.Confirm')}
                  </Button>
                  <div className="mt-[12px] text-center text-[12px] leading-[16px] text-r-neutral-foot">
                    <Trans
                      t={t}
                      i18nKey="page.newUserImport.PasswordCard.termsNotice"
                      components={{
                        terms: (
                          <span
                            className="text-r-blue-default font-medium cursor-pointer"
                            onClick={gotoTermsOfUse}
                          />
                        ),
                        privacy: (
                          <span
                            className="text-r-blue-default font-medium cursor-pointer"
                            onClick={gotoPrivacy}
                          />
                        ),
                      }}
                    />
                  </div>
                </footer>
              );
            }}
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
