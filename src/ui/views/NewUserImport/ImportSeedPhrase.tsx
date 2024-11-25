import React, { useEffect } from 'react';
import { Card } from '@/ui/component/NewUserImport';
import { useHistory } from 'react-router-dom';
import { Button, Form, Input } from 'antd';
import WordsMatrix from '@/ui/component/WordsMatrix';
import clsx from 'clsx';
import { useRabbyDispatch } from '@/ui/store';
import { getUiType, useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const FormItemWrapper = styled.div`
  .mnemonics-with-error,
  .ant-form-item-has-error {
    .ant-form-item-control-input
      + .ant-form-item-explain.ant-form-item-explain-error {
      display: none;
    }
  }
`;

type IFormStates = {
  mnemonics: string;
  passphrase: string;
};

export const ImportSeedPhrase = () => {
  const history = useHistory();
  const { store, setStore } = useNewUserGuideStore();

  const wallet = useWallet();
  const [form] = Form.useForm<IFormStates>();
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const [needPassphrase, setNeedPassphrase] = React.useState(false);
  const [slip39ErrorIndex, setSlip39ErrorIndex] = React.useState<number>(-1);
  const [isSlip39, setIsSlip39] = React.useState(false);
  const [slip39GroupNumber, setSlip39GroupNumber] = React.useState(1);

  let keyringId: number | null;

  const onPassphrase = React.useCallback((val: boolean) => {
    setNeedPassphrase(val);
  }, []);

  const checkSubmitSlip39Mnemonics = React.useCallback(
    async (mnemonics: string) => {
      if (!isSlip39) return;
      const secretShares = mnemonics.split('\n').filter((v) => v);

      for (let i = 0; i < secretShares.length; i++) {
        try {
          await wallet.slip39DecodeMnemonic(secretShares[i]);
        } catch (err) {
          setSlip39ErrorIndex(i);
          throw new Error(err.message);
        }
      }
    },
    [isSlip39]
  );

  // if is pop, redirect to dashboard
  if (getUiType().isPop) {
    history.replace('/dashboard');
    return null;
  }

  useEffect(() => {
    (async () => {
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache && cache.path === history.location.pathname) {
          form.setFieldsValue({
            ...cache.states,
            mnemonics: '',
            passphrase: '',
          });
        }
      }
    })();

    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  useEffect(() => {
    if (!needPassphrase) {
      form.setFieldsValue({
        passphrase: '',
      });
    }
  }, [needPassphrase]);

  const [secretShares, setSecretShares] = React.useState<string[]>([]);
  const checkSlip39Mnemonics = React.useCallback(
    async (mnemonics: string) => {
      if (!isSlip39) return;
      const _secretShares = mnemonics.split('\n').filter((v) => v);

      setSecretShares(_secretShares);
      try {
        const groupThreshold = await wallet.slip39GetThreshold(_secretShares);
        setSlip39GroupNumber(groupThreshold);
        form.setFieldsValue({
          mnemonics: _secretShares.slice(0, groupThreshold).join('\n'),
        });
      } catch (err) {
        console.log('slip39GetThreshold error', err);
      }
    },
    [isSlip39]
  );

  const [errMsgs, setErrMsgs] = React.useState<string[]>();

  const disabledButton = React.useMemo(() => {
    if (!isSlip39) return;
    return secretShares.length < slip39GroupNumber;
  }, [isSlip39, secretShares, slip39GroupNumber]);

  const validateMnemonic = React.useCallback(
    async (mnemonics: string, skipSlip39?: boolean) => {
      try {
        if (skipSlip39 && isSlip39) return true;
        if (!isSlip39) {
          return bip39.validateMnemonic(mnemonics, wordlist);
        }
        const result = await wallet.validateMnemonic(mnemonics);
        return result;
      } catch (err) {
        return false;
      }
    },
    [isSlip39]
  );

  const run = React.useCallback(
    async ({
      mnemonics,
      passphrase,
    }: {
      mnemonics: string;
      passphrase: string;
    }) => {
      try {
        await checkSubmitSlip39Mnemonics(mnemonics);

        if (!(await validateMnemonic(mnemonics))) {
          throw new Error(
            t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck')
          );
        }

        setStore({ seedPhrase: mnemonics, passphrase });
        history.push('/new-user/import/seed-phrase/set-password');
      } catch (err) {
        form.setFields([
          {
            name: 'mnemonics',
            value: form.getFieldValue('mnemonics'),
          },
        ]);
        setErrMsgs([
          err?.message ||
            t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck'),
        ]);
      }
    },
    [validateMnemonic, checkSubmitSlip39Mnemonics, setStore, form, t]
  );

  return (
    <Card
      onBack={() => {
        history.replace('/new-user/import-list');
      }}
      step={1}
      className="flex flex-col"
    >
      <div className="mt-18 mb-16 text-center text-20 font-medium text-r-neutral-title1">
        {t('page.newUserImport.importSeedPhrase.title')}
      </div>
      <Form
        form={form}
        className={clsx('flex flex-col flex-1')}
        onFinish={run}
        onValuesChange={async (states) => {
          setErrMsgs([]);
          setSlip39ErrorIndex(-1);
        }}
      >
        <FormItemWrapper className="relative mb-16">
          <Form.Item
            name="mnemonics"
            className={clsx(
              'mb-[24px]',
              errMsgs?.length && 'mnemonics-with-error'
            )}
          >
            <WordsMatrix.MnemonicsInputs
              newUserImport
              slip39GroupNumber={slip39GroupNumber}
              isSlip39={isSlip39}
              onSlip39Change={setIsSlip39}
              onPassphrase={onPassphrase}
              errMsgs={errMsgs}
              onChange={checkSlip39Mnemonics}
              setSlip39GroupNumber={setSlip39GroupNumber}
              errorIndexes={[slip39ErrorIndex]}
            />
          </Form.Item>
          {needPassphrase && (
            <Form.Item name="passphrase" className={clsx('mb-[12px]')}>
              <Input
                type="password"
                className={clsx(
                  'h-[44px] border-rabby-neutral-line bg-rabby-neutral-card-1 focus:border-blue'
                )}
                spellCheck={false}
                placeholder={t('page.newAddress.seedPhrase.passphrase')}
              />
            </Form.Item>
          )}
        </FormItemWrapper>

        <Button
          htmlType="submit"
          disabled={disabledButton}
          block
          type="primary"
          className={clsx(
            'mt-auto h-[56px] shadow-none rounded-[8px]',
            'text-[17px] font-medium'
          )}
        >
          {t('global.confirm')}
        </Button>
      </Form>
    </Card>
  );
};
