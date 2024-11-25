import { Card } from '@/ui/component/NewUserImport';
import { useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';
import { useMemoizedFn, useMount, useRequest } from 'ahooks';
import { Button, Form, Input } from 'antd';
import clsx from 'clsx';
import { isValidAddress } from 'ethereumjs-util';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { GnosisChainList } from './GnosisChainList';

const Container = styled.div`
  .ant-input {
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #e0e5ec);
    color: var(--r-neutral-title1, #192945);
    font-size: 15px;
    font-weight: 500;
    line-height: 18px;

    &::placeholder {
      color: var(--r-neutral-foot, #6a7587);
      font-weight: 400;
    }
  }

  .ant-input:focus,
  .ant-input-focused {
    border-color: var(--r-blue-default, #7084ff);
  }

  .ant-form-item-has-error .ant-input {
    border: 1px solid var(--r-red-default, #e34935);
  }

  .ant-form-item-explain {
    display: none !important;
  }
  .error {
    margin-top: 12px;
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-red-default, #e34935);
  }
  .loading {
    margin-top: 20px;
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-body, #3e495e);
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

export const NewUserImportGnosisAddress = () => {
  const { t } = useTranslation();
  const { store, setStore, clearStore } = useNewUserGuideStore();

  const history = useHistory();
  const wallet = useWallet();

  const [errorMessage, setErrorMessage] = useState('');

  const [form] = Form.useForm<{ address: string }>();
  const { data: chainList, runAsync, loading } = useRequest(
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

  const handleNext = useMemoizedFn(() => {
    const { address } = form.getFieldsValue();

    setStore({
      gnosis: {
        address,
        chainList: chainList || [],
      },
    });
    history.push('/new-user/import/gnosis-address/set-password');
  });

  useMount(() => {
    if (store.gnosis?.address) {
      runAsync(store.gnosis?.address);
    }
  });

  return (
    <Container>
      <Card
        onBack={() => {
          history.goBack();
          clearStore();
        }}
        step={1}
        className="flex flex-col"
      >
        <div className="flex-1 mt-[18px]">
          <div className="text-r-neutral-title1 text-center text-[20px] font-semibold leading-[24px]">
            {t('page.newUserImport.importSafe.title')}
          </div>
          <div className="relative mt-[20px]">
            <Form
              form={form}
              initialValues={{
                address: store.gnosis?.address,
              }}
              onValuesChange={(changedValues) => {
                const value = changedValues.address;
                if (!value) {
                  setErrorMessage(
                    t('page.newUserImport.importSafe.error.required')
                  );
                  return;
                }
                if (!isValidAddress(value)) {
                  setErrorMessage(
                    t('page.newUserImport.importSafe.error.invalid')
                  );
                  return;
                }
                runAsync(value);
              }}
            >
              <Form.Item
                name="address"
                className="mb-0"
                validateStatus={errorMessage ? 'error' : undefined}
                getValueFromEvent={(e) => {
                  const value = e.target.value;
                  if (
                    value.includes(':') &&
                    isValidAddress(value.split(':')[1])
                  ) {
                    return value.split(':')[1];
                  }
                  return value;
                }}
              >
                <Input.TextArea
                  className="leading-normal h-[100px]"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoSize
                  size="large"
                  autoFocus
                  placeholder={t('page.newUserImport.importSafe.placeholder')}
                  autoComplete="off"
                />
              </Form.Item>
            </Form>
            {loading ? (
              <div className="loading">
                <LoadingOutlined /> {t('page.newUserImport.importSafe.loading')}
              </div>
            ) : (
              <>
                {errorMessage ? (
                  <div className="error">{errorMessage}</div>
                ) : (
                  <GnosisChainList
                    chainList={chainList}
                    className="mt-[20px]"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <Button
          onClick={handleNext}
          disabled={!!errorMessage || loading || !chainList?.length}
          block
          type="primary"
          className={clsx(
            'mt-[48px] h-[56px] shadow-none rounded-[8px]',
            'text-[17px] font-medium'
          )}
        >
          {t('global.next')}
        </Button>
      </Card>
    </Container>
  );
};
