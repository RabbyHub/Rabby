import React, { useState, useEffect, useRef, useMemo } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Input, Form, message, Button } from 'antd';
import { isValidAddress } from 'ethereumjs-util';
import {
  CHAINS,
  KEYRING_PURPLE_LOGOS,
  KEYRING_CLASS,
  CHAINS_ENUM,
} from 'consts';
import { useRabbyDispatch, useRabbySelector, connectStore } from 'ui/store';
import { Account } from 'background/service/preference';
import { NFTItem } from '@/background/service/openapi';
import { UIContactBookItem } from 'background/service/contactBook';
import { useWallet, isSameAddress, openInTab } from 'ui/utils';
import AccountCard from '../Approval/components/AccountCard';
import { PageHeader, AddressViewer, Copy } from 'ui/component';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import NumberInput from '@/ui/component/NFTNumberInput';
import NFTAvatar from 'ui/views/Dashboard/components/NFT/NFTAvatar';
import IconWhitelist, {
  ReactComponent as RcIconWhitelist,
} from 'ui/assets/dashboard/whitelist.svg';
import { ReactComponent as RcIconEdit } from 'ui/assets/edit-purple.svg';
import IconContact, {
  ReactComponent as RcIconContact,
} from 'ui/assets/send-token/contact.svg';
import IconCheck, {
  ReactComponent as RcIconCheck,
} from 'ui/assets/send-token/check.svg';
import IconTemporaryGrantCheckbox, {
  ReactComponent as RcIconTemporaryGrantCheckbox,
} from 'ui/assets/send-token/temporary-grant-checkbox.svg';
import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { ReactComponent as RcIconExternal } from 'ui/assets/icon-share-currentcolor.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/icon-copy-2-currentcolor.svg';

import { findChain, findChainByEnum } from '@/utils/chain';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import AccountSearchInput from '@/ui/component/AccountSearchInput';
import { confirmAllowTransferToPromise } from '../SendToken/components/ModalConfirmAllowTransfer';
import { confirmAddToContactsModalPromise } from '../SendToken/components/ModalConfirmAddToContacts';
import { useContactAccounts } from '@/ui/hooks/useContact';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { getAddressScanLink } from '@/utils';

