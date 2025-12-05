/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useAsyncFn, usePrevious } from 'react-use';
import { Form, message, Modal } from 'antd';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import { useMemoizedFn } from 'ahooks';
import { isValidAddress, intToHex, zeroAddress } from '@ethereumjs/util';
import { globalSupportCexList } from '@/ui/models/exchange';

import {
  CHAINS_ENUM,
  KEYRING_CLASS,
  MINIMUM_GAS_LIMIT,
  CAN_ESTIMATE_L1_FEE_CHAINS,
  CAN_NOT_SPECIFY_INTRINSIC_GAS_CHAINS,
  KEYRING_TYPE,
} from 'consts';
import { useRabbyDispatch, connectStore, useRabbySelector } from 'ui/store';
import {
  getUiType,
  isSameAddress,
  openInternalPageInTab,
  useWallet,
} from 'ui/utils';
import { obj2query, query2obj } from 'ui/utils/url';
import { coerceFloat, formatTokenAmount } from 'ui/utils/number';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import {
  Cex,
  GasLevel,
  TokenItem,
  TokenItemWithEntity,
  Tx,
} from 'background/service/openapi';
import { PageHeader } from 'ui/component';
// import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/send-token/switch-cc.svg';

import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { findChain, findChainByEnum, findChainByID } from '@/utils/chain';
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
import { useAddressInfo } from '@/ui/hooks/useAddressInfo';
import { ellipsisAddress } from '@/ui/utils/address';
import { useInitCheck } from './useInitCheck';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import {
  DirectSubmitProvider,
  supportedDirectSign,
  supportedHardwareDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { ShowMoreOnSend } from './components/SendShowMore';
import { PendingTxItem } from '../Swap/Component/PendingTxItem';
import { SendTxHistoryItem } from '@/background/service/transactionHistory';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import styled from 'styled-components';
import { TDisableCheckChainFn } from '@/ui/component/ChainSelector/components/SelectChainItem';
import { AddressInfoFrom } from '@/ui/component/SendLike/AddressInfoFrom';
import { AddressInfoTo } from '@/ui/component/SendLike/AddressInfoTo';
import BottomArea from './components/BottomArea';
import {
  RiskType,
  sortRisksDesc,
  useAddressRisks,
} from '@/ui/hooks/useAddressRisk';
import { SendSlider } from '@/ui/component/SendLike/Slider';
import { appIsDebugPkg } from '@/utils/env';
import { add, debounce } from 'lodash';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import { useToAddressPositiveTips } from '@/ui/component/SendLike/hooks/useRecentSend';

const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;

const getContainer =
  isTab || isDesktop ? '.js-rabby-popup-container' : undefined;

const abiCoder = (abiCoderInst as unknown) as AbiCoder;

function findInstanceLevel(gasList: GasLevel[]) {
  if (!gasList.length) return;

  return gasList.reduce((prev, current) =>
    prev.price >= current.price ? prev : current
  );
}

const DEFAULT_GAS_USED = 21000;

const DEFAULT_TOKEN: TokenItem = {
  id: 'eth',
  chain: 'eth',
  name: 'ETH',
  symbol: 'ETH',
  display_symbol: null,
  optimized_symbol: 'ETH',
  decimals: 18,
  logo_url:
    'https://static.debank.com/image/coin/logo_url/eth/6443cdccced33e204d90cb723c632917.png',
  price: 0,
  is_verified: true,
  is_core: true,
  is_wallet: true,
  time_at: 0,
  amount: 0,
  cex_ids: [],
};

type FormSendToken = {
  to: string;
  amount: string;
};

function formatAmountString(
  amount: number | string | BigNumber,
  decimals: number = 4
) {
  const amountBigNumber = new BigNumber(
    BigNumber.isBigNumber(amount) ? amount : coerceFloat(amount)
  );

  return amountBigNumber.lt(0.0001)
    ? amountBigNumber.toString(10)
    : new BigNumber(amountBigNumber.toFixed(decimals, 1)).toString(10);
}

function getSliderPercent(
  amountValue: string | number,
  inputs: {
    token?: TokenItem | null;
  }
) {
  const { token } = inputs || {};

  let balanceBigNum = new BigNumber(0);
  if (token) {
    balanceBigNum = new BigNumber(token.raw_amount_hex_str || 0).div(
      10 ** token.decimals
    );

    if (balanceBigNum.isZero()) return 0;

    const val =
      coerceFloat(
        new BigNumber(coerceFloat(amountValue, 0)).div(balanceBigNum).toFixed(2)
      ) * 100;

    return Math.max(0, Math.min(100, val));
  }

  return 0;
}

function encodeTokenParam(currentToken: Pick<TokenItem, 'chain' | 'id'>) {
  return `${currentToken.chain}:${currentToken.id}`;
}

function decodeTokenParam(tokenParam: string) {
  const [chain, id] = tokenParam.split(':');
  return { chain, id };
}

const ChainSelectWrapper = styled.div`
  border: 1px solid transparent;
  border-bottom: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  &:hover {
    border: 1px solid var(--r-blue-default, #7084ff);
    background-color: var(--r-blue-light-1, #eef1ff);
    border-radius: 8px;
  }
`;

const SendToken = () => {
  const { useForm } = Form;
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useRabbyDispatch();
  const rbisource = useRbiSource();
  const { search } = useLocation();
  const wallet = useWallet();

  // UI States
  const [reserveGasOpen, setReserveGasOpen] = useState(false);
  const [refreshId, setRefreshId] = useState(0);

  // Core States
  const [form] = useForm<FormSendToken>();
  const { toAddress, toAddressType, paramAmount } = useMemo(() => {
    const query = new URLSearchParams(search);
    return {
      toAddress: query.get('to') || '',
      toAddressType: query.get('type') || '',
      paramAmount: query.get('amount') || '',
    };
  }, [search]);

  const currentAccount = useCurrentAccount();
  const [chain, setChain] = useState(CHAINS_ENUM.ETH);
  const chainItem = useMemo(() => findChain({ enum: chain }), [chain]);

  const { openDirect, prefetch } = useMiniSigner({
    account: currentAccount!,
    chainServerId: chainItem?.serverId,
    autoResetGasStoreOnChainChange: true,
  });
  const [currentToken, setCurrentToken] = useState<TokenItem | null>(
    DEFAULT_TOKEN
  );

  const [safeInfo, setSafeInfo] = useState<{
    chainId: number;
    nonce: number;
  } | null>(null);

  const [inited, setInited] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
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
  const [chainTokenGasFees, setChainTokenGasFees] = useState<{
    gasLimit: number;
    maybeL1Fee: BigNumber | null;
  }>({
    gasLimit: MINIMUM_GAS_LIMIT,
    maybeL1Fee: null,
  });

  const isGnosisSafe = useMemo(() => {
    return currentAccount?.type === KEYRING_CLASS.GNOSIS;
  }, [currentAccount?.type]);

  useEffect(() => {
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      to: toAddress,
    });
  }, [toAddress, history, search, form]);

  const {
    targetAccount,
    isMyImported,
    addressDesc,
    loading: loadingToAddressDesc,
  } = useAddressInfo(toAddress, {
    type: toAddressType,
  });
  useInitCheck(addressDesc);

  const disableItemCheck = useCallback(
    (
      token: TokenItemWithEntity
    ): {
      disable: boolean;
      reason: string;
      shortReason: string;
      cexId?: string;
    } => {
      if (!addressDesc) {
        return {
          disable: false,
          cexId: '',
          reason: '',
          shortReason: '',
        };
      }

      const toCexId = addressDesc?.cex?.id;
      const isSupportCEX = globalSupportCexList.find(
        (cex) => cex.id === toCexId
      );
      if (toCexId && isSupportCEX) {
        const cex_ids =
          token.cex_ids || token.identity?.cex_list?.map((item) => item.id);
        const noSupportToken = cex_ids?.every?.(
          (id) => id.toLowerCase() !== toCexId.toLowerCase()
        );
        if (!cex_ids?.length || noSupportToken) {
          return {
            disable: true,
            cexId: toCexId,
            reason: t('page.sendToken.noSupprotTokenForDex'),
            shortReason: t('page.sendToken.noSupprotTokenForDex_short'),
          };
        }
      } else {
        const safeChains = Object.entries(addressDesc?.contract || {})
          .filter(([, contract]) => {
            return contract.multisig;
          })
          .map(([chain]) => chain?.toLowerCase());
        if (
          safeChains.length > 0 &&
          !safeChains.includes(token?.chain?.toLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupprotTokenForSafe'),
            shortReason: t('page.sendToken.noSupprotTokenForSafe_short'),
          };
        }
        const contactChains = Object.entries(
          addressDesc?.contract || {}
        ).map(([chain]) => chain?.toLowerCase());
        if (
          contactChains.length > 0 &&
          !contactChains.includes(token?.chain?.toLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupportTokenForChain'),
            shortReason: t('page.sendToken.noSupportTokenForChain_short'),
          };
        }
      }
      return {
        disable: false,
        cexId: '',
        reason: '',
        shortReason: '',
      };
    },
    [addressDesc, t]
  );

  const disableChainCheck: TDisableCheckChainFn = useCallback(
    (chain) => {
      // do not check cex
      if (!addressDesc || addressDesc.cex?.id) {
        return {
          disable: false,
          reason: '',
          shortReason: '',
        };
      }

      const safeChains = Object.entries(addressDesc?.contract || {})
        .filter(([, contract]) => {
          return contract.multisig;
        })
        .map(([chain]) => chain?.toLowerCase());
      if (safeChains.length > 0 && !safeChains.includes(chain?.toLowerCase())) {
        return {
          disable: true,
          reason: t('page.sendToken.noSupprotTokenForSafe'),
          shortReason: t('page.sendToken.noSupprotTokenForSafe_short'),
        };
      }
      const contactChains = Object.entries(
        addressDesc?.contract || {}
      ).map(([chain]) => chain?.toLowerCase());
      if (
        contactChains.length > 0 &&
        !contactChains.includes(chain?.toLowerCase())
      ) {
        return {
          disable: true,
          reason: t('page.sendToken.noSupportTokenForChain'),
          shortReason: t('page.sendToken.noSupportTokenForChain_short'),
        };
      }

      return {
        disable: false,
        reason: '',
        shortReason: '',
      };
    },
    [addressDesc, t]
  );

  const [agreeRequiredChecks, setAgreeRequiredChecks] = useState({
    forToAddress: false,
    forToken: false,
  });
  const { loading: loadingRisks, risks } = useAddressRisks({
    toAddress: toAddress || '',
    fromAddress: currentAccount?.address,
    onLoadFinished: useCallback(() => {
      setAgreeRequiredChecks((prev) => ({ ...prev, forToAddress: false }));
    }, []),
    scene: 'send-token',
  });

  const toAddressPositiveTips = useToAddressPositiveTips({
    toAddress,
    isMyImported,
  });

  const {
    mostImportantRisks,
    hasRiskForToAddress,
    hasRiskForToken,
  } = React.useMemo(() => {
    const ret = {
      risksForToAddress: [] as { value: string }[],
      risksForToken: [] as { value: string }[],
      mostImportantRisks: [] as { value: string }[],
    };
    if (risks.length) {
      const sorted = (!toAddressPositiveTips.hasPositiveTips
        ? [...risks]
        : [...risks].filter((item) => item.type !== RiskType.NEVER_SEND)
      ).sort(sortRisksDesc);

      ret.risksForToAddress = sorted
        .slice(0, 1)
        .map((item) => ({ value: item.value }));
    }

    if (!ret.risksForToAddress.length) {
      const disableCheck = currentToken ? disableItemCheck(currentToken) : null;

      if (disableCheck?.disable) {
        ret.risksForToken.push({ value: disableCheck.shortReason });
      }
    }

    if (appIsDebugPkg) {
      if (ret.risksForToAddress.length && ret.risksForToken.length) {
        throw new Error(
          'Address risk and Token risk should not appear at the same time'
        );
      }
    }

    ret.mostImportantRisks = [
      ...ret.risksForToAddress,
      ...ret.risksForToken,
    ].slice(0, 1);

    return {
      mostImportantRisks: ret.mostImportantRisks,
      hasRiskForToAddress: !!ret.risksForToAddress.length,
      hasRiskForToken: !!ret.risksForToken.length,
    };
  }, [
    toAddressPositiveTips.hasPositiveTips,
    currentToken,
    risks,
    disableItemCheck,
  ]);

  const agreeRequiredChecked =
    (hasRiskForToAddress && agreeRequiredChecks.forToAddress) ||
    (hasRiskForToken && agreeRequiredChecks.forToken);

  const canSubmitBasic =
    isValidAddress(form.getFieldValue('to')) &&
    !!currentToken &&
    !balanceError &&
    new BigNumber(form.getFieldValue('amount')).gte(0) &&
    !isLoading;

  const canSubmit =
    canSubmitBasic &&
    !loadingRisks &&
    (!hasRiskForToAddress || agreeRequiredChecked) &&
    (!hasRiskForToken || agreeRequiredChecked);

  const isNativeToken =
    !!chainItem && currentToken?.id === chainItem.nativeTokenAddress;

  const getParams = React.useCallback(
    ({ amount }: FormSendToken) => {
      if (!currentToken) {
        return {};
      }
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
    [currentAccount, currentToken, isNativeToken, safeInfo?.nonce, toAddress]
  );

  const fetchGasList = useCallback(async () => {
    const values = form.getFieldsValue();
    const params = getParams(values) as Tx;

    const list: GasLevel[] = chainItem?.isTestnet
      ? await wallet.getCustomTestnetGasMarket({ chainId: chainItem.id })
      : params?.from
      ? await wallet.gasMarketV2({
          chain: chainItem!,
          tx: params,
        })
      : [];
    return list;
  }, [chainItem, form, getParams, wallet]);

  const [
    { value: gasList, loading: loadingGasList },
    loadGasList,
  ] = useAsyncFn(() => {
    return fetchGasList();
  }, [fetchGasList]);

  useEffect(() => {
    if (clickedMax) {
      loadGasList();
    }
  }, [clickedMax, loadGasList]);

  const fetchExtraGasFees = useCallback(
    async (input: { gasPrice?: number }) => {
      const ret = {
        gasLimit: 0,
        maybeL1Fee: new BigNumber(0),
      };
      const doReturn = (
        gasLimit: number | BigNumber,
        l1Value: number | BigNumber = 0
      ) => {
        // ret.gasLimit = new BigNumber(baseValue);
        ret.maybeL1Fee = new BigNumber(l1Value);

        setChainTokenGasFees((prev) => ({
          ...prev,
          maybeL1Fee: ret.maybeL1Fee,
        }));

        return ret;
      };

      if (!currentAccount?.address) return doReturn(0, 0);
      if (!currentToken || !CAN_ESTIMATE_L1_FEE_CHAINS.includes(chain))
        return doReturn(0, 0);

      const {
        gasPrice = (await loadGasList().then(findInstanceLevel))?.price || 0,
      } = input;

      const l1GasFee = await wallet.fetchEstimatedL1Fee(
        {
          txParams: {
            chainId: chainItem?.id,
            from: currentAccount?.address,
            to:
              toAddress && isValidAddress(toAddress)
                ? toAddress
                : zeroAddress(),
            value: currentToken.raw_amount_hex_str,
            gas: intToHex(DEFAULT_GAS_USED),
            gasPrice: `0x${new BigNumber(gasPrice).toString(16)}`,
            data: '0x',
          },
        },
        chain
      );

      return doReturn(0, new BigNumber(l1GasFee || 0));
    },
    [
      currentAccount?.address,
      loadGasList,
      chainItem?.id,
      currentToken,
      wallet,
      chain,
      toAddress,
    ]
  );

  const defaultGasLevel = useMemo(() => {
    return findInstanceLevel(gasList || []);
  }, [gasList]);
  useEffect(() => {
    fetchExtraGasFees({
      gasPrice: selectedGasLevel?.price || defaultGasLevel?.price,
    });
  }, [fetchExtraGasFees, selectedGasLevel?.price, defaultGasLevel?.price]);

  const [miniSignLoading, setMiniSignLoading] = useState(false);

  const canUseDirectSubmitTx = useMemo(() => {
    let sendToOtherChainContract = false;
    if (addressDesc && chainItem) {
      const arr = Object.keys(addressDesc.contract || {}).map((chain) =>
        chain.toLowerCase()
      );
      if (arr.length > 0) {
        // is contract address
        sendToOtherChainContract = !arr.includes(
          chainItem.serverId.toLowerCase()
        );
      }
    }
    return (
      canSubmitBasic &&
      supportedDirectSign(currentAccount?.type || '') &&
      !chainItem?.isTestnet &&
      !sendToOtherChainContract
    );
  }, [canSubmitBasic, chainItem, currentAccount?.type, addressDesc]);

  const { runAsync: handleSubmit, loading: isSubmitLoading } = useRequest(
    async ({
      amount,
      forceSignPage,
    }: FormSendToken & { forceSignPage?: boolean }) => {
      if (!currentToken || !currentAccount?.address) {
        return;
      }
      const params = getParams({
        to: toAddress,
        amount,
      });

      let shouldForceSignPage = !!forceSignPage;

      if (canUseDirectSubmitTx && !shouldForceSignPage) {
        setMiniSignLoading(true);
        try {
          // no need to wait
          wallet.setLastTimeSendToken(currentToken).catch((error) => {
            console.error('[MiniSign] setLastTimeSendToken error', error);
          });

          const hashes = await openDirect({
            txs: [params as Tx],
            ga: {
              category: 'Send',
              source: 'sendToken',
              trigger: filterRbiSource('sendToken', rbisource) && rbisource,
            },
            getContainer,
          });

          handleFormValuesChange(
            {
              amount: '',
            },
            {
              ...form.getFieldsValue(),
              amount: '',
            },
            {
              updateHistoryState: true,
            }
          );
          const hash = hashes[hashes.length - 1];
          if (hash) {
            await handleMiniSignResolve();
          } else {
            setMiniSignLoading(false);
          }

          return;
        } catch (error) {
          console.error('send token direct sign error', error);

          setMiniSignLoading(false);
          if (
            error === MINI_SIGN_ERROR.USER_CANCELLED ||
            error === MINI_SIGN_ERROR.CANT_PROCESS
          ) {
            return;
          }

          shouldForceSignPage = true;
        }
      }

      const chain = findChain({
        serverId: currentToken.chain,
      })!;

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

          if (chainTokenGasFees.gasLimit) {
            gasLimit = chainTokenGasFees.gasLimit;
          }

          /**
           * we don't need always fetch chainTokenGasFees.gasLimit, if no `params.gas` set below,
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

        !isGnosisSafe &&
          wallet.addCacheHistoryData(
            `${chain.enum}-${params.data || '0x'}`,
            {
              address: currentAccount!.address,
              chainId: findChainByEnum(chain.enum)?.id || 0,
              from: currentAccount!.address,
              to: toAddress,
              token: currentToken,
              amount: Number(amount),
              status: 'pending',
              createdAt: Date.now(),
            } as SendTxHistoryItem,
            'send'
          );

        // no need to wait
        wallet.setLastTimeSendToken(currentToken).catch((error) => {
          console.error('[FullSign] setLastTimeSendToken error', error);
        });
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

        if (isTab || isDesktop) {
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

  const replaceHistorySearch = useCallback(
    (input: { token?: TokenItem; amount?: string }) => {
      const { token, amount } = input;
      const searchParams = new URLSearchParams(history.location.search);
      if (token) {
        searchParams.set('token', encodeTokenParam(token));
      } else if (token === null) {
        searchParams.delete('token');
      }
      if (amount !== undefined) {
        searchParams.set('amount', amount);
      }

      history.replace({
        pathname: history.location.pathname,
        search: searchParams.toString(),
      });
    },
    [history]
  );

  const initialFormValues = {
    to: toAddress,
    amount: paramAmount || '',
  };
  const amount = useDebounceValue(form.getFieldValue('amount'), 300);
  const address = form.getFieldValue('to');

  useEffect(() => {
    let isCurrent = true;
    const setMiniTx = async () => {
      if (
        canSubmitBasic &&
        canUseDirectSubmitTx &&
        amount &&
        address &&
        currentToken?.chain &&
        !isEstimatingGas &&
        !reserveGasOpen
      ) {
        const chain = findChain({
          serverId: currentToken.chain,
        })!;
        const params = getParams({
          to: toAddress,
          amount: form.getFieldValue('amount'),
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

            if (chainTokenGasFees.gasLimit) {
              gasLimit = chainTokenGasFees.gasLimit;
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

        !isGnosisSafe &&
          wallet.addCacheHistoryData(
            `${chain.enum}-${params.data || '0x'}`,
            {
              address: currentAccount!.address,
              chainId: findChainByEnum(chain.enum)?.id || 0,
              from: currentAccount!.address,
              to: toAddress,
              token: currentToken,
              amount: Number(amount),
              status: 'pending',
              createdAt: Date.now(),
            } as SendTxHistoryItem,
            'send'
          );

        if (isCurrent) {
          prefetch({
            txs: [params as Tx],
            ga: {
              category: 'Send',
              source: 'sendToken',
              trigger: filterRbiSource('sendToken', rbisource) && rbisource,
            },
            getContainer,
          }).catch((error) => {
            if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
              console.error('send token prefetch error', error);
            }
          });
        }
      } else {
        if (isCurrent) {
          prefetch({
            txs: [],
          });
        }
      }
    };
    // setGasFeeOpen(true);
    setMiniTx();
    return () => {
      isCurrent = false;
      prefetch({
        txs: [],
      });
    };
  }, [
    refreshId,
    reserveGasOpen,
    isEstimatingGas,
    isGnosisSafe,
    canSubmitBasic,
    canUseDirectSubmitTx,
    currentToken?.chain,
    getParams,
    toAddress,
    form,
    isNativeToken,
    clickedMax,
    selectedGasLevel?.price,
    wallet,
    chainTokenGasFees.gasLimit,
    amount,
    address,
    currentAccount,
    currentToken,
    prefetch,
    rbisource,
  ]);

  const handleMiniSignResolve = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          setMiniSignLoading(false);
          prefetch({
            txs: [],
          });
          form.setFieldsValue({ amount: '' });
          // persistPageStateCache();
          wallet.clearPageStateCache();
          setRefreshId((e) => e + 1);
          resolve();
        } catch (err) {
          console.error(err);
          reject();
        }
      }, 500);
    });
  }, [form, prefetch, wallet]);

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
      changedValues: null | Partial<FormSendToken>,
      { amount, ...restForm }: FormSendToken,
      opts?: {
        token?: TokenItem;
        isInitFromCache?: boolean;
        updateSliderValue?: boolean;
        updateHistoryState?: boolean;
      }
    ) => {
      const { token, updateSliderValue = true, updateHistoryState = true } =
        opts || {};
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
        targetToken &&
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
      setCacheAmount(resultAmount);

      if (resultAmount) {
        if (updateSliderValue) {
          const percentValue = getSliderPercent(resultAmount, {
            token: targetToken,
          });
          setSliderPercentValue(percentValue);
        }
      } else {
        setSliderPercentValue(0);
      }

      if (updateHistoryState) {
        replaceHistorySearch({
          amount: resultAmount || '',
        });
      }
    },
    [
      cacheAmount,
      currentToken,
      form,
      handleReceiveAddressChanged,
      persistPageStateCache,
      replaceHistorySearch,
      setShowGasReserved,
      showGasReserved,
      t,
      toAddress,
    ]
  );

  const previousAccountAddress = usePrevious(currentAccount?.address);
  useEffect(() => {
    if (
      previousAccountAddress &&
      !isSameAddress(previousAccountAddress, currentAccount?.address || '')
    ) {
      form.setFieldsValue({ amount: '' });
      handleFormValuesChange(
        { amount: '' },
        {
          ...form.getFieldsValue(),
          amount: '',
        },
        {
          updateSliderValue: true,
        }
      );
    }
  }, [
    previousAccountAddress,
    currentAccount?.address,
    form,
    handleFormValuesChange,
  ]);

  const estimateGasOnChain = useCallback(
    async (input?: {
      chainItem?: Chain | null;
      tokenItem?: TokenItem;
      currentAddress?: string;
    }) => {
      const result = { gasNumber: 0 };

      const doReturn = (nextGas = DEFAULT_GAS_USED) => {
        result.gasNumber = nextGas;

        // setEstimatedGas(result.gasNumber);
        setChainTokenGasFees((prev) => {
          return {
            ...prev,
            gasLimit: result.gasNumber,
          };
        });
        return result;
      };

      const {
        chainItem: lastestChainItem = chainItem,
        tokenItem = currentToken,
        currentAddress = currentAccount?.address,
      } = input || {};

      if (!lastestChainItem?.needEstimateGas) return doReturn(DEFAULT_GAS_USED);

      if (!currentAddress) return doReturn();

      if (lastestChainItem.serverId !== tokenItem?.chain) {
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

        const currentValues = form.getFieldsValue();
        if (currentValues.amount && result) {
          const amount = currentValues.amount;
          if (
            new BigNumber(amount || 0).isGreaterThan(
              new BigNumber(result.raw_amount_hex_str || 0).div(
                10 ** result.decimals
              )
            )
          ) {
            setBalanceError(
              t('page.sendToken.balanceError.insufficientBalance')
            );
          } else {
            setBalanceError(null);
          }
        }
      }
      setIsLoading(false);

      if (result && disableItemCheck(result).disable) {
        setAgreeRequiredChecks((prev) => ({ ...prev, forToken: false }));
      }

      return result;
    },
    [wallet, estimateGasOnChain, disableItemCheck, form, t]
  );

  const handleAmountChange = useCallback(() => {
    cancelClickedMax();
  }, [cancelClickedMax]);

  const handleCurrentTokenChange = useCallback(
    async (token: TokenItem, ignoreCache = false) => {
      cancelClickedMax();
      if (showGasReserved) {
        setShowGasReserved(false);
      }
      const account = (await wallet.syncGetCurrentAccount())!;
      const values = form.getFieldsValue();
      if (
        token.id !== currentToken?.id ||
        token.chain !== currentToken?.chain
      ) {
        form.setFieldsValue({
          ...values,
          amount: '',
        });
      }
      const chainItem = findChain({ serverId: token.chain });
      setChain(chainItem?.enum ?? CHAINS_ENUM.ETH);
      setCurrentToken(token);
      // setEstimatedGas(0);
      setChainTokenGasFees((prev) => ({
        ...prev,
        gasLimit: 0,
      }));
      if (!ignoreCache) {
        await persistPageStateCache({ currentToken: token });
      }
      setBalanceError(null);
      setIsLoading(true);
      loadCurrentToken(token.id, token.chain, account.address);

      replaceHistorySearch({
        token: token,
      });
    },
    [
      currentToken?.chain,
      currentToken?.id,
      form,
      loadCurrentToken,
      persistPageStateCache,
      setShowGasReserved,
      showGasReserved,
      wallet,
      cancelClickedMax,
      replaceHistorySearch,
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

      const gasAmount = new BigNumber(gasLevel.price).times(gasLimit).div(1e18);
      if (updateTokenAmount && currentToken) {
        const values = form.getFieldsValue();
        const diffValue = new BigNumber(currentToken.raw_amount_hex_str || 0)
          .div(10 ** currentToken.decimals)
          .minus(gasAmount);
        if (diffValue.lt(0)) {
          setShowGasReserved(false);
        }
        const newValues = {
          ...values,
          amount: diffValue.gt(0) ? diffValue.toFixed() : '0',
        };
        form.setFieldsValue(newValues);
      }
      return gasAmount;
    },
    [currentToken, form, setShowGasReserved]
  );

  const couldReserveGas = useMemo(() => isNativeToken && !isGnosisSafe, [
    isGnosisSafe,
    isNativeToken,
  ]);
  const handleMaxInfoChanged = useCallback(
    async (
      input?: { gasLevel?: GasLevel },
      options?: { updateSliderValue?: boolean }
    ) => {
      if (!currentAccount) return;

      if (isLoading) return;
      if (isEstimatingGas) return;
      if (!currentToken) return;

      const { updateSliderValue = false } = options || {};

      const tokenBalance = new BigNumber(
        currentToken.raw_amount_hex_str || 0
      ).div(10 ** currentToken.decimals);
      let amount = tokenBalance.toFixed();

      const {
        gasLevel = selectedGasLevel ||
          (await loadGasList().then(findInstanceLevel)),
      } = input || {};
      const needReserveGasOnSendToken = !!gasLevel && gasLevel?.price > 0;

      if (couldReserveGas && needReserveGasOnSendToken) {
        setShowGasReserved(true);
        setSendMaxInfo((prev) => ({ ...prev, isEstimatingGas: true }));
        try {
          const { gasNumber } = await estimateGasOnChain({
            chainItem,
            tokenItem: currentToken,
          });

          let gasAmount = handleGasChange({
            gasLevel: gasLevel,
            updateTokenAmount: false,
            gasLimit: gasNumber,
          });

          let maybeL1Fee = chainTokenGasFees.maybeL1Fee;
          if (input?.gasLevel) {
            maybeL1Fee = await fetchExtraGasFees({
              gasPrice: input.gasLevel.price,
            }).then((res) => res.maybeL1Fee);
          }
          if (maybeL1Fee?.gt(0)) {
            gasAmount = gasAmount
              .plus(new BigNumber(maybeL1Fee).div(1e18))
              .times(1.1);
          }
          const tokenForSend = tokenBalance.minus(gasAmount);
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
      handleFormValuesChange(null, newValues, { updateSliderValue });

      setTimeout(() => {
        setRefreshId((e) => e + 1);
      }, 0);
    },
    [
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
      handleGasChange,
      isGnosisSafe,
      chainItem,
      chainTokenGasFees.maybeL1Fee,
      currentAccount,
      fetchExtraGasFees,
    ]
  );
  const [sliderPercentValue, setSliderPercentValue] = useState(0);
  // const onSliderValueChangeTo100 = useCallback(
  //   debounce((value: number) => {
  //     if (value !== 100) return;

  //     handleMaxInfoChanged(undefined, { updateSliderValue: false });
  //   }, 300),
  //   [handleMaxInfoChanged]
  // );

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

      if (gasLevel) {
        setSelectedGasLevel(gasLevel);
      }
      handleMaxInfoChanged({ gasLevel }, { updateSliderValue: false });
    },
    [handleReserveGasClose, handleMaxInfoChanged, loadGasList]
  );

  const handleClickMaxButton = useCallback(async () => {
    setSendMaxInfo((prev) => ({ ...prev, clickedMax: true }));

    if (couldReserveGas) {
      setReserveGasOpen(true);
    } else {
      handleMaxInfoChanged(undefined, { updateSliderValue: false });
    }
  }, [couldReserveGas, handleMaxInfoChanged]);

  const handleClickBack = () => {
    const from = (history.location.state as any)?.from;

    if (from) {
      history.replace(from);
    } else {
      history.replace('/dashboard');
    }
  };

  // const handleChainChanged = useCallback(
  //   async (val: CHAINS_ENUM) => {
  //     setSendMaxInfo((prev) => ({ ...prev, clickedMax: false }));
  //     const gasList = await loadGasList();
  //     if (gasList && Array.isArray(gasList) && gasList.length > 0) {
  //       const foundLevel = gasList.find(
  //           (gasLevel) => (gasLevel.level as GasLevelType) === 'normal'
  //         ) || findInstanceLevel(gasList);
  //       foundLevel && setSelectedGasLevel(foundLevel);
  //     }

  //     const account = (await wallet.syncGetCurrentAccount())!;
  //     const chain = findChain({
  //       enum: val,
  //     });
  //     if (!chain) {
  //       return;
  //     }
  //     form.setFieldsValue({
  //       ...form.getFieldsValue(),
  //       amount: '',
  //     });
  //     setChain(val);
  //     if (addressDesc?.cex?.id && addressDesc.cex.is_deposit) {
  //       try {
  //         const isSupportRes = await wallet.openapi.depositCexSupport(
  //           chain.nativeTokenAddress,
  //           chain.serverId,
  //           addressDesc.cex.id
  //         );
  //         if (isSupportRes && !isSupportRes.support) {
  //           setCurrentToken(null);
  //           setBalanceError(null);
  //           setSelectedGasLevel(null);
  //           setShowGasReserved(false);
  //           // setEstimatedGas(0);

  //           setChainTokenGasFees((prev) => ({
  //             ...prev,
  //             gasLimit: 0,
  //           }));
  //           const values = form.getFieldsValue();
  //           form.setFieldsValue({
  //             ...values,
  //             amount: '',
  //           });
  //           return;
  //         }
  //       } catch (error) {
  //         console.error(error);
  //       }
  //     }
  //     setCurrentToken({
  //       id: chain.nativeTokenAddress,
  //       decimals: chain.nativeTokenDecimals,
  //       logo_url: chain.nativeTokenLogo,
  //       symbol: chain.nativeTokenSymbol,
  //       display_symbol: chain.nativeTokenSymbol,
  //       optimized_symbol: chain.nativeTokenSymbol,
  //       is_core: true,
  //       is_verified: true,
  //       is_wallet: true,
  //       amount: 0,
  //       price: 0,
  //       name: chain.nativeTokenSymbol,
  //       chain: chain.serverId,
  //       time_at: 0,
  //     });

  //     let nextToken: TokenItem | null = null;
  //     try {
  //       nextToken = await loadCurrentToken(
  //         chain.nativeTokenAddress,
  //         chain.serverId,
  //         account.address
  //       );
  //     } catch (error) {
  //       console.error(error);
  //     }

  //     const values = form.getFieldsValue();
  //     form.setFieldsValue({
  //       ...values,
  //       amount: '',
  //     });
  //     setShowGasReserved(false);
  //     handleFormValuesChange(
  //       { amount: '' },
  //       {
  //         ...values,
  //         amount: '',
  //       },
  //       {
  //         ...(nextToken && { token: nextToken }),
  //       }
  //     );
  //   },
  //   [
  //     loadGasList,
  //     wallet,
  //     addressDesc?.cex?.id,
  //     addressDesc?.cex?.is_deposit,
  //     form,
  //     setShowGasReserved,
  //     handleFormValuesChange,
  //     loadCurrentToken,
  //   ]
  // );

  const initByCache = async () => {
    try {
      const account = (await wallet.syncGetCurrentAccount())!;
      const qs = query2obj(history.location.search);

      const filledAmountRef = { current: false };
      const fillAmount = (token?: TokenItem) => {
        if (filledAmountRef.current) return;

        if (qs.amount) {
          filledAmountRef.current = true;

          const patchValues = { to: qs.to, amount: qs.amount };
          handleFormValuesChange(patchValues, initialFormValues, {
            token,
            updateSliderValue: true,
          });
        }
      };

      if (qs.token) {
        const { chain: tokenChain, id } = decodeTokenParam(qs.token);
        if (!tokenChain || !id) {
          setInitLoading(false);
          return;
        }

        const target = findChain({
          serverId: tokenChain,
        });
        if (!target) {
          if (currentToken) {
            setInitLoading(false);
            loadCurrentToken(
              currentToken.id,
              currentToken.chain,
              account.address
            );
          }
          return;
        }
        setChain(target.enum);
        const tokenItem = await loadCurrentToken(
          id,
          tokenChain,
          account.address
        );
        fillAmount(tokenItem || undefined);
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
        const lastTimeSentToken = await wallet.getLastTimeSendToken();
        let needLoadToken: TokenItem | null = lastTimeSentToken || currentToken;

        if (await wallet.hasPageStateCache()) {
          const cache = await wallet.getPageStateCache();

          if (cache?.path === history.location.pathname) {
            if (cache.states.values) {
              form.setFieldsValue(cache.states.values);
              handleFormValuesChange(
                cache.states.values,
                form.getFieldsValue(),
                {
                  token: cache.states.currentToken,
                  isInitFromCache: true,
                  updateSliderValue: true,
                }
              );
            }
            if (cache.states.currentToken) {
              needLoadToken = cache.states.currentToken;
            }
            if (cache.states.safeInfo) {
              setSafeInfo(cache.states.safeInfo);
            }
          }
        }
        if (!needLoadToken) return;
        // check the recommended token is support for address
        setCurrentToken(needLoadToken);
        if (chainItem && needLoadToken.chain !== chainItem.serverId) {
          const target = findChain({ serverId: needLoadToken.chain });
          if (target?.enum) {
            setChain(target.enum);
          }
        }
        setInitLoading(false);
        await loadCurrentToken(
          needLoadToken.id,
          needLoadToken.chain,
          account.address
        );
      }

      fillAmount();
    } catch (error) {
      /* empty */
      console.error('initByCache error', error);
    } finally {
      setInitLoading(false);
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

  const { balanceBigNum, balanceNumText } = useMemo(() => {
    if (!currentToken) {
      return {
        balanceNumText: '',
        balanceBigNum: new BigNumber(0),
        sliderPercentValue: 0,
      };
    }
    const balanceBigNum = new BigNumber(
      currentToken.raw_amount_hex_str || 0
    ).div(10 ** currentToken.decimals);
    const decimalPlaces = clickedMax || selectedGasLevel ? 8 : 4;

    return {
      balanceBigNum,
      balanceNumText: formatTokenAmount(
        balanceBigNum.lte(1e-4)
          ? balanceBigNum.toFixed()
          : balanceBigNum.toFixed(decimalPlaces, BigNumber.ROUND_FLOOR),
        decimalPlaces
      ),
    };
  }, [currentToken, clickedMax, selectedGasLevel]);

  useEffect(() => {
    if (currentToken && gasList && gasList.length > 0) {
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

  // const [gasFeeOpen, setGasFeeOpen] = useState(false);
  const pendingTxRef = useRef<{ fetchHistory: () => void }>(null);
  const handleFulfilled = useMemoizedFn(() => {
    if (currentToken) {
      handleCurrentTokenChange(currentToken, true);
    }
  });

  return (
    <FullscreenContainer className={isDesktop ? 'h-[600px]' : 'h-[700px]'}>
      <div
        className={clsx(
          'send-token',
          isTab || isDesktop
            ? 'w-full h-full overflow-auto min-h-0 rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
            : ''
        )}
      >
        <PageHeader
          onBack={handleClickBack}
          forceShowBack={!(isTab || isDesktop)}
          isShowAccount
          canBack={!(isTab || isDesktop)}
          className="mb-[10px]"
          rightSlot={
            isTab || isDesktop ? null : (
              <div
                className="text-r-neutral-title1 cursor-pointer absolute right-0"
                onClick={() => {
                  // openInternalPageInTab(`send-token${history.location.search}`);
                  wallet.openInDesktop(
                    `/desktop/profile?action=send&${history.location.search.slice(
                      1
                    )}`
                  );
                  window.close();
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
          className="send-token-form pt-[4px]"
          onFinish={handleSubmit}
          onValuesChange={handleFormValuesChange}
          initialValues={initialFormValues}
        >
          <div className="flex-1 overflow-auto pb-[32px]">
            {/* <AddressInfoFrom /> */}
            <AddressInfoTo
              loadingToAddressDesc={loadingToAddressDesc}
              toAccount={targetAccount}
              toAddressPositiveTips={toAddressPositiveTips}
              cexInfo={addressDesc?.cex}
              onClick={() => {
                if (isDesktop) {
                  history.push(
                    `${history.location.pathname}?${obj2query({
                      action: 'send',
                      sendPageType: 'selectToAddress',
                      type: 'send-token',
                      rbisource:
                        filterRbiSource('sendToken', rbisource) || rbisource,
                      token: encodeTokenParam({
                        chain: currentToken?.chain || '',
                        id: currentToken?.id || '',
                      }),
                      amount: form.getFieldValue('amount') || '',
                    })}`
                  );
                } else {
                  history.push(
                    `/select-to-address?${obj2query({
                      type: 'send-token',
                      rbisource:
                        filterRbiSource('sendToken', rbisource) || rbisource,
                      token: encodeTokenParam({
                        chain: currentToken?.chain || '',
                        id: currentToken?.id || '',
                      }),
                      amount: form.getFieldValue('amount') || '',
                    })}`
                  );
                }
              }}
            />
            <div className="section">
              <div className="section-title flex justify-between items-center">
                <div className="token-balance whitespace-pre-wrap">
                  {t('page.sendToken.sectionBalance.title')}
                </div>

                {/* <div className="token-balance-slider flex pl-[2px] w-[192px] pr-[8px] justify-between items-center">
                  <SendSlider
                    min={0}
                    max={100}
                    disabled={isLoading || isEstimatingGas}
                    value={sliderPercentValue}
                    onChange={(value) => {
                      setSliderPercentValue(value);
                      let newAmountBigNum = balanceBigNum?.multipliedBy(
                        value / 100
                      );

                      if (value === 100) {
                        if (
                          chainTokenGasFees.gasLimit &&
                          selectedGasLevel?.price
                        ) {
                          newAmountBigNum = newAmountBigNum.minus(
                            new BigNumber(chainTokenGasFees.gasLimit)
                              .times(selectedGasLevel?.price)
                              .div(1e18)
                          );
                        }
                        if (chainTokenGasFees.maybeL1Fee?.gt(0)) {
                          newAmountBigNum = newAmountBigNum.minus(
                            new BigNumber(chainTokenGasFees.maybeL1Fee).div(
                              1e18
                            )
                          );
                        }

                        if (newAmountBigNum.lt(0)) {
                          newAmountBigNum = new BigNumber(0);
                        }
                      }

                      const newAmount =
                        value === 100
                          ? newAmountBigNum.toFixed()
                          : !value
                          ? ''
                          : formatAmountString(newAmountBigNum);

                      form.setFieldsValue({ amount: newAmount });
                      handleFormValuesChange(
                        { amount: newAmount },
                        {
                          ...form.getFieldsValue(),
                          amount: newAmount,
                        },
                        {
                          updateSliderValue: false,
                          updateHistoryState: true,
                        }
                      );

                      onSliderValueChangeTo100(value);
                    }}
                    className="w-[160px] max-w-[100%]"
                  />
                  <div className="ml-[8px] w-[42px] text-right text-[13px] text-r-blue-default">
                    {sliderPercentValue}%
                  </div>
                </div> */}
              </div>
              {currentAccount && chainItem && (
                <div className="bg-r-neutral-card1 rounded-[8px]">
                  {/* <ChainSelectWrapper>
                    <ChainSelectorInForm
                      value={chain}
                      loading={initLoading}
                      onChange={handleChainChanged}
                      disableChainCheck={disableChainCheck}
                      chainRenderClassName={clsx(
                        'text-[13px] font-medium border-0 bg-transparent',
                        'before:border-transparent hover:before:border-rabby-blue-default pl-[8px]'
                      )}
                      drawerHeight={540}
                      showClosableIcon
                      getContainer={getContainer}
                    />
                  </ChainSelectWrapper> */}
                  <Form.Item name="amount">
                    <TokenAmountInput
                      type="send"
                      className="bg-r-neutral-card1 rounded-[8px]"
                      token={currentToken}
                      onChange={handleAmountChange}
                      onTokenChange={handleCurrentTokenChange}
                      // chainId={chainItem.serverId}
                      excludeTokens={[]}
                      initLoading={initLoading}
                      disableItemCheck={disableItemCheck}
                      balanceNumText={balanceNumText}
                      insufficientError={!!balanceError}
                      handleClickMaxButton={handleClickMaxButton}
                      isLoading={isLoading}
                      getContainer={getContainer}
                    />
                  </Form.Item>
                </div>
              )}
            </div>

            {chainItem?.serverId && canUseDirectSubmitTx ? (
              <ShowMoreOnSend
                chainServeId={chainItem?.serverId}
                open
                // setOpen={setGasFeeOpen}
              />
            ) : null}
            {!canSubmitBasic && (
              <div className="mt-20">
                <PendingTxItem
                  getContainer={getContainer}
                  onFulfilled={handleFulfilled}
                  type="send"
                  ref={pendingTxRef}
                />
              </div>
            )}
          </div>

          <BottomArea
            mostImportantRisks={mostImportantRisks}
            agreeRequiredChecked={agreeRequiredChecked}
            onCheck={(newVal) => {
              setAgreeRequiredChecks((prev) => ({
                ...prev,
                ...(hasRiskForToAddress && { forToAddress: newVal }),
                ...(hasRiskForToken && { forToken: newVal }),
              }));
            }}
            currentAccount={currentAccount}
            isSubmitLoading={isSubmitLoading}
            canSubmit={canSubmit}
            miniSignLoading={miniSignLoading}
            canUseDirectSubmitTx={canUseDirectSubmitTx}
            onConfirm={async () => {
              await handleSubmit({
                to: form.getFieldValue('to'),
                amount: form.getFieldValue('amount'),
              });
              setAgreeRequiredChecks((prev) => ({
                ...prev,
                forToAddress: false,
                forToken: false,
              }));
            }}
          />
        </Form>
        <SendReserveGasPopup
          selectedItem={selectedGasLevel?.level as GasLevelType}
          chain={chain}
          limit={Math.max(chainTokenGasFees.gasLimit, MINIMUM_GAS_LIMIT)}
          onGasChange={(gasLevel) => {
            handleGasLevelChanged(gasLevel);
          }}
          gasList={gasList}
          visible={reserveGasOpen}
          isLoading={loadingGasList}
          rawHexBalance={currentToken?.raw_amount_hex_str || '0'}
          onClose={() => handleReserveGasClose()}
          getContainer={getContainer}
        />
      </div>
    </FullscreenContainer>
  );
};

const SendTokenWrapper = () => {
  return (
    <DirectSubmitProvider>
      <SendToken />
    </DirectSubmitProvider>
  );
};

export default isTab
  ? connectStore()(withAccountChange(SendTokenWrapper))
  : connectStore()(SendTokenWrapper);
