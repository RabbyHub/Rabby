import React, { useState, useEffect, useMemo } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useDebounce } from 'react-use';
import { Input, Form, Skeleton, message, Button } from 'antd';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import { isValidAddress, intToHex } from 'ethereumjs-util';
import styled from 'styled-components';
import {
  CHAINS,
  CHAINS_ENUM,
  KEYRING_PURPLE_LOGOS,
  KEYRING_CLASS,
  MINIMUM_GAS_LIMIT,
  L2_ENUMS,
} from 'consts';
import { useRabbyDispatch, useRabbySelector, connectStore } from 'ui/store';
import { Account, ChainGas } from 'background/service/preference';
import { isSameAddress, useWallet } from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import { formatTokenAmount, splitNumberByStep } from 'ui/utils/number';
import AccountCard from '../Approval/components/AccountCard';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import { GasLevel, TokenItem } from 'background/service/openapi';
import { PageHeader, AddressViewer } from 'ui/component';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import GasReserved from './components/GasReserved';
import GasSelector from './components/GasSelector';
import IconWhitelist from 'ui/assets/dashboard/whitelist.svg';
import IconEdit from 'ui/assets/edit-purple.svg';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconCheck from 'ui/assets/icon-check.svg';
import IconContact from 'ui/assets/send-token/contact.svg';
import IconTemporaryGrantCheckbox from 'ui/assets/send-token/temporary-grant-checkbox.svg';
import TokenInfoArrow from 'ui/assets/send-token/token-info-arrow.svg';
import ButtonMax from 'ui/assets/send-token/max.svg';
import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { UIContactBookItem } from '@/background/service/contactBook';
import {
  findChainByEnum,
  findChainByServerID,
  makeTokenFromChain,
} from '@/utils/chain';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import AccountSearchInput from '@/ui/component/AccountSearchInput';
import { confirmAllowTransferToPromise } from './components/ModalConfirmAllowTransfer';
import { confirmAddToContactsModalPromise } from './components/ModalConfirmAddToContacts';
import LessPalette from '@/ui/style/var-defs';

const MaxButton = styled.img`
  cursor: pointer;
  user-select: nonce;
  margin-left: 6px;
`;

