import React, { useEffect, useState } from 'react';
// import { Button, Form, Input } from 'antd';
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
import {
  CardBody,
  CardContainer,
  CardHeader,
  CardHeading,
} from 'ui/component/CardContainer';
import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import { Form } from 'radix-ui';

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
  // const [form] = Form.useForm<IFormStates>();
  const [formStates, setFormStates] = useState<IFormStates>({
    mnemonics: '',
    passphrase: '',
  });
  const [isError, setIsError] = useState<boolean>(false);
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
        // form.setFields([
        //   {
        //     name: 'mnemonics',
        //     value: form.getFieldValue('mnemonics'),
        //   },
        // ]);

        setFormStates((prev) => ({
          ...prev,
          passphrase: '',
        }));
        setIsError(true);

        setErrMsgs([
          err?.message ||
            t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck'),
        ]);
      },
    }
  );

  const handleCreateSeedPhrase = React.useCallback(() => {
    run(formStates.mnemonics, formStates.passphrase);
  }, [run, formStates]);

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
          // form.setFieldsValue({
          //   ...cache.states,
          //   mnemonics: '',
          //   passphrase: '',
          // });

          setFormStates({
            ...formStates,
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
      // form.setFieldsValue({
      //   passphrase: '',
      // });

      setFormStates({
        ...formStates,
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
        // form.setFieldsValue({
        //   mnemonics: _secretShares.slice(0, groupThreshold).join('\n'),
        // });

        setFormStates({
          ...formStates,
          mnemonics: _secretShares.slice(0, groupThreshold).join('\n'),
        });
      } catch (err) {
        console.log('slip39GetThreshold error', err);
      }
    },
    [isSlip39]
  );

  const handleMnemonicsChange = React.useCallback(
    (mnemonics: string) => {
      // setMnemonics(mnemonics);
      setFormStates({
        ...formStates,
        mnemonics,
      });
      checkSlip39Mnemonics(mnemonics);
    },
    [checkSlip39Mnemonics, formStates]
  );

  const [errMsgs, setErrMsgs] = React.useState<string[]>();

  const disabledButton = React.useMemo(() => {
    if (!isSlip39) return;
    return secretShares.length < slip39GroupNumber;
  }, [isSlip39, secretShares, slip39GroupNumber]);

  return (
    <>
      <CardContainer>
        <CardHeader
          showBackButton={false}
          onPress={() => {
            if (history.length) {
              history.goBack();
            } else {
              history.replace('/new-user/import-list');
            }
          }}
        >
          <CardHeading center>
            {t('page.newUserImport.importSeedPhrase.title')}
          </CardHeading>
        </CardHeader>
        <CardBody>
          <Flex
            direction={'column'}
            justify={'between'}
            gap={'6'}
            width={'100%'}
            height={'100%'}
          >
            <Form.Root className={'space-y-8'}>
              <Flex
                direction={'column'}
                gapY={'4'}
                // style={{ backgroundColor: 'blue' }}
              >
                <Form.Field
                  className={clsx(
                    // 'pt-5 grid bg-orange-500',
                    // isSlip39 ? 'mb-16' : 'mb-[24px]',
                    errMsgs?.length && 'mnemonics-with-error'
                  )}
                  name="mnemonics"
                  // style={{ backgroundColor: 'green' }}
                >
                  <WordsMatrix.MnemonicsInputs
                    newUserImport
                    slip39GroupNumber={slip39GroupNumber}
                    isSlip39={isSlip39}
                    onSlip39Change={setIsSlip39}
                    onPassphrase={onPassphrase}
                    errMsgs={errMsgs}
                    // onChange={checkSlip39Mnemonics}
                    onChange={handleMnemonicsChange}
                    setSlip39GroupNumber={setSlip39GroupNumber}
                    errorIndexes={[slip39ErrorIndex]}
                  />
                </Form.Field>
                {needPassphrase && (
                  <Form.Field name="passphrase" className={clsx('mb-[12px]')}>
                    {/*<Input
                    type="password"
                    className={clsx(
                      isSlip39 ? 'h-[56px] text-15' : 'h-[44px]',
                      'border-rabby-neutral-line bg-rabby-neutral-card-1 focus:border-blue'
                    )}
                    spellCheck={false}
                    placeholder={t('page.newAddress.seedPhrase.passphrase')}
                  />*/}
                    <TextField.Root
                      type={'password'}
                      className={clsx(
                        isSlip39 ? 'h-[56px] text-15' : 'h-[44px]',
                        'border-rabby-neutral-line bg-rabby-neutral-card-1 focus:border-blue',
                        'h-[56px] !rounded-3xl'
                      )}
                      spellCheck={false}
                      placeholder={t('page.newAddress.seedPhrase.passphrase')}
                      radius={'large'}
                      // onChange={handlePrivateKeyChange}
                    >
                      <TextField.Slot>
                        {/*<MagnifyingGlassIcon height="16" width="16" />*/}
                      </TextField.Slot>
                    </TextField.Root>
                  </Form.Field>
                )}
                {isError && (
                  <Text size={'2'} color={'red'}>
                    {'Invalid Private Key' || t('global.InvalidInput')}
                  </Text>
                )}
              </Flex>
            </Form.Root>

            <Text size={'2'} color={'grass'}>
              {formStates.mnemonics}
            </Text>

            <Button
              type={'button'}
              highContrast
              size={'4'}
              // htmlType="submit"
              disabled={
                !formStates.mnemonics
                // !formStates.passphrase ||
                // disabledButton
              }
              onClick={handleCreateSeedPhrase}
              // block
              // type="primary"
              // className={clsx(
              //   'mt-auto h-[56px] shadow-none rounded-[8px]',
              //   'text-[17px] font-medium'
              // )}
            >
              {t('global.confirm')}
            </Button>
          </Flex>
        </CardBody>
      </CardContainer>

      {/*<main className="w-screen h-screen bg-r-neutral-bg-2 flex items-center">
        <div className="mx-auto w-[600px]">
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
                    isSlip39 ? 'mb-16' : 'mb-[24px]',
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
                        isSlip39 ? 'h-[56px] text-15' : 'h-[44px]',
                        'border-solid border-rabby-neutral-line bg-rabby-neutral-card-1 focus:border-blue'
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
      </main>*/}
    </>
  );
};

export default connectStore()(ImportMnemonics);
