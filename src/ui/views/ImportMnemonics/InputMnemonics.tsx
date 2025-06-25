import React, { useEffect } from 'react';
import { Button, Form, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import clsx from 'clsx';
import { getUiType, useWallet, useWalletRequest } from '@/ui/utils';
import { clearClipboard } from '@/ui/utils/clipboard';
import { connectStore, useRabbyDispatch } from '../../store';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { KEYRING_CLASS } from '@/constant';
import { useTranslation } from 'react-i18next';
import { Card } from '@/ui/component/NewUserImport';

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
const ImportMnemonics = () => {
  const history = useHistory();
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

  const [run, loading] = useWalletRequest(
    async (mnemonics: string, passphrase: string) => {
      await checkSubmitSlip39Mnemonics(mnemonics);

      const {
        keyringId: stashKeyringId,
        isExistedKR,
      } = await wallet.generateKeyringWithMnemonic(mnemonics, passphrase);

      dispatch.importMnemonics.switchKeyring({
        finalMnemonics: mnemonics,
        passphrase,
        isExistedKeyring: isExistedKR,
        stashKeyringId,
      });
      const accounts = await dispatch.importMnemonics.getAccounts({
        start: 0,
        end: 1,
      });

      await dispatch.importMnemonics.setSelectedAccounts([accounts[0].address]);
      await dispatch.importMnemonics.confirmAllImportingAccountsAsync();
      keyringId = stashKeyringId;
    },
    {
      onSuccess() {
        setErrMsgs([]);
        clearClipboard();
        history.push({
          pathname: '/new-user/success',
          search: `?hd=${
            KEYRING_CLASS.MNEMONIC
          }&keyringId=${keyringId}&isCreated=${false}`,
        });
      },
      onError(err) {
        // nothing but reset form errors
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
      },
    }
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

  return (
    <Card step={1} className="flex flex-col">
      <div className="mt-18 mb-[25px] text-center text-[28px] font-semibold text-r-neutral-title1">
        {t('page.newUserImport.importSeedPhrase.title')}
      </div>
      <Form
        form={form}
        className={clsx('flex flex-col flex-1')}
        onFinish={({ mnemonics, passphrase }) => run(mnemonics, passphrase)}
        onValuesChange={() => {
          setErrMsgs([]);
          setSlip39ErrorIndex(-1);
        }}
      >
        <FormItemWrapper className="relative mb-16">
          <Form.Item
            name="mnemonics"
            className={clsx(
              isSlip39 ? 'mb-16' : 'mb-[24px]',
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
                  isSlip39 ? 'h-[56px] text-15' : 'h-[44px]',
                  'border-rabby-neutral-line bg-rabby-neutral-card-1 focus:border-blue'
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

export default connectStore()(ImportMnemonics);