const SendToken = () => {
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const [chain, setChain] = useState(CHAINS_ENUM.ETH);

  const chainItem = useMemo(() => findChainByEnum(chain), [chain]);
  const { t } = useTranslation();
  const [tokenAmountForGas, setTokenAmountForGas] = useState('0');
  const { useForm } = Form;
  const history = useHistory();
  const dispatch = useRabbyDispatch();

  const rbisource = useRbiSource();

  const [form] = useForm<{ to: string; amount: string }>();
  const [formSnapshot, setFormSnapshot] = useState(form.getFieldsValue());
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
  const [inited, setInited] = useState(false);
  const [gasList, setGasList] = useState<GasLevel[]>([]);
  const [sendAlianName, setSendAlianName] = useState<string | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [cacheAmount, setCacheAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceWarn, setBalanceWarn] = useState<string | null>(null);
  const [showGasReserved, setShowGasReserved] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showWhitelistAlert, setShowWhitelistAlert] = useState(false);
  const [gasSelectorVisible, setGasSelectorVisible] = useState(false);
  const [selectedGasLevel, setSelectedGasLevel] = useState<GasLevel | null>(
    null
  );
  const [temporaryGrant, setTemporaryGrant] = useState(false);
  const [gasPriceMap, setGasPriceMap] = useState<
    Record<string, { list: GasLevel[]; expireAt: number }>
  >({});
  const [isGnosisSafe, setIsGnosisSafe] = useState(false);

  const { whitelist, whitelistEnabled, contactsByAddr } = useRabbySelector(
    (s) => ({
      whitelist: s.whitelist.whitelist,
      whitelistEnabled: s.whitelist.enabled,
      contactsByAddr: s.contactBook.contactsByAddr,
    })
  );

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
      toAddressInContactBook: !!contactsByAddr[formSnapshot.to]?.isAlias,
    };
  }, [whitelist, contactsByAddr, formSnapshot]);

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
    !balanceError &&
    new BigNumber(form.getFieldValue('amount')).gte(0) &&
    !isLoading &&
    (!whitelistEnabled || temporaryGrant || toAddressInWhitelist);
  const isNativeToken =
    !!chainItem && currentToken?.id === chainItem.nativeTokenAddress;

  const fetchGasList = async () => {
    const list: GasLevel[] = await wallet.openapi.gasMarket(
      chainItem?.serverId || ''
    );
    return list;
  };

  useDebounce(
    async () => {
      const targetChain = Object.values(CHAINS).find(
        (item) => item.enum === chain
      )!;
      let gasList: GasLevel[];
      if (
        gasPriceMap[targetChain.enum] &&
        gasPriceMap[targetChain.enum].expireAt > Date.now()
      ) {
        gasList = gasPriceMap[targetChain.enum].list;
      } else {
        gasList = await fetchGasList();
        setGasPriceMap({
          ...gasPriceMap,
          [targetChain.enum]: {
            list: gasList,
            expireAt: Date.now() + 300000, // cache gasList for 5 mins
          },
        });
      }
    },
    500,
    [chain]
  );

  const calcGasCost = async () => {
    const targetChain = Object.values(CHAINS).find(
      (item) => item.enum === chain
    )!;
    const gasList = gasPriceMap[targetChain.enum]?.list;

    if (!gasList) return new BigNumber(0);

    const lastTimeGas: ChainGas | null = await wallet.getLastTimeGasSelection(
      targetChain.id
    );

    let gasLevel: GasLevel;
    if (lastTimeGas?.lastTimeSelect === 'gasPrice' && lastTimeGas.gasPrice) {
      // use cached gasPrice if exist
      gasLevel = {
        level: 'custom',
        price: lastTimeGas.gasPrice,
        front_tx_count: 0,
        estimated_seconds: 0,
        base_fee: 0,
      };
    } else if (
      lastTimeGas?.lastTimeSelect &&
      lastTimeGas?.lastTimeSelect === 'gasLevel'
    ) {
      const target = gasList.find(
        (item) => item.level === lastTimeGas?.gasLevel
      )!;
      gasLevel = target;
    } else {
      // no cache, use the fast level in gasMarket
      gasLevel = gasList.find((item) => item.level === 'fast')!;
    }
    const costTokenAmount = new BigNumber(gasLevel.price)
      .times(21000)
      .div(1e18);
    return costTokenAmount;
  };

  const handleSubmit = async ({
    to,
    amount,
  }: {
    to: string;
    amount: string;
  }) => {
    setIsSubmitLoading(true);
    const chain = Object.values(CHAINS).find(
      (item) => item.serverId === currentToken.chain
    )!;
    const sendValue = new BigNumber(amount).multipliedBy(
      10 ** currentToken.decimals
    );
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
        [to, sendValue.toFixed(0)]
      ),
      isSend: true,
    };
    if (isNativeToken) {
      params.to = to;
      delete params.data;
      params.value = `0x${sendValue.toString(16)}`;
      try {
        const code = await wallet.requestETHRpc(
          {
            method: 'eth_getCode',
            params: [to, 'latest'],
          },
          chain.serverId
        );
        if (
          code &&
          (code === '0x' || code === '0x0') &&
          !L2_ENUMS.includes(chain.enum)
        ) {
          params.gas = intToHex(21000); // L2 has extra validation fee so can not set gasLimit as 21000 when send native token
        }
      } catch (e) {
        if (!L2_ENUMS.includes(chain.enum)) {
          params.gas = intToHex(21000); // L2 has extra validation fee so can not set gasLimit as 21000 when send native token
        }
      }
      setIsSubmitLoading(false);
      if (showGasReserved) {
        params.gasPrice = selectedGasLevel?.price;
      }
    }
    try {
      await wallet.setLastTimeSendToken(currentAccount!.address, currentToken);
      await wallet.setPageStateCache({
        path: history.location.pathname,
        search: history.location.search,
        params: {},
        states: {
          values: form.getFieldsValue(),
          currentToken,
        },
      });
      matomoRequestEvent({
        category: 'Send',
        action: 'createTx',
        label: [
          chain.name,
          getKRCategoryByType(currentAccount?.type),
          currentAccount?.brandName,
          'token',
          filterRbiSource('sendToken', rbisource) && rbisource, // mark source module of `sendToken`
        ].join('|'),
      });

      wallet.sendRequest({
        method: 'eth_sendTransaction',
        params: [params],
        $ctx: {
          ga: {
            category: 'Send',
            source: 'sendToken',
            trigger: filterRbiSource('sendToken', rbisource) && rbisource, // mark source module of `sendToken`
          },
        },
      });
      window.close();
    } catch (e) {
      message.error(e.message);
      console.error(e);
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
  };

  const handleCancelContact = () => {
    setShowListContactModal(false);
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
    changedValues,
    {
      to,
      amount,
    }: {
      to: string;
      amount: string;
    },
    token?: TokenItem
  ) => {
    if (changedValues && changedValues.to) {
      setTemporaryGrant(false);
    }
    const targetToken = token || currentToken;
    if (!to || !isValidAddress(to)) {
      setEditBtnDisabled(true);
      setShowWhitelistAlert(false);
    } else {
      setShowWhitelistAlert(true);
      setEditBtnDisabled(false);
    }
    let resultAmount = amount;
    if (!/^\d*(\.\d*)?$/.test(amount)) {
      resultAmount = cacheAmount;
    }

    if (amount !== cacheAmount) {
      if (showGasReserved && Number(resultAmount) > 0) {
        setShowGasReserved(false);
      } else if (isNativeToken && !isGnosisSafe) {
        const gasCostTokenAmount = await calcGasCost();
        if (
          new BigNumber(targetToken.raw_amount_hex_str || 0)
            .div(10 ** targetToken.decimals)
            .minus(amount)
            .minus(gasCostTokenAmount)
            .lt(0)
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
    const nextFormValues = {
      to,
      amount: resultAmount,
    };
    form.setFieldsValue(nextFormValues);
    setFormSnapshot(nextFormValues);
    setCacheAmount(resultAmount);
    const alianName = await wallet.getAlianName(to.toLowerCase());
    if (alianName) {
      setContactInfo({ address: to, name: alianName });
      setShowContactInfo(true);
    } else if (contactInfo) {
      setContactInfo(null);
    }
  };

  const handleCurrentTokenChange = async (token: TokenItem) => {
    if (showGasReserved) {
      setShowGasReserved(false);
    }
    const account = (await wallet.syncGetCurrentAccount())!;
    const values = form.getFieldsValue();
    if (token.id !== currentToken.id || token.chain !== currentToken.chain) {
      form.setFieldsValue({
        ...values,
        amount: '',
      });
    }
    const chainItem = findChainByServerID(token.chain);
    setChain(chainItem?.enum ?? CHAINS_ENUM.ETH);
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

    if (isNativeToken && !isGnosisSafe) {
      setShowGasReserved(true);
      try {
        const list = await fetchGasList();
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
        if (!isGnosisSafe) {
          setBalanceWarn(t('Gas fee reservation required'));
          setShowGasReserved(false);
        }
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
    const account = (await wallet.syncGetCurrentAccount())!;
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
    handleFormValuesChange(
      { amount: '' },
      {
        ...values,
        amount: '',
      }
    );
  };

  const handleCopyContactAddress = () => {
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
    if (t) setCurrentToken(t);
    setIsLoading(false);
  };

  const initByCache = async () => {
    const account = (await wallet.syncGetCurrentAccount())!;
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
      let tokenFromOrder: TokenItem | null = null;

      const lastTimeToken = await wallet.getLastTimeSendToken(account.address);
      if (lastTimeToken) {
        setCurrentToken(lastTimeToken);
      } else {
        const { firstChain } = await dispatch.chains.getOrderedChainList({
          supportChains: undefined,
        });
        tokenFromOrder = firstChain ? makeTokenFromChain(firstChain) : null;
        if (firstChain) setCurrentToken(tokenFromOrder!);
      }

      let needLoadToken: TokenItem =
        lastTimeToken || tokenFromOrder || currentToken;
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache?.path === history.location.pathname) {
          if (cache.states.values) {
            form.setFieldsValue(cache.states.values);
            handleFormValuesChange(
              cache.states.values,
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
      if (chainItem && needLoadToken.chain !== chainItem.serverId) {
        const target = Object.values(CHAINS).find(
          (item) => item.serverId === needLoadToken.chain
        )!;
        setChain(target.enum);
      }
      loadCurrentToken(needLoadToken.id, needLoadToken.chain, account.address);
    }
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
    dispatch.contactBook.getContactBookAsync();
    if (!account) {
      history.replace('/');
      return;
    }
    setCurrentAccount(account);

    if (account.type === KEYRING_CLASS.GNOSIS) {
      setIsGnosisSafe(true);
    }

    setInited(true);
  };

  useEffect(() => {
    if (inited) {
      initByCache();
    }
  }, [inited]);

  const getAlianName = async () => {
    const alianName = await wallet.getAlianName(currentAccount?.address || '');
    setSendAlianName(alianName || '');
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

  const handleClickAllowTransferTo = () => {
    if (!whitelistEnabled || temporaryGrant || toAddressInWhitelist) return;

    const toAddr = form.getFieldValue('to');
    confirmAllowTransferToPromise({
      wallet,
      toAddr,
      showAddToWhitelist: !!toAddressInContactBook,
      title: 'Enter the Password to Confirm',
      cancelText: 'Cancel',
      confirmText: 'Confirm',
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
      addrToAdd: toAddr,
      title: 'Add to contacts',
      confirmText: 'Confirm',
      async onFinished(result) {
        await dispatch.contactBook.getContactBookAsync();
        // trigger fetch contactInfo
        const values = form.getFieldsValue();
        handleFormValuesChange(null, { ...values });
        // trigger get balance of address
        await wallet.getAddressBalance(result.contactAddrAdded, true);
      },
    });
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

  return (
    <div className="send-token">
      <PageHeader onBack={handleClickBack} forceShowBack>
        {t('Send')}
      </PageHeader>
      <Form
        form={form}
        className="send-token-form"
        onFinish={handleSubmit}
        onValuesChange={handleFormValuesChange}
        initialValues={{
          to: '',
          amount: '',
        }}
      >
        <div className="flex-1 overflow-auto">
          <div className="section relative">
            <div className={clsx('section-title')}>{t('Chain')}</div>
            <ChainSelectorInForm
              value={chain}
              onChange={handleChainChanged}
              disabledTips={'Not supported'}
              supportChains={undefined}
            />
            <div className={clsx('section-title mt-[10px]')}>{t('From')}</div>
            <AccountCard
              icons={{
                mnemonic: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.MNEMONIC],
                privatekey: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.PRIVATE_KEY],
                watch: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.WATCH],
              }}
              alianName={sendAlianName}
              isHideAmount={CHAINS[chain]?.isTestnet}
            />
            <div className="section-title">
              <span className="section-title__to">{t('To')}</span>
              <div className="flex flex-1 justify-end items-center">
                {showContactInfo && !!contactInfo && (
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
                        // setAmountFocus(true);
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(t('This address is invalid'))
                      );
                    },
                  },
                ]}
              >
                <AccountSearchInput
                  placeholder={'Enter address or search'}
                  autoComplete="off"
                  autoFocus
                  spellCheck={false}
                  onSelectedAccount={(account) => {
                    const nextVals = {
                      ...form.getFieldsValue(),
                      to: account.address,
                    };
                    handleFormValuesChange({ to: nextVals.to }, nextVals);
                    form.setFieldsValue(nextVals);
                  }}
                />
              </Form.Item>
              {toAddressIsValid && !toAddressInContactBook && (
                <div className="tip-no-contact font-normal text-[12px] pt-[12px]">
                  Not on address list.{' '}
                  <span
                    onClick={handleClickAddContact}
                    className={clsx('ml-[2px] underline cursor-pointer')}
                    style={{ color: LessPalette['@primary-text-color'] }}
                  >
                    Add to contacts
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="section">
            <div className="section-title flex justify-between items-center">
              <div className="token-balance whitespace-pre-wrap">
                {isLoading ? (
                  <Skeleton.Input active style={{ width: 100 }} />
                ) : (
                  <>
                    {t('Balance')}:{' '}
                    <span
                      className="truncate max-w-[80px]"
                      title={formatTokenAmount(
                        new BigNumber(currentToken.raw_amount_hex_str || 0)
                          .div(10 ** currentToken.decimals)
                          .toFixed(),
                        4
                      )}
                    >
                      {formatTokenAmount(
                        new BigNumber(currentToken.raw_amount_hex_str || 0)
                          .div(10 ** currentToken.decimals)
                          .toFixed(),
                        4
                      )}
                    </span>
                  </>
                )}
                {currentToken.amount > 0 && (
                  <MaxButton
                    src={ButtonMax}
                    onClick={handleClickTokenBalance}
                  />
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
                <div className="balance-error">
                  {balanceError || balanceWarn}
                </div>
              ) : null}
            </div>
            <Form.Item name="amount">
              {currentAccount && chainItem && (
                <TokenAmountInput
                  token={currentToken}
                  onTokenChange={handleCurrentTokenChange}
                  chainId={chainItem.serverId}
                  excludeTokens={[]}
                  inlinePrize
                />
              )}
            </Form.Item>
            <div className="token-info">
              <img className="token-info__header" src={TokenInfoArrow} />
              {!isNativeToken ? (
                <div className="section-field">
                  <span>{t('Contract Address')}</span>
                  <span className="flex">
                    <AddressViewer
                      address={currentToken.id}
                      showArrow={false}
                    />
                    <img
                      src={IconCopy}
                      className="icon icon-copy"
                      onClick={handleCopyContactAddress}
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
          <div className="btn-wrapper w-[100%] px-[20px] flex justify-center">
            <Button
              disabled={!canSubmit}
              type="primary"
              htmlType="submit"
              size="large"
              className="w-[100%] h-[48px]"
              loading={isSubmitLoading}
            >
              {t('Send')}
            </Button>
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
        onCancel={handleCancelContact}
        onOk={handleConfirmContact}
      />

      <GasSelector
        visible={gasSelectorVisible}
        onClose={handleGasSelectorClose}
        chainId={chainItem?.id || CHAINS.ETH.id}
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

export default connectStore()(SendToken);
