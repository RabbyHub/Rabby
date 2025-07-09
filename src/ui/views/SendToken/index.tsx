/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useAsyncFn, useDebounce } from 'react-use';
import { Form, message, Button, Modal } from 'antd';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import { useMemoizedFn } from 'ahooks';
import { isValidAddress, intToHex, zeroAddress } from '@ethereumjs/util';

import {
  CHAINS_ENUM,
  KEYRING_CLASS,
  MINIMUM_GAS_LIMIT,
  CAN_ESTIMATE_L1_FEE_CHAINS,
  CAN_NOT_SPECIFY_INTRINSIC_GAS_CHAINS,
  KEYRING_TYPE,
} from 'consts';
import { useRabbyDispatch, connectStore, useRabbySelector } from 'ui/store';
import { Account } from 'background/service/preference';
import {
  getUiType,
  isSameAddress,
  openInternalPageInTab,
  useWallet,
} from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import { formatTokenAmount } from 'ui/utils/number';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import { GasLevel, TokenItem, Tx } from 'background/service/openapi';
import { PageHeader } from 'ui/component';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/send-token/down-cc.svg';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/send-token/switch-cc.svg';

import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { UIContactBookItem } from '@/background/service/contactBook';
import {
  findChain,
  findChainByEnum,
  findChainByID,
  makeTokenFromChain,
} from '@/utils/chain';
import { Chain } from '@debank/common';
import {
  checkIfTokenBalanceEnough,
  customTestnetTokenToTokenItem,
} from '@/ui/utils/token';
import {
  GasLevelType,
  SendReserveGasPopup,
} from '../Swap/Component/ReserveGasPopup';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { withAccountChange } from '@/ui/utils/withAccountChange';
import { useRequest } from 'ahooks';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { AccountSelectorModal } from '@/ui/component/AccountSelector/AccountSelectorModal';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { useAddressInfo } from '@/ui/hooks/useAddressInfo';
import { ellipsis } from '@/ui/utils/address';
import { useInitCheck } from './useInitCheck';
import { MiniApproval } from '../Approval/components/MiniSignTx';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const abiCoder = (abiCoderInst as unknown) as AbiCoder;

function findInstanceLevel(gasList: GasLevel[]) {
  return gasList.reduce((prev, current) =>
    prev.price >= current.price ? prev : current
  );
}

const DEFAULT_GAS_USED = 21000;

const DEFAULT_TOKEN = {
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
};

