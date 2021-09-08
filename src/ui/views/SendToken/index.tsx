import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Input, Form } from 'antd';
import { isValidAddress } from 'ethereumjs-util';
import { ContactBookItem } from 'background/service/contactBook';
import { useWallet } from 'ui/utils';
import AccountCard from '../Approval/components/AccountCard';
import TokenSelector from 'ui/component/TokenSelector';
import TokenWithChain from 'ui/component/TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { PageHeader } from 'ui/component';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import IconContact from 'ui/assets/contact.svg';
import IconEdit from 'ui/assets/edit-purple.svg';
import IconNormal from 'ui/assets/keyring-normal-purple.svg';
import IconHardware from 'ui/assets/hardware-purple.svg';
import IconWatch from 'ui/assets/watch-purple.svg';
import IconArrowDown from 'ui/assets/arrow-down-triangle.svg';
import { SvgIconPlusPrimary } from 'ui/assets';
import './style.less';

const SendToken = () => {
  const wallet = useWallet();
  const currentAccount = wallet.syncGetCurrentAccount()!;
  const { t } = useTranslation();
  const { useForm } = Form;
  const [form] = useForm<{ to: string; amount: string }>();
  const [contactInfo, setContactInfo] = useState<null | ContactBookItem>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [currentToken, setCurrentToken] = useState<TokenItem>({
    id: 'eth',
    chain: 'eth',
    name: 'ETH',
    symbol: 'ETH',
    display_symbol: null,
    optimized_symbol: 'ETH',
    decimals: 18,
    logo_url:
      'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
    price: 0,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    time_at: 0,
    amount: 0,
  });
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [cacheAmount, setCacheAmount] = useState('0');
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);

  const handleSubmit = (values) => {
    console.log(values);
  };

  const handleConfirmContact = (data: ContactBookItem) => {
    setShowEditContactModal(false);
    setShowListContactModal(false);
    setContactInfo(data);
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      to: data.address,
    });
    handleFormValuesChange({
      ...values,
      to: data.address,
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

  const handleFormValuesChange = ({
    to,
    amount,
  }: {
    to: string;
    amount: string;
  }) => {
    if (!to || !isValidAddress(to)) {
      setEditBtnDisabled(true);
    } else {
      setEditBtnDisabled(false);
    }
    let resultAmount = amount;
    if (!/^\d*(\.\d*)?$/.test(amount)) {
      resultAmount = cacheAmount;
    }
    form.setFieldsValue({
      to,
      amount: resultAmount,
    });
    setCacheAmount(resultAmount);
  };

  const handleCurrentTokenChange = (token: TokenItem) => {
    console.log(token);
  };

  const handleTokenSelectorClose = () => {
    setTokenSelectorVisible(false);
  };

  const handleSelectToken = () => {
    setTokenSelectorVisible(true);
  };

  const handleLoadTokens = async (q?: string) => {
    let tokens: TokenItem[] = [];
    if (q) {
      tokens = await wallet.openapi.searchToken(currentAccount.address, q);
    } else {
      tokens = await wallet.openapi.listToken(currentAccount.address);
    }
    setTokens(tokens);
    const existCurrentToken = tokens.find(
      (token) => token.id === currentToken.id
    );
    if (existCurrentToken) {
      setCurrentToken(existCurrentToken);
    }
  };

  // useEffect(() => {
  //   handleLoadTokens();
  // }, []);

  return (
    <div className="send-token">
      <PageHeader>{t('Settings')}</PageHeader>
      <Form
        form={form}
        onFinish={handleSubmit}
        onValuesChange={handleFormValuesChange}
      >
        <div className="section">
          <div className="section-title">From</div>
          <AccountCard
            icons={{
              normal: IconNormal,
              watch: IconWatch,
              hardware: IconHardware,
            }}
          />
        </div>
        <div className="section">
          <div className="section-title">
            <span className="section-title__to">To</span>
            <div className="flex flex-1 justify-end items-center">
              <div
                className={clsx('contact-info', { disabled: editBtnDisabled })}
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
              <Input placeholder={t('Enter the address')} />
            </Form.Item>
          </div>
        </div>
        <div className="section">
          <div className="section-title">
            {t('Blance')}: {currentToken.amount}
          </div>
          <div className="token-input">
            <div className="left" onClick={handleSelectToken}>
              <TokenWithChain token={currentToken} />
              <span className="token-input__symbol">{currentToken.symbol}</span>
              <img src={IconArrowDown} className="icon icon-arrow-down" />
            </div>
            <div className="right">
              <Form.Item name="amount">
                <Input />
              </Form.Item>
            </div>
            <TokenSelector
              visible={tokenSelectorVisible}
              list={tokens}
              onConfirm={handleCurrentTokenChange}
              onCancel={handleTokenSelectorClose}
              onSearch={handleLoadTokens}
            />
          </div>
        </div>
      </Form>
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
        address={form.getFieldValue('to')}
      />
    </div>
  );
};

export default SendToken;
