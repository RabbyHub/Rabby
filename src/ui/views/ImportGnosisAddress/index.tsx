import { LoadingOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Form, Input } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { KEYRING_TYPE, WALLET_BRAND_CATEGORY } from 'consts';
import { isValidAddress } from 'ethereumjs-util';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconBack from 'ui/assets/icon-back.svg';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import { useWallet } from 'ui/utils';
import './style.less';

const ImportGnosisAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();

  const [errorMessage, setErrorMessage] = useState('');

  const [form] = useForm();
  const { data: chainList, runAsync, error, loading } = useRequest(
    async (address: string) => {
      const res = await wallet.fetchGnosisChainList(address);
      if (!res.length) {
        throw new Error('This address is not a valid safe address');
      }
      return res;
    },
    {
      manual: true,
      debounceWait: 500,
      onBefore() {
        form.setFields([
          {
            name: ['address'],
            errors: [],
          },
        ]);
      },
      onError(e) {
        setErrorMessage(e.message);
      },
      onSuccess() {
        setErrorMessage('');
      },
    }
  );

  const { runAsync: handleNext } = useRequest(wallet.importGnosisAddress, {
    manual: true,
    async onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          title: t('Added successfully'),
          editing: true,
          importedAccount: true,
          importedLength: (
            await wallet.getTypedAccounts(KEYRING_TYPE.GnosisKeyring)
          )?.[0]?.accounts?.length,
          supportChainList: chainList,
        },
      });
    },
    onError(err) {
      setErrorMessage(err?.message || t('Not a valid address'));
    },
  });

  return (
    <div className="import-gnosis h-full relative">
      <header className="header h-[180px] relative">
        <div className="rabby-container pt-[40px]">
          <img
            src={IconBack}
            className="mb-0 absolute z-10 top-[20px] left-[20px] cursor-pointer"
            onClick={() => {
              history.goBack();
              sessionStorage.setItem(
                'SELECTED_WALLET_TYPE',
                WALLET_BRAND_CATEGORY.INSTITUTIONAL
              );
            }}
          />
          <img
            className="unlock-logo w-[60px] h-[60px] mb-[16px] mx-auto"
            src={IconGnosis}
          />
          <p className="text-[17px] leading-[20px] mt-0 text-white text-center font-bold">
            {t('Add Safe address')}
          </p>
        </div>
      </header>
      <div className="rabby-container">
        <div className="relative p-20">
          <Form form={form}>
            <Form.Item
              name="address"
              className="mb-0"
              validateStatus={errorMessage ? 'error' : undefined}
            >
              <Input
                size="large"
                autoFocus
                placeholder={t('Please input address')}
                autoComplete="off"
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setErrorMessage('Please input address');
                    return;
                  }
                  if (!isValidAddress(value)) {
                    setErrorMessage(t('Not a valid address'));
                    return;
                  }
                  runAsync(e.target.value);
                }}
              />
            </Form.Item>
          </Form>
          {loading ? (
            <div className="loading">
              <LoadingOutlined /> Searching the deployed chain of this address
            </div>
          ) : (
            <>
              {errorMessage ? (
                <div className="error">{errorMessage}</div>
              ) : (
                !!chainList?.length && (
                  <div className="chain-list-container">
                    <div className="desc">
                      This address was found deployed on {chainList?.length}{' '}
                      chains
                    </div>
                    <div className="chain-list">
                      {chainList?.map((chain) => {
                        return (
                          <div className="chain-list-item" key={chain.id}>
                            <img
                              src={chain.logo}
                              alt=""
                              className="chain-logo"
                            />
                            {chain.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
      <footer className="footer fixed bottom-0 left-0 right-0 p-[20px]">
        <Button
          type="primary"
          size="large"
          className="w-[152px] h-[42px]"
          disabled={loading || !!errorMessage || !chainList?.length}
          onClick={() =>
            handleNext(
              form.getFieldValue('address'),
              (chainList || []).map((chain) => chain.network)
            )
          }
        >
          Next
        </Button>
      </footer>
    </div>
  );
};

export default ImportGnosisAddress;