type FormSendToken = {
  to: string;
  amount: string;
};
const SendToken = () => {
  const { useForm } = Form;
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useRabbyDispatch();
  const rbisource = useRbiSource();
  const { search } = useLocation();
  const wallet = useWallet();
  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));

  // UI States
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [reserveGasOpen, setReserveGasOpen] = useState(false);
  const [, setRefreshId] = useState(0);

  // Core States
  const [form] = useForm<FormSendToken>();

  const toAddress = useMemo(() => {
    const query = new URLSearchParams(search);
    return query.get('to') || '';
  }, [search]);
  const toAddressType = useMemo(() => {
    const query = new URLSearchParams(search);
    return query.get('type') || '';
  }, [search]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const { balance: currentAccountBalance } = useCurrentBalance(
    currentAccount?.address
  );
  const [chain, setChain] = useState(CHAINS_ENUM.ETH);
  const chainItem = useMemo(() => findChain({ enum: chain }), [chain]);
  const [formSnapshot, setFormSnapshot] = useState(form.getFieldsValue());
  const [contactInfo, setContactInfo] = useState<null | UIContactBookItem>(
    null
  );
  const [currentToken, setCurrentToken] = useState<TokenItem>(DEFAULT_TOKEN);
  const [safeInfo, setSafeInfo] = useState<{
    chainId: number;
    nonce: number;
  } | null>(null);

  const [inited, setInited] = useState(false);
  const [cacheAmount, setCacheAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const persistPageStateCache = useCallback(
    async (nextStateCache?: {
      values?: FormSendToken;
      currentToken?: TokenItem | null;
      safeInfo?: {
        chainId: number;
        nonce: number;
      };
    }) => {
      await wallet.setPageStateCache({
        path: '/send-token',
        search: history.location.search,
        params: {},
        states: {
          values: form.getFieldsValue(),
          currentToken,
          safeInfo,
          ...nextStateCache,
        },
      });
    },
    [wallet, history, form, currentToken, safeInfo]
  );

  const [
    { showGasReserved, clickedMax, isEstimatingGas },
    setSendMaxInfo,
  ] = useState({
    /** @deprecated */
    showGasReserved: false,
    clickedMax: false,
    isEstimatingGas: false,
  });

  const setShowGasReserved = useCallback((show: boolean) => {
    setSendMaxInfo((prev) => ({
      ...prev,
      showGasReserved: show,
    }));
  }, []);
  const cancelClickedMax = useCallback(() => {
    setSendMaxInfo((prev) => ({ ...prev, clickedMax: false }));
  }, []);

  const handleReserveGasClose = useCallback(() => {
    setReserveGasOpen(false);
  }, []);

  const [selectedGasLevel, setSelectedGasLevel] = useState<GasLevel | null>(
    null
  );

  const [estimatedGas, setEstimatedGas] = useState(0);
  const [gasPriceMap, setGasPriceMap] = useState<
    Record<string, { list: GasLevel[]; expireAt: number }>
  >({});
  const [isGnosisSafe, setIsGnosisSafe] = useState(false);

  useEffect(() => {
    if (!toAddress) {
      const query = new URLSearchParams(search);
      query.delete('to');
      history.replace(
        `/send-poly${query.toString() ? `?${query.toString()}` : ''}`
      );
      return;
    }
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      to: toAddress,
    });
  }, [toAddress, history, search, form]);

  const {
    targetAccount,
    addressDesc,
    tmpCexInfo,
    isTokenSupport,
  } = useAddressInfo(toAddress, {
    type: toAddressType,
  });
  useInitCheck(addressDesc);

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    !balanceError &&
    new BigNumber(form.getFieldValue('amount')).gte(0) &&
    !isLoading;
  const isNativeToken =
    !!chainItem && currentToken?.id === chainItem.nativeTokenAddress;

  useDebounce(
    async () => {
      const targetChain = findChainByEnum(chain)!;
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

  const disableItemCheck = useCallback(
    (token: TokenItem) => {
      if (!addressDesc) {
        return {
          disable: false,
          reason: '',
        };
      }

      const toCexId = addressDesc?.cex?.id;
      if (toCexId) {
        const noSupportToken = token.cex_ids?.every?.(
          (id) => id.toLocaleLowerCase() !== toCexId.toLocaleLowerCase()
        );
        if (!token?.cex_ids?.length || noSupportToken) {
          return {
            disable: true,
            cexId: toCexId,
            reason: t('page.sendToken.noSupprotTokenForDex'),
          };
        }
      } else {
        const safeChains = Object.entries(addressDesc?.contract || {})
          .filter(([, contract]) => {
            return contract.multisig;
          })
          .map(([chain]) => chain?.toLocaleLowerCase());
        if (
          safeChains.length > 0 &&
          !safeChains.includes(token?.chain?.toLocaleLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupprotTokenForSafe'),
          };
        }
        const contactChains = Object.entries(
          addressDesc?.contract || {}
        ).map(([chain]) => chain?.toLocaleLowerCase());
        if (
          contactChains.length > 0 &&
          !contactChains.includes(token?.chain?.toLocaleLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupportTokenForChain'),
          };
        }
      }
      return {
        disable: false,
        reason: '',
      };
    },
    [addressDesc, t]
  );

  const handleFromAddressChange = useCallback(
    async (value: Account) => {
      await dispatch.account.changeAccountAsync(value);
      setCurrentAccount(value);

      if (value.type === KEYRING_CLASS.GNOSIS) {
        setIsGnosisSafe(true);
      }
      setShowSelectorModal(false);
    },
    [dispatch.account]
  );
  const handleFromAddressCancel = useCallback(() => {
    setShowSelectorModal(false);
  }, []);

  const getParams = React.useCallback(
    ({ amount }: FormSendToken) => {
      const chain = findChain({
        serverId: currentToken.chain,
      })!;
      const sendValue = new BigNumber(amount || 0)
        .multipliedBy(10 ** currentToken.decimals)
        .decimalPlaces(0, BigNumber.ROUND_DOWN);
      const dataInput = [
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
          ] as any[],
        } as const,
        [
          toAddress || '0x0000000000000000000000000000000000000000',
          sendValue.toFixed(0),
        ] as any[],
      ] as const;
      const params: Record<string, any> = {
        chainId: chain.id,
        from: currentAccount!.address,
        to: currentToken.id,
        value: '0x0',
        data: abiCoder.encodeFunctionCall(dataInput[0], dataInput[1]),
        isSend: true,
      };
      if (safeInfo?.nonce != null) {
        params.nonce = safeInfo.nonce;
      }
      if (isNativeToken) {
        params.to = toAddress;
        delete params.data;

        params.value = `0x${sendValue.toString(16)}`;
      }

      return params;
    },
    [
      currentAccount,
      currentToken.chain,
      currentToken.decimals,
      currentToken.id,
      isNativeToken,
      safeInfo?.nonce,
      toAddress,
    ]
  );

  const fetchGasList = useCallback(async () => {
    const values = form.getFieldsValue();
    const params = getParams(values) as Tx;

    const list: GasLevel[] = chainItem?.isTestnet
      ? await wallet.getCustomTestnetGasMarket({ chainId: chainItem.id })
      : await wallet.gasMarketV2({
          chain: chainItem!,
          tx: params,
        });
    return list;
  }, [chainItem, form, getParams, wallet]);

  const [
    { value: gasList, loading: loadingGasList },
    loadGasList,
  ] = useAsyncFn(() => {
    return fetchGasList();
  }, [fetchGasList]);

  useDebounce(
    async () => {
      const targetChain = findChainByEnum(chain)!;
      let gasList: GasLevel[];
      if (
        gasPriceMap[targetChain.enum] &&
        gasPriceMap[targetChain.enum].expireAt > Date.now()
      ) {
        gasList = gasPriceMap[targetChain.enum].list;
      }
    },
    500,
    [chain]
  );

  useEffect(() => {
    if (clickedMax) {
      loadGasList();
    }
  }, [clickedMax, loadGasList]);

  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const [miniSignTx, setMiniSignTx] = useState<Tx | null>(null);

  const miniSignTxs = useMemo(() => {
    return miniSignTx ? [miniSignTx] : [];
  }, [miniSignTx]);

  const canUseMiniTx = useMemo(() => {
    return (
      [
        KEYRING_TYPE.SimpleKeyring,
        KEYRING_TYPE.HdKeyring,
        KEYRING_CLASS.HARDWARE.LEDGER,
      ].includes((currentAccount?.type || '') as any) && !chainItem?.isTestnet
    );
  }, [chainItem?.isTestnet, currentAccount?.type]);

  const { runAsync: handleSubmit, loading: isSubmitLoading } = useRequest(
    async ({ amount }: FormSendToken) => {
      const chain = findChain({
        serverId: currentToken.chain,
      })!;
      const params = getParams({
        to: toAddress,
        amount,
      });

      if (isNativeToken) {
        // L2 has extra validation fee so we can not set gasLimit as 21000 when send native token
        const couldSpecifyIntrinsicGas = !CAN_NOT_SPECIFY_INTRINSIC_GAS_CHAINS.includes(
          chain.enum
        );

        try {
          const code = await wallet.requestETHRpc<any>(
            {
              method: 'eth_getCode',
              params: [toAddress, 'latest'],
            },
            chain.serverId
          );
          const notContract = !!code && (code === '0x' || code === '0x0');

          let gasLimit = 0;

          if (estimatedGas) {
            gasLimit = estimatedGas;
          }

          /**
           * we don't need always fetch estimatedGas, if no `params.gas` set below,
           * `params.gas` would be filled on Tx Page.
           */
          if (gasLimit > 0) {
            params.gas = intToHex(gasLimit);
          } else if (notContract && couldSpecifyIntrinsicGas) {
            params.gas = intToHex(DEFAULT_GAS_USED);
          }
          if (!notContract) {
            // not pre-set gasLimit if to address is contract address
            delete params.gas;
          }
        } catch (e) {
          if (couldSpecifyIntrinsicGas) {
            params.gas = intToHex(DEFAULT_GAS_USED);
          }
        }
        if (clickedMax && selectedGasLevel?.price) {
          params.gasPrice = selectedGasLevel?.price;
        }
      }
      try {
        await wallet.setLastTimeSendToken(
          currentAccount!.address,
          currentToken
        );
        await persistPageStateCache();
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

        if (canUseMiniTx) {
          setMiniSignTx(params as Tx);
          setIsShowMiniSign(true);
          return;
        }

        const promise = wallet.sendRequest({
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
        if (isTab) {
          await promise;
          form.setFieldsValue({
            amount: '',
          });
        } else {
          window.close();
        }
      } catch (e) {
        message.error(e.message);
        console.error(e);
      }
    },
    {
      manual: true,
    }
  );

  const handleMiniSignResolve = useCallback(() => {
    setTimeout(() => {
      setIsShowMiniSign(false);
      setMiniSignTx(null);
      if (!isTab) {
        history.replace('/');
      }
      form.setFieldsValue({ amount: '' });
      setRefreshId((e) => e + 1);
    }, 500);
  }, [form, history]);

  const handleReceiveAddressChanged = useMemoizedFn(async (to: string) => {
    if (!to) return;
    try {
      const { is_blocked } = await wallet.openapi.isBlockedAddress(to);
      if (is_blocked) {
        Modal.error({
          title: t('page.sendToken.blockedTransaction'),
          content: t('page.sendToken.blockedTransactionContent'),
          okText: t('page.sendToken.blockedTransactionCancelText'),
          onCancel: async () => {
            await wallet.clearPageStateCache();
            handleClickBack();
          },
          onOk: async () => {
            await wallet.clearPageStateCache();
            handleClickBack();
          },
        });
      }
    } catch (e) {
      // NOTHING
    }
  });

  const handleFormValuesChange = useCallback(
    async (
      changedValues,
      { amount, ...restForm }: FormSendToken,
      opts?: {
        token?: TokenItem;
        isInitFromCache?: boolean;
      }
    ) => {
      const { token, isInitFromCache } = opts || {};
      if (changedValues && changedValues.to) {
        handleReceiveAddressChanged(changedValues.to);
      }

      const targetToken = token || currentToken;

      let resultAmount = amount;
      if (!/^\d*(\.\d*)?$/.test(amount)) {
        resultAmount = cacheAmount;
      }

      if (amount !== cacheAmount) {
        if (showGasReserved && Number(resultAmount) > 0) {
          setShowGasReserved(false);
        }
      }

      if (
        new BigNumber(resultAmount || 0).isGreaterThan(
          new BigNumber(targetToken.raw_amount_hex_str || 0).div(
            10 ** targetToken.decimals
          )
        )
      ) {
        // Insufficient balance
        setBalanceError(t('page.sendToken.balanceError.insufficientBalance'));
      } else {
        setBalanceError(null);
      }
      const nextFormValues = {
        ...restForm,
        to: toAddress,
        amount: resultAmount,
      };

      await persistPageStateCache({
        values: nextFormValues,
        currentToken: targetToken,
      });

      form.setFieldsValue(nextFormValues);
      setFormSnapshot(nextFormValues);
      setCacheAmount(resultAmount);
      const aliasName = await wallet.getAlianName(toAddress.toLowerCase());
      if (aliasName) {
        setContactInfo({ address: toAddress, name: aliasName });
      } else if (contactInfo) {
        setContactInfo(null);
      }
    },
    [
      cacheAmount,
      contactInfo,
      currentToken,
      form,
      handleReceiveAddressChanged,
      persistPageStateCache,
      setShowGasReserved,
      showGasReserved,
      t,
      toAddress,
      wallet,
    ]
  );

  const estimateGasOnChain = useCallback(
    async (input?: {
      chainItem?: Chain | null;
      tokenItem?: TokenItem;
      currentAddress?: string;
    }) => {
      const result = { gasNumber: 0 };

      const doReturn = (nextGas = DEFAULT_GAS_USED) => {
        result.gasNumber = nextGas;

        setEstimatedGas(result.gasNumber);
        return result;
      };

      const {
        chainItem: lastestChainItem = chainItem,
        tokenItem = currentToken,
        currentAddress = currentAccount?.address,
      } = input || {};

      if (!lastestChainItem?.needEstimateGas) return doReturn(DEFAULT_GAS_USED);

      if (!currentAddress) return doReturn();

      if (lastestChainItem.serverId !== tokenItem.chain) {
        console.warn(
          'estimateGasOnChain:: chain not matched!',
          lastestChainItem,
          tokenItem
        );
        return doReturn();
      }

      let _gasUsed: string = intToHex(DEFAULT_GAS_USED);
      try {
        _gasUsed = await wallet.requestETHRpc<string>(
          {
            method: 'eth_estimateGas',
            params: [
              {
                from: currentAddress,
                to:
                  toAddress && isValidAddress(toAddress)
                    ? toAddress
                    : zeroAddress(),
                gasPrice: intToHex(0),
                value: intToHex(0),
              },
            ],
          },
          lastestChainItem.serverId
        );
      } catch (err) {
        console.error(err);
      }

      const gasUsed = new BigNumber(_gasUsed)
        .multipliedBy(1.5)
        .integerValue()
        .toNumber();

      return doReturn(Number(gasUsed));
    },
    [chainItem, currentToken, currentAccount?.address, wallet, toAddress]
  );

  const loadCurrentToken = useCallback(
    async (id: string, chainId: string, currentAddress: string) => {
      const chain = findChain({
        serverId: chainId,
      });
      let result: TokenItem | null = null;
      if (chain?.isTestnet) {
        const res = await wallet.getCustomTestnetToken({
          address: currentAddress,
          chainId: chain.id,
          tokenId: id,
        });
        if (res) {
          result = customTestnetTokenToTokenItem(res);
        }
      } else {
        result = await wallet.openapi.getToken(currentAddress, chainId, id);
      }
      if (result) {
        estimateGasOnChain({
          chainItem: chain,
          tokenItem: result,
          currentAddress,
        });
        setCurrentToken(result);
      }
      setIsLoading(false);

      return result;
    },
    [wallet, estimateGasOnChain]
  );

  const handleAmountChange = useCallback(() => {
    cancelClickedMax();
  }, [cancelClickedMax]);

  const handleCurrentTokenChange = useCallback(
    async (token: TokenItem) => {
      cancelClickedMax();
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
      const chainItem = findChain({ serverId: token.chain });
      setChain(chainItem?.enum ?? CHAINS_ENUM.ETH);
      setCurrentToken(token);
      setEstimatedGas(0);
      await persistPageStateCache({ currentToken: token });
      setBalanceError(null);
      setIsLoading(true);
      loadCurrentToken(token.id, token.chain, account.address);
    },
    [
      currentToken.chain,
      currentToken.id,
      form,
      loadCurrentToken,
      persistPageStateCache,
      setShowGasReserved,
      showGasReserved,
      wallet,
      cancelClickedMax,
    ]
  );

  const handleGasChange = useCallback(
    (input: {
      gasLevel: GasLevel;
      updateTokenAmount?: boolean;
      gasLimit?: number;
    }) => {
      const {
        gasLevel,
        updateTokenAmount = true,
        gasLimit = MINIMUM_GAS_LIMIT,
      } = input;
      setSelectedGasLevel(gasLevel);

      const gasTokenAmount = new BigNumber(gasLevel.price)
        .times(gasLimit)
        .div(1e18);
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
    },
    [
      currentToken.decimals,
      currentToken.raw_amount_hex_str,
      form,
      setShowGasReserved,
    ]
  );

  const couldReserveGas = isNativeToken && !isGnosisSafe;

  const handleMaxInfoChanged = useCallback(
    async (input?: { gasLevel: GasLevel }) => {
      if (!currentAccount) return;

      if (isLoading) return;
      if (isEstimatingGas) return;

      const tokenBalance = new BigNumber(
        currentToken.raw_amount_hex_str || 0
      ).div(10 ** currentToken.decimals);
      let amount = tokenBalance.toFixed();

      const {
        gasLevel = selectedGasLevel ||
          (await loadGasList().then(findInstanceLevel)),
      } = input || {};
      const needReserveGasOnSendToken = gasLevel.price > 0;

      if (couldReserveGas && needReserveGasOnSendToken) {
        setShowGasReserved(true);
        setSendMaxInfo((prev) => ({ ...prev, isEstimatingGas: true }));
        try {
          const { gasNumber } = await estimateGasOnChain({
            chainItem,
            tokenItem: currentToken,
          });

          let gasTokenAmount = handleGasChange({
            gasLevel: gasLevel,
            updateTokenAmount: false,
            gasLimit: gasNumber,
          });
          if (CAN_ESTIMATE_L1_FEE_CHAINS.includes(chain)) {
            const l1GasFee = await wallet.fetchEstimatedL1Fee(
              {
                txParams: {
                  chainId: chainItem.id,
                  from: currentAccount.address,
                  to:
                    toAddress && isValidAddress(toAddress)
                      ? toAddress
                      : zeroAddress(),
                  value: currentToken.raw_amount_hex_str,
                  gas: intToHex(DEFAULT_GAS_USED),
                  gasPrice: `0x${new BigNumber(gasLevel.price).toString(16)}`,
                  data: '0x',
                },
              },
              chain
            );
            gasTokenAmount = gasTokenAmount
              .plus(new BigNumber(l1GasFee).div(1e18))
              .times(1.1);
          }
          const tokenForSend = tokenBalance.minus(gasTokenAmount);
          amount = tokenForSend.gt(0) ? tokenForSend.toFixed() : '0';
          if (tokenForSend.lt(0)) {
            setShowGasReserved(false);
          }
        } catch (e) {
          if (!isGnosisSafe) {
            setShowGasReserved(false);
          }
        } finally {
          setSendMaxInfo((prev) => ({ ...prev, isEstimatingGas: false }));
        }
      }

      const values = form.getFieldsValue();
      const newValues = {
        ...values,
        amount,
      };
      form.setFieldsValue(newValues);
      handleFormValuesChange(null, newValues);
    },
    [
      currentAccount,
      isLoading,
      isEstimatingGas,
      currentToken,
      selectedGasLevel,
      loadGasList,
      couldReserveGas,
      form,
      handleFormValuesChange,
      setShowGasReserved,
      estimateGasOnChain,
      chainItem,
      handleGasChange,
      chain,
      wallet,
      toAddress,
      isGnosisSafe,
    ]
  );
  const handleGasLevelChanged = useCallback(
    async (gl?: GasLevel | null) => {
      handleReserveGasClose();
      const gasLevel = gl
        ? gl
        : await loadGasList().then(
            (res) =>
              res.find((item) => item.level === 'normal') ||
              findInstanceLevel(res)
          );

      setSelectedGasLevel(gasLevel);
      handleMaxInfoChanged({ gasLevel });
    },
    [handleReserveGasClose, handleMaxInfoChanged, loadGasList]
  );

  const handleClickMaxButton = useCallback(async () => {
    setSendMaxInfo((prev) => ({ ...prev, clickedMax: true }));

    if (couldReserveGas) {
      setReserveGasOpen(true);
    } else {
      handleMaxInfoChanged();
    }
  }, [couldReserveGas, handleMaxInfoChanged]);

  const handleClickBack = () => {
    const from = (history.location.state as any)?.from;
    if (from) {
      history.replace(from);
    } else if (history.length > 1) {
      history.goBack();
    } else {
      history.replace(`/send-poly${history.location.search}`);
    }
  };

  const initByCache = async () => {
    const account = (await wallet.syncGetCurrentAccount())!;
    const qs = query2obj(history.location.search);

    if (qs.token) {
      const [tokenChain, id] = qs.token.split(':');
      if (!tokenChain || !id) return;

      const target = findChain({
        serverId: tokenChain,
      });
      if (!target) {
        loadCurrentToken(currentToken.id, currentToken.chain, account.address);
        return;
      }
      setChain(target.enum);
      loadCurrentToken(id, tokenChain, account.address);
    } else if ((history.location.state as any)?.safeInfo) {
      const safeInfo: {
        nonce: number;
        chainId: number;
      } = (history.location.state as any)?.safeInfo;

      const chain = findChainByID(safeInfo.chainId);
      let nativeToken: TokenItem | null = null;
      if (chain) {
        setChain(chain.enum);
        nativeToken = await loadCurrentToken(
          chain.nativeTokenAddress,
          chain.serverId,
          account.address
        );
      }
      setSafeInfo(safeInfo);
      persistPageStateCache({
        safeInfo,
        currentToken: nativeToken || currentToken,
      });
    } else {
      let tokenFromOrder: TokenItem | null = null;

      const lastTimeToken = await wallet.getLastTimeSendToken(account.address);
      if (
        !(
          lastTimeToken &&
          findChain({
            serverId: lastTimeToken.chain,
          })
        )
      ) {
        const { firstChain } = await dispatch.chains.getOrderedChainList({
          supportChains: undefined,
        });
        tokenFromOrder = firstChain ? makeTokenFromChain(firstChain) : null;
      }

      let needLoadToken: TokenItem =
        lastTimeToken || tokenFromOrder || currentToken;

      let cachesState;
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache?.path === history.location.pathname) {
          if (cache.states.values) {
            form.setFieldsValue(cache.states.values);
            handleFormValuesChange(cache.states.values, form.getFieldsValue(), {
              token: cache.states.currentToken,
              isInitFromCache: true,
            });
          }
          if (cache.states.currentToken) {
            cachesState = cache.states;
            needLoadToken = cache.states.currentToken;
          }
          if (cache.states.safeInfo) {
            setSafeInfo(cache.states.safeInfo);
          }
        }
      }

      // check the recommended token is support for address
      const {
        isCex,
        isCexSupport,
        isContractAddress,
        contractSupportChain,
      } = await isTokenSupport(needLoadToken.id, needLoadToken.chain);

      // CEX CHECK: 交易所地址但不支持该token，默认eth:eth
      if (isCex && !isCexSupport) {
        needLoadToken = DEFAULT_TOKEN;
        // reset formValues change
        if (cachesState) {
          handleFormValuesChange(cachesState.values, form.getFieldsValue(), {
            token: DEFAULT_TOKEN,
            isInitFromCache: true,
          });
        }
        // CONTRACT CHECK: 合约地址但合约不支持该token，默认第一个支持的链的原生代币
      } else if (
        isContractAddress &&
        !contractSupportChain.includes(needLoadToken.chain)
      ) {
        const chainList = contractSupportChain
          .map((chain) => findChain({ serverId: chain })?.enum)
          .filter((chainEnum): chainEnum is CHAINS_ENUM => !!chainEnum);
        let { firstChain } = await dispatch.chains.getOrderedChainList({
          supportChains: chainList,
        });
        const noSortFirstChain = findChainByEnum(chainList[0]);
        if (!firstChain && noSortFirstChain) {
          firstChain = noSortFirstChain;
        }
        if (firstChain) {
          const targetToken = makeTokenFromChain(firstChain);
          needLoadToken = targetToken;
          // reset formValues change
          if (cachesState) {
            handleFormValuesChange(cachesState.values, form.getFieldsValue(), {
              token: targetToken,
              isInitFromCache: true,
            });
          }
        }
      }
      setCurrentToken(needLoadToken);

      if (chainItem && needLoadToken.chain !== chainItem.serverId) {
        const target = findChain({ serverId: needLoadToken.chain });
        if (target?.enum) {
          setChain(target.enum);
        }
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
    if (inited && currentAccount?.address) {
      initByCache();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inited, currentAccount?.address]);

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { balanceNumText } = useMemo(() => {
    const balanceNum = new BigNumber(currentToken.raw_amount_hex_str || 0).div(
      10 ** currentToken.decimals
    );
    const decimalPlaces = clickedMax || selectedGasLevel ? 8 : 4;

    return {
      balanceNumText: formatTokenAmount(
        balanceNum.toFixed(decimalPlaces, BigNumber.ROUND_FLOOR),
        decimalPlaces
      ),
    };
  }, [
    currentToken.raw_amount_hex_str,
    currentToken.decimals,
    clickedMax,
    selectedGasLevel,
  ]);

  useEffect(() => {
    if (currentToken && gasList) {
      const result = checkIfTokenBalanceEnough(currentToken, {
        gasList,
        gasLimit: MINIMUM_GAS_LIMIT,
      });

      if (result.isNormalEnough && result.normalLevel) {
        setSelectedGasLevel(result.normalLevel);
      } else if (result.isSlowEnough && result.slowLevel) {
        setSelectedGasLevel(result.slowLevel);
      } else if (result.customLevel) {
        setSelectedGasLevel(result.customLevel);
      }
    }
  }, [currentToken, gasList]);

  return (
    <FullscreenContainer className="h-[700px]">
      <div
        className={clsx(
          'send-token',
          isTab
            ? 'w-full h-full overflow-auto min-h-0 rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
            : ''
        )}
      >
        <PageHeader
          onBack={handleClickBack}
          forceShowBack={!isTab}
          canBack={!isTab}
          rightSlot={
            isTab ? null : (
              <div
                className="text-r-neutral-title1 cursor-pointer absolute right-0"
                onClick={() => {
                  openInternalPageInTab(`send-token${history.location.search}`);
                }}
              >
                <RcIconFullscreen />
              </div>
            )
          }
        >
          {t('page.sendToken.header.title')}
        </PageHeader>
        <Form
          form={form}
          className="send-token-form"
          onFinish={handleSubmit}
          onValuesChange={handleFormValuesChange}
          initialValues={{
            to: toAddress,
            amount: '',
          }}
        >
          <div className="flex-1 overflow-auto">
            <div className="section relative">
              <div className="section-title mt-[8px] font-medium">
                {t('page.sendToken.sectionFrom.title')}
              </div>
              <AccountItem
                balance={currentAccountBalance || 0}
                address={currentAccount?.address || ''}
                type={currentAccount?.type || ''}
                brandName={currentAccount?.brandName || ''}
                onClick={() => {
                  setShowSelectorModal(true);
                }}
                className="w-full bg-r-neutral-card1 rounded-[8px]"
                rightIcon={
                  <div className="text-r-neutral-foot">
                    <RcIconDownCC width={16} height={16} />
                  </div>
                }
              />
              <div className="section-title mt-[20px]">
                <span className="section-title__to font-medium">
                  {t('page.sendToken.sectionTo.title')}
                </span>
              </div>
              <div className="to-address">
                <AccountItem
                  balance={
                    targetAccount?.balance || addressDesc?.usd_value || 0
                  }
                  address={targetAccount?.address || ''}
                  type={targetAccount?.type || ''}
                  alias={
                    targetAccount?.address
                      ? ellipsis(targetAccount?.address)
                      : ''
                  }
                  showWhitelistIcon={whitelist?.some(
                    (w) =>
                      targetAccount?.address &&
                      isSameAddress(w, targetAccount?.address)
                  )}
                  tmpCexInfo={tmpCexInfo}
                  brandName={targetAccount?.brandName || ''}
                  onClick={() => {
                    history.push(`/send-poly${history.location.search}`);
                  }}
                  className="w-full bg-r-neutral-card1 rounded-[8px]"
                  rightIcon={
                    <div className="text-r-neutral-foot">
                      <RcIconSwitchCC width={16} height={16} />
                    </div>
                  }
                />
              </div>
            </div>
            <div className="section">
              <div className="section-title flex justify-between items-center">
                <div className="token-balance whitespace-pre-wrap font-medium">
                  {t('page.sendToken.sectionBalance.title')}
                </div>
              </div>
              <Form.Item name="amount">
                {currentAccount && chainItem && (
                  <TokenAmountInput
                    className="bg-r-neutral-card1 rounded-[8px]"
                    token={currentToken}
                    onChange={handleAmountChange}
                    onTokenChange={handleCurrentTokenChange}
                    chainId={chainItem.serverId}
                    excludeTokens={[]}
                    disableItemCheck={disableItemCheck}
                    balanceNumText={balanceNumText}
                    insufficientError={!!balanceError}
                    handleClickMaxButton={handleClickMaxButton}
                    isLoading={isLoading}
                    getContainer={getContainer}
                  />
                )}
              </Form.Item>
            </div>
          </div>

          <div className={clsx('footer', isTab ? 'rounded-b-[16px]' : '')}>
            <div className="btn-wrapper w-[100%] px-[16px] flex justify-center">
              <Button
                disabled={!canSubmit}
                type="primary"
                htmlType="submit"
                size="large"
                className="w-[100%] h-[48px] text-[16px]"
                loading={isSubmitLoading}
              >
                {t('page.sendToken.sendButton')}
              </Button>
            </div>
          </div>
        </Form>
        <SendReserveGasPopup
          selectedItem={selectedGasLevel?.level as GasLevelType}
          chain={chain}
          limit={Math.max(estimatedGas, MINIMUM_GAS_LIMIT)}
          onGasChange={(gasLevel) => {
            handleGasLevelChanged(gasLevel);
          }}
          gasList={gasList}
          visible={reserveGasOpen}
          isLoading={loadingGasList}
          rawHexBalance={currentToken.raw_amount_hex_str}
          onClose={() => handleReserveGasClose()}
          getContainer={getContainer}
        />
        <AccountSelectorModal
          title={t('page.sendToken.selectFromAddress')}
          visible={showSelectorModal}
          onChange={handleFromAddressChange}
          onCancel={handleFromAddressCancel}
          value={currentAccount}
          getContainer={getContainer}
          height="calc(100% - 60px)"
        />
        <MiniApproval
          txs={miniSignTxs}
          visible={isShowMiniSign}
          ga={{
            category: 'Send',
            source: 'sendToken',
            trigger: filterRbiSource('sendToken', rbisource) && rbisource, // mark source module of `sendToken`
          }}
          onClose={() => {
            setRefreshId((e) => e + 1);
            setIsShowMiniSign(false);
            setTimeout(() => {
              setMiniSignTx(null);
            }, 500);
          }}
          onReject={() => {
            setRefreshId((e) => e + 1);
            setIsShowMiniSign(false);
            setMiniSignTx(null);
          }}
          onResolve={handleMiniSignResolve}
          getContainer={getContainer}
        />
      </div>
    </FullscreenContainer>
  );
};

export default isTab
  ? connectStore()(withAccountChange(SendToken))
  : connectStore()(SendToken);
