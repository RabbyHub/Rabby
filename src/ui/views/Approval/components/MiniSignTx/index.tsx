import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { isLedgerLockError, useLedgerDeviceConnected } from '@/ui/utils/ledger';
import { findChain } from '@/utils/chain';
import { ReactComponent as RcIconCheckedCC } from '@/ui/assets/icon-checked-cc.svg';
import {
  calcGasLimit,
  calcMaxPriorityFee,
  checkGasAndNonce,
  convertLegacyTo1559,
  explainGas,
  getNativeTokenBalance,
  getPendingTxs,
  is7702Tx,
} from '@/utils/transaction';
import {
  GasLevel,
  ParseTxResponse,
  Tx,
  TxPushType,
} from '@rabby-wallet/rabby-api/dist/types';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { useMemoizedFn, useRequest, useSetState, useSize } from 'ahooks';
import { Drawer, DrawerProps, Modal } from 'antd';
import { Chain, ExplainTxResponse } from 'background/service/openapi';
import { Account, ChainGas } from 'background/service/preference';
import BigNumber from 'bignumber.js';
import {
  HARDWARE_KEYRING_TYPES,
  INTERNAL_REQUEST_ORIGIN,
  INTERNAL_REQUEST_SESSION,
  KEYRING_CLASS,
  KEYRING_TYPE,
  SUPPORT_1559_KEYRING_TYPE,
} from 'consts';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync, useScroll } from 'react-use';
import { useApproval } from 'ui/utils';
import { intToHex } from 'ui/utils/number';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import {
  ActionRequireData,
  ParsedActionData,
} from '@rabby-wallet/rabby-action';
import { GasLessConfig } from '../FooterBar/GasLessComponents';
import GasSelectorHeader, {
  GasSelectorResponse,
} from '../TxComponents/GasSelectorHeader';
import clsx from 'clsx';
import { Ledger } from '../../../CommonPopup/Ledger';
import { Popup } from '@/ui/component';
import { ApprovalPopupContainer } from '../Popup/ApprovalPopupContainer';
import _ from 'lodash';
import { normalizeTxParams } from '../SignTx';
import { Dots } from '../Popup/Dots';
import { BatchSignTxTaskType, useBatchSignTxTask } from './useBatchSignTxTask';
import { MiniFooterBar } from './MiniFooterBar';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useGasAccountSign } from '@/ui/views/GasAccount/hooks';
import { useGasAccountTxsCheck } from '@/ui/views/GasAccount/hooks/checkTxs';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import {
  supportedHardwareDirectSign,
  useDirectSigning,
  useGetDisableProcessDirectSign,
  useMiniApprovalGas,
  useResetDirectSignState,
  useSetDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { ReactComponent as RCIconLoadingCC } from '@/ui/assets/loading-cc.svg';
import { RetryUpdateType } from '@/background/utils/errorTxRetry';
import { MiniApprovalPopupContainer } from '../Popup/MiniApprovalPopupContainer';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';

export const MiniSignTx = ({
  txs,
  onReject,
  onResolve,
  onPreExecError,
  onStatusChange,
  ga,
  getContainer,
  directSubmit,
}: {
  txs: Tx[];
  onReject?: () => void;
  onResolve?: () => void;
  onPreExecError?: () => void;
  onStatusChange?: (status: BatchSignTxTaskType['status']) => void;
  ga?: Record<string, any>;
  getContainer?: DrawerProps['getContainer'];
  directSubmit?: boolean;
}) => {
  const chainId = txs[0].chainId;
  const chain = findChain({
    id: chainId,
  })!;
  const currentAccount = useCurrentAccount();
  const [isReady, setIsReady] = useState(false);
  const [nonceChanged, setNonceChanged] = useState(false);
  const [canProcess, setCanProcess] = useState(true);
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const [gasPriceMedian, setGasPriceMedian] = useState<null | number>(null);
  const [recommendGasLimit, setRecommendGasLimit] = useState<string>('');
  const [gasUsed, setGasUsed] = useState(0);
  const [recommendGasLimitRatio, setRecommendGasLimitRatio] = useState(1); // 1 / 1.5 / 2
  const [recommendNonce, setRecommendNonce] = useState<string>('');
  const [updateId, setUpdateId] = useState(0);
  const [txDetail, setTxDetail] = useState<ExplainTxResponse | null>({
    pre_exec_version: 'v0',
    balance_change: {
      receive_nft_list: [],
      receive_token_list: [],
      send_nft_list: [],
      send_token_list: [],
      success: true,
      usd_value_change: 0,
    },
    trace_id: '',
    native_token: {
      amount: 0,
      chain: '',
      decimals: 18,
      display_symbol: '',
      id: '1',
      is_core: true,
      is_verified: true,
      is_wallet: true,
      is_infinity: true,
      logo_url: '',
      name: '',
      optimized_symbol: '',
      price: 0,
      symbol: '',
      time_at: 0,
      usd_value: 0,
    },
    gas: {
      gas_used: 0,
      gas_limit: 0,
      gas_ratio: 1.5,
      estimated_gas_cost_usd_value: 0,
      estimated_gas_cost_value: 0,
      estimated_gas_used: 0,
      estimated_seconds: 0,
    },
    pre_exec: {
      success: true,
      error: null,
      // err_msg: '',
    },
    recommend: {
      gas: '',
      nonce: '',
    },
    support_balance_change: true,
    type_call: {
      action: '',
      contract: '',
      contract_protocol_logo_url: '',
      contract_protocol_name: '',
    },
  });
  const [actionData, setActionData] = useState<ParsedActionData>({});
  const [actionRequireData, setActionRequireData] = useState<ActionRequireData>(
    null
  );
  const { t } = useTranslation();
  const [preprocessSuccess, setPreprocessSuccess] = useState(true);

  const [inited, setInited] = useState(false);
  const [isHardware, setIsHardware] = useState(false);
  const [manuallyChangeGasLimit, setManuallyChangeGasLimit] = useState(false);
  const [selectedGas, setSelectedGas] = useState<GasLevel | null>(null);
  const [gasList, setGasList] = useState<GasLevel[]>([
    {
      level: 'slow',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
      priority_price: null,
    },
    {
      level: 'normal',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
      priority_price: null,
    },
    {
      level: 'fast',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
      priority_price: null,
    },
    {
      level: 'custom',
      price: 0,
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: 0,
      priority_price: null,
    },
  ]);
  const [currentAccountType, setCurrentAccountType] = useState<
    undefined | string
  >();
  const [gasLessLoading, setGasLessLoading] = useState(false);
  const [isFirstGasLessLoading, setIsFirstGasLessLoading] = useState(true);
  const [canUseGasLess, setCanUseGasLess] = useState(false);
  const [gasLessFailedReason, setGasLessFailedReason] = useState<
    string | undefined
  >(undefined);
  const [gasLessConfig, setGasLessConfig] = useState<GasLessConfig | undefined>(
    undefined
  );
  const [useGasLess, setUseGasLess] = useState(false);
  const [isGnosisAccount, setIsGnosisAccount] = useState(false);
  const [isCoboArugsAccount, setIsCoboArugsAccount] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [gnosisFooterBarVisible, setGnosisFooterBarVisible] = useState(false);
  const [currentGnosisAdmin, setCurrentGnosisAdmin] = useState<Account | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const [support1559, setSupport1559] = useState(chain.eip['1559']);
  const [isLedger, setIsLedger] = useState(false);
  const { currentTx } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    currentTx: s.securityEngine.currentTx,
    tokenDetail: s.sign.tokenDetail,
  }));
  const [footerShowShadow, setFooterShowShadow] = useState(false);

  const [txsResult, setTxsResult] = useState<
    {
      tx: Tx;
      preExecResult: ExplainTxResponse;
      gasUsed: number;
      gasLimit: string;
      recommendGasLimitRatio: number;
      gasCost: Awaited<ReturnType<typeof explainGas>>;
      actionData: ParseTxResponse;
    }[]
  >([]);

  const customRPCErrorModalRef = useRef(false);
  const triggerCustomRPCErrorModal = () => {
    if (customRPCErrorModalRef.current) return;
    customRPCErrorModalRef.current = true;
    Modal.error({
      className: 'modal-support-darkmode',
      closable: true,
      title: t('page.signTx.customRPCErrorModal.title'),
      content: t('page.signTx.customRPCErrorModal.content'),
      okText: t('page.signTx.customRPCErrorModal.button'),
      okButtonProps: {
        className: 'w-[280px]',
      },
      async onOk() {
        await wallet.setRPCEnable(chain.enum, false);
        location.reload();
      },
    });
  };

  const { swapPreferMEVGuarded, isSwap, isBridge, isSend } = normalizeTxParams(
    txs[0]
  );

  const [pushInfo, setPushInfo] = useState<{
    type: TxPushType;
    lowGasDeadline?: number;
  }>({
    type: swapPreferMEVGuarded ? 'mev' : 'default',
  });

  const [realNonce, setRealNonce] = useState('');
  const [gasLimit, setGasLimit] = useState<string | undefined>(undefined);
  const [maxPriorityFee, setMaxPriorityFee] = useState(0);
  const [nativeTokenBalance, setNativeTokenBalance] = useState('0x0');
  const { executeEngine } = useSecurityEngine();
  const [engineResults, setEngineResults] = useState<Result[]>([]);
  const securityLevel = useMemo(() => {
    const enableResults = engineResults.filter((result) => {
      return result.enable && !currentTx.processedRules.includes(result.id);
    });
    if (enableResults.some((result) => result.level === Level.FORBIDDEN))
      return Level.FORBIDDEN;
    if (enableResults.some((result) => result.level === Level.DANGER))
      return Level.DANGER;
    if (enableResults.some((result) => result.level === Level.WARNING))
      return Level.WARNING;
    return undefined;
  }, [engineResults, currentTx]);

  const isSupportedAddr = useMemo(() => {
    const isNotWalletConnect =
      currentAccountType !== KEYRING_TYPE.WalletConnectKeyring;
    const isNotWatchAddress =
      currentAccountType !== KEYRING_TYPE.WatchAddressKeyring;

    if (!isNotWalletConnect) {
      setGasLessFailedReason(
        t('page.signFooterBar.gasless.walletConnectUnavailableTip')
      );
    }

    if (!isNotWatchAddress) {
      setGasLessFailedReason(
        t('page.signFooterBar.gasless.watchUnavailableTip')
      );
    }

    return isNotWatchAddress && isNotWalletConnect;
  }, [currentAccountType]);

  const [noCustomRPC, setNoCustomRPC] = useState(true);

  const gasAccountTxs = useMemo(() => {
    if (!selectedGas?.price) {
      return [] as Tx[];
    }
    return (
      txsResult.map((item) => {
        return {
          ...item.tx,
          gas: item.gasLimit,
          gasPrice: intToHex(selectedGas.price),
        };
      }) || ([] as Tx[])
    );
  }, [txsResult, realNonce, selectedGas?.price]);

  const _currentAccount = useRabbySelector((s) => s.account.currentAccount!);

  const {
    gasAccountCost,
    gasMethod,
    setGasMethod,
    isGasAccountLogin,
    gasAccountCanPay,
    canGotoUseGasAccount,
    canDepositUseGasAccount,
    sig,
    gasAccountAddress,
    isFirstGasCostLoading,
  } = useGasAccountTxsCheck({
    isReady,
    txs: gasAccountTxs,
    noCustomRPC,
    isSupportedAddr,
    currentAccount: _currentAccount,
  });

  useEffect(() => {
    const hasCustomRPC = async () => {
      if (chain?.enum) {
        const b = await wallet.hasCustomRPC(chain?.enum);
        if (b) {
          setGasLessFailedReason(
            t('page.signFooterBar.gasless.customRpcUnavailableTip')
          );
        }
        setNoCustomRPC(!b);
      }
    };
    hasCustomRPC();
  }, [chain?.enum]);

  const task = useBatchSignTxTask({
    ga,
  });
  useEffect(() => {
    onStatusChange?.(task.status);
  }, [task.status]);

  const handleInitTask = useMemoizedFn(() => {
    task.init(
      txsResult.map((item) => {
        return {
          tx: item.tx,
          options: {
            chainServerId: chain.serverId,
            gasLevel: selectedGas || undefined,
            isGasLess: gasMethod === 'native' ? useGasLess : false,
            isGasAccount: gasAccountCanPay,
            waitCompleted: false,
            pushType: pushInfo.type,
            ignoreGasCheck: true,
            ignoreGasNotEnoughCheck: true,
            ignoreSimulationFailed: true,
            sig,
            extra: {
              preExecResult: item.preExecResult,
              actionData: item.actionData,
            },
          },
          status: 'idle',
        };
      })
    );
  });

  useEffect(() => {
    handleInitTask();
  }, [
    txsResult,
    chain?.serverId,
    selectedGas,
    useGasLess,
    pushInfo?.type,
    gasAccountCanPay,
  ]);

  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleAllow = useMemoizedFn(async () => {
    if (currentAccount?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(currentAccount.address);
    }

    if (!txsResult?.length || !selectedGas) {
      return;
    }
    await task.start();
    onResolve?.();
  });

  const handleGasChange = (gas: GasSelectorResponse) => {
    setSelectedGas({
      level: gas.level,
      front_tx_count: gas.front_tx_count,
      estimated_seconds: gas.estimated_seconds,
      base_fee: gas.base_fee,
      price: Math.round(gas.price),
      priority_price: gas.priority_price,
    });
    if (gas.level === 'custom') {
      setGasList(
        (gasList || []).map((item) => {
          if (item.level === 'custom') return gas;
          return item;
        })
      );
    }
    Promise.all(
      txsResult.map(async (item) => {
        const tx = {
          ...item.tx,
          ...(support1559
            ? {
                maxFeePerGas: intToHex(Math.round(gas.price)),
                maxPriorityFeePerGas:
                  gas.maxPriorityFee <= 0
                    ? item.tx.maxFeePerGas
                    : intToHex(Math.round(gas.maxPriorityFee)),
              }
            : { gasPrice: intToHex(Math.round(gas.price)) }),
        };
        return {
          ...item,
          tx,
          gasCost: await explainGas({
            gasUsed: item.gasUsed,
            gasPrice: gas.price,
            chainId: chain.id,
            nativeTokenPrice: item.preExecResult.native_token.price,
            wallet,
            tx,
            gasLimit: item.gasLimit,
            account: currentAccount!,
          }),
        };
      })
    ).then((res) => {
      setTxsResult(res);
    });
    if (support1559) {
      setMaxPriorityFee(Math.round(gas.maxPriorityFee));
    }
  };

  const handleCancel = useMemoizedFn(() => {
    onReject?.();
  });

  const loadGasMarket = async (
    chain: Chain,
    custom?: number
  ): Promise<GasLevel[]> => {
    const list = await wallet.gasMarketV2({
      chain,
      customGas: custom && custom > 0 ? custom : undefined,
      tx: txs[0],
    });
    setGasList(list);
    return list;
  };

  const loadGasMedian = async (chain: Chain) => {
    const { median } = await wallet.openapi.gasPriceStats(chain.serverId);
    setGasPriceMedian(median);
    return median;
  };

  const checkCanProcess = async () => {
    const currentAccount = (await wallet.getCurrentAccount())!;

    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setCanProcess(false);
      setCantProcessReason(
        <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
      );
    }
  };

  const checkGasLessStatus = useMemoizedFn(async () => {
    if (!selectedGas || !txsResult?.length) {
      return;
    }
    try {
      setGasLessLoading(true);
      const res = await wallet.openapi.gasLessTxsCheck({
        tx_list:
          txsResult.map((item) => {
            return {
              ...item.tx,
              gas: item.gasLimit,
              gasPrice: intToHex(selectedGas.price),
            };
          }) || [],
      });
      setCanUseGasLess(res.is_gasless);
      setGasLessFailedReason(res.desc);
      setGasLessLoading(false);
      if (res.is_gasless && res?.promotion?.config) {
        setGasLessConfig(
          res.promotion.id === '0ca5aaa5f0c9217e6f45fe1d109c24fb'
            ? {
                ...res.promotion.config,
                dark_color: '',
                theme_color: '',
              }
            : res?.promotion?.config
        );
      }
      setIsFirstGasLessLoading(false);
    } catch (error) {
      console.error('gasLessTxCheck error', error);
      setCanUseGasLess(false);
      setGasLessConfig(undefined);
      setGasLessLoading(false);
      setIsFirstGasLessLoading(false);
    }
  });

  const handleIgnoreAllRules = () => {
    dispatch.securityEngine.processAllRules(
      engineResults.map((result) => result.id)
    );
  };

  const init = useMemoizedFn(async () => {
    if (!chainId) {
      return;
    }

    try {
      await wallet.syncDefaultRPC();
    } catch (error) {
      console.error('before submit sync default rpc error', error);
    }

    try {
      const currentAccount = (await wallet.getCurrentAccount())!;

      setCurrentAccountType(currentAccount.type);
      const is1559 =
        support1559 &&
        SUPPORT_1559_KEYRING_TYPE.includes(currentAccount.type as any);
      setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
      setIsHardware(
        !!Object.values(HARDWARE_KEYRING_TYPES).find(
          (item) => item.type === currentAccount.type
        )
      );
      try {
        const balance = await getNativeTokenBalance({
          wallet,
          chainId,
          address: currentAccount.address,
        });

        setNativeTokenBalance(balance);
      } catch (e) {
        if (await wallet.hasCustomRPC(chain.enum)) {
          triggerCustomRPCErrorModal();
        }
      }

      checkCanProcess();
      const lastTimeGas: ChainGas | null = await wallet.getLastTimeGasSelection(
        chainId
      );
      let customGasPrice = 0;
      if (
        lastTimeGas?.lastTimeSelect === 'gasPrice' &&
        lastTimeGas.gasPrice &&
        !directSubmit
      ) {
        // use cached gasPrice if exist
        customGasPrice = lastTimeGas.gasPrice;
      }
      const gasPrice = txs[0].gasPrice || txs[0].maxFeePerGas;
      if ((isSend || isSwap || isBridge) && gasPrice) {
        // use gasPrice set by dapp when it's a speedup or cancel tx
        customGasPrice = parseInt(gasPrice!);
      }
      const gasList = await loadGasMarket(chain, customGasPrice);
      loadGasMedian(chain);
      let gas: GasLevel | null = null;

      if (
        (customGasPrice || lastTimeGas?.lastTimeSelect === 'gasPrice') &&
        !directSubmit
      ) {
        gas = gasList.find((item) => item.level === 'custom')!;
      } else if (
        lastTimeGas?.lastTimeSelect &&
        lastTimeGas?.lastTimeSelect === 'gasLevel' &&
        !directSubmit
      ) {
        const target = gasList.find(
          (item) => item.level === lastTimeGas?.gasLevel
        )!;
        if (target) {
          gas = target;
        } else {
          gas = gasList.find((item) => item.level === 'normal')!;
        }
      } else {
        // no cache, use the fast level in gasMarket
        gas = gasList.find((item) => item.level === 'normal')!;
      }
      const fee = calcMaxPriorityFee(gasList, gas, chainId, false);
      setMaxPriorityFee(fee);

      setSelectedGas(gas);
      setSupport1559(is1559);
      setInited(true);
    } catch (e) {
      Modal.error({
        className: 'modal-support-darkmode',
        title: 'Error',
        content: e.message || JSON.stringify(e),
      });
    }
  });

  useEffect(() => {
    init();
  }, []);

  const [initdTxs, setInitdTxs] = useState<typeof txsResult>([]);

  const checkGasLevelIsNotEnough = useCallback(
    (gas: GasSelectorResponse): Promise<[number, boolean, boolean]> => {
      if (!isReady || !initdTxs.length) {
        return Promise.resolve([0, false, true]);
      }
      let _txsResult = initdTxs;
      return Promise.all(
        initdTxs.map(async (item) => {
          const tx = {
            ...item.tx,
            ...(support1559
              ? {
                  maxFeePerGas: intToHex(Math.round(gas.price || 0)),
                  maxPriorityFeePerGas:
                    gas.maxPriorityFee <= 0
                      ? item.tx.maxFeePerGas
                      : intToHex(Math.round(gas.maxPriorityFee)),
                }
              : { gasPrice: intToHex(Math.round(gas.price)) }),
          };
          return {
            ...item,
            tx,
            gasCost: await explainGas({
              gasUsed: item.gasUsed,
              gasPrice: gas.price,
              chainId: chain.id,
              nativeTokenPrice: item.preExecResult.native_token.price,
              wallet,
              tx,
              gasLimit: item.gasLimit,
              account: currentAccount!,
            }),
          };
        })
      ).then((arr) => {
        let balance = nativeTokenBalance;
        _txsResult = arr;

        if (!_txsResult.length) {
          return [0, false, true];
        }

        return wallet.openapi
          .checkGasAccountTxs({
            sig: sig || '',
            account_id: gasAccountAddress,
            tx_list: arr.map((item, index) => {
              return {
                ...item.tx,
                gas: item.gasLimit,
                gasPrice: intToHex(gas.price),
              };
            }),
          })
          .then((gasAccountRes) => {
            const checkResult = _txsResult.map((item, index) => {
              const result = checkGasAndNonce({
                recommendGasLimitRatio: item.recommendGasLimitRatio,
                recommendGasLimit: item.gasLimit,
                recommendNonce: item.tx.nonce,
                tx: item.tx,
                gasLimit: item.gasLimit,
                nonce: item.tx.nonce,
                isCancel: false,
                gasExplainResponse: item.gasCost,
                isSpeedUp: false,
                isGnosisAccount: false,
                nativeTokenBalance: balance,
              });
              balance = new BigNumber(balance)
                .minus(new BigNumber(item.tx.value || 0))
                .minus(new BigNumber(item.gasCost.maxGasCostAmount || 0))
                .toFixed();
              return result;
            });
            return [
              (gasAccountRes.gas_account_cost.estimate_tx_cost || 0) +
                (gasAccountRes.gas_account_cost?.gas_cost || 0),
              gasAccountRes.balance_is_enough,
              _.flatten(checkResult)?.some((e) => e.code === 3001),
            ];
          });
      });
    },
    [
      isReady,
      chain.id,
      gasAccountAddress,
      nativeTokenBalance,
      sig,
      support1559,
      initdTxs,
    ]
  );

  const [preExecError, setPreExecError] = useState(false);

  const prepareTxs = useMemoizedFn(async () => {
    if (!selectedGas || !inited || !currentAccount?.address) {
      return;
    }

    const recommendNonce = await wallet.getRecommendNonce({
      from: currentAccount.address,
      chainId: chain.id,
    });
    setRecommendNonce(recommendNonce);
    setPreExecError(false);
    const tempTxs: Tx[] = [];
    const res = await Promise.all(
      txs.map(async (rawTx, index) => {
        const normalizedTx = normalizeTxParams(rawTx);
        let tx: Tx = {
          chainId,
          data: normalizedTx.data || '0x', // can not execute with empty string, use 0x instead
          from: normalizedTx.from,
          gas: normalizedTx.gas || rawTx.gasLimit,
          nonce:
            normalizedTx.nonce ||
            intToHex(new BigNumber(recommendNonce).plus(index).toNumber()),
          to: normalizedTx.to,
          value: normalizedTx.value,
          gasPrice: intToHex(selectedGas.price),
        };
        tempTxs.push(tx);

        if (support1559) {
          tx = convertLegacyTo1559(tx);
          tx.maxPriorityFeePerGas =
            maxPriorityFee <= 0
              ? tx.maxFeePerGas
              : intToHex(Math.round(maxPriorityFee));
        }

        const preExecResult = await wallet.openapi.preExecTx({
          tx: tx,
          origin: INTERNAL_REQUEST_ORIGIN,
          address: currentAccount?.address,
          updateNonce: true,
          pending_tx_list: [
            ...(await getPendingTxs({
              recommendNonce,
              wallet,
              address: currentAccount?.address,
            })),
            ...tempTxs.slice(0, index),
          ],
        });
        let estimateGas = 0;

        if (!preExecResult.pre_exec.success) {
          throw new Error('Pre exec failed');
        }
        if (preExecResult.gas.success) {
          estimateGas =
            preExecResult.gas.gas_limit || preExecResult.gas.gas_used;
        }
        const {
          gas: gasRaw,
          needRatio,
          gasUsed,
        } = await wallet.getRecommendGas({
          gasUsed: preExecResult.gas.gas_used,
          gas: estimateGas,
          tx: tx,
          chainId: chain.id,
        });
        const gas = new BigNumber(gasRaw);

        let gasLimit = tx.gas || tx.gasLimit;
        let recommendGasLimitRatio = 1;

        if (!gasLimit) {
          const {
            gasLimit: _gasLimit,
            recommendGasLimitRatio: _recommendGasLimitRatio,
          } = await calcGasLimit({
            chain,
            tx,
            gas,
            selectedGas: selectedGas,
            nativeTokenBalance,
            explainTx: preExecResult,
            needRatio,
            wallet,
          });
          gasLimit = _gasLimit;
          recommendGasLimitRatio = _recommendGasLimitRatio;
        }

        // calc gasCost
        const gasCost = await explainGas({
          gasUsed,
          gasPrice: selectedGas?.price,
          chainId: chain.id,
          nativeTokenPrice: preExecResult.native_token.price,
          wallet,
          tx,
          gasLimit,
          account: currentAccount,
        });

        tx.gas = gasLimit;

        const actionData = await wallet.openapi.parseTx({
          chainId: chain.serverId,
          tx: {
            ...tx,
            gas: '0x0',
            nonce: tx.nonce || '0x1',
            value: tx.value || '0x0',
            to: tx.to || '',
            type: is7702Tx(tx) ? 4 : support1559 ? 2 : undefined,
          } as any,
          origin: origin || '',
          addr: currentAccount.address,
        });

        return {
          rawTx,
          tx,
          preExecResult,
          gasUsed,
          gasLimit,
          recommendGasLimitRatio,
          gasCost,
          actionData,
        };
      })
    );

    setIsReady(true);
    setTxsResult(res);
    setInitdTxs(res);
  });

  const directSigning = useDirectSigning();
  const setDirectSigning = useSetDirectSigning();

  useEffect(() => {
    if (directSigning && directSubmit && onPreExecError && preExecError) {
      onPreExecError?.();
      setDirectSigning(false);
    }
  }, [directSigning, directSubmit, preExecError, onPreExecError]);

  useEffect(() => {
    if (
      isReady &&
      txsResult.length &&
      !isGnosisAccount &&
      !isCoboArugsAccount
    ) {
      if (isSupportedAddr && noCustomRPC) {
        checkGasLessStatus();
      } else {
        setIsFirstGasLessLoading(false);
        setGasLessLoading(false);
      }
    }
  }, [
    isReady,
    nativeTokenBalance,
    gasLimit,
    txsResult,
    realNonce,
    isSupportedAddr,
    noCustomRPC,
    isGnosisAccount,
    isCoboArugsAccount,
  ]);

  useEffect(() => {
    if (inited) {
      prepareTxs().catch((error) => {
        if (directSubmit) {
          setPreExecError(true);
          //goto origin signTx
        }
      });
    }
  }, [inited, txs, directSubmit]);

  const checkErrors = useMemo(() => {
    let balance = nativeTokenBalance;
    const res = txsResult.map((item) => {
      const result = checkGasAndNonce({
        recommendGasLimitRatio: item.recommendGasLimitRatio,
        recommendGasLimit: item.gasLimit,
        recommendNonce: item.tx.nonce,
        tx: item.tx,
        gasLimit: item.gasLimit,
        nonce: item.tx.nonce,
        isCancel: false,
        gasExplainResponse: item.gasCost,
        isSpeedUp: false,
        isGnosisAccount: false,
        nativeTokenBalance: balance,
      });
      balance = new BigNumber(balance)
        .minus(new BigNumber(item.tx.value || 0))
        .minus(new BigNumber(item.gasCost.maxGasCostAmount || 0))
        .toFixed();
      return result;
    });
    return _.flatten(res);
  }, [txsResult, nativeTokenBalance, recommendNonce]);

  const totalGasCost = useMemo(() => {
    return txsResult.reduce(
      (sum, item) => {
        sum.gasCostAmount = sum.gasCostAmount.plus(item.gasCost.gasCostAmount);
        sum.gasCostUsd = sum.gasCostUsd.plus(item.gasCost.gasCostUsd);
        return sum;
      },
      {
        gasCostUsd: new BigNumber(0),
        gasCostAmount: new BigNumber(0),
        success: true,
      }
    );
  }, [txsResult]);

  const isGasNotEnough = useMemo(() => {
    return checkErrors.some((e) => e.code === 3001);
  }, [checkErrors]);

  const gasCalcMethod = useCallback(
    async (price) => {
      const res = await Promise.all(
        txsResult.map((item) =>
          explainGas({
            gasUsed: item.gasUsed,
            gasPrice: price,
            chainId,
            nativeTokenPrice: item.preExecResult.native_token.price || 0,
            tx: item.tx,
            wallet,
            gasLimit: item.gasLimit,
            account: currentAccount!,
          })
        )
      );
      const totalCost = res.reduce(
        (sum, item) => {
          sum.gasCostAmount = sum.gasCostAmount.plus(item.gasCostAmount);
          sum.gasCostUsd = sum.gasCostUsd.plus(item.gasCostUsd);

          sum.maxGasCostAmount = sum.maxGasCostAmount.plus(
            item.maxGasCostAmount
          );
          return sum;
        },
        {
          gasCostUsd: new BigNumber(0),
          gasCostAmount: new BigNumber(0),
          maxGasCostAmount: new BigNumber(0),
        }
      );
      return totalCost;
    },
    [chainId, txsResult, currentAccount]
  );

  const { value } = useAsync<() => Promise<[string, RetryUpdateType]>>(() => {
    let msg = task.error;

    const getLedgerError = (description: string) => {
      if (isLedgerLockError(description)) {
        return t('page.signFooterBar.ledger.unlockAlert');
      } else if (
        description.includes('0x6e00') ||
        description.includes('0x6b00')
      ) {
        return t('page.signFooterBar.ledger.updateFirmwareAlert');
      } else if (description.includes('0x6985')) {
        return t('page.signFooterBar.ledger.txRejectedByLedger');
      }

      return description;
    };
    if (currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      msg = getLedgerError(msg);
    }
    return msg
      ? wallet.getTxFailedResult(msg)
      : Promise.resolve(['', 'origin']);
  }, [task.error, currentAccount?.type]);

  const [description, retryUpdateType] = value || ['', 'origin'];

  const content = useMemo(() => {
    if (ga?.category) {
      if (task?.error && retryUpdateType) {
        return t('page.signFooterBar.qrcode.retryTxFailedBy', {
          category: ga?.category,
        });
      }
      return t('page.signFooterBar.qrcode.txFailedBy', {
        category: ga?.category,
      });
    }
    return t('page.signFooterBar.qrcode.txFailed');
  }, [ga?.category, task?.error, retryUpdateType]);

  const brandIcon = useMemo(() => {
    switch (currentAccount?.type) {
      case KEYRING_CLASS.HARDWARE.LEDGER: {
        return LedgerSVG;
      }
      case KEYRING_CLASS.HARDWARE.ONEKEY: {
        return OneKeySVG;
      }
      default: {
        return null;
      }
    }
  }, [currentAccount?.type]);

  return (
    <>
      <Popup
        height={'fit-content'}
        visible={!!task.error}
        bodyStyle={{ padding: 0 }}
        // maskStyle={{
        //   backgroundColor: 'transparent',
        // }}
        getContainer={getContainer}
      >
        <MiniApprovalPopupContainer
          hdType={
            currentAccount!.type === KEYRING_CLASS.HARDWARE.LEDGER
              ? 'wired'
              : 'privatekey'
          }
          brandIcon={brandIcon}
          status={'FAILED'}
          content={content}
          description={description}
          onCancel={onReject}
          onRetry={async () => {
            await wallet.setRetryTxType(retryUpdateType);
            await task.retry();
            onResolve?.();
          }}
          retryUpdateType={retryUpdateType}
        />
      </Popup>

      <MiniFooterBar
        directSubmit={directSubmit}
        task={task}
        Header={
          <div
            className={clsx(
              'fixed left-[99999px] top-[99999px] z-[-1]',
              task.status !== 'idle' && 'pointer-events-none'
            )}
            key={task.status}
          >
            <GasSelectorHeader
              tx={txs[0]}
              gasAccountCost={gasAccountCost}
              gasMethod={gasMethod}
              onChangeGasMethod={setGasMethod}
              pushType={pushInfo.type}
              disabled={false}
              isReady={isReady}
              gasLimit={gasLimit}
              noUpdate={false}
              gasList={gasList}
              selectedGas={selectedGas}
              version={txsResult?.[0]?.preExecResult?.pre_exec_version || 'v0'}
              recommendGasLimit={recommendGasLimit}
              recommendNonce={recommendNonce}
              chainId={chainId}
              onChange={handleGasChange}
              nonce={realNonce}
              disableNonce={true}
              isSpeedUp={false}
              isCancel={false}
              is1559={support1559}
              isHardware={isHardware}
              manuallyChangeGasLimit={manuallyChangeGasLimit}
              errors={checkErrors}
              engineResults={engineResults}
              nativeTokenBalance={nativeTokenBalance}
              gasPriceMedian={gasPriceMedian}
              gas={totalGasCost}
              gasCalcMethod={gasCalcMethod}
              directSubmit={directSubmit}
              checkGasLevelIsNotEnough={checkGasLevelIsNotEnough}
              getContainer={getContainer}
            />
          </div>
        }
        noCustomRPC={noCustomRPC}
        gasMethod={gasMethod}
        gasAccountCost={gasAccountCost}
        gasAccountCanPay={gasAccountCanPay}
        canGotoUseGasAccount={canGotoUseGasAccount}
        canDepositUseGasAccount={canDepositUseGasAccount}
        isGasAccountLogin={isGasAccountLogin}
        isWalletConnect={
          currentAccountType === KEYRING_TYPE.WalletConnectKeyring
        }
        onChangeGasAccount={() => setGasMethod('gasAccount')}
        isWatchAddr={currentAccountType === KEYRING_TYPE.WatchAddressKeyring}
        gasLessConfig={gasLessConfig}
        gasLessFailedReason={gasLessFailedReason}
        canUseGasLess={canUseGasLess}
        showGasLess={
          !gasLessLoading && isReady && (isGasNotEnough || !!gasLessConfig)
        }
        useGasLess={
          (isGasNotEnough || !!gasLessConfig) && canUseGasLess && useGasLess
        }
        isGasNotEnough={isGasNotEnough}
        enableGasLess={() => setUseGasLess(true)}
        hasShadow={footerShowShadow}
        origin={INTERNAL_REQUEST_SESSION.origin}
        originLogo={INTERNAL_REQUEST_SESSION.icon}
        // hasUnProcessSecurityResult={hasUnProcessSecurityResult}
        securityLevel={securityLevel}
        gnosisAccount={undefined}
        chain={chain}
        isTestnet={chain.isTestnet}
        onCancel={handleCancel}
        onSubmit={() => handleAllow()}
        onIgnoreAllRules={handleIgnoreAllRules}
        enableTooltip={
          // 3001 use gasless tip
          checkErrors && checkErrors?.[0]?.code === 3001
            ? false
            : !canProcess ||
              !!checkErrors.find((item) => item.level === 'forbidden')
        }
        tooltipContent={
          checkErrors && checkErrors?.[0]?.code === 3001
            ? undefined
            : checkErrors.find((item) => item.level === 'forbidden')
            ? checkErrors.find((item) => item.level === 'forbidden')!.msg
            : cantProcessReason
        }
        disabledProcess={
          !isReady ||
          (selectedGas ? selectedGas.price < 0 : true) ||
          !canProcess ||
          !!checkErrors.find((item) => item.level === 'forbidden')
        }
        isFirstGasLessLoading={isFirstGasLessLoading}
        isFirstGasCostLoading={isFirstGasCostLoading}
        getContainer={getContainer}
      />
    </>
  );
};