const SendNFT = () => {
  const wallet = useWallet();
  const history = useHistory();
  const { state } = useLocation<{
    nftItem: NFTItem;
  }>();
  const { t } = useTranslation();
  const rbisource = useRbiSource();
  const dispatch = useRabbyDispatch();

  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [nftItem, setNftItem] = useState<NFTItem | null>(
    state?.nftItem || null
  );
  const [chain, setChain] = useState<CHAINS_ENUM | undefined>(
    state?.nftItem
      ? findChain({
          serverId: state.nftItem.chain,
        })?.enum
      : undefined
  );

  const amountInputEl = useRef<any>(null);

  const { useForm } = Form;

  const [form] = useForm<{ to: string; amount: number }>();
  const [formSnapshot, setFormSnapshot] = useState(form.getFieldsValue());
  const [contactInfo, setContactInfo] = useState<null | UIContactBookItem>(
    null
  );
  const [inited, setInited] = useState(false);
  const [sendAlianName, setSendAlianName] = useState<string | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showWhitelistAlert, setShowWhitelistAlert] = useState(false);
  const [temporaryGrant, setTemporaryGrant] = useState(false);

  const { whitelist, whitelistEnabled } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
    whitelistEnabled: s.whitelist.enabled,
  }));

  const {
    getAddressNote,
    isAddrOnContactBook,
    fetchContactAccounts,
  } = useContactAccounts();

  const {
    toAddressIsValid,
    toAddressInWhitelist,
    toAddressInContactBook,
  } = useMemo(() => {
    return {
      toAddressIsValid: !!formSnapshot.to && isValidAddress(formSnapshot.to),
      toAddressInWhitelist: !!whitelist.find((item) =>
        isSameAddress(item, formSnapshot.to)
      ),
      toAddressInContactBook: !!isAddrOnContactBook(formSnapshot.to),
    };
  }, [whitelist, isAddrOnContactBook, formSnapshot]);

  const whitelistAlertContent = useMemo(() => {
    if (!whitelistEnabled) {
      return {
        content: t('page.sendNFT.whitelistAlert__disabled'),
        success: true,
      };
    }
    if (toAddressInWhitelist) {
      return {
        content: t('page.sendNFT.whitelistAlert__whitelisted'),
        success: true,
      };
    }
    if (temporaryGrant) {
      return {
        content: t('page.sendNFT.whitelistAlert__temporaryGranted'),
        success: true,
      };
    }
    return {
      success: false,
      content: (
        <>
          <Trans i18nKey="page.sendNFT.whitelistAlert__notWhitelisted" t={t}>
            The address is not whitelisted.
            <br /> I agree to grant temporary permission to transfer.
          </Trans>
        </>
      ),
    };
  }, [temporaryGrant, whitelist, toAddressInWhitelist, whitelistEnabled, t]);

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    new BigNumber(form.getFieldValue('amount')).isGreaterThan(0) &&
    (!whitelistEnabled || temporaryGrant || toAddressInWhitelist);
  const handleClickContractId = () => {
    if (!chain || !nftItem) return;
    const targetChain = findChainByEnum(chain);
    if (!targetChain) return;

    openInTab(
      getAddressScanLink(targetChain.scanLink, nftItem.contract_id),
      false
    );
  };

  const handleFormValuesChange = async (
    changedValues,
    {
      to,
    }: {
      to: string;
      amount: number;
    }
  ) => {
    if (changedValues && changedValues.to) {
      setTemporaryGrant(false);
    }
    if (!to || !isValidAddress(to)) {
      setEditBtnDisabled(true);
      setShowWhitelistAlert(false);
    } else {
      setEditBtnDisabled(false);
      setShowWhitelistAlert(true);
    }
    setFormSnapshot({ ...form.getFieldsValue(), to });
    const alianName = await wallet.getAlianName(to.toLowerCase());
    if (alianName) {
      setContactInfo({ address: to, name: alianName });
      setShowContactInfo(true);
    } else if (contactInfo) {
      setContactInfo(null);
    }
  };

  const handleSubmit = async ({
    to,
    amount,
  }: {
    to: string;
    amount: number;
  }) => {
    if (!nftItem) return;
    await wallet.setPageStateCache({
      path: history.location.pathname,
      search: history.location.search,
      params: {},
      states: {
        values: form.getFieldsValue(),
        nftItem,
      },
    });
    try {
      matomoRequestEvent({
        category: 'Send',
        action: 'createTx',
        label: [
          findChainByEnum(chain)?.name,
          getKRCategoryByType(currentAccount?.type),
          currentAccount?.brandName,
          'nft',
          filterRbiSource('sendNFT', rbisource) && rbisource,
        ].join('|'),
      });

      wallet.transferNFT(
        {
          to,
          amount,
          tokenId: nftItem.inner_id,
          chainServerId: nftItem.chain,
          contractId: nftItem.contract_id,
          abi: nftItem.is_erc1155 ? 'ERC1155' : 'ERC721',
        },
        {
          ga: {
            category: 'Send',
            source: 'sendNFT',
            trigger: filterRbiSource('sendNFT', rbisource) && rbisource,
          },
        }
      );
      window.close();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleClickAllowTransferTo = () => {
    if (!whitelistEnabled || temporaryGrant || toAddressInWhitelist) return;

    const toAddr = form.getFieldValue('to');
    confirmAllowTransferToPromise({
      wallet,
      toAddr,
      showAddToWhitelist: !!toAddressInContactBook,
      title: t('page.sendNFT.confirmModal.title'),
      cancelText: t('global.Cancel'),
      confirmText: t('global.Confirm'),
      onFinished(result) {
        dispatch.whitelist.getWhitelist();
        setTemporaryGrant(true);
      },
    });
  };

  const handleClickAddContact = () => {
    if (toAddressInContactBook) return;

    const toAddr = form.getFieldValue('to');
    confirmAddToContactsModalPromise({
      wallet,
      initAddressNote: getAddressNote(toAddr),
      addrToAdd: toAddr,
      title: 'Add to contacts',
      confirmText: 'Confirm',
      async onFinished(result) {
        await dispatch.contactBook.getContactBookAsync();
        // trigger fetch contactInfo
        const values = form.getFieldsValue();
        handleFormValuesChange(null, { ...values });
        await Promise.allSettled([
          fetchContactAccounts(),
          // trigger get balance of address
          wallet.getInMemoryAddressBalance(result.contactAddrAdded, true),
        ]);
      },
    });
  };

  const handleConfirmContact = (account: UIContactBookItem) => {
    setShowListContactModal(false);
    setShowEditContactModal(false);
    setContactInfo(account);
    const values = form.getFieldsValue();
    const to = account ? account.address : '';
    if (!account) return;
    const nextFormValues = {
      ...values,
      to,
    };
    form.setFieldsValue(nextFormValues);
    handleFormValuesChange(null, nextFormValues);
    amountInputEl.current && amountInputEl.current.focus();
  };

  const handleCancelEditContact = () => {
    setShowEditContactModal(false);
  };

  const handleListContact = () => {
    setShowListContactModal(true);
  };

  const handleEditContact = () => {
    if (editBtnDisabled) return;
    setShowEditContactModal(true);
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/');
    }
  };

  const initByCache = async () => {
    if (!nftItem) {
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache?.path === history.location.pathname) {
          if (cache.states.values) {
            form.setFieldsValue(cache.states.values);
            handleFormValuesChange(null, cache.states.values);
          }
          if (cache.states.nftItem) {
            setNftItem(cache.states.nftItem);
          }
        }
      }
    }
  };

  const init = async () => {
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
    dispatch.contactBook.getContactBookAsync();
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }

    setCurrentAccount(account);
    setInited(true);
  };

  const getAlianName = async () => {
    const alianName = await wallet.getAlianName(currentAccount?.address || '');
    setSendAlianName(alianName || '');
  };

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  useEffect(() => {
    if (inited) initByCache();
  }, [inited]);

  useEffect(() => {
    if (currentAccount) {
      getAlianName();
    }
  }, [currentAccount]);

  useEffect(() => {
    if (nftItem) {
      if (!chain) {
        const nftChain = findChain({
          serverId: nftItem.chain,
        })?.enum;
        if (!nftChain) {
          history.replace('/');
        } else {
          setChain(nftChain);
        }
      }
    }
  }, [nftItem, chain]);

  return (
    <div className="transfer-nft">
      <PageHeader onBack={handleClickBack} forceShowBack>
        {t('page.sendNFT.header.title')}
      </PageHeader>
      {nftItem && (
        <Form
          form={form}
          onFinish={handleSubmit}
          initialValues={{
            to: '',
            amount: 1,
          }}
          onValuesChange={handleFormValuesChange}
        >
          <div className="flex-1 overflow-auto">
            <div className="section relative">
              {/* {chain && <TagChainSelector value={chain!} readonly />} */}
              {chain && (
                <>
                  <div className={clsx('section-title')}>
                    {t('page.sendNFT.sectionChain.title')}
                  </div>
                  <ChainSelectorInForm value={chain} readonly />
                </>
              )}
              <div className="section-title mt-[10px]">
                {t('page.sendNFT.sectionFrom.title')}
              </div>
              <AccountCard
                icons={{
                  mnemonic: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.MNEMONIC],
                  privatekey: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.PRIVATE_KEY],
                  watch: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.WATCH],
                }}
                alianName={sendAlianName}
              />
              <div className="section-title">
                <span className="section-title__to">
                  {t('page.sendNFT.sectionTo.title')}
                </span>
                <div className="flex flex-1 justify-end items-center">
                  {showContactInfo && (
                    <div
                      className={clsx('contact-info', {
                        disabled: editBtnDisabled,
                      })}
                      onClick={handleEditContact}
                    >
                      {contactInfo && (
                        <>
                          <ThemeIcon
                            src={RcIconEdit}
                            className="icon icon-edit"
                          />
                          <span
                            title={contactInfo.name}
                            className="inline-block align-middle truncate max-w-[240px]"
                          >
                            {contactInfo.name}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <ThemeIcon
                    className="icon icon-contact"
                    src={whitelistEnabled ? RcIconWhitelist : RcIconContact}
                    onClick={handleListContact}
                  />
                </div>
              </div>
              <div className="to-address">
                <Form.Item
                  name="to"
                  rules={[
                    {
                      required: true,
                      message: t('page.sendNFT.sectionTo.addrValidator__empty'),
                    },
                    {
                      validator(_, value) {
                        if (!value) return Promise.resolve();
                        if (value && isValidAddress(value)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(
                            t('page.sendNFT.sectionTo.addrValidator__invalid')
                          )
                        );
                      },
                    },
                  ]}
                >
                  <AccountSearchInput
                    placeholder={t(
                      'page.sendNFT.sectionTo.searchInputPlaceholder'
                    )}
                    autoComplete="off"
                    autoFocus
                    spellCheck={false}
                    onSelectedAccount={(account) => {
                      const nextVals = {
                        ...form.getFieldsValue(),
                        to: account.address,
                      };
                      form.setFieldsValue(nextVals);
                      handleFormValuesChange(
                        {
                          to: nextVals.to,
                        },
                        nextVals
                      );
                    }}
                  />
                </Form.Item>
                {toAddressIsValid && !toAddressInContactBook && (
                  <div className="tip-no-contact font-normal text-[12px] text-r-neutral-body pt-[12px]">
                    {/* Not on address list.{' '} */}
                    {t('page.sendNFT.tipNotOnAddressList')}{' '}
                    <span
                      onClick={handleClickAddContact}
                      className={clsx(
                        'ml-[2px] underline cursor-pointer text-r-blue-default'
                      )}
                    >
                      {/* Add to contacts */}
                      {t('page.sendNFT.tipAddToContacts')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div
              className={clsx('section', {
                'mb-40': !showWhitelistAlert,
              })}
            >
              <div className="nft-info flex">
                <NFTAvatar
                  type={nftItem.content_type}
                  content={nftItem.content}
                  className="w-[72px] h-[72px]"
                />
                <div className="nft-info__detail">
                  <h3>{nftItem.name}</h3>
                  <p>
                    <span className="field-name">
                      {t('page.sendNFT.nftInfoFieldLabel.Collection')}
                    </span>
                    <span className="value">
                      {nftItem.collection?.name || '-'}
                    </span>
                  </p>
                  <p>
                    <span className="field-name">
                      {t('page.sendNFT.nftInfoFieldLabel.Contract')}
                    </span>
                    <span className="value gap-[4px]">
                      <AddressViewer
                        address={nftItem.contract_id}
                        showArrow={false}
                      />
                      <ThemeIcon
                        src={RcIconExternal}
                        className="icon icon-copy text-r-neutral-foot"
                        onClick={handleClickContractId}
                      />
                      <Copy
                        data={nftItem.contract_id}
                        variant="address"
                        className="text-r-neutral-foot w-14 h-14"
                      />
                    </span>
                  </p>
                </div>
              </div>
              <div className="section-footer">
                <span>{t('page.sendNFT.nftInfoFieldLabel.sendAmount')}</span>

                <Form.Item name="amount">
                  <NumberInput
                    max={nftItem.amount}
                    nftItem={nftItem}
                    disabled={!nftItem.is_erc1155}
                    ref={amountInputEl}
                  />
                </Form.Item>
              </div>
            </div>
          </div>

          <div className="footer">
            {showWhitelistAlert && (
              <div
                className={clsx(
                  'whitelist-alert',
                  !whitelistEnabled || whitelistAlertContent.success
                    ? 'granted'
                    : 'cursor-pointer'
                )}
                onClick={handleClickAllowTransferTo}
              >
                <p className="whitelist-alert__content text-center">
                  {whitelistEnabled && (
                    <ThemeIcon
                      src={
                        whitelistAlertContent.success
                          ? RcIconCheck
                          : RcIconTemporaryGrantCheckbox
                      }
                      className="icon icon-check inline-block relative -top-1"
                    />
                  )}
                  {whitelistAlertContent.content}
                </p>
              </div>
            )}
            <div className="btn-wrapper w-[100%] px-[20px] flex justify-center">
              <Button
                disabled={!canSubmit}
                type="primary"
                htmlType="submit"
                size="large"
                className="w-[100%] h-[48px]"
              >
                {t('page.sendNFT.sendButton')}
              </Button>
            </div>
          </div>
        </Form>
      )}
      <ContactEditModal
        visible={showEditContactModal}
        address={form.getFieldValue('to')}
        onOk={handleConfirmContact}
        onCancel={handleCancelEditContact}
        isEdit={!!contactInfo}
      />
      <ContactListModal
        visible={showListContactModal}
        onCancel={() => setShowListContactModal(false)}
        onOk={handleConfirmContact}
      />
    </div>
  );
};

export default connectStore()(SendNFT);
