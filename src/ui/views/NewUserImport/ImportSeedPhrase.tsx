import React, { useEffect, useState } from 'react';
// import { Card } from '@/ui/component/NewUserImport';
import { useHistory } from 'react-router-dom';
// import { Button, Form, Input } from 'antd';
import WordsMatrix from '@/ui/component/WordsMatrix';
import clsx from 'clsx';
import { useRabbyDispatch } from '@/ui/store';
import { getUiType, useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
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

type IFormStates = {
  mnemonics: string;
  passphrase: string;
};

export const ImportSeedPhrase = () => {
  const history = useHistory();
  const { store, setStore } = useNewUserGuideStore();

  const wallet = useWallet();
  // const [form] = Form.useForm<IFormStates>();
  const [formStates, setFormStates] = useState<IFormStates>({
    mnemonics: '',
    passphrase: '',
  });
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const [needPassphrase, setNeedPassphrase] = React.useState(false);
  const [slip39ErrorIndex, setSlip39ErrorIndex] = React.useState<number>(-1);
  const [isSlip39, setIsSlip39] = React.useState(false);
  const [slip39GroupNumber, setSlip39GroupNumber] = React.useState(1);

  // Handle Form states and fields
  const [mnemonics, setMnemonics] = useState<string | undefined>();
  const [passphrase, setPassphrase] = useState<string | undefined>();
  const [isError, setIsError] = useState<boolean>(false);

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
      setMnemonics(mnemonics);
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
        // form.setFields([
        //   {
        //     name: 'mnemonics',
        //     value: form.getFieldValue('mnemonics'),
        //   },
        // ]);

        // Set the mnemonics from the current value in the form field
        setMnemonics(mnemonics);

        setIsError(true);
        setErrMsgs([
          err?.message ||
            t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck'),
        ]);
      }
    },
    [validateMnemonic, checkSubmitSlip39Mnemonics, setStore, formStates, t]
  );

  const handleCreateSeedPhrase = React.useCallback(() => {
    run(formStates);
  }, [run, formStates]);

  return (
    <>
      <CardContainer>
        <CardHeader
          showBackButton
          onPress={() => {
            if (history.length) {
              history.goBack();
            } else {
              history.replace('/new-user/import-list');
            }
          }}
        >
          <CardHeading>
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

      {/*<Card
        onBack={() => {
          if (history.length) {
            history.goBack();
          } else {
            history.replace('/new-user/import-list');
          }
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
      </Card>*/}
    </>
  );
};
