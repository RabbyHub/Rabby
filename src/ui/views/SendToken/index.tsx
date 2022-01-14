import React, { useState, useEffect } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { Input, Form, Skeleton, message, Button } from 'antd';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import { isValidAddress, unpadHexString, addHexPrefix } from 'ethereumjs-util';
import { Contract, providers } from 'ethers';
import {
  CHAINS,
  CHAINS_ENUM,
  KEYRING_PURPLE_LOGOS,
  KEYRING_CLASS,
} from 'consts';
import { ERC20ABI } from 'consts/abi';
import { Account } from 'background/service/preference';
import { ContactBookItem } from 'background/service/contactBook';
import { useWallet } from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import { formatTokenAmount, splitNumberByStep } from 'ui/utils/number';
import AccountCard from '../Approval/components/AccountCard';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { TokenItem } from 'background/service/openapi';
import { PageHeader, AddressViewer } from 'ui/component';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
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

const SendToken = () => {
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [chain, setChain] = useState(CHAINS_ENUM.ETH);
  const { t } = useTranslation();
  const { useForm } = Form;
  const history = useHistory();
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};

  const [form] = useForm<{ to: string; amount: string }>();
  const [contactInfo, setContactInfo] = useState<null | ContactBookItem>(null);
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
  const isNativeToken = currentToken.id === CHAINS[chain].nativeTokenAddress;

  const handleSubmit = async ({
    to,
    amount,
  }: {
    to: string;
    amount: string;
  }) => {
    const chain = Object.values(CHAINS).find(
      (item) => item.serverId === currentToken.chain
    )!;
    const sendValue = new BigNumber(amount)
      .multipliedBy(10 ** currentToken.decimals)
      .toFixed(0);
    const params: Record<string, any> = {
      chainId: chain.id,
      from: currentAccount!.address,
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
    await wallet.setLastTimeSendToken(currentAccount!.address, currentToken);
    await wallet.setPageStateCache({
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

  const handleFormValuesChange = async (
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

  const handleCurrentTokenChange = async (token: TokenItem) => {
    const account = await wallet.syncGetCurrentAccount();
    const values = form.getFieldsValue();
    if (token.id !== currentToken.id || token.chain !== currentToken.chain) {
      form.setFieldsValue({
        ...values,
        amount: '',
      });
    }
    setCurrentToken(token);
    setBalanceError(null);
    setBalanceWarn(null);
    setIsLoading(true);
    loadCurrentToken(token.id, token.chain, account.address);
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

  const handleChainChanged = async (val: CHAINS_ENUM) => {
    const account = await wallet.syncGetCurrentAccount();
    const chain = CHAINS[val];
    setChain(val);
    loadCurrentToken(chain.nativeTokenAddress, chain.serverId, account.address);
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      amount: '',
    });
    handleFormValuesChange(null, {
      ...values,
      amount: '',
    });
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
    history.replace('/');
  };

  const loadCurrentToken = async (
    id: string,
    chainId: string,
    address: string
  ) => {
    const t = await wallet.openapi.getToken(address, chainId, id);
    setCurrentToken(t);
    setIsLoading(false);
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }

    setCurrentAccount(account);

    const qs = query2obj(history.location.search);
    if (qs.token) {
      const [tokenChain, id] = qs.token.split(':');
      if (!tokenChain || !id) return;
      const target = Object.values(CHAINS).find(
        (item) => item.serverId === tokenChain
      );
      if (!target) return;
      setChain(target.enum);
      loadCurrentToken(id, tokenChain, account.address);
    } else {
      const lastTimeToken = await wallet.getLastTimeSendToken(account.address);
      if (lastTimeToken) setCurrentToken(lastTimeToken);
      let needLoadToken: TokenItem = lastTimeToken || currentToken;
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache?.path === history.location.pathname) {
          if (cache.states.values) {
            form.setFieldsValue(cache.states.values);
            // handleFormValuesChange(null, form.getFieldsValue());
          }
          if (cache.states.currentToken) {
            setCurrentToken(cache.states.currentToken);
            needLoadToken = cache.states.currentToken;
          }
        }
      }
      if (needLoadToken.chain !== CHAINS[chain].serverId) {
        const target = Object.values(CHAINS).find(
          (item) => item.serverId === needLoadToken.chain
        )!;
        setChain(target.enum);
      }
      loadCurrentToken(needLoadToken.id, needLoadToken.chain, account.address);
      if (qs.address) {
        const data: ContactBookItem = {
          name: qs?.name,
          address: qs?.address,
        };
        const type = 'others';
        handleConfirmContact(data, type);
      }
    }
  };

  const getAlianName = async () => {
    const alianName = await wallet.getAlianName(currentAccount?.address);
    setSendAlianName(alianName);
  };

  const validateCurrentToken = async () => {
    setTokenValidationStatus(TOKEN_VALIDATION_STATUS.PENDING);
    const chain = Object.values(CHAINS).find(
      (item) => item.serverId === currentToken.chain
    );
    if (!chain) return;
    if (currentToken.id === chain.nativeTokenAddress) {
      if (
        currentToken.symbol !== chain.nativeTokenSymbol ||
        currentToken.decimals !== chain.nativeTokenDecimals
      ) {
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.FAILD);
      } else {
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.SUCCESS);
      }
      return;
    }
    const contract = new Contract(
      currentToken.id,
      ERC20ABI,
      new providers.JsonRpcProvider(chain.thridPartyRPC)
    );
    const decimals = await contract.decimals();
    const symbol = await contract.symbol();
    if (symbol !== currentToken.symbol || decimals !== currentToken.decimals) {
      setTokenValidationStatus(TOKEN_VALIDATION_STATUS.FAILD);
    } else {
      setTokenValidationStatus(TOKEN_VALIDATION_STATUS.SUCCESS);
    }
  };

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  useEffect(() => {
    validateCurrentToken();
  }, [currentToken]);

  useEffect(() => {
    if (currentAccount) {
      getAlianName();
    }
  }, [currentAccount]);

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
        <TagChainSelector
          value={chain}
          onChange={handleChainChanged}
          showModal={showChainsModal}
        />
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
          <Form.Item name="amount">
            {currentAccount && (
              <TokenAmountInput
                token={currentToken}
                onTokenChange={handleCurrentTokenChange}
                chainId={CHAINS[chain].serverId}
                amountFocus={amountFocus}
              />
            )}
          </Form.Item>
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
              <span>
                ${splitNumberByStep((currentToken.price || 0).toFixed(2))}
              </span>
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

export default SendToken;
