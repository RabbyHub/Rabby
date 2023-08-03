import React, { useEffect, useState } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { KEYRING_TYPE } from 'consts';

import { Navbar, StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { clearClipboard } from 'ui/utils/clipboard';
import { useMedia } from 'react-use';
import clsx from 'clsx';

const TipTextList = styled.div`
  margin-top: 32px;
  h3 {
    font-weight: 700;
    font-size: 13px;
    line-height: 15px;
    color: #13141a;
    margin-top: 0;
    margin-bottom: 8px;
  }
  p {
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: #4b4d59;
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
          title: t('Imported Successfully'),
          editing: true,
          importedAccount: true,
          importedLength: importedAccountsLength,
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'key',
          errors: [err?.message || t('Not a valid private key')],
        },
      ]);
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
      <StrayPageWithButton
        custom={isWide}
        spinning={loading}
        form={form}
        onSubmit={({ key }) => run(key)}
        hasBack={false}
        hasDivider
        noPadding
        className={clsx(isWide && 'rabby-stray-page')}
        NextButtonContent="Confirm"
        formProps={{
          onValuesChange: (states) => {
            wallet.setPageStateCache({
              path: history.location.pathname,
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
          Import Private Key
        </Navbar>
        <div className="rabby-container">
          <div className="px-20 pt-24">
            <Form.Item
              name="key"
              rules={[
                { required: true, message: t('Please input Private key') },
              ]}
            >
              <Input
                className={'h-[52px] p-16'}
                placeholder={t('Enter your Private key')}
                autoFocus
                spellCheck={false}
                type="password"
              />
            </Form.Item>
            <TipTextList className="mt-32">
              <section>
                <h3>What is a private key?</h3>
                <p>
                  A string of letters and numbers used to control your assets.
                </p>
              </section>
              <section>
                <h3>Is it safe to import it in Rabby?</h3>
                <p>
                  Yes, it will be stored locally on your browser and only
                  accessible to you.{' '}
                </p>
              </section>
              <section>
                <h3>Is it possible to import KeyStore?</h3>
                <p>
                  Yes, you can{' '}
                  <a
                    className="underline text-blue-light cursor-pointer"
                    onClick={() => history.push('/import/json')}
                  >
                    import KeyStore
                  </a>{' '}
                  here.
                </p>
              </section>
            </TipTextList>
          </div>
        </div>
      </StrayPageWithButton>
    </>
  );
};

export default ImportPrivateKey;
