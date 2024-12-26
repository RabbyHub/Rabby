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
    margin-bottom: 24px;
  }

  .ant-input {
    border-radius: 8px;
    color: var(--r-neutral-foot, #6a7587);
    font-size: 15px;
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
    &-focused {
      border: 1px solid var(--r-blue-default, #7084ff);
    }
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);
    .ant-input {
      border: none !important;
      border-radius: 0 !important;
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

  .ant-form-item-explain.ant-form-item-explain-error {
    color: var(--r-red-default, #e34935);
    font-size: 13px;
    font-weight: 400;
    line-height: 16px;
    min-height: unset;
    margin-top: 10px;
  }

  .ant-input-suffix {
    display: none;
  }

  .ant-form-item-has-success {
    .ant-input-suffix {
      display: flex;
    }
  }
`;

interface Props {
  onSubmit?(password: string): void;
  onBack?(): void;
  step: 1 | 2;
}

export const PasswordCard: React.FC<Props> = ({ onSubmit, step, onBack }) => {
  const { t } = useTranslation();
  const [agreeTerm, setAgreeTerm] = useState(true);

  const [form] = Form.useForm<{
    password: string;
    confirmPassword: string;
  }>();

  const handleSubmit = useMemoizedFn(async () => {
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
      <Card onBack={onBack} step={step} className="flex flex-col">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="flex flex-col flex-1"
        >
          <div className="flex-1 mt-[18px]">
            <hgroup className="mb-[24px]">
              <h1 className="text-r-neutral-title1 text-center font-semibold text-[24px] leading-[29px] mb-[8px]">
                {t('page.newUserImport.PasswordCard.title')}
              </h1>
              <p className="text-center text-r-neutral-foot text-[14px] leading-[17px]">
                {t('page.newUserImport.PasswordCard.desc')}
              </p>
            </hgroup>

            <Form.Item
              name="password"
              validateTrigger={['onChange', 'onSubmit']}
              label={t('page.newUserImport.PasswordCard.form.password.label')}
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
                type="password"
                autoFocus
                spellCheck={false}
                suffix={
                  <span className="text-r-green-default">
                    <RcIconSuccessCC />
                  </span>
                }
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              validateTrigger={['onChange', 'onSubmit']}
              label={t(
                'page.newUserImport.PasswordCard.form.confirmPassword.label'
              )}
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
                type="password"
                spellCheck={false}
                suffix={
                  <span className="text-r-green-default">
                    <RcIconSuccessCC />
                  </span>
                }
              />
            </Form.Item>
          </div>
          <Form.Item shouldUpdate noStyle>
            {(form) => {
              const isDisabled =
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
                      <div className={'text-r-blue-default'}>
                        <RcIconCheckCC />
                      </div>
                    ) : (
                      <div className={'text-r-neutral-foot'}>
                        <RcIconUnCheckCC />
                      </div>
                    )}
                    <div className="text-[13px] text-r-neutral-body leading-[16px]">
                      <Trans
                        t={t}
                        i18nKey="page.newUserImport.PasswordCard.agree"
                      >
                        I agree to the{' '}
                        <span
                          className="text-r-blue-default font-medium cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            gotoTermsOfUse();
                          }}
                        >
                          Terms of Use
                        </span>
                        and
                        <span
                          className="text-r-blue-default font-medium cursor-pointer"
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
                      'mt-[24px] h-[56px] shadow-none rounded-[8px]',
                      'text-[17px] font-medium'
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
