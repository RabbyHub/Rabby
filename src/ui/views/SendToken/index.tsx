import React, { useState, useEffect } from 'react';
import ClipboardJS from 'clipboard';
import * as Sentry from '@sentry/browser';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { Input, Form, Skeleton, message, Button } from 'antd';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import { isValidAddress, unpadHexString, addHexPrefix } from 'ethereumjs-util';
import styled from 'styled-components';
import { providers } from 'ethers';
import {
  CHAINS,
  CHAINS_ENUM,
  KEYRING_PURPLE_LOGOS,
  KEYRING_CLASS,
  MINIMUM_GAS_LIMIT,
} from 'consts';
import { Account } from 'background/service/preference';
import { UIContactBookItem } from 'background/service/contactBook';
import { useWallet, useWalletOld } from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import { getTokenSymbol, geTokenDecimals } from 'ui/utils/token';
import { formatTokenAmount, splitNumberByStep } from 'ui/utils/number';
import AccountCard from '../Approval/components/AccountCard';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { GasLevel, GasResult, TokenItem } from 'background/service/openapi';
import { PageHeader, AddressViewer } from 'ui/component';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import GasReserved from './components/GasReserved';
import GasSelector from './components/GasSelector';
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

const MaxButton = styled.div`
  padding: 4px 5px;
  background: rgba(134, 151, 255, 0.1);
  border-radius: 2px;
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: #8697ff;
  margin-left: 6px;
  cursor: pointer;
  &:hover {
    background: rgba(134, 151, 255, 0.2);
  }
`;