export const MiniApproval = ({
  txs,
  visible,
  onClose,
  onResolve,
  onReject,
  onPreExecError,
  ga,
  getContainer,
  directSubmit,
  canUseDirectSubmitTx,
  isPreparingSign,
  setIsPreparingSign,
}: {
  txs?: Tx[];
  visible?: boolean;
  onClose?: () => void;
  onReject?: () => void;
  onResolve?: () => void;
  onPreExecError?: () => void;
  ga?: Record<string, any>;
  getContainer?: DrawerProps['getContainer'];
  directSubmit?: boolean;
  canUseDirectSubmitTx?: boolean;
  isPreparingSign?: boolean;
  setIsPreparingSign?: (isPreparingSign: boolean) => void;
}) => {
  const [status, setStatus] = useState<BatchSignTxTaskType['status']>('idle');
  const { isDarkTheme } = useThemeMode();
  const currentAccount = useCurrentAccount();

  const isSigningLoading = useDirectSigning();
  const setDirectSigning = useSetDirectSigning();

  const resetDirectSigning = useResetDirectSignState();
  const disabledProcess = useGetDisableProcessDirectSign();

  const [innerVisible, setInnerVisible] = useState(false);

  useEffect(() => {
    if (isSigningLoading && disabledProcess) {
      setDirectSigning(false);
      setIsPreparingSign?.(false);
      setInnerVisible(false);
    }
  }, [isSigningLoading, disabledProcess, setDirectSigning]);

  useEffect(() => {
    resetDirectSigning();
    setInnerVisible(false);
  }, [txs]);

  useEffect(() => {
    if (visible) {
      setStatus('idle');
    }
  }, [visible]);

  useEffect(() => {
    if (innerVisible) {
      setStatus('idle');
    }
  }, [innerVisible]);

  useEffect(() => {
    if (
      supportedHardwareDirectSign(currentAccount?.type || '') &&
      isSigningLoading
    ) {
      setInnerVisible(true);
    } else {
      setInnerVisible(false);
    }
  }, [currentAccount?.type, isSigningLoading]);

  const handleClose = useCallback(() => {
    onClose?.();
    setInnerVisible(false);
    setDirectSigning(false);
    setIsPreparingSign?.(false);
  }, [onClose]);

  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((e) => e + 1);
  }, [txs]);

  return (
    <>
      <Popup
        placement="bottom"
        height="fit-content"
        className="is-support-darkmode"
        visible={innerVisible}
        onClose={handleClose}
        maskClosable={status === 'idle'}
        closable={false}
        bodyStyle={{
          padding: 0,
          // maxHeight: 160,
        }}
        push={false}
        forceRender
        destroyOnClose={false}
        maskStyle={{
          backgroundColor: !isDarkTheme ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
        }}
        getContainer={getContainer}
        key={`${currentAccount?.address}-${currentAccount?.type}`}
      >
        {txs?.length ? (
          <MiniSignTx
            key={key}
            directSubmit={directSubmit}
            ga={ga}
            txs={txs}
            onStatusChange={(status) => {
              setStatus(status);
            }}
            onPreExecError={onPreExecError}
            onReject={onReject}
            onResolve={() => {
              onResolve?.();
            }}
            getContainer={getContainer}
          />
        ) : null}
      </Popup>

      {isPreparingSign ||
      (directSubmit &&
        canUseDirectSubmitTx &&
        !supportedHardwareDirectSign(currentAccount?.type || '')) ? (
        <Modal
          transitionName=""
          visible={isSigningLoading || isPreparingSign}
          maskClosable={false}
          centered
          cancelText={null}
          okText={null}
          footer={null}
          width={'auto'}
          closable={false}
          bodyStyle={{ padding: 0 }}
        >
          <div className="w-[52px] h-[52px] p-[14px] flex items-center justify-center">
            <RCIconLoadingCC className="text-r-neutral-body animate-spin" />
          </div>
        </Modal>
      ) : null}
    </>
  );
};
