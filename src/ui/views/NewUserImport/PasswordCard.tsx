import { Card } from '@/ui/component/NewUserImport';
import { openInTab } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Input } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import IconCheck from 'ui/assets/check.svg';

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
    border: 1px solid var(--r-neutral-line, #e0e5ec);
  }

  .ant-input:focus,
  .ant-input-focused {
    border-color: var(--r-blue-default, #7084ff);
  }

  .ant-form-item-has-error .ant-input {
    border: 1px solid var(--r-red-default, #e34935);
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

  const history = useHistory();

  const handleSubmit = useMemoizedFn(async () => {
    // todo
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
        <div className="flex-1 mt-[18px]">
          <hgroup>
            <h1 className="text-r-neutral-title1 text-center font-semibold text-[24px] leading-[29px] mb-[8px]">
              {t('page.newUserImport.PasswordCard.title')}
            </h1>
            <p className="text-center text-r-neutral-foot text-[14px] leading-[17px]">
              It will be used to unlock wallet and encrypt data
            </p>
          </hgroup>
          <Form
            form={form}
            className="mt-[24px]"
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="password"
              validateTrigger={['onChange', 'submit']}
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
                className={'h-[52px]'}
                size="large"
                placeholder={t(
                  'page.newUserImport.PasswordCard.form.password.placeholder'
                )}
                type="password"
                autoFocus
                spellCheck={false}
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              validateTrigger={['onChange', 'onsubmit']}
              label={t(
                'page.newUserImport.PasswordCard.form.confirmPassword.label'
              )}
              rules={[
                {
                  required: true,
                  message: t('page.createPassword.confirmRequired'),
                },
                ({ getFieldValue }) => ({
                  validator(_, value: string) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(t('page.createPassword.confirmError'))
                    );
                  },
                }),
              ]}
            >
              <Input
                className="h-[52px]"
                size="large"
                placeholder={t(
                  'page.newUserImport.PasswordCard.form.confirmPassword.placeholder'
                )}
                type="password"
                spellCheck={false}
              />
            </Form.Item>
          </Form>
        </div>
        <footer>
          <div
            className="flex items-center justify-center gap-[4px] cursor-pointer"
            onClick={() => {
              setAgreeTerm((prev) => !prev);
            }}
          >
            <div
              className={clsx(
                'w-[16px] h-[16px] flex items-center justify-center  rounded-full overflow-hidden',
                agreeTerm ? 'bg-r-blue-default' : 'bg-r-neutral-foot'
              )}
            >
              <img src={IconCheck} className="w-[10px]" />
            </div>
            <div className="text-[13px] text-r-neutral-body leading-[16px]">
              <Trans t={t} i18nKey="page.newUserImport.PasswordCard.agree">
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
            type="primary"
            className={clsx(
              'mt-[24px] h-[56px] shadow-none rounded-[8px]',
              'text-[17px] font-medium'
            )}
          >
            {t('global.Confirm')}
          </Button>
        </footer>
      </Card>
    </Container>
  );
};
