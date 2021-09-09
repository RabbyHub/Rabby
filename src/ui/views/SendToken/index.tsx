import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import cloneDeep from 'lodash/cloneDeep';
import { Input, Form, Skeleton } from 'antd';
import { isValidAddress } from 'ethereumjs-util';
import { CHAINS } from 'consts';
import { ContactBookItem } from 'background/service/contactBook';
import { useWallet } from 'ui/utils';
import { formatTokenAmount, splitNumberByStep } from 'ui/utils/number';
import AccountCard from '../Approval/components/AccountCard';
import TokenSelector from 'ui/component/TokenSelector';
import TokenWithChain from 'ui/component/TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { PageHeader, AddressViewer } from 'ui/component';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import IconContact from 'ui/assets/contact.svg';
import IconEdit from 'ui/assets/edit-purple.svg';
import IconNormal from 'ui/assets/keyring-normal-purple.svg';
import IconHardware from 'ui/assets/hardware-purple.svg';
import IconWatch from 'ui/assets/watch-purple.svg';
import IconArrowDown from 'ui/assets/arrow-down-triangle.svg';
import IconCopy from 'ui/assets/copy-no-border.svg';
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
  const [originTokenList, setOriginTokenList] = useState<TokenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      amount: '0',
    });
    setCurrentToken(token);
    setTokenSelectorVisible(false);
  };

  const handleTokenSelectorClose = () => {
    setTokenSelectorVisible(false);
  };

  const handleSelectToken = () => {
    setTokenSelectorVisible(true);
  };

  const sortTokens = (condition: 'common' | 'all', tokens: TokenItem[]) => {
    if (condition === 'common') {
      const copy = cloneDeep(tokens);
      return copy.sort((a, b) => {
        if (a.is_core && !b.is_core) {
          return -1;
        } else if (a.is_core && b.is_core) {
          return 0;
        } else if (!a.is_core && b.is_core) {
          return 1;
        }
        return 0;
      });
    } else {
      return tokens;
    }
  };

  const handleSort = (condition: 'common' | 'all') => {
    setTokens(sortTokens(condition, originTokenList));
  };

  const handleClickTokenBalance = () => {
    const values = form.getFieldsValue();
    const newValues = {
      ...values,
      amount: new BigNumber(currentToken.amount).toFixed(),
    };
    form.setFieldsValue(newValues);
    handleFormValuesChange(newValues);
  };

  const handleLoadTokens = async (q?: string) => {
    let tokens: TokenItem[] = [];
    if (q) {
      tokens = await wallet.openapi.searchToken(currentAccount.address, q);
    } else {
      if (originTokenList.length > 0) {
        tokens = originTokenList;
      } else {
        tokens = await wallet.openapi.listToken(currentAccount.address);
        setOriginTokenList(tokens);
      }
    }
    setTokens(sortTokens('common', tokens));
    const existCurrentToken = tokens.find(
      (token) => token.id === currentToken.id
    );
    if (existCurrentToken) {
      setCurrentToken(existCurrentToken);
    }
    if (isLoading) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      to: '',
      amount: '0',
    });
  }, []);

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
          <div className="section-title flex justify-between">
            <div className="token-balance" onClick={handleClickTokenBalance}>
              {t('Balance')}:{' '}
              {isLoading ? (
                <Skeleton.Input active style={{ width: 50 }} />
              ) : (
                formatTokenAmount(currentToken.amount, 8)
              )}
            </div>
            <div className="token-price">
              ≈ $
              {splitNumberByStep(
                (
                  (form.getFieldValue('amount') || 0) * currentToken.price || 0
                ).toFixed(2)
              )}
            </div>
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
              onSort={handleSort}
            />
          </div>
          <div className="token-info">
            {isValidAddress(currentToken.id) ? (
              <div className="section-field">
                <span>{t('Contract Address')}</span>
                <span className="flex">
                  <AddressViewer address={currentToken.id} showArrow={false} />
                  <img src={IconCopy} className="icon icon-copy" />
                </span>
              </div>
            ) : (
              ''
            )}
            <div className="section-field">
              <span>{t('Chain')}</span>
              <span>
                {
                  Object.values(CHAINS).find(
                    (chain) => chain.serverId === currentToken.chain
                  )?.name
                }
              </span>
            </div>
            <div className="section-field">
              <span>{t('Price')}</span>
              <span>${splitNumberByStep(currentToken.price)}</span>
            </div>
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
