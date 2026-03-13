import React from 'react';
import { Button, Form, Input, message } from 'antd';
import clsx from 'clsx';
import styled from 'styled-components';
import { useMemoizedFn } from 'ahooks';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KEYRING_CLASS } from 'consts';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { clearClipboard } from '@/ui/utils/clipboard';
import { connectStore, useRabbyDispatch } from '@/ui/store';
import { PageHeader } from '@/ui/component';
import PillsSwitch from '@/ui/component/PillsSwitch';
import { useRepeatImportConfirm } from '@/ui/utils/useRepeatImportConfirm';
import { safeJSONParse } from '@/utils';
import { useWallet } from '@/ui/utils';
import { openInternalPageInTab } from '@/ui/utils/webapi';
import IconSuccess from 'ui/assets/success.svg';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { useCreateAddressActions } from './useCreateAddress';
import { RcBulkImportArrowCC } from '@/ui/assets/add-address';
import { privateKeyToAddress } from 'viem/accounts';
import { ellipsisAddress } from '@/ui/utils/address';

type ImportTab = 'privateKey' | 'seedPhrase';

type RouteState = {
  tab?: ImportTab;
};

type ImportFormValues = {
  privateKey: string;
  seedPhrase: string;
  passphrase: string;
};

const FormItemWrapper = styled.div`
  .mnemonics-with-error,
  .ant-form-item-has-error {
    .ant-form-item-control-input
      + .ant-form-item-explain.ant-form-item-explain-error {
      display: none;
    }
  }
`;

const getTabTitleKey = (tab: ImportTab) =>
  tab === 'privateKey'
    ? 'page.newAddress.importPrivateKey'
    : 'page.newAddress.importSeedPhrase';

const getTabPlaceholder = (tab: ImportTab, t: (key: string) => string) =>
  tab === 'privateKey'
    ? t('page.newAddress.privateKey.placeholder')
    : t('page.newAddress.importSeedPhrase');

const defaultFormValues: ImportFormValues = {
  privateKey: '',
  seedPhrase: '',
  passphrase: '',
};

