import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { Input, Form, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { getUiType, useApproval, useWallet, useWalletRequest } from 'ui/utils';
import qs from 'qs';
import { isString } from 'lodash';
import {
  Button,
  Callout,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { LucideXCircle } from 'lucide-react';
import {
  PageBody,
  PageContainer,
  PageHeader,
} from 'ui/component/PageContainer';
import { CardContainer } from 'ui/component/CardContainer';
import { useThemeMode } from 'ui/hooks/usePreference';
import clsx from 'clsx';
import { MINIMUM_PASSWORD_LENGTH } from 'consts';

// const InputFormStyled = styled(Form.Item)`
//   .ant-form-item-explain {
//     font-size: 13px;
//     line-height: 16px;
//     margin-top: 16px;
//     margin-bottom: 24px;
//     min-height: 0px;
//     color: var(--r-red-default);
//     font-weight: 500;
//   }
// `;

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

const isTab = getUiType().isTab;
export const UnlockScreenContainer: React.FC<Props> = ({
  children,
  className,
  style,
}) => {
  const { isDarkTheme } = useThemeMode();
  if (isTab) {
    return <CardContainer>{children}</CardContainer>;
  }
  return <CardContainer>{children}</CardContainer>;
};

const Unlock = () => {
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();
  // const [form] = Form.useForm();
  // const inputEl = useRef<Input>(null);
  const inputEl = useRef<HTMLInputElement>(null);
  const UiType = getUiType();
  const { t } = useTranslation();
  const history = useHistory();
  const isUnlockingRef = useRef(false);
  const [hasForgotPassword, setHasForgotPassword] = React.useState(false);
  const location = useLocation();
  const [password, setPassword] = useState<string>('');
  const [inputError, setInputError] = React.useState('');
  const query = useMemo(() => {
    return qs.parse(location.search, {
      ignoreQueryPrefix: true,
    });
  }, [location.search]);

  useEffect(() => {
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, []);

  const [run] = useWalletRequest(wallet.unlock, {
    onSuccess() {
      if (UiType.isNotification) {
        if (query.from === '/connect-approval') {
          history.replace('/approval?ignoreOtherWallet=1');
        } else {
          resolveApproval();
        }
      } else if (UiType.isTab) {
        history.replace(query.from && isString(query.from) ? query.from : '/');
      } else {
        history.replace('/');
      }
    },
    onError(err) {
      console.log('error unlocking wallet', err);
      setInputError(err?.message || t('page.unlock.password.error'));
      // form.validateFields(['password']);
    },
  });

  const handleSubmit = async ({ password }: { password: string }) => {
    if (isUnlockingRef.current) return;
    isUnlockingRef.current = true;
    await run(password);
    isUnlockingRef.current = false;
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setInputError(t('page.unlock.password.required'));
      return;
    }
    await handleSubmit({ password });
  };

  useEffect(() => {
    wallet.savedUnencryptedKeyringData().then(setHasForgotPassword);
  }, []);

  // useEffect(() => {
  //   if (UiType.isTab) {
  //     document.documentElement.classList.remove('dark');
  //   }
  // }, []);

  return (
    <>
      <UnlockScreenContainer>
        <PageHeader showBackButton={false}>
          {inputError && (
            <Callout.Root size={'1'} color="red">
              <Callout.Icon>
                <LucideXCircle />
              </Callout.Icon>
              {/* @ts-expect-error "This error is negligible" */}
              <Callout.Text align={'center'}>{inputError}</Callout.Text>
            </Callout.Root>
          )}
          {/*<h2 className="text-center text-3xl font-extrabold text-gray-900">
            Web3 Wallet
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your password to unlock
          </p>*/}
        </PageHeader>

        <PageBody>
          <form className="mt-8 space-y-6" onSubmit={handleUnlock}>
            <Flex direction="column" justify={'center'} gap="6">
              <Flex
                direction={'column'}
                gapY={'3'}
                height={'200px'}
                className={'plasmo-justify-end plasmo-py-4'}
              >
                <Heading size={'9'}>
                  <Text as={'div'} size={'3'}>
                    Unlock
                  </Text>
                  {t('page.unlock.title')}
                </Heading>
                <Text
                  as={'div'}
                  className={'plasmo-px-2'}
                  size={'3'}
                  weight={'regular'}
                  color={'gray'}
                >
                  {t('page.unlock.description')}
                </Text>
              </Flex>

              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Password
                </Text>
                <TextField.Root
                  required
                  placeholder={t('page.unlock.password.placeholder')}
                  ref={inputEl}
                  size={'3'}
                  type={'password'}
                  value={password}
                  variant="soft"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <div className={'plasmo-w-full'}>
                <Button
                  highContrast
                  disabled={
                    !password.trim() &&
                    password.trim().length < MINIMUM_PASSWORD_LENGTH / 2
                  }
                  size={'3'}
                  type="submit"
                  className={'w-full'}
                  // className="group relative flex plasmo-w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {t('page.unlock.btn.unlock')}
                </Button>
              </div>
            </Flex>
          </form>
        </PageBody>
        {/*</div>*/}
      </UnlockScreenContainer>

      {/*<FullscreenContainer>
        <div className="unlock page-has-ant-input relative h-full min-h-[550px]">
          <BackgroundSVG className="absolute inset-0 z-[-1]" />
          <div className="pt-80">
            <RabbySVG className="m-auto" />
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
          <Form autoComplete="off" form={form} onFinish={handleSubmit}>
            <InputFormStyled
              className="mt-[34px] mx-20"
              name="password"
              rules={[
                {
                  required: true,
                  message: t('page.unlock.password.required'),
                },
                {
                  validator: (_, value) => {
                    if (inputError) {
                      return Promise.reject(
                        <div>
                          <span>{inputError}</span>
                          <button
                            className={clsx(
                              'text-r-blue-default font-medium',
                              'underline',
                              'ml-[8px]'
                            )}
                            onClick={() =>
                              openInternalPageInTab('forgot-password')
                            }
                          >
                            {t('page.unlock.btnForgotPassword')}
                          </button>
                        </div>
                      );
                    }
                    return Promise.resolve();
                  },
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
            </InputFormStyled>

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
        </div>
      </FullscreenContainer>*/}
    </>
  );
};

export default Unlock;
