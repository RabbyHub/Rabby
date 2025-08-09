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
import {
  getUiType,
  isSameAddress,
  openInternalPageInTab,
  useWallet,
} from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import { formatTokenAmount } from 'ui/utils/number';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import { Cex, GasLevel, TokenItem, Tx } from 'background/service/openapi';
import { PageHeader } from 'ui/component';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/send-token/switch-cc.svg';
import Checkbox from 'ui/component/Checkbox';

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
import { MiniApproval } from '../Approval/components/MiniSignTx';
import {
  DirectSubmitProvider,
  supportedDirectSign,
  useStartDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { ShowMoreOnSend } from './components/SendShowMore';
import { PendingTxItem } from '../Swap/Component/PendingTxItem';
import { SendTxHistoryItem } from '@/background/service/transactionHistory';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { Account } from '@/background/service/preference';
import { AddressTypeCard } from '@/ui/component/AddressRiskAlert';
import { ReactComponent as RcIconCopy } from 'ui/assets/send-token/modal/copy.svg';
import { copyAddress } from '@/ui/utils/clipboard';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import styled from 'styled-components';
import { TDisableCheckChainFn } from '@/ui/component/ChainSelector/components/SelectChainItem';
import { Unlink } from './UnlinkSDK';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const abiCoder = (abiCoderInst as unknown) as AbiCoder;

function findInstanceLevel(gasList: GasLevel[]) {
  return gasList.reduce((prev, current) =>
    prev.price >= current.price ? prev : current
  );
}

const DEFAULT_GAS_USED = 21000;

// TODO: replace with real config when integrating Unlink SDK
const unlinkConfig = {} as any;
const unlink = new Unlink(unlinkConfig);

const DEFAULT_TOKEN = {
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
};

type FormSendToken = {
  to: string;
  amount: string;
};

interface AddressTypeCardProps {
  loading?: boolean;
  account: Account;
  cexInfo?: Cex;
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

const AddressText = styled.span`
  font-weight: 500;
  color: var(--r-neutral-title1);
`;

export const ToAddressCard = ({
  account: targetAccount,
  loading,
  cexInfo,
}: AddressTypeCardProps) => {
  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));
  const dispatch = useRabbyDispatch();

  const addressSplit = useMemo(() => {
    const address = targetAccount.address || '';
    if (!address) {
      return [];
    }
    const prefix = address.slice(0, 8);
    const middle = address.slice(8, -6);
    const suffix = address.slice(-6);

    return [prefix, middle, suffix];
  }, [targetAccount.address]);

  useEffect(() => {
    dispatch.whitelist.getWhitelist();
  }, [dispatch.whitelist]);

  return (
    <header
      className={clsx(
        'header bg-r-neutral-card1 rounded-[8px] px-[28px] py-[20px]',
        'flex flex-col items-center gap-[8px]'
      )}
    >
      <div
        className="text-[16px] w-full text-center text-r-neutral-foot break-words cursor-pointer"
        onClick={() => {
          copyAddress(targetAccount.address);
        }}
      >
        <AddressText>{addressSplit[0]}</AddressText>
        {addressSplit[1]}
        <AddressText>{addressSplit[2]}</AddressText>
        <span className="ml-2 inline-block w-[14px] h-[13px]">
          <RcIconCopy />
        </span>
      </div>

      <AddressTypeCard
        type={targetAccount.type}
        address={targetAccount.address}
        getContainer={getContainer}
        cexInfo={{
          id: cexInfo?.id,
          name: cexInfo?.name,
          logo: cexInfo?.logo_url,
          isDeposit: !!cexInfo?.is_deposit,
        }}
        allowEditAlias
        loading={loading}
        inWhitelist={whitelist?.some((w) =>
          isSameAddress(w, targetAccount.address)
        )}
        brandName={targetAccount.brandName}
        aliasName={
          targetAccount.alianName || ellipsisAddress(targetAccount.address)
        }
      />
    </header>
  );
};

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
  const [isPrivate, setIsPrivate] = useState(false);

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
  const currentAccount = useCurrentAccount();
  const [chain, setChain] = useState(CHAINS_ENUM.ETH);
  const chainItem = useMemo(() => findChain({ enum: chain }), [chain]);
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

  const [estimatedGas, setEstimatedGas] = useState(0);

  const isGnosisSafe = useMemo(() => {
    return currentAccount?.type === KEYRING_CLASS.GNOSIS;
  }, [currentAccount?.type]);

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
    loading: loadingToAddressDesc,
  } = useAddressInfo(toAddress, {
    type: toAddressType,
  });
  useInitCheck(addressDesc);

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    !!currentToken &&
    !balanceError &&
    new BigNumber(form.getFieldValue('amount')).gte(0) &&
    !isLoading;
  const isNativeToken =
    !!chainItem && currentToken?.id === chainItem.nativeTokenAddress;

  const disableItemCheck = useCallback(
    (
      token: TokenItem
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
      if (toCexId) {
        const noSupportToken = token.cex_ids?.every?.(
          (id) => id.toLocaleLowerCase() !== toCexId.toLocaleLowerCase()
        );
        if (!token?.cex_ids?.length || noSupportToken) {
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
          .map(([chain]) => chain?.toLocaleLowerCase());
        if (
          safeChains.length > 0 &&
          !safeChains.includes(token?.chain?.toLocaleLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupprotTokenForSafe'),
            shortReason: t('page.sendToken.noSupprotTokenForSafe_short'),
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
        .map(([chain]) => chain?.toLocaleLowerCase());
      if (
        safeChains.length > 0 &&
        !safeChains.includes(chain?.toLocaleLowerCase())
      ) {
        return {
          disable: true,
          reason: t('page.sendToken.noSupprotTokenForSafe'),
          shortReason: t('page.sendToken.noSupprotTokenForSafe_short'),
        };
      }
      const contactChains = Object.entries(
        addressDesc?.contract || {}
      ).map(([chain]) => chain?.toLocaleLowerCase());
      if (
        contactChains.length > 0 &&
        !contactChains.includes(chain?.toLocaleLowerCase())
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

  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const [miniSignTx, setMiniSignTx] = useState<Tx | null>(null);

  const miniSignTxs = useMemo(() => {
    return miniSignTx ? [miniSignTx] : [];
  }, [miniSignTx]);

  const startDirectSigning = useStartDirectSigning();

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
      canSubmit &&
      supportedDirectSign(currentAccount?.type || '') &&
      !chainItem?.isTestnet &&
      !sendToOtherChainContract
    );
  }, [canSubmit, chainItem?.isTestnet, currentAccount?.type]);

  const { runAsync: handleSubmit, loading: isSubmitLoading } = useRequest(
    async ({
      amount,
      forceSignPage,
    }: FormSendToken & { forceSignPage?: boolean }) => {
      if (!currentToken) {
        return;
      }

      // Private Mode branch
      if (isPrivate) {
        try {
          const chainInfo = findChain({ serverId: currentToken.chain })!;
          const amountNum = new BigNumber(amount || 0);
          const amountInUSDC = amountNum
            .multipliedBy(new BigNumber(currentToken.price || 0))
            .toNumber();

          await unlink.sendPrivate({
            from: currentAccount!.address,
            to: toAddress,
            amount: amountInUSDC,
            chainId: chainInfo.id,
          });

          wallet.addCacheHistoryData(
            `${chainInfo.enum}-${'0x'}`,
            {
              address: currentAccount!.address,
              chainId: chainInfo.id,
              from: currentAccount!.address,
              to: `${toAddress} (Private)`,
              token: currentToken,
              amount: Number(amount),
              status: 'pending',
              createdAt: Date.now(),
            } as SendTxHistoryItem,
            'send'
          );

          message.success(
            t('page.sendToken.privateSentSuccess', {
              defaultValue: 'Private transfer submitted',
            })
          );

          if (isTab) {
            form.setFieldsValue({ amount: '' });
          } else {
            window.close();
          }
          return;
        } catch (e: any) {
          message.error(e?.message || 'Private transfer failed');
          throw e;
        }
      }

      if (canUseDirectSubmitTx && !forceSignPage) {
        startDirectSigning();
        return;
      }
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

  const amount = form.getFieldValue('amount');
  const address = form.getFieldValue('to');

  useEffect(() => {
    let isCurrent = true;
    const setMiniTx = async () => {
      if (
        canSubmit &&
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
          setMiniSignTx(params as Tx);
        }
      } else {
        if (isCurrent) {
          setMiniSignTx(null);
        }
      }
    };
    setMiniTx();
    return () => {
      isCurrent = false;
      setMiniSignTx(null);
    };
  }, [
    refreshId,
    reserveGasOpen,
    isEstimatingGas,
    canSubmit,
    canUseDirectSubmitTx,
    currentToken?.chain,
    getParams,
    toAddress,
    form,
    isNativeToken,
    clickedMax,
    selectedGasLevel?.price,
    wallet,
    estimatedGas,
    amount,
    address,
    currentAccount,
    currentToken,
  ]);

  const handleMiniSignResolve = useCallback(() => {
    setTimeout(() => {
      setIsShowMiniSign(false);
      setMiniSignTx(null);
      form.setFieldsValue({ amount: '' });
      // persistPageStateCache();
      wallet.clearPageStateCache();
      setRefreshId((e) => e + 1);
    }, 500);
  }, [form]);

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
      const { token } = opts || {};
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
    },
    [
      cacheAmount,
      currentToken,
      form,
      handleReceiveAddressChanged,
      persistPageStateCache,
      setShowGasReserved,
      showGasReserved,
      t,
      toAddress,
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

      return result;
    },
    [wallet, estimateGasOnChain, form, t]
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
      setEstimatedGas(0);
      await persistPageStateCache({ currentToken: token });
      setBalanceError(null);
      setIsLoading(true);
      loadCurrentToken(token.id, token.chain, account.address);
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
      if (updateTokenAmount && currentToken) {
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
    [currentToken, form, setShowGasReserved]
  );

  const couldReserveGas = useMemo(() => isNativeToken && !isGnosisSafe, [
    isGnosisSafe,
    isNativeToken,
  ]);

  const handleMaxInfoChanged = useCallback(
    async (input?: { gasLevel: GasLevel }) => {
      if (!currentAccount) return;

      if (isLoading) return;
      if (isEstimatingGas) return;
      if (!currentToken) return;

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
                  chainId: chainItem?.id,
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

      setTimeout(() => {
        setRefreshId((e) => e + 1);
      }, 0);
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

  const handleChainChanged = useCallback(
    async (val: CHAINS_ENUM) => {
      setSendMaxInfo((prev) => ({ ...prev, clickedMax: false }));
      const gasList = await loadGasList();
      if (gasList && Array.isArray(gasList) && gasList.length > 0) {
        setSelectedGasLevel(
          gasList.find(
            (gasLevel) => (gasLevel.level as GasLevelType) === 'normal'
          ) || findInstanceLevel(gasList)
        );
      }

      const account = (await wallet.syncGetCurrentAccount())!;
      const chain = findChain({
        enum: val,
      });
      if (!chain) {
        return;
      }
      form.setFieldsValue({
        ...form.getFieldsValue(),
        amount: '',
      });
      setChain(val);
      if (addressDesc?.cex?.id && addressDesc.cex.is_deposit) {
        try {
          const isSupportRes = await wallet.openapi.depositCexSupport(
            chain.nativeTokenAddress,
            chain.serverId,
            addressDesc.cex.id
          );
          if (isSupportRes && !isSupportRes.support) {
            setCurrentToken(null);
            setBalanceError(null);
            setSelectedGasLevel(null);
            setShowGasReserved(false);
            setEstimatedGas(0);
            const values = form.getFieldsValue();
            form.setFieldsValue({
              ...values,
              amount: '',
            });
            return;
          }
        } catch (error) {
          console.error(error);
        }
      }
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

      let nextToken: TokenItem | null = null;
      try {
        nextToken = await loadCurrentToken(
          chain.nativeTokenAddress,
          chain.serverId,
          account.address
        );
      } catch (error) {
        console.error(error);
      }

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
        },
        {
          ...(nextToken && { token: nextToken }),
        }
      );
    },
    [
      loadGasList,
      wallet,
      addressDesc?.cex?.id,
      addressDesc?.cex?.is_deposit,
      form,
      setShowGasReserved,
      handleFormValuesChange,
      loadCurrentToken,
    ]
  );

  const initByCache = async () => {
    try {
      const account = (await wallet.syncGetCurrentAccount())!;
      const qs = query2obj(history.location.search);

      if (qs.token) {
        const [tokenChain, id] = qs.token.split(':');
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
        await loadCurrentToken(id, tokenChain, account.address);
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
        let needLoadToken: TokenItem | null = currentToken;

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

  const { balanceNumText } = useMemo(() => {
    if (!currentToken) {
      return { balanceNumText: '' };
    }
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

  const [gasFeeOpen, setGasFeeOpen] = useState(false);
  const pendingTxRef = useRef<{ fetchHistory: () => void }>(null);

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
          isShowAccount
          className="mb-[10px]"
          rightSlot={
            isTab ? null : (
              <div
                className="text-r-neutral-title1 cursor-pointer absolute right-0 top-1/2 -translate-y-1/2"
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
              <div className="section-title justify-between items-center flex">
                <span className="section-title__to font-medium">
                  {t('page.sendToken.sectionTo.title')}
                </span>

                <div
                  className="cursor-pointer text-r-neutral-title1"
                  onClick={() => {
                    history.replace(`/send-poly${history.location.search}`);
                  }}
                >
                  <RcIconSwitchCC width={20} height={20} />
                </div>
              </div>
              <div className="to-address">
                {targetAccount && (
                  <ToAddressCard
                    loading={loadingToAddressDesc}
                    account={targetAccount}
                    cexInfo={addressDesc?.cex}
                  />
                )}
              </div>
            </div>
            <div className="section">
              <div className="section-title flex justify-between items-center">
                <div className="token-balance whitespace-pre-wrap font-medium">
                  {t('page.sendToken.sectionBalance.title')}
                </div>
              </div>
              {currentAccount && chainItem && (
                <div className="bg-r-neutral-card1 rounded-[8px]">
                  <ChainSelectWrapper>
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
                  </ChainSelectWrapper>
                  <Form.Item name="amount">
                    <TokenAmountInput
                      className="bg-r-neutral-card1 rounded-[8px]"
                      token={currentToken}
                      onChange={handleAmountChange}
                      onTokenChange={handleCurrentTokenChange}
                      chainId={chainItem.serverId}
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
                open={gasFeeOpen}
                setOpen={setGasFeeOpen}
              />
            ) : null}
            {!canSubmit && (
              <div className="mt-20">
                <PendingTxItem type="send" ref={pendingTxRef} />
              </div>
            )}
          </div>

          <div className={clsx('footer', isTab ? 'rounded-b-[16px]' : '')}>
            <div className="w-[100%] px-[16px] flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={isPrivate} onChange={setIsPrivate} />
                <span className="text-[14px] text-r-neutral-title1">
                  {t('page.sendToken.privateMode', 'Private Mode')}
                </span>
              </div>
            </div>
            <div className="btn-wrapper w-[100%] px-[16px] flex justify-center">
              {canUseDirectSubmitTx ? (
                <DirectSignToConfirmBtn
                  title={t('page.sendToken.sendButton')}
                  onConfirm={() => {
                    handleSubmit({
                      to: form.getFieldValue('to'),
                      amount: form.getFieldValue('amount'),
                    });
                  }}
                  disabled={!canSubmit}
                />
              ) : (
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
              )}
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
          rawHexBalance={currentToken?.raw_amount_hex_str || '0'}
          onClose={() => handleReserveGasClose()}
          getContainer={getContainer}
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
            setMiniSignTx(null);
            setRefreshId((e) => e + 1);
            setIsShowMiniSign(false);
          }}
          onReject={() => {
            setMiniSignTx(null);
            setRefreshId((e) => e + 1);
            setIsShowMiniSign(false);
          }}
          onResolve={handleMiniSignResolve}
          onPreExecError={() => {
            handleSubmit({
              to: form.getFieldValue('to'),
              amount: form.getFieldValue('amount'),
              forceSignPage: true,
            });
          }}
          getContainer={getContainer}
          directSubmit
          canUseDirectSubmitTx={canUseDirectSubmitTx}
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