const ImportKeyOrSeed: React.FC<{
  isInModal?: boolean;
  onBack?(): void;
  onNavigate?(type: string, state?: Record<string, any>): void;
  state?: RouteState;
}> = ({ isInModal, onBack, onNavigate, state: outerState }) => {
  const history = useHistory();
  const location = useLocation<RouteState>();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const { openSuccessPage } = useCreateAddressActions({
    onNavigate,
  });
  const [form] = Form.useForm<ImportFormValues>();
  const { show, contextHolder } = useRepeatImportConfirm();

  const query = React.useMemo(() => new URLSearchParams(location.search), [
    location.search,
  ]);
  const currentTab = React.useMemo<ImportTab>(() => {
    const nextTab =
      outerState?.tab ||
      location.state?.tab ||
      (query.get('tab') as ImportTab | null);
    return nextTab === 'seedPhrase' ? 'seedPhrase' : 'privateKey';
  }, [location.state, outerState, query]);

  const [selectedTab, setSelectedTab] = React.useState<ImportTab>(currentTab);
  const [submitting, setSubmitting] = React.useState(false);
  const [formValues, setFormValues] = React.useState<ImportFormValues>(
    defaultFormValues
  );
  const [needPassphrase, setNeedPassphrase] = React.useState(false);
  const [slip39ErrorIndex, setSlip39ErrorIndex] = React.useState<number>(-1);
  const [isSlip39, setIsSlip39] = React.useState(false);
  const [slip39GroupNumber, setSlip39GroupNumber] = React.useState(1);
  const [secretShares, setSecretShares] = React.useState<string[]>([]);
  const [errMsgs, setErrMsgs] = React.useState<string[]>();
  const [pkOnPrivateKey, setPkOnPrivateKey] = React.useState('');

  React.useEffect(() => {
    setSelectedTab(currentTab);
  }, [currentTab]);

  React.useEffect(() => {
    if (!needPassphrase) {
      form.setFieldsValue({
        passphrase: '',
      });
      setFormValues((prev) => ({
        ...prev,
        passphrase: '',
      }));
    }
  }, [form, needPassphrase]);

  const syncTab = useMemoizedFn((tab: ImportTab) => {
    setSelectedTab(tab);
    setErrMsgs(undefined);
    setSlip39ErrorIndex(-1);
    if (isInModal) {
      onNavigate?.('import-key-or-seed', { tab });
      return;
    }
    history.replace({
      pathname: '/add-address/import',
      search: `?tab=${tab}`,
    });
  });

  const handleBack = useMemoizedFn(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace('/');
  });

  const openSuccess = useMemoizedFn(
    (
      addresses: {
        address: string;
        alias: string;
      }[],
      extra?: { publicKey?: string }
    ) => {
      openSuccessPage({
        addresses,
        publicKey: extra?.publicKey || '',
        title: t('page.newAddress.addressImported'),
      });
    }
  );

  const checkSubmitSlip39Mnemonics = React.useCallback(
    async (mnemonics: string) => {
      if (!isSlip39) return;
      const shares = mnemonics.split('\n').filter((v) => v);

      for (let i = 0; i < shares.length; i++) {
        try {
          await wallet.slip39DecodeMnemonic(shares[i]);
        } catch (err) {
          setSlip39ErrorIndex(i);
          throw new Error((err as Error).message);
        }
      }
    },
    [isSlip39, wallet]
  );

  const checkSlip39Mnemonics = React.useCallback(
    async (mnemonics: string) => {
      if (!isSlip39) return;
      const shares = mnemonics.split('\n').filter((v) => v);
      setSecretShares(shares);
      try {
        const groupThreshold = await wallet.slip39GetThreshold(shares);
        setSlip39GroupNumber(groupThreshold);
        form.setFieldsValue({
          seedPhrase: shares.slice(0, groupThreshold).join('\n'),
        });
      } catch (err) {
        console.log('slip39GetThreshold error', err);
      }
    },
    [form, isSlip39, wallet]
  );

  const validateMnemonic = React.useCallback(
    async (mnemonics: string) => {
      try {
        if (!isSlip39) {
          return bip39.validateMnemonic(mnemonics, wordlist);
        }
        return await wallet.validateMnemonic(mnemonics);
      } catch (err) {
        return false;
      }
    },
    [isSlip39, wallet]
  );

  const handleImportPrivateKey = useMemoizedFn(async () => {
    const privateKey = form.getFieldValue('privateKey')?.trim();
    if (!privateKey) {
      form.setFields([
        {
          name: 'privateKey',
          errors: [t('page.newAddress.privateKey.required')],
        },
      ]);
      return;
    }

    try {
      setSubmitting(true);
      const accounts = await wallet.importPrivateKey(privateKey);
      clearClipboard();
      openSuccess(
        accounts.map((item) => ({
          address: item.address,
          alias: '',
        }))
      );
    } catch (err) {
      if ((err as Error)?.message?.includes?.('DuplicateAccountError')) {
        const address = safeJSONParse((err as Error).message)?.address;
        show({
          address,
          type: KEYRING_CLASS.PRIVATE_KEY,
        });
      } else {
        form.setFields([
          {
            name: 'privateKey',
            errors: [t('page.newAddress.privateKey.notAValidPrivateKey')],
          },
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  });

  const handleImportSeedPhrase = useMemoizedFn(async () => {
    const seedPhrase = form.getFieldValue('seedPhrase');
    const passphrase = form.getFieldValue('passphrase');
    if (!seedPhrase) {
      form.setFields([
        {
          name: 'seedPhrase',
          errors: [t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck')],
        },
      ]);
      return;
    }

    try {
      setSubmitting(true);
      await checkSubmitSlip39Mnemonics(seedPhrase);

      if (!(await validateMnemonic(seedPhrase))) {
        throw new Error(t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck'));
      }

      const {
        keyringId: stashKeyringId,
        isExistedKR,
      } = await wallet.generateKeyringWithMnemonic(seedPhrase, passphrase);
      const keyring = await wallet.getKeyringByMnemonic(seedPhrase, passphrase);

      dispatch.importMnemonics.switchKeyring({
        finalMnemonics: seedPhrase,
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
      clearClipboard();

      openSuccess(
        accounts.map((item) => ({
          address: item.address,
          alias: item.alianName || '',
        })),
        {
          publicKey: keyring?.publicKey || '',
        }
      );
    } catch (err) {
      setErrMsgs([
        (err as Error)?.message ||
          t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck'),
      ]);
    } finally {
      setSubmitting(false);
    }
  });

  const handleSubmit = useMemoizedFn(async () => {
    if (selectedTab === 'privateKey') {
      await handleImportPrivateKey();
      return;
    }

    await handleImportSeedPhrase();
  });

  const tabOptions = React.useMemo(() => {
    const originTab =
      outerState?.tab ||
      location.state?.tab ||
      (query.get('tab') as ImportTab | null);
    return originTab === 'privateKey'
      ? [
          {
            key: 'privateKey',
            label: t('page.newAddress.privateKeyTab'),
          },
          {
            key: 'seedPhrase',
            label: t('page.newAddress.seedPhraseTab'),
          },
        ]
      : [
          {
            key: 'seedPhrase',
            label: t('page.newAddress.seedPhraseTab'),
          },
          {
            key: 'privateKey',
            label: t('page.newAddress.privateKeyTab'),
          },
        ];
  }, [t, location.state?.tab, outerState?.tab, query]);

  const isPrivateKeyTab = selectedTab === 'privateKey';
  const currentValue = isPrivateKeyTab
    ? formValues.privateKey
    : formValues.seedPhrase;
  const disabledButton =
    submitting ||
    !currentValue?.trim?.() ||
    (!isPrivateKeyTab && isSlip39 && secretShares.length < slip39GroupNumber);

  return (
    <>
      {contextHolder}
      <div
        className={clsx(
          'bg-r-neutral-bg-2 flex flex-col px-20 overflow-hidden',
          isInModal ? 'h-[600px]' : 'h-full min-h-full'
        )}
      >
        <PageHeader
          fixed
          className="pt-[20px]"
          forceShowBack
          onBack={handleBack}
        >
          {t(getTabTitleKey(selectedTab))}
        </PageHeader>

        <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 pt-[12px] pb-[16px]">
            <PillsSwitch
              value={selectedTab}
              onTabChange={(key) => syncTab(key as ImportTab)}
              options={tabOptions}
              className="flex bg-r-neutral-line w-full my-[0] h-[36px] p-[2px] rounded-[8px]"
              itemClassname="w-[50%] py-[7px] text-[15px] leading-[18px] font-medium rounded-[6px] text-center transition-colors"
              itemClassnameInActive="text-r-neutral-body"
              itemClassnameActive="bg-r-neutral-card-1 text-r-blue-default"
            />
          </div>

          <Form
            form={form}
            onFinish={handleSubmit}
            initialValues={defaultFormValues}
            className="min-h-0 flex flex-1 flex-col overflow-hidden"
            onValuesChange={(_, values) => {
              setFormValues(values as ImportFormValues);
              setErrMsgs(undefined);
              setSlip39ErrorIndex(-1);
              const nextPrivateKey =
                selectedTab === 'privateKey' ? values.privateKey?.trim() : '';
              if (!nextPrivateKey) {
                setPkOnPrivateKey('');
              } else {
                try {
                  setPkOnPrivateKey(
                    privateKeyToAddress(
                      (nextPrivateKey?.startsWith('0x')
                        ? nextPrivateKey
                        : `0x${nextPrivateKey}`) as `0x${string}`
                    )
                  );
                } catch (error) {
                  setPkOnPrivateKey('');
                }
              }
              form.setFields([
                {
                  name:
                    selectedTab === 'privateKey' ? 'privateKey' : 'seedPhrase',
                  errors: [],
                },
              ]);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isPrivateKeyTab ? (
                <>
                  <Form.Item name="privateKey" className="mb-0">
                    <Input.TextArea
                      autoFocus
                      spellCheck={false}
                      autoSize={false}
                      className="h-[128px] resize-none rounded-[8px] border-r-blue-default bg-r-neutral-card-1 px-[15px] py-[18px] text-[15px] leading-[20px] text-r-neutral-title-1 placeholder:text-r-neutral-foot"
                      placeholder={getTabPlaceholder(selectedTab, t)}
                      onPaste={() => {
                        clearClipboard();
                        message.success({
                          icon: (
                            <img
                              src={IconSuccess}
                              className="icon icon-success"
                            />
                          ),
                          content: t(
                            'page.newAddress.seedPhrase.pastedAndClear'
                          ),
                          duration: 2,
                        });
                      }}
                    />
                  </Form.Item>
                  {pkOnPrivateKey ? (
                    <div className="mt-12 flex justify-between items-center text-[13px] font-medium text-r-neutral-title-1">
                      <div>{t('page.addressDetail.address')}</div>
                      <div>{ellipsisAddress(pkOnPrivateKey)}</div>
                    </div>
                  ) : null}
                </>
              ) : (
                <FormItemWrapper className="relative">
                  <Form.Item
                    name="seedPhrase"
                    className={clsx(
                      isSlip39 ? 'mb-16' : 'mb-[24px]',
                      errMsgs?.length && 'mnemonics-with-error'
                    )}
                  >
                    <WordsMatrix.MnemonicsInputs
                      compact
                      slip39GroupNumber={slip39GroupNumber}
                      isSlip39={isSlip39}
                      onSlip39Change={setIsSlip39}
                      onPassphrase={setNeedPassphrase}
                      errMsgs={errMsgs}
                      onChange={checkSlip39Mnemonics}
                      setSlip39GroupNumber={setSlip39GroupNumber}
                      errorIndexes={[slip39ErrorIndex]}
                    />
                  </Form.Item>
                  {needPassphrase ? (
                    <Form.Item name="passphrase" className="mb-[12px]">
                      <Input
                        type="password"
                        className={clsx(
                          isSlip39 ? 'h-[56px] text-15' : 'h-[44px]',
                          'border-rabby-neutral-line bg-rabby-neutral-card-1 focus:border-blue text-r-neutral-title-1'
                        )}
                        spellCheck={false}
                        placeholder={t('page.newAddress.seedPhrase.passphrase')}
                      />
                    </Form.Item>
                  ) : null}
                </FormItemWrapper>
              )}

              {isPrivateKeyTab && !pkOnPrivateKey ? (
                <button
                  type="button"
                  className="mx-auto mt-[20px] flex items-center text-[12px] leading-[14px] text-r-neutral-foot"
                  onClick={() => {
                    openInternalPageInTab(
                      'add-address/bulk-import-private-key'
                    );
                    if (isInModal) {
                      onNavigate?.('done');
                    }
                  }}
                >
                  <span>{t('page.newAddress.bulkImportPrivateKey')}</span>
                  <RcBulkImportArrowCC className="ml-[2px] h-[14px] w-[14px]" />
                </button>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-rabby-neutral-line pb-[18px] pt-[18px]">
              <Button
                htmlType="submit"
                type="primary"
                size="large"
                disabled={disabledButton}
                className="h-[44px] w-full rounded-[6px] text-[15px] leading-[18px] font-medium"
                // onClick={handleSubmit}
              >
                {t('global.confirm')}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </>
  );
};

export default connectStore()(ImportKeyOrSeed);