const SendToken = () => {
  const wallet = useWalletOld();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [chain, setChain] = useState(CHAINS_ENUM.ETH);
  const { t } = useTranslation();
  const [tokenAmountForGas, setTokenAmountForGas] = useState('0');
  const { useForm } = Form;
  const history = useHistory();
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};

  const [form] = useForm<{ to: string; amount: string }>();
  const [contactInfo, setContactInfo] = useState<null | UIContactBookItem>(
    null
  );
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
  const [gasList, setGasList] = useState<GasLevel[]>([]);
  const [sendAlianName, setSendAlianName] = useState<string | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [cacheAmount, setCacheAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceWarn, setBalanceWarn] = useState<string | null>(null);
  const [showGasReserved, setShowGasReserved] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [accountType, setAccountType] = useState('');
  const [amountFocus, setAmountFocus] = useState(false);
  const [gasSelectorVisible, setGasSelectorVisible] = useState(false);
  const [selectedGasLevel, setSelectedGasLevel] = useState<GasLevel | null>(
    null
  );
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
      if (showGasReserved) {
        params.gasPrice = selectedGasLevel?.price;
      }
    }
    try {
      await wallet.setLastTimeSendToken(currentAccount!.address, currentToken);
      await wallet.setPageStateCache({
        path: history.location.pathname,
        params: {},
        states: {
          values: form.getFieldsValue(),
          currentToken,
        },
      });
      await wallet.sendRequest({
        method: 'eth_sendTransaction',
        params: [params],
      });
      window.close();
    } catch (e) {
      message.error(e.message);
      console.error(e);
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
    },
    token?: TokenItem
  ) => {
    const targetToken = token || currentToken;
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

    if (amount !== cacheAmount) {
      if (showGasReserved && Number(resultAmount) > 0) {
        setShowGasReserved(false);
      } else if (isNativeToken) {
        if (
          new BigNumber(targetToken.raw_amount_hex_str || 0)
            .div(10 ** targetToken.decimals)
            .minus(resultAmount)
            .lt(0.1)
        ) {
          setBalanceWarn(t('Gas fee reservation required'));
        } else {
          setBalanceWarn(null);
        }
      }
    }

    if (
      new BigNumber(resultAmount || 0).isGreaterThan(
        new BigNumber(targetToken.raw_amount_hex_str || 0).div(
          10 ** targetToken.decimals
        )
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
    if (showGasReserved) {
      setShowGasReserved(false);
    }
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

  const handleClickTokenBalance = async () => {
    if (isLoading) return;
    if (showGasReserved) return;
    const tokenBalance = new BigNumber(
      currentToken.raw_amount_hex_str || 0
    ).div(10 ** currentToken.decimals);
    let amount = tokenBalance.toFixed();

    if (isNativeToken) {
      setShowGasReserved(true);
      try {
        const list: GasLevel[] = await wallet.openapi.gasMarket(
          CHAINS[chain].serverId
        );
        setGasList(list);
        let instant = list[0];
        for (let i = 1; i < list.length; i++) {
          if (list[i].price > instant.price) {
            instant = list[i];
          }
        }
        const gasTokenAmount = handleGasChange(instant, false);
        const tokenForSend = tokenBalance.minus(gasTokenAmount);
        amount = tokenForSend.gt(0) ? tokenForSend.toFixed() : '0';
        if (tokenForSend.lt(0)) {
          setShowGasReserved(false);
        }
      } catch (e) {
        setBalanceWarn(t('Gas fee reservation required'));
        setShowGasReserved(false);
      }
    }

    const values = form.getFieldsValue();
    const newValues = {
      ...values,
      amount,
    };
    form.setFieldsValue(newValues);
    handleFormValuesChange(null, newValues);
  };

  const handleChainChanged = async (val: CHAINS_ENUM) => {
    const account = await wallet.syncGetCurrentAccount();
    const chain = CHAINS[val];
    setChain(val);
    setCurrentToken({
      id: chain.nativeTokenAddress,
      decimals: chain.nativeTokenDecimals,
      logo_url: chain.nativeTokenLogo,
      symbol: chain.nativeTokenSymbol,
      display_symbol: chain.nativeTokenSymbol,
      optimized_symbol: chain.nativeTokenSymbol,
      is_core: true,
      is_verified: true,
      is_wallet: true,
      amount: 0,
      price: 0,
      name: chain.nativeTokenSymbol,
      chain: chain.serverId,
      time_at: 0,
    });
    loadCurrentToken(chain.nativeTokenAddress, chain.serverId, account.address);
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      amount: '',
    });
    setShowGasReserved(false);
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
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{currentToken.id}</div>
          </div>
        ),
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
      if (!target) {
        loadCurrentToken(currentToken.id, currentToken.chain, account.address);
        return;
      }
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
            handleFormValuesChange(
              null,
              form.getFieldsValue(),
              cache.states.currentToken
            );
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
        const data = {
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
        Sentry.captureException(
          new Error('Token validation failed'),
          (scope) => {
            scope.setTag('id', `${currentToken.chain}-${currentToken.id}`);
            return scope;
          }
        );
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.FAILD);
      } else {
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.SUCCESS);
      }
      return;
    }
    try {
      const decimals = await geTokenDecimals(
        currentToken.id,
        new providers.JsonRpcProvider(chain.thridPartyRPC)
      );
      const symbol = await getTokenSymbol(
        currentToken.id,
        new providers.JsonRpcProvider(chain.thridPartyRPC)
      );
      if (
        symbol !== currentToken.symbol ||
        decimals !== currentToken.decimals
      ) {
        Sentry.captureException(
          new Error('Token validation failed'),
          (scope) => {
            scope.setTag('id', `${currentToken.chain}-${currentToken.id}`);
            return scope;
          }
        );
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.FAILD);
      } else {
        setTokenValidationStatus(TOKEN_VALIDATION_STATUS.SUCCESS);
      }
    } catch (e) {
      Sentry.captureException(new Error('Token validation failed'), (scope) => {
        scope.setTag('id', `${currentToken.chain}-${currentToken.id}`);
        return scope;
      });
      setTokenValidationStatus(TOKEN_VALIDATION_STATUS.FAILD);
      throw e;
    }
  };

  const handleClickGasReserved = () => {
    setGasSelectorVisible(true);
  };

  const handleGasSelectorClose = () => {
    setGasSelectorVisible(false);
  };

  const handleGasChange = (gas: GasLevel, updateTokenAmount = true) => {
    setSelectedGasLevel(gas);
    const gasTokenAmount = new BigNumber(gas.price)
      .times(MINIMUM_GAS_LIMIT)
      .div(1e18);
    setTokenAmountForGas(gasTokenAmount.toFixed());
    if (updateTokenAmount) {
      const values = form.getFieldsValue();
      const diffValue = new BigNumber(currentToken.raw_amount_hex_str || 0)
        .div(10 ** currentToken.decimals)
        .minus(gasTokenAmount);
      if (diffValue.lt(0)) {
        setShowGasReserved(false);
      }
      const newValues = {
        ...values,
        amount: diffValue.gt(0) ? diffValue.toFixed() : '0',
      };
      form.setFieldsValue(newValues);
    }
    return gasTokenAmount;
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
                      <span
                        title={contactInfo.name}
                        className="inline-block align-middle truncate max-w-[240px]"
                      >
                        {contactInfo.name}
                      </span>
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
          <div className="section-title flex justify-between items-center">
            <div className="token-balance">
              {isLoading ? (
                <Skeleton.Input active style={{ width: 100 }} />
              ) : (
                `${t('Balance')}: ${formatTokenAmount(
                  new BigNumber(currentToken.raw_amount_hex_str || 0)
                    .div(10 ** currentToken.decimals)
                    .toFixed(),
                  4
                )}`
              )}
              {currentToken.amount > 0 && (
                <MaxButton onClick={handleClickTokenBalance}>MAX</MaxButton>
              )}
            </div>
            {showGasReserved &&
              (selectedGasLevel ? (
                <GasReserved
                  token={currentToken}
                  amount={tokenAmountForGas}
                  onClickAmount={handleClickGasReserved}
                />
              ) : (
                <Skeleton.Input active style={{ width: 180 }} />
              ))}
            {!showGasReserved && (balanceError || balanceWarn) ? (
              <div className="balance-error">{balanceError || balanceWarn}</div>
            ) : null}
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
          <div className="token-price">
            ≈ $
            {splitNumberByStep(
              (
                (form.getFieldValue('amount') || 0) * currentToken.price || 0
              ).toFixed(2)
            )}
          </div>

          <div className="token-info">
            <div className="token-info__header" />
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

      <GasSelector
        visible={gasSelectorVisible}
        onClose={handleGasSelectorClose}
        chainId={CHAINS[chain].id}
        onChange={(val) => {
          setGasSelectorVisible(false);
          handleGasChange(val);
        }}
        gasList={gasList}
        gas={selectedGasLevel}
        token={currentToken}
      />
    </div>
  );
};

export default SendToken;
