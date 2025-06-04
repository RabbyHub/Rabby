import { openInTab } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
// import { Button, Form, Input } from 'antd';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  CardBody,
  CardContainer,
  CardHeader,
  CardHeading,
} from 'ui/component/CardContainer';
import { Form } from 'radix-ui';
import {
  Button,
  Callout,
  Checkbox,
  Flex,
  Link,
  Radio,
  Text,
  TextField,
} from '@radix-ui/themes';
import {
  LucideEye,
  LucideEyeClosed,
  LucideInfo,
  LucideXCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { unstable_PasswordToggleField as PasswordToggleField } from 'radix-ui';

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
    color: var(--r-neutral-title1);
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
  step: 1 | 2;

  onSubmit?(password: string): void;

  onBack?(): void;
}

export const PasswordCard: React.FC<Props> = ({ onSubmit, step, onBack }) => {
  const { t } = useTranslation();
  const [agreeTerm, setAgreeTerm] = useState(false);
  const [form, setForm] = useState<{
    password: string;
    confirmPassword: string;
  }>({
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(
    false
  );

  /*const [form] = Form.useForm<{
    password: string;
    confirmPassword: string;
  }>();*/

  const handleSubmit = useMemoizedFn(async () => {
    // await form.validateFields();
    // onSubmit?.(form.getFieldsValue().password);

    onSubmit?.(form.password);
    setForm({
      password: '',
      confirmPassword: '',
    });
    setAgreeTerm(false);
    setError(null);
  });

  const gotoTermsOfUse = useMemoizedFn(() => {
    openInTab('https://rabby.io/docs/terms-of-use', false);
  });

  const gotoPrivacy = useMemoizedFn(() => {
    openInTab('https://rabby.io/docs/privacy', false);
  });

  const formInputsAreValid =
    !(form.password && form.confirmPassword) ||
    (form.password !== '' && form.password !== form.confirmPassword);

  return (
    <Flex
      direction={'column'}
      align={'center'}
      justify={'center'}
      width={'100%'}
      height={'100%'}
    >
      <Flex
        position={'absolute'}
        top={'20%'}
        left={'50%'}
        gap={'2'}
        style={{ transform: 'translateX(-50%)' }}
      >
        {error ? (
          <Callout.Root size={'2'} color="red">
            <Callout.Icon>
              <LucideXCircle size={16} />
            </Callout.Icon>
            {/* @ts-expect-error "This should not throw an error" */}
            <Callout.Text align={'center'}>{error}</Callout.Text>
          </Callout.Root>
        ) : (
          <Callout.Root size={'2'} color="gray" variant="soft" highContrast>
            <Callout.Icon>
              <LucideInfo size={16} />
            </Callout.Icon>
            {/* @ts-expect-error "This should not throw an error" */}
            <Callout.Text weight={'medium'}>
              Create a Password to protect your wallet
            </Callout.Text>
          </Callout.Root>
        )}
      </Flex>
      <CardContainer className={'overflow-auto relative'}>
        <CardHeader showBackButton onPress={onBack}>
          <CardHeading center>
            {t('page.newUserImport.PasswordCard.title')}
          </CardHeading>
          {/*<CardDescription>*/}
          {/*  {t('page.newUserImport.PasswordCard.desc')}*/}
          {/*</CardDescription>*/}
        </CardHeader>
        <CardBody>
          <Flex
            direction={'column'}
            align={'center'}
            justify={'center'}
            gapY={'8'}
            height={'100%'}
            width={'100%'}
          >
            <Form.Root className={'w-full space-y-5'}>
              <Form.Field className="grid gap-y-2" name="password">
                <Flex align={'baseline'} justify={'between'}>
                  <Form.Label className="text-sm">
                    {t('page.newUserImport.PasswordCard.form.password.label')}
                  </Form.Label>
                  <Form.Message
                    className="opacity-80"
                    color={'crimson'}
                    match="valueMissing"
                  >
                    {t(
                      'page.newUserImport.PasswordCard.form.password.required'
                    )}
                  </Form.Message>
                  <Form.Message
                    className="opacity-80"
                    color={'crimson'}
                    match="tooShort"
                  >
                    {t('page.newUserImport.PasswordCard.form.password.min')}
                  </Form.Message>
                  <Form.Message
                    className="opacity-80"
                    color={'crimson'}
                    match="typeMismatch"
                  >
                    Please provide a valid password
                  </Form.Message>
                </Flex>
                <Form.Control asChild>
                  <TextField.Root
                    className={'h-[56px]'}
                    size={'3'}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t(
                      'page.newUserImport.PasswordCard.form.password.placeholder'
                    )}
                    value={form.password}
                    variant="soft"
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  >
                    {form.password.trim() && (
                      <TextField.Slot
                        side={'right'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        style={{ cursor: 'pointer' }}
                      >
                        {showPassword ? (
                          <LucideEyeClosed size={16} />
                        ) : (
                          <LucideEye size={16} />
                        )}
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                </Form.Control>
              </Form.Field>

              <Form.Field className="grid gap-y-2" name="confirm_password">
                <div className="flex items-baseline justify-between">
                  <Form.Label className="text-sm">
                    {t(
                      'page.newUserImport.PasswordCard.form.confirmPassword.label'
                    )}
                  </Form.Label>
                  <Form.Message
                    className=""
                    color={'crimson'}
                    match="valueMissing"
                  >
                    {t(
                      'page.newUserImport.PasswordCard.form.confirmPassword.required'
                    )}
                  </Form.Message>
                  <Form.Message
                    className=""
                    color={'crimson'}
                    match="typeMismatch"
                  >
                    {t(
                      'page.newUserImport.PasswordCard.form.confirmPassword.notMatch'
                    )}
                  </Form.Message>
                </div>
                <Form.Control asChild>
                  <TextField.Root
                    className={'h-[56px]'}
                    radius={'large'}
                    size={'3'}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t(
                      'page.newUserImport.PasswordCard.form.confirmPassword.placeholder'
                    )}
                    value={form.confirmPassword}
                    variant="soft"
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                  >
                    {form.confirmPassword.trim() && (
                      <TextField.Slot
                        side={'right'}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        style={{ cursor: 'pointer' }}
                      >
                        {showConfirmPassword ? (
                          <LucideEyeClosed size={16} />
                        ) : (
                          <LucideEye size={16} />
                        )}
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                </Form.Control>
              </Form.Field>

              <Flex direction={'column'} width={'100%'}>
                <Text
                  as="label"
                  align={'center'}
                  size="2"
                  className={clsx(formInputsAreValid ? 'opacity-40' : '')}
                >
                  <Flex align={'center'} gap="2">
                    <Checkbox
                      color={'grass'}
                      disabled={formInputsAreValid}
                      onCheckedChange={() => setAgreeTerm(!agreeTerm)}
                      checked={agreeTerm}
                    />
                    <Text size={'1'}>
                      <Trans
                        t={t}
                        i18nKey="page.newUserImport.PasswordCard.agree"
                      >
                        I agree to the{' '}
                        <Link
                          // className="text-r-blue-default font-medium cursor-pointer"
                          color={'grass'}
                          weight={'bold'}
                          onClick={(e) => {
                            e.stopPropagation();
                            gotoTermsOfUse();
                          }}
                        >
                          Terms of Use
                        </Link>
                        and
                        <Link
                          // className="text-r-blue-default font-medium cursor-pointer"
                          color={'grass'}
                          weight={'bold'}
                          onClick={(e) => {
                            e.stopPropagation();
                            gotoPrivacy();
                          }}
                        >
                          Privacy Policy
                        </Link>
                      </Trans>
                    </Text>
                  </Flex>
                </Text>
              </Flex>

              <Form.Submit
                asChild
                onSubmit={(e: React.FormEvent) => e.preventDefault()}
              >
                <Button
                  className={'mt-4'}
                  type="submit"
                  size={'4'}
                  variant="solid"
                  highContrast
                  disabled={
                    !(form.password && form.confirmPassword) ||
                    (form.password !== '' &&
                      form.password !== form.confirmPassword &&
                      !agreeTerm) ||
                    !agreeTerm
                  }
                  style={{ width: '100%', cursor: 'pointer' }}
                  onClick={handleSubmit}
                >
                  {t('page.newUserImport.PasswordCard.form.submit.label')}
                </Button>
              </Form.Submit>
            </Form.Root>
          </Flex>
        </CardBody>
      </CardContainer>

      {/*<Container>
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
                  form.isFieldsValidating([
                    ['password'],
                    ['confirmPassword'],
                  ]) ||
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
      </Container>*/}
    </Flex>
  );
};
