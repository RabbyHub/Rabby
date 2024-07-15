import React, { useEffect } from 'react';
import { Button, Form, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import clsx from 'clsx';
import { getUiType, useWallet, useWalletRequest } from '@/ui/utils';
import { clearClipboard } from '@/ui/utils/clipboard';
import { connectStore, useRabbyDispatch } from '../../store';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { ReactComponent as RcIconMnemonicInkCC } from '@/ui/assets/walletlogo/mnemonic-ink-cc.svg';
import LogoSVG from '@/ui/assets/logo.svg';
import { KEYRING_CLASS } from '@/constant';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

const FormItemWrapper = styled.div`
  .mnemonics-with-error,
  .ant-form-item-has-error {
    .ant-form-item-control-input
      + .ant-form-item-explain.ant-form-item-explain-error {
      display: none;
    }
  }
`;

const TipTextList = styled.div`
  margin-top: 32px;
  h3 {
    font-weight: 700;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-title-1);
    margin-top: 0;
    margin-bottom: 8px;
  }
  p {
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-body);
    margin: 0;
  }
  section + section {
    margin-top: 24px;
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
      keyringId = stashKeyringId;
    },
    {
      onSuccess() {
        setErrMsgs([]);
        clearClipboard();
        history.push({
          pathname: '/import/select-address',
          state: {
            keyring: KEYRING_CLASS.MNEMONIC,
            keyringId,
          },
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
    <main className="w-screen h-screen bg-r-neutral-bg-2">
      <div className={clsx('mx-auto pt-[58px]', 'w-[600px]')}>
        <img src={LogoSVG} alt="Rabby" className="mb-[12px]" />
        <Form
          form={form}
          className={clsx(
            'px-[100px] pt-[36px] pb-[40px]',
            'bg-r-neutral-card-1 rounded-[12px]'
          )}
          onFinish={({ mnemonics, passphrase }) => run(mnemonics, passphrase)}
          onValuesChange={(states) => {
            setErrMsgs([]);
            setSlip39ErrorIndex(-1);
            wallet.setPageStateCache({
              path: history.location.pathname,
              params: {},
              states,
            });
          }}
        >
          <h1
            className={clsx(
              'flex items-center justify-center',
              'space-x-[16px] mb-[24px]',
              'text-[20px] text-r-neutral-title-1'
            )}
          >
            <ThemeIcon
              className="w-[24px] text-r-neutral-body"
              src={RcIconMnemonicInkCC}
              viewBox="0 0 32 32"
            />
            <span>{t('page.newAddress.importSeedPhrase')}</span>
          </h1>
          <div>
            <FormItemWrapper className="relative">
              <Form.Item
                name="mnemonics"
                className={clsx(
                  'mb-[24px]',
                  errMsgs?.length && 'mnemonics-with-error'
                )}
              >
                <WordsMatrix.MnemonicsInputs
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
            <TipTextList>
              <section>
                <h3>
                  {t('page.newAddress.seedPhrase.whatIsASeedPhrase.question')}
                </h3>
                <p>
                  {t('page.newAddress.seedPhrase.whatIsASeedPhrase.answer')}
                </p>
              </section>
              <section>
                <h3>
                  {t(
                    'page.newAddress.seedPhrase.isItSafeToImportItInRabby.question'
                  )}
                </h3>
                <p className="whitespace-nowrap">
                  {t(
                    'page.newAddress.seedPhrase.isItSafeToImportItInRabby.answer'
                  )}
                </p>
              </section>
            </TipTextList>
          </div>
          <div className="text-center">
            <Button
              htmlType="submit"
              type="primary"
              className="h-[44px] mt-[40px]"
              block
              disabled={disabledButton}
            >
              {t('global.confirm')}
            </Button>
          </div>
        </Form>
      </div>
    </main>
  );
};

export default connectStore()(ImportMnemonics);
