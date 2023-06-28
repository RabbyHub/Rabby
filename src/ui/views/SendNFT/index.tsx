import React, { useState, useEffect, useRef, useMemo } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
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
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { PageHeader, AddressViewer, Copy } from 'ui/component';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import NumberInput from '@/ui/component/NFTNumberInput';
import NFTAvatar from 'ui/views/Dashboard/components/NFT/NFTAvatar';
import IconWhitelist from 'ui/assets/dashboard/whitelist.svg';
import IconEdit from 'ui/assets/edit-purple.svg';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconCheck from 'ui/assets/icon-check.svg';
import IconContact from 'ui/assets/send-token/contact.svg';
import IconTemporaryGrantCheckbox from 'ui/assets/send-token/temporary-grant-checkbox.svg';
import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import IconExternal from 'ui/assets/icon-share.svg';
import { findChainByEnum } from '@/utils/chain';

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
      ? Object.values(CHAINS).find(
          (item) => item.serverId === state.nftItem.chain
        )?.enum
      : undefined
  );

  const amountInputEl = useRef<any>(null);

  const { useForm } = Form;

  const [form] = useForm<{ to: string; amount: number }>();
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
  const [toAddressInWhitelist, setToAddressInWhitelist] = useState(false);

  const { whitelist, whitelistEnabled } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
    whitelistEnabled: s.whitelist.enabled,
  }));

  const whitelistAlertContent = useMemo(() => {
    if (!whitelistEnabled) {
      return {
        content: 'Whitelist disabled. You can transfer to any address.',
        success: true,
      };
    }
    if (toAddressInWhitelist) {
      return {
        content: 'The address is whitelisted',
        success: true,
      };
    }
    if (temporaryGrant) {
      return {
        content: 'Temporary permission granted',
        success: true,
      };
    }
    return {
      success: false,
      content: (
        <>
          The address is not whitelisted.
          <br /> I agree to grant temporary permission to transfer.
        </>
      ),
    };
  }, [temporaryGrant, whitelist, toAddressInWhitelist, whitelistEnabled]);

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    new BigNumber(form.getFieldValue('amount')).isGreaterThan(0) &&
    (!whitelistEnabled || temporaryGrant || toAddressInWhitelist);
  const handleClickContractId = () => {
    if (!chain || !nftItem) return;
    const targetChain = findChainByEnum(chain);
    if (!targetChain) return;

    openInTab(
      targetChain.scanLink.replace(/tx\/_s_/, `address/${nftItem.contract_id}`),
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
      setToAddressInWhitelist(
        !!whitelist.find((item) => isSameAddress(item, to))
      );
    }
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

  const handleClickWhitelistAlert = () => {
    if (whitelistEnabled && !temporaryGrant && !toAddressInWhitelist) {
      AuthenticationModalPromise({
        title: 'Enter the Password to Confirm',
        cancelText: 'Cancel',
        wallet,
        onFinished() {
          setTemporaryGrant(true);
        },
        onCancel() {
          // do nothing
        },
      });
    }
  };

  const handleConfirmContact = (account: UIContactBookItem) => {
    setShowListContactModal(false);
    setShowEditContactModal(false);
    setContactInfo(account);
    const values = form.getFieldsValue();
    const to = account ? account.address : '';
    if (!account) return;
    form.setFieldsValue({
      ...values,
      to,
    });
    handleFormValuesChange(null, {
      ...values,
      to,
    });
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
        const nftChain = Object.values(CHAINS).find(
          (item) => item.serverId === nftItem.chain
        )?.enum;
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
        {t('Send NFT')}
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
          {chain && <TagChainSelector value={chain!} readonly />}
          <div className="section relative">
            <div className="section-title">{t('From')}</div>
            <AccountCard
              icons={{
                mnemonic: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.MNEMONIC],
                privatekey: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.PRIVATE_KEY],
                watch: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.WATCH],
              }}
              alianName={sendAlianName}
            />
            <div className="section-title">
              <span className="section-title__to">{t('To')}</span>
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
                        <img src={IconEdit} className="icon icon-edit" />
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
                <img
                  className="icon icon-contact"
                  src={whitelistEnabled ? IconWhitelist : IconContact}
                  onClick={handleListContact}
                />
              </div>
            </div>
            <div className="to-address">
              <Form.Item
                name="to"
                rules={[
                  { required: true, message: t('Please input address') },
                  {
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      if (value && isValidAddress(value)) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(t('This address is invalid'))
                      );
                    },
                  },
                ]}
              >
                <Input
                  placeholder={t('Enter the address')}
                  autoComplete="off"
                  autoFocus
                />
              </Form.Item>
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
                  <span className="field-name">Collection</span>
                  <span className="value">
                    {nftItem.collection?.name || '-'}
                  </span>
                </p>
                <p>
                  <span className="field-name">Contract</span>
                  <span className="value gap-[4px]">
                    <AddressViewer
                      address={nftItem.contract_id}
                      showArrow={false}
                    />
                    <img
                      src={IconExternal}
                      className="icon icon-copy"
                      onClick={handleClickContractId}
                    />
                    <Copy data={nftItem.contract_id} variant="address"></Copy>
                  </span>
                </p>
              </div>
            </div>
            <div className="section-footer">
              <span>Send amount</span>

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

          <footer
            className={clsx(
              'p-20',
              'fixed left-0 right-0 bottom-0',
              'border-t border-gray-divider bg-white'
            )}
          >
            {showWhitelistAlert && (
              <div
                className={clsx(
                  'whitelist-alert',
                  !whitelistEnabled || whitelistAlertContent.success
                    ? 'granted'
                    : 'cursor-pointer'
                )}
                onClick={handleClickWhitelistAlert}
              >
                <p className="whitelist-alert__content text-center">
                  {whitelistEnabled && (
                    <img
                      src={
                        whitelistAlertContent.success
                          ? IconCheck
                          : IconTemporaryGrantCheckbox
                      }
                      className="icon icon-check inline-block relative -top-1"
                    />
                  )}
                  {whitelistAlertContent.content}
                </p>
              </div>
            )}

            <div className="footer flex justify-center">
              <Button
                disabled={!canSubmit}
                type="primary"
                htmlType="submit"
                size="large"
                className="w-[200px]"
              >
                {t('Send')}
              </Button>
            </div>
          </footer>
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
