import React, { useState, useEffect } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { Input, Form, Skeleton, message, Button, Tooltip } from 'antd';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import { isValidAddress, unpadHexString, addHexPrefix } from 'ethereumjs-util';
import { Contract, providers } from 'ethers';
import {
  CHAINS,
  CHAINS_ENUM,
  KEYRING_PURPLE_LOGOS,
  KEYRING_CLASS,
} from 'consts';
import { ERC721ABI, ERC1155ABI } from 'consts/abi';
import { Account } from 'background/service/preference';
import { NFTItem } from '@/background/service/openapi';
import { ContactBookItem } from 'background/service/contactBook';
import { useWallet } from 'ui/utils';
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
  const chain = Object.values(CHAINS).find(
    (item) => item.serverId === state.nftItem.chain
  )?.enum;

  if (!chain) {
    history.replace('/');
    return <></>;
  }

  const { useForm } = Form;

  const [form] = useForm<{ to: string; amount: number }>();
  const [contactInfo, setContactInfo] = useState<null | ContactBookItem>(null);
  const [sendAlianName, setSendAlianName] = useState<string | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [cacheAmount, setCacheAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(null);
  const [balanceWarn, setBalanceWarn] = useState(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [accountType, setAccountType] = useState('');
  const [amountFocus, setAmountFocus] = useState(false);
  const [tokenValidationStatus, setTokenValidationStatus] = useState(
    TOKEN_VALIDATION_STATUS.PENDING
  );

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    !balanceError &&
    new BigNumber(form.getFieldValue('amount')).isGreaterThan(0) &&
    !isLoading &&
    tokenValidationStatus === TOKEN_VALIDATION_STATUS.SUCCESS;

  const handleCopyContractAddress = () => {
    const clipboard = new ClipboardJS('.send-nft', {
      text: function () {
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
      amount,
    }: {
      to: string;
      amount: number;
    }
  ) => {
    console.log(to, amount);
    setShowContactInfo(!!to && isValidAddress(to));
    if (!to || !isValidAddress(to)) {
      setEditBtnDisabled(true);
    } else {
      setEditBtnDisabled(false);
    }
    const account = await wallet.syncGetCurrentAccount();
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
    // await wallet.setLastTimeSendToken(currentAccount!.address, currentToken);
    // await wallet.setPageStateCache({
    //   path: history.location.pathname,
    //   params: {},
    //   states: {
    //     values: form.getFieldsValue(),
    //     currentToken,
    //   },
    // });
    // wallet.sendRequest({
    //   method: 'eth_sendTransaction',
    //   params: [params],
    // });
    // window.close();
  };

  const handleConfirmContact = (data: ContactBookItem | null, type: string) => {
    setShowEditContactModal(false);
    setShowListContactModal(false);
    setContactInfo(data);
    setAccountType(type);
    setAmountFocus(true);
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
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }

    setCurrentAccount(account);

    await validateNFT();
  };

  const getAlianName = async () => {
    const alianName = await wallet.getAlianName(currentAccount?.address);
    setSendAlianName(alianName);
  };

  const validateNFT = async () => {
    setTokenValidationStatus(TOKEN_VALIDATION_STATUS.PENDING);
    const contract = new Contract(
      nftItem.contract_id,
      nftItem.is1155 ? ERC1155ABI : ERC721ABI,
      new providers.JsonRpcProvider(CHAINS[chain].thridPartyRPC)
    );
    const name = await contract.name();
    if (name === nftItem.contract_name) {
      setTokenValidationStatus(TOKEN_VALIDATION_STATUS.SUCCESS);
    } else {
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

  const { nftItem } = state;

  nftItem.is1155 = false;

  return (
    <div className="send-nft">
      <PageHeader onBack={handleClickBack} forceShowBack>
        {t('Send NFT')}
      </PageHeader>
      <Form
        form={form}
        onFinish={handleSubmit}
        initialValues={{
          to: '',
          amount: 1,
        }}
        onValuesChange={handleFormValuesChange}
      >
        <TagChainSelector value={chain} readonly />
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
                      setAmountFocus(true);
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
                <span className="value">{nftItem.collection?.name || '-'}</span>
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
                disabled={!nftItem.is1155}
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
                {t('Veriying token info ...')}
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
