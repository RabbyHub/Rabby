import { Card } from '@/ui/component/NewUserImport';
import { openInTab } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Input } from 'antd';
import clsx from 'clsx';
import { sum } from 'lodash';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconCheckCC } from 'ui/assets/icon-checked-cc.svg';
import { ReactComponent as RcIconSuccessCC } from 'ui/assets/icon-checked-success-cc.svg';
import { ReactComponent as RcIconUnCheckCC } from 'ui/assets/icon-unchecked-cc.svg';
import { ReactComponent as RcIconEyeCC } from 'ui/assets/new-user-import/eye-cc.svg';
import { ReactComponent as RcIconEyeCloseCC } from 'ui/assets/new-user-import/eye-close-cc.svg';

const MINIMUM_PASSWORD_LENGTH = 8;

const Container = styled.div`
  .ant-form-item-label {
    & > label {
      color: var(--r-neutral-title1, #192945);
      font-size: 15px;
      font-weight: 500;
      line-height: 18px;
    }
  }
  .ant-form-item {
    margin-bottom: 16px;
  }

  .ant-input {
    border-radius: 8px;
    color: var(--r-neutral-title1);
    font-size: 15px;
    line-height: 18px;
    font-weight: 400;
    height: 52px;
    background: transparent !important;
  }

  .ant-input-affix-wrapper {
    background: var(--r-neutral-bg1, #fff) !important;
    padding: 0 16px;
    overflow: hidden;
  }

  /* .ant-input {
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);
  }

  .ant-input:focus,
  .ant-input-focused {
    border-color: var(--r-blue-default, #7084ff);
  }

  .ant-form-item-has-error {
    margin-bottom: 20px;
    .ant-input {
      border: 1px solid var(--r-red-default, #e34935);
    }
  } */

  .ant-input-affix-wrapper {
    &:hover,
    &-focused,
    &-focused:hover {
      border: 1px solid var(--r-blue-default, #7084ff);
    }
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);
    .ant-input {
      border: none !important;
      border-radius: 0 !important;
      font-size: 15px;
      line-height: 18px;
      font-weight: 400;
      transition: none;

      &::placeholder {
        font-size: 15px;
        line-height: 18px;
        color: var(--r-neutral-foot, #6a7587);
      }
    }
  }
  .ant-form-item-has-error {
    .ant-input-affix-wrapper {
      border: 1px solid var(--r-red-default, #e34935);
    }
  }

  .ant-form-item-explain {
    transition: none;
  }

  .ant-form-item-explain {
    color: var(--r-red-default, #e34935);
    font-size: 13px;
    font-weight: 400;
    line-height: 16px;
    min-height: unset;
    margin-top: 8px;
  }

  .ant-input-suffix {
    .icon-check {
      display: none;
    }
  }

  .ant-form-item-has-success {
    .ant-input-suffix {
      .icon-check {
        display: block;
      }
    }
  }
`;

interface Props {
  onSubmit?(password: string): void;
  onBack?(): void;
  step?: 1 | 2;
}

export const PasswordCard: React.FC<Props> = ({ onSubmit, step, onBack }) => {
  const { t } = useTranslation();
  const [agreeTerm, setAgreeTerm] = useState(true);
  const [isShowPassword, setIsShowPassword] = useState(false);

  const [form] = Form.useForm<{
    password: string;
    confirmPassword: string;
  }>();

  const handleSubmit = useMemoizedFn(async () => {
    if (!agreeTerm) {
      return;
    }
    await form.validateFields();
    onSubmit?.(form.getFieldsValue().password);
  });

  const gotoTermsOfUse = useMemoizedFn(() => {
    openInTab('https://rabby.io/docs/terms-of-use', false);
  });

  const gotoPrivacy = useMemoizedFn(() => {
    openInTab('https://rabby.io/docs/privacy', false);
  });

  return (
    <Container>
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
                <footer className="mt-auto">
                  <div
                    className="flex items-center justify-center gap-[4px] cursor-pointer"
                    onClick={() => {
                      setAgreeTerm((prev) => !prev);
                    }}
                  >
                    {agreeTerm ? (
                      <div className={'text-rabby-blue-default'}>
                        <RcIconCheckCC
                          viewBox="0 0 20 20"
                          className="w-[16px] h-[16px]"
                        />
                      </div>
                    ) : (
                      <div className={'text-r-neutral-foot'}>
                        <RcIconUnCheckCC
                          viewBox="0 0 20 20"
                          className="w-[16px] h-[16px]"
                        />
                      </div>
                    )}
                    <div className="text-[13px] text-r-neutral-foot leading-[16px]">
                      <Trans
                        t={t}
                        i18nKey="page.newUserImport.PasswordCard.agree"
                      >
                        I agree to the{' '}
                        <span
                          className="text-rabby-blue-default font-medium cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            gotoTermsOfUse();
                          }}
                        >
                          Terms of Use
                        </span>
                        and
                        <span
                          className="text-rabby-blue-default font-medium cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            gotoPrivacy();
                          }}
                        >
                          Privacy Policy
                        </span>
                      </Trans>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    block
                    disabled={!agreeTerm || isDisabled}
                    type="primary"
                    className={clsx(
                      'mt-[20px] h-[52px] shadow-none rounded-[8px]',
                      'text-[15px] leading-[18px] font-medium'
                    )}
                  >
                    {t('global.Confirm')}
                  </Button>
                </footer>
              );
            }}
          </Form.Item>
        </Form>
      </Card>
    </Container>
  );
};
