import React, { useEffect, useState } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { KEYRING_TYPE } from 'consts';

import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import LessPalette from 'ui/style/var-defs';

const TipTextList = styled.ol`
  list-style-type: decimal;

  > li {
    font-weight: 400;
    color: ${LessPalette['@color-body']};
    line-height: 20px;
  }

  > li + li {
    margin-top: 4px;
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
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts: successShowAccounts,
          title: t('Created Successfully'),
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
    <StrayPageWithButton
      custom={isWide}
      spinning={loading}
      form={form}
      onSubmit={({ key }) => run(key)}
      hasBack
      hasDivider
      noPadding
      className={clsx(isWide && 'rabby-stray-page')}
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
      <header className="create-new-header import-privatekey-header h-[60px] leading-[60px] py-0">
        <h2 className="text-20 mb-0 mt-0 text-white text-center font-medium">
          {t('Import Your Private Key')}
        </h2>
      </header>
      <div className="rabby-container">
        <div className="pt-32 px-20">
          <Form.Item
            name="key"
            rules={[{ required: true, message: t('Please input Private key') }]}
          >
            <Input.TextArea
              className={'h-[128px] p-16'}
              placeholder={t('Enter your Private key')}
              autoFocus
              spellCheck={false}
            />
          </Form.Item>
          <TipTextList className="text-14 pl-20 mt-35">
            <li>
              The seed phrase you import will only be stored on the front end of
              your browser and will not be uploaded to Rabby's servers.
            </li>
            <li>
              After you uninstall Rabby or uninstall your browser, the seed
              phrase will be deleted and Rabby cannot help you recover them.
            </li>
          </TipTextList>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default ImportPrivateKey;
