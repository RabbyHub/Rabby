import React, { useEffect, useState } from 'react';
import { Input, Form, message } from 'antd';
import { useHistory } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import IconSuccess from 'ui/assets/success.svg';

import { Navbar, StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { clearClipboard } from 'ui/utils/clipboard';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { useRepeatImportConfirm } from '../utils/useRepeatImportConfirm';
import { safeJSONParse } from '@/utils';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import {
  Button,
  Callout,
  Flex,
  Heading,
  Section,
  Text,
  TextField,
} from '@radix-ui/themes';
import { toast } from 'sonner';
import { LucideInfo } from 'lucide-react';

const TipTextList = styled.div`
  margin-top: 32px;
  h3 {
    font-weight: 700;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-title-1, #f7fafc);
    margin-top: 0;
    margin-bottom: 8px;
  }
  p {
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-body, #d3d8e0);
    margin: 0;
  }
  section + section {
    margin-top: 16px;
  }
`;

const ImportPrivateKey = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [importedAccountsLength, setImportedAccountsLength] = useState<number>(
    0
  );
  const isWide = useMedia('(min-width: 401px)');
  const [error, setError] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');

  const { show, contextHolder } = useRepeatImportConfirm();
  const [run, loading] = useWalletRequest(wallet.importPrivateKey, {
    onSuccess(accounts) {
      const successShowAccounts = accounts.map((item, index) => {
        return { ...item, index: index + 1 };
      });
      clearClipboard();
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts: successShowAccounts,
          title: t('page.newAddress.importedSuccessfully'),
          editing: true,
          importedAccount: true,
          importedLength: importedAccountsLength,
        },
      });
    },
    onError(err) {
      if (err.message?.includes?.('DuplicateAccountError')) {
        const address = safeJSONParse(err.message)?.address;
        show({
          address,
          type: KEYRING_CLASS.PRIVATE_KEY,
        });
      } else {
        setError(
          err?.message || t('page.newAddress.privateKey.notAValidPrivateKey')
        );
        form.setFields([
          {
            name: 'key',
            errors: [
              err?.message ||
                t('page.newAddress.privateKey.notAValidPrivateKey'),
            ],
          },
        ]);
      }
    },
  });

  useEffect(() => {
    (async () => {
      const importedAccounts = await wallet.getTypedAccounts(
        KEYRING_TYPE.SimpleKeyring
      );
      setImportedAccountsLength(importedAccounts.length);
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache && cache.path === history.location.pathname) {
          form.setFieldsValue(cache.states);
        }
      }
    })();

    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <>
      {contextHolder}
      <PageContainer>
        <PageHeader>
          <PageHeading>{t('page.newAddress.importPrivateKey')}</PageHeading>
        </PageHeader>

        <PageBody>
          <Flex direction={'column'} gap={'4'}>
            <Flex direction={'column'} gap={'2'} my={'3'}>
              <Section size={'1'}>
                <Heading size={'4'}>Your Private Key is</Heading>
                <Text size={'3'}>
                  {t('page.newAddress.privateKey.whatIsAPrivateKey.answer')}
                </Text>
              </Section>

              <Callout.Root>
                <Callout.Icon>
                  <LucideInfo size={16} />
                </Callout.Icon>
                <Callout.Text>
                  {t(
                    'page.newAddress.privateKey.isItSafeToImportItInRabby.answer'
                  )}
                </Callout.Text>
              </Callout.Root>

              {/*<section>
                <h3>
                  {t(
                    'page.newAddress.privateKey.isItSafeToImportItInRabby.question'
                  )}
                </h3>
                <p>
                  {t(
                    'page.newAddress.privateKey.isItSafeToImportItInRabby.answer'
                  )}
                </p>
              </section>
              <section>
                <h3>
                  {t(
                    'page.newAddress.privateKey.isItPossibleToImportKeystore.question'
                  )}
                </h3>
                <p>
                  <Trans
                    t={t}
                    i18nKey="page.newAddress.privateKey.isItPossibleToImportKeystore.answer"
                  >
                    Yes, you can
                    <a
                      className="underline text-r-blue-default cursor-pointer"
                      onClick={() => history.push('/import/json')}
                    >
                      import KeyStore
                    </a>
                    here.
                  </Trans>
                </p>
              </section>*/}
            </Flex>

            <TextField.Root
              autoFocus
              className={'h-[56px]'}
              size={'3'}
              spellCheck={false}
              type={'password'}
              placeholder={t('page.newAddress.privateKey.placeholder')}
              onPaste={() => {
                clearClipboard();
                toast.success(t('page.newAddress.seedPhrase.pastedAndClear'));
              }}
              onChange={(e) => setPrivateKey(e.target.value)}
            ></TextField.Root>
          </Flex>
        </PageBody>

        <Flex direction={'column'} p={'2'}>
          <Button
            highContrast
            disabled={!privateKey.trim()}
            size={'3'}
            onClick={() => run(privateKey)}
          >
            {t('global.confirm')}
          </Button>
        </Flex>
      </PageContainer>

      {/*<StrayPageWithButton
        custom={isWide}
        spinning={loading}
        form={form}
        onSubmit={({ key }) => run(key)}
        hasBack={false}
        hasDivider
        noPadding
        className={clsx(isWide && 'rabby-stray-page')}
        NextButtonContent={t('global.confirm')}
        formProps={{
          onValuesChange: (states) => {
            wallet.setPageStateCache({
              path: '/import/key',
              params: {},
              states,
            });
          },
        }}
        onBackClick={() => {
          if (history.length > 1) {
            history.goBack();
          } else {
            history.replace('/');
          }
        }}
        backDisabled={false}
      >
        <Navbar
          onBack={() => {
            if (history.length > 1) {
              history.goBack();
            } else {
              history.replace('/');
            }
          }}
        >
          {t('page.newAddress.importPrivateKey')}
        </Navbar>
        <div className="rabby-container widget-has-ant-input">
          <div className="px-20 pt-24">
            <Form.Item
              name="key"
              rules={[
                {
                  required: true,
                  message: t('page.newAddress.privateKey.required'),
                },
              ]}
            >
              <Input
                className={'h-[52px] p-16 border-bright-on-active'}
                placeholder={t('page.newAddress.privateKey.placeholder')}
                autoFocus
                spellCheck={false}
                type="password"
                onPaste={() => {
                  clearClipboard();
                  message.success({
                    icon: (
                      <img src={IconSuccess} className="icon icon-success" />
                    ),
                    content: t('page.newAddress.seedPhrase.pastedAndClear'),
                    duration: 2,
                  });
                }}
              />
            </Form.Item>
            <TipTextList className="mt-32">
              <section>
                <h3>
                  {t('page.newAddress.privateKey.whatIsAPrivateKey.question')}
                </h3>
                <p>
                  {t('page.newAddress.privateKey.whatIsAPrivateKey.answer')}
                </p>
              </section>
              <section>
                <h3>
                  {t(
                    'page.newAddress.privateKey.isItSafeToImportItInRabby.question'
                  )}
                </h3>
                <p>
                  {t(
                    'page.newAddress.privateKey.isItSafeToImportItInRabby.answer'
                  )}
                </p>
              </section>
              <section>
                <h3>
                  {t(
                    'page.newAddress.privateKey.isItPossibleToImportKeystore.question'
                  )}
                </h3>
                <p>
                  <Trans
                    t={t}
                    i18nKey="page.newAddress.privateKey.isItPossibleToImportKeystore.answer"
                  >
                    Yes, you can
                    <a
                      className="underline text-r-blue-default cursor-pointer"
                      onClick={() => history.push('/import/json')}
                    >
                      import KeyStore
                    </a>
                    here.
                  </Trans>
                </p>
              </section>
            </TipTextList>
          </div>
        </div>
      </StrayPageWithButton>*/}
    </>
  );
};

export default ImportPrivateKey;
