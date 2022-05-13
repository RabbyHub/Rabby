import React, { useState, useEffect, useRef } from 'react';
import * as Sentry from '@sentry/browser';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { Input, Form, message, Button } from 'antd';
import { isValidAddress } from 'ethereumjs-util';
import { providers } from 'ethers';
import {
  CHAINS,
  KEYRING_PURPLE_LOGOS,
  KEYRING_CLASS,
  CHAINS_ENUM,
} from 'consts';
import { Account } from 'background/service/preference';
import { NFTItem } from '@/background/service/openapi';
import { UIContactBookItem } from 'background/service/contactBook';
import { useWallet } from 'ui/utils';
import { getTokenName } from 'ui/utils/token';
import AccountCard from '../Approval/components/AccountCard';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { PageHeader, AddressViewer } from 'ui/component';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import NumberInput from '@/ui/component/NFTNumberInput';
import NFTAvatar from 'ui/views/Dashboard/components/NFT/NFTAvatar';
import IconContact from 'ui/assets/contact.svg';
import IconEdit from 'ui/assets/edit-purple.svg';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import { SvgIconPlusPrimary, SvgIconLoading, SvgAlert } from 'ui/assets';
import './style.less';

const TOKEN_VALIDATION_STATUS = {
  PENDING: 0,
  SUCCESS: 1,
  FAILD: 2,
};

const SendNFT = () => {
  const wallet = useWallet();
  const history = useHistory();
  const { state } = useLocation<{
    nftItem: NFTItem;
  }>();
  const { t } = useTranslation();
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
  const [sendAlianName, setSendAlianName] = useState<string | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [accountType, setAccountType] = useState('');
  const [tokenValidationStatus, setTokenValidationStatus] = useState(
    TOKEN_VALIDATION_STATUS.PENDING
  );

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    new BigNumber(form.getFieldValue('amount')).isGreaterThan(0) &&
    tokenValidationStatus === TOKEN_VALIDATION_STATUS.SUCCESS;

  const handleCopyContractAddress = () => {
    const clipboard = new ClipboardJS('.transfer-nft', {
      text: function () {
        if (!nftItem) return '';
        return nftItem.contract_id;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const handleFormValuesChange = async (
    _,
    {
      to,
    }: {
      to: string;
      amount: number;
    }
  ) => {
    setShowContactInfo(!!to && isValidAddress(to));
    if (!to || !isValidAddress(to)) {
      setEditBtnDisabled(true);
    } else {
      setEditBtnDisabled(false);
    }
    const addressContact = await wallet.getContactByAddress(to);
    const alianName = await wallet.getAlianName(to.toLowerCase());
    if (addressContact || alianName) {
      setContactInfo(addressContact || { to, name: alianName });
      alianName ? setAccountType('my') : setAccountType('others');
    } else if (!addressContact && contactInfo) {
      setContactInfo(null);
      setAccountType('');
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
      params: {},
      states: {
        values: form.getFieldsValue(),
        nftItem,
      },
    });
    try {
      await wallet.transferNFT({
        to,
        amount,
        tokenId: nftItem.inner_id,
        chainServerId: nftItem.chain,
        contractId: nftItem.contract_id,
        abi: nftItem.is_erc1155 ? 'ERC1155' : 'ERC721',
      });
      window.close();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleConfirmContact = (
    data: UIContactBookItem | null,
    type: string
  ) => {
    setShowEditContactModal(false);
    setShowListContactModal(false);
    setContactInfo(data);
    setAccountType(type);
    const values = form.getFieldsValue();
    const to = data ? data.address : '';
    if (!data) return;
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
    history.replace('/');
  };

  const init = async () => {
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
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }

    setCurrentAccount(account);
  };

  const getAlianName = async () => {
    const alianName = await wallet.getAlianName(currentAccount?.address);
    setSendAlianName(alianName);
  };

  const validateNFT = async () => {
    if (!nftItem) return;
    try {
      setTokenValidationStatus(TOKEN_VALIDATION_STATUS.PENDING);
      const name = await getTokenName(
        nftItem.contract_id,
        new providers.JsonRpcProvider(CHAINS[chain!].thridPartyRPC)
      );
      if (name === nftItem.contract_name) {
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.SUCCESS);
      } else {
        Sentry.captureException(new Error('NFT validation failed'), (scope) => {
          scope.setTag('id', `${nftItem.chain}-${nftItem.contract_id}`);
          return scope;
        });
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.FAILD);
      }
    } catch (e) {
      Sentry.captureException(new Error('NFT validation failed'), (scope) => {
        scope.setTag('id', `${nftItem.chain}-${nftItem.contract_id}`);
        return scope;
      });
      setTokenValidationStatus(TOKEN_VALIDATION_STATUS.FAILD);
    }
  };

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

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
      } else {
        validateNFT();
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
          <div className="section">
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
                    {contactInfo ? (
                      <>
                        <img src={IconEdit} className="icon icon-edit" />
                        <span>{contactInfo.name}</span>
                      </>
                    ) : (
                      <>
                        <SvgIconPlusPrimary
                          className="icon icon-add"
                          fill="#8697FF"
                        />
                        <span>{t('Add contact')}</span>
                      </>
                    )}
                  </div>
                )}
                <img
                  className="icon icon-contact"
                  src={IconContact}
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
          <div className="section">
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
                  <span className="value">
                    <AddressViewer
                      address={nftItem.contract_id}
                      showArrow={false}
                    />
                    <img
                      src={IconCopy}
                      className="icon icon-copy"
                      onClick={handleCopyContractAddress}
                    />
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

          {tokenValidationStatus !== TOKEN_VALIDATION_STATUS.SUCCESS && (
            <div
              className={clsx('token-validation', {
                pending:
                  tokenValidationStatus === TOKEN_VALIDATION_STATUS.PENDING,
                faild: tokenValidationStatus === TOKEN_VALIDATION_STATUS.FAILD,
              })}
            >
              {tokenValidationStatus === TOKEN_VALIDATION_STATUS.PENDING ? (
                <>
                  <SvgIconLoading
                    className="icon icon-loading"
                    viewBox="0 0 36 36"
                  />
                  {t('Verifying token info ...')}
                </>
              ) : (
                <>
                  <SvgAlert className="icon icon-alert" viewBox="0 0 14 14" />
                  {t('Token verification failed')}
                </>
              )}
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
        </Form>
      )}
      <ContactEditModal
        visible={showEditContactModal}
        address={form.getFieldValue('to')}
        onOk={handleConfirmContact}
        accountType={accountType}
        onCancel={handleCancelEditContact}
        isEdit={!!contactInfo}
      />
      <ContactListModal
        visible={showListContactModal}
        onCancel={() => setShowListContactModal(false)}
        onOk={handleConfirmContact}
        address={form.getFieldValue('to')}
      />
    </div>
  );
};

export default SendNFT;
