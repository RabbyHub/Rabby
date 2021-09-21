import React, { useState, useEffect, useRef } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import cloneDeep from 'lodash/cloneDeep';
import { useHistory } from 'react-router-dom';
import { Input, Form, Skeleton, message, Button } from 'antd';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import { isValidAddress, unpadHexString, addHexPrefix } from 'ethereumjs-util';
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
import IconSuccess from 'ui/assets/success.svg';
import { SvgIconPlusPrimary } from 'ui/assets';
import './style.less';

const SendToken = () => {
  const wallet = useWallet();
  const currentAccount = wallet.syncGetCurrentAccount()!;
  const { t } = useTranslation();
  const { useForm } = Form;
  const history = useHistory();
  const [form] = useForm<{ to: string; amount: string }>();
  const [contactInfo, setContactInfo] = useState<null | ContactBookItem>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const lastTimeSendToken = wallet.getLastTimeSendToken(currentAccount.address);
  const tokenInputRef = useRef<Input>(null);
  const [currentToken, setCurrentToken] = useState<TokenItem>(
    lastTimeSendToken || {
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
    }
  );

  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [cacheAmount, setCacheAmount] = useState('0');
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const [originTokenList, setOriginTokenList] = useState<TokenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(null);
  const [balanceWarn, setBalanceWarn] = useState(null);
  const [showContactInfo, setShowContactInfo] = useState(false);

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    !balanceError &&
    new BigNumber(form.getFieldValue('amount')).isGreaterThan(0) &&
    !isLoading;
  const isNativeToken = currentToken.id === currentToken.chain;

  const handleSubmit = ({ to, amount }: { to: string; amount: string }) => {
    const chain = Object.values(CHAINS).find(
      (item) => item.serverId === currentToken.chain
    )!;
    const sendValue = new BigNumber(amount)
      .multipliedBy(10 ** currentToken.decimals)
      .toFixed();
    const params: Record<string, any> = {
      chainId: chain.id,
      from: currentAccount.address,
      to: currentToken.id,
      value: '0x0',
      data: ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            {
              type: 'address',
              name: 'to',
            },
            {
              type: 'uint256',
              name: 'value',
            },
          ],
        },
        [to, sendValue]
      ),
      isSend: true,
    };
    if (isNativeToken) {
      params.to = to;
      delete params.data;
      params.value = addHexPrefix(
        unpadHexString(
          ((abiCoder as unknown) as AbiCoder).encodeParameter(
            'uint256',
            sendValue
          )
        )
      );
    }
    wallet.setLastTimeSendToken(currentAccount.address, currentToken);
    wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states: {
        values: form.getFieldsValue(),
        currentToken,
      },
    });
    wallet.sendRequest({
      method: 'eth_sendTransaction',
      params: [params],
    });
    window.close();
  };

  const handleConfirmContact = (data: ContactBookItem | null) => {
    setShowEditContactModal(false);
    setShowListContactModal(false);
    setContactInfo(data);
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

  const handleFormValuesChange = (
    _,
    {
      to,
      amount,
    }: {
      to: string;
      amount: string;
    }
  ) => {
    setShowContactInfo(!!to && isValidAddress(to));
    if (!to || !isValidAddress(to)) {
      setEditBtnDisabled(true);
    } else {
      setEditBtnDisabled(false);
    }
    let resultAmount = amount;
    if (!/^\d*(\.\d*)?$/.test(amount)) {
      resultAmount = cacheAmount;
    }

    if (
      isNativeToken &&
      new BigNumber(currentToken.amount)
        .minus(new BigNumber(amount))
        .isLessThan(0.1)
    ) {
      setBalanceWarn(t('Gas fee reservation required'));
    } else {
      setBalanceWarn(null);
    }
    if (
      new BigNumber(resultAmount || 0).isGreaterThan(
        new BigNumber(currentToken.amount)
      )
    ) {
      setBalanceError(t('Insufficient balance'));
    } else {
      setBalanceError(null);
    }
    form.setFieldsValue({
      to,
      amount: resultAmount,
    });
    setCacheAmount(resultAmount);
    const addressContact = wallet.getContactByAddress(to);
    if (addressContact) {
      setContactInfo(addressContact);
    } else if (!addressContact && contactInfo) {
      setContactInfo(null);
    }
  };

  const handleCurrentTokenChange = (token: TokenItem) => {
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      amount: '',
    });
    setTokenSelectorVisible(false);
    setCurrentToken(token);
    setBalanceError(null);
    setBalanceWarn(null);
    tokenInputRef.current?.focus();
  };

  const handleTokenSelectorClose = () => {
    setTokenSelectorVisible(false);
  };

  const handleSelectToken = () => {
    setTokenSelectorVisible(true);
  };

  const sortTokensByPrice = (tokens: TokenItem[]) => {
    const copy = cloneDeep(tokens);
    return copy.sort((a, b) => {
      return new BigNumber(b.amount)
        .times(new BigNumber(b.price || 0))
        .minus(new BigNumber(a.amount).times(new BigNumber(a.price || 0)))
        .toNumber();
    });
  };

  const sortTokens = (condition: 'common' | 'all', tokens: TokenItem[]) => {
    const copy = cloneDeep(tokens);
    if (condition === 'common') {
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
      return copy;
    }
  };

  const handleSort = (condition: 'common' | 'all') => {
    setTokens(sortTokens(condition, originTokenList));
  };

  const handleClickTokenBalance = () => {
    if (isLoading) return;
    const values = form.getFieldsValue();
    const newValues = {
      ...values,
      amount: new BigNumber(currentToken.amount).toFixed(),
    };
    form.setFieldsValue(newValues);
    handleFormValuesChange(null, newValues);
  };

  const handleLoadTokens = async (q?: string) => {
    let tokens: TokenItem[] = [];
    if (q) {
      tokens = sortTokensByPrice(
        await wallet.openapi.searchToken(currentAccount.address, q)
      );
    } else {
      if (originTokenList.length > 0) {
        tokens = originTokenList;
      } else {
        tokens = sortTokensByPrice(
          await wallet.openapi.listToken(currentAccount.address)
        );
        setOriginTokenList(tokens);
        setIsListLoading(false);
      }
    }
    setTokens(sortTokens('common', tokens));
    const existCurrentToken = tokens.find(
      (token) => token.id === currentToken.id
    );
    if (existCurrentToken) {
      setCurrentToken(existCurrentToken);
    }
  };

  const handleCopyContractAddress = () => {
    const clipboard = new ClipboardJS('.send-token', {
      text: function () {
        return currentToken.id;
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

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };

  const loadCurrentToken = async (token: TokenItem) => {
    const t = await wallet.openapi.getToken(
      currentAccount.address,
      token.chain,
      token.id
    );
    setCurrentToken(t);
    setIsLoading(false);
  };

  useEffect(() => {
    let needLoadToken = currentToken;
    if (wallet.hasPageStateCache()) {
      const cache = wallet.getPageStateCache();
      if (cache?.path === history.location.pathname) {
        if (cache.states.values) form.setFieldsValue(cache.states.values);
        if (cache.states.currentToken) {
          setCurrentToken(cache.states.currentToken);
          needLoadToken = cache.states.currentToken;
        }
      }
    }
    loadCurrentToken(needLoadToken);
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <div className="send-token">
      <PageHeader onBack={handleClickBack} forceShowBack>
        {t('Send')}
      </PageHeader>
      <Form
        form={form}
        onFinish={handleSubmit}
        onValuesChange={handleFormValuesChange}
        initialValues={{
          to: '',
          amount: '',
        }}
      >
        <div className="section">
          <div className="section-title">{t('From')}</div>
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
              <Input placeholder={t('Enter the address')} autoFocus />
            </Form.Item>
          </div>
        </div>
        <div className="section">
          <div className="section-title flex justify-between">
            <div className="token-balance" onClick={handleClickTokenBalance}>
              {isLoading ? (
                <Skeleton.Input active style={{ width: 100 }} />
              ) : (
                `${t('Balance')}: ${formatTokenAmount(currentToken.amount, 8)}`
              )}
            </div>
            {balanceError || balanceWarn ? (
              <div className="balance-error">{balanceError || balanceWarn}</div>
            ) : (
              <div className="token-price">
                ≈ $
                {splitNumberByStep(
                  (
                    (form.getFieldValue('amount') || 0) * currentToken.price ||
                    0
                  ).toFixed(2)
                )}
              </div>
            )}
          </div>
          <div className="token-input">
            <div className="left" onClick={handleSelectToken}>
              <TokenWithChain token={currentToken} />
              <span className="token-input__symbol" title={currentToken.symbol}>
                {currentToken.symbol}
              </span>
              <img src={IconArrowDown} className="icon icon-arrow-down" />
            </div>
            <div className="right">
              <Form.Item name="amount">
                <Input ref={tokenInputRef} />
              </Form.Item>
            </div>
            <TokenSelector
              visible={tokenSelectorVisible}
              list={tokens}
              onConfirm={handleCurrentTokenChange}
              onCancel={handleTokenSelectorClose}
              onSearch={handleLoadTokens}
              onSort={handleSort}
              isLoading={isListLoading}
            />
          </div>
          <div className="token-info__header" />
          <div className="token-info">
            {!isNativeToken ? (
              <div className="section-field">
                <span>{t('Contract Address')}</span>
                <span className="flex">
                  <AddressViewer address={currentToken.id} showArrow={false} />
                  <img
                    src={IconCopy}
                    className="icon icon-copy"
                    onClick={handleCopyContractAddress}
                  />
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
