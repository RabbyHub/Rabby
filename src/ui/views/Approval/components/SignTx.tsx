import stats from '@/stats';
import {
  calcGasLimit,
  checkGasAndNonce,
  convertLegacyTo1559,
  explainGas,
  getKRCategoryByType,
  getNativeTokenBalance,
  getPendingTxs,
  validateGasPriceRange,
} from '@/utils/transaction';
import Safe, { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import * as Sentry from '@sentry/browser';
import { Drawer, message, Modal } from 'antd';
import { maxBy } from 'lodash';
import {
  Chain,
  ExplainTxResponse,
  GasLevel,
  Tx,
} from 'background/service/openapi';
import { Account, ChainGas } from 'background/service/preference';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  CHAINS,
  CHAINS_ENUM,
  HARDWARE_KEYRING_TYPES,
  INTERNAL_REQUEST_ORIGIN,
  KEYRING_CLASS,
  KEYRING_TYPE,
  SUPPORT_1559_KEYRING_TYPE,
  KEYRING_CATEGORY_MAP,
  GAS_TOP_UP_ADDRESS,
  ALIAS_ADDRESS,
} from 'consts';
import { addHexPrefix, isHexPrefixed, isHexString } from '@ethereumjs/util';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useTranslation, Trans } from 'react-i18next';
import { useScroll } from 'react-use';
import { useSize, useDebounceFn, useRequest } from 'ahooks';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import {
  useApproval,
  useWallet,
  isStringOrNumber,
  useCommonPopupView,
  getTimeSpan,
} from '@/ui/utils';
import { WaitingSignComponent, WaitingSignMessageComponent } from './map';
import GnosisDrawer from './TxComponents/GnosisDrawer';
import Loading from './TxComponents/Loading';
import { intToHex } from 'ui/utils/number';
import { calcMaxPriorityFee } from '@/utils/transaction';
import { FooterBar } from './FooterBar/FooterBar';
import Actions from './Actions';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import RuleDrawer from './SecurityEngine/RuleDrawer';
import {
  Level,
  defaultRules,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { CoboDelegatedDrawer } from './TxComponents/CoboDelegatedDrawer';
import { BroadcastMode } from './BroadcastMode';
import { TxPushType } from '@rabby-wallet/rabby-api/dist/types';
import { SafeNonceSelector } from './TxComponents/SafeNonceSelector';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { findChain, isTestnet } from '@/utils/chain';
import { SignTestnetTx } from './SignTestnetTx';
import { SignAdvancedSettings } from './SignAdvancedSettings';
import GasSelectorHeader, {
  GasSelectorResponse,
} from './TxComponents/GasSelectorHeader';
import { GasLessConfig } from './FooterBar/GasLessComponents';
import { adjustV } from '@/ui/utils/gnosis';
import {
  useAutoLoginOnSwitchedGasAccount,
  useGasAccountTxsCheck,
} from '../../GasAccount/hooks/checkTxs';
import {
  fetchActionRequiredData,
  parseAction,
  formatSecurityEngineContext,
  ActionRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { ga4 } from '@/utils/ga4';
import { EIP7702Warning } from './EIP7702Warning';

interface BasicCoboArgusInfo {
  address: string;
  safeModuleAddress: string;
  networkId: string;
  delegates: string[];
}

const normalizeHex = (value: string | number) => {
  if (typeof value === 'number') {
    return intToHex(Math.floor(value));
  }
  if (typeof value === 'string') {
    if (!isHexPrefixed(value)) {
      return addHexPrefix(value);
    }
    return value;
  }
  return value;
};

export const normalizeTxParams = (tx) => {
  const copy = tx;
  try {
    if ('nonce' in copy && isStringOrNumber(copy.nonce)) {
      copy.nonce = normalizeHex(copy.nonce);
    }
    if ('gas' in copy && isStringOrNumber(copy.gas)) {
      copy.gas = normalizeHex(copy.gas);
    }
    if ('gasLimit' in copy && isStringOrNumber(copy.gasLimit)) {
      copy.gas = normalizeHex(copy.gasLimit);
    }
    if ('gasPrice' in copy && isStringOrNumber(copy.gasPrice)) {
      copy.gasPrice = normalizeHex(copy.gasPrice);
    }
    if ('maxFeePerGas' in copy && isStringOrNumber(copy.maxFeePerGas)) {
      copy.maxFeePerGas = normalizeHex(copy.maxFeePerGas);
    }
    if (
      'maxPriorityFeePerGas' in copy &&
      isStringOrNumber(copy.maxPriorityFeePerGas)
    ) {
      copy.maxPriorityFeePerGas = normalizeHex(copy.maxPriorityFeePerGas);
    }
    if ('value' in copy) {
      if (!isStringOrNumber(copy.value)) {
        copy.value = '0x0';
      } else {
        copy.value = normalizeHex(copy.value);
      }
    }
    if ('data' in copy) {
      if (!tx.data.startsWith('0x')) {
        copy.data = `0x${tx.data}`;
      }
    }

    if ('authorizationList' in copy) {
      copy.authorizationList = copy.authorizationList.map((item) => {
        return normalizeHex(item);
      });
    }
  } catch (e) {
    Sentry.captureException(
      new Error(`normalizeTxParams failed, ${JSON.stringify(e)}`)
    );
  }
  return copy;
};

export const TxTypeComponent = ({
  actionRequireData,
  actionData,
  chain = CHAINS[CHAINS_ENUM.ETH],
  isReady,
  raw,
  onChange,
  isSpeedUp,
  engineResults,
  txDetail,
  origin,
  originLogo,
}: {
  actionRequireData: ActionRequireData;
  actionData: ParsedTransactionActionData;
  chain: Chain;
  isReady: boolean;
  txDetail: ExplainTxResponse;
  raw: Record<string, string | number>;
  onChange(data: Record<string, any>): void;
  isSpeedUp: boolean;
  engineResults: Result[];
  origin?: string;
  originLogo?: string;
}) => {
  if (!isReady) return <Loading />;
  if (actionData && actionRequireData) {
    return (
      <Actions
        data={actionData}
        requireData={actionRequireData}
        chain={chain}
        engineResults={engineResults}
        txDetail={txDetail}
        raw={raw}
        onChange={onChange}
        isSpeedUp={isSpeedUp}
        origin={origin}
        originLogo={originLogo}
      />
    );
  }
  return <></>;
};

const useExplainGas = ({
  gasUsed,
  gasPrice,
  chainId,
  nativeTokenPrice,
  tx,
  wallet,
  gasLimit,
  isReady,
}: {
  gasUsed: number | string;
  gasPrice: number | string;
  chainId: number;
  nativeTokenPrice: number;
  tx: Tx;
  wallet: ReturnType<typeof useWallet>;
  gasLimit: string | undefined;
  isReady: boolean;
}) => {
  const [result, setResult] = useState({
    gasCostUsd: new BigNumber(0),
    gasCostAmount: new BigNumber(0),
    maxGasCostAmount: new BigNumber(0),
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isReady) {
      explainGas({
        gasUsed,
        gasPrice,
        chainId,
        nativeTokenPrice,
        wallet,
        tx,
        gasLimit,
      }).then((data) => {
        setResult(data);
        setIsLoading(false);
      });
    }
  }, [
    gasUsed,
    gasPrice,
    chainId,
    nativeTokenPrice,
    wallet,
    tx,
    gasLimit,
    isReady,
  ]);

  return useMemo(() => {
    return {
      ...result,
      isExplainingGas: isLoading,
    };
  }, [result, isLoading]);
};

const useCheckGasAndNonce = ({
  recommendGasLimitRatio,
  recommendGasLimit,
  recommendNonce,
  tx,
  gasLimit,
  nonce,
  isCancel,
  gasExplainResponse,
  isSpeedUp,
  isGnosisAccount,
  nativeTokenBalance,
}: Parameters<typeof checkGasAndNonce>[0]) => {
  return useMemo(
    () =>
      checkGasAndNonce({
        recommendGasLimitRatio,
        recommendGasLimit,
        recommendNonce,
        tx,
        gasLimit,
        nonce,
        isCancel,
        gasExplainResponse,
        isSpeedUp,
        isGnosisAccount,
        nativeTokenBalance,
      }),
    [
      recommendGasLimit,
      recommendNonce,
      tx,
      gasLimit,
      nonce,
      isCancel,
      gasExplainResponse,
      isSpeedUp,
      isGnosisAccount,
      nativeTokenBalance,
    ]
  );
};

interface SignTxProps<TData extends any[] = any[]> {
  params: {
    session: {
      origin: string;
      icon: string;
      name: string;
    };
    data: TData;
    isGnosis?: boolean;
    account?: Account;
    $ctx?: any;
  };
  origin?: string;
}

const SignTx = ({ params, origin }: SignTxProps) => {
  const { isGnosis, account } = params;
  const renderStartAt = useRef(0);
  const securityEngineCtx = useRef<any>(null);
  const logId = useRef('');
  const actionType = useRef('');
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
  const [actionData, setActionData] = useState<ParsedTransactionActionData>({});
  const [actionRequireData, setActionRequireData] = useState<ActionRequireData>(
    null
  );
  const { t } = useTranslation();
  const [preprocessSuccess, setPreprocessSuccess] = useState(true);
  const [chainId, setChainId] = useState<number>(
    params.data[0].chainId && Number(params.data[0].chainId)
  );
  const [chain, setChain] = useState(
    findChain({
      id: chainId,
    })
  );
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
  const scrollRefSize = useSize(scrollRef);
  const scrollInfo = useScroll(scrollRef);
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  if (!chain) throw new Error('No support chain found');
  const [support1559, setSupport1559] = useState(chain.eip['1559']);
  const [support7702, setSupport7702] = useState(chain.eip['7702']);
  const [isLedger, setIsLedger] = useState(false);
  const { userData, rules, currentTx, tokenDetail } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    currentTx: s.securityEngine.currentTx,
    tokenDetail: s.sign.tokenDetail,
  }));
  const [footerShowShadow, setFooterShowShadow] = useState(false);

  const gaEvent = async (type: 'allow' | 'cancel') => {
    const ga:
      | {
          category: 'Send' | 'Security';
          source: 'sendNFT' | 'sendToken' | 'nftApproval' | 'tokenApproval';
          trigger: string;
        }
      | undefined = params?.$ctx?.ga;
    if (!ga) {
      return;
    }
    const { category, source, trigger } = ga;
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;

    if (category === 'Send') {
      matomoRequestEvent({
        category,
        action: type === 'cancel' ? 'cancelSignTx' : 'signTx',
        label: [
          chain.name,
          getKRCategoryByType(currentAccount.type),
          currentAccount.brandName,
          source === 'sendNFT' ? 'nft' : 'token',
          trigger,
        ].join('|'),
        transport: 'beacon',
      });
    } else if (category === 'Security') {
      let action = '';
      if (type === 'cancel') {
        if (source === 'nftApproval') {
          action = 'cancelSignDeclineNFTApproval';
        } else {
          action = 'cancelSignDeclineTokenApproval';
        }
      } else {
        if (source === 'nftApproval') {
          action = 'signDeclineNFTApproval';
        } else {
          action = 'signDeclineTokenApproval';
        }
      }
      matomoRequestEvent({
        category,
        action,
        label: [
          chain.name,
          getKRCategoryByType(currentAccount.type),
          currentAccount.brandName,
        ].join('|'),
        transport: 'beacon',
      });
    }
  };
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

  const {
    data = '0x',
    from,
    gas,
    gasPrice,
    nonce,
    to,
    value,
    maxFeePerGas,
    isSpeedUp,
    isCancel,
    isSend,
    isSwap,
    isBridge,
    swapPreferMEVGuarded,
    isViewGnosisSafe,
    reqId,
    safeTxGas,
    authorizationList,
  } = useMemo(() => {
    return normalizeTxParams(params.data[0]);
  }, [params.data]);

  // is eip7702
  if (authorizationList) {
    return <EIP7702Warning />;
  }

  const [pushInfo, setPushInfo] = useState<{
    type: TxPushType;
    lowGasDeadline?: number;
  }>({
    type: swapPreferMEVGuarded ? 'mev' : 'default',
  });

  let updateNonce = true;
  if (isCancel || isSpeedUp || (nonce && from === to) || nonceChanged)
    updateNonce = false;

  const getGasPrice = () => {
    let result = '';
    if (maxFeePerGas) {
      result = isHexString(maxFeePerGas)
        ? maxFeePerGas
        : intToHex(maxFeePerGas);
    }
    if (gasPrice) {
      result = isHexString(gasPrice) ? gasPrice : intToHex(parseInt(gasPrice));
    }
    if (Number.isNaN(Number(result))) {
      result = '';
    }
    return result;
  };
  const [tx, setTx] = useState<Tx>({
    chainId,
    data: data || '0x', // can not execute with empty string, use 0x instead
    from,
    gas: gas || params.data[0].gasLimit,
    gasPrice: getGasPrice(),
    nonce,
    to,
    value,
  });
  const [realNonce, setRealNonce] = useState('');
  const [gasLimit, setGasLimit] = useState<string | undefined>(undefined);
  const [safeInfo, setSafeInfo] = useState<BasicSafeInfo | null>(null);
  const [coboArgusInfo, setCoboArgusInfo] = useState<BasicCoboArgusInfo>();
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

  const isGasTopUp = tx.to?.toLowerCase() === GAS_TOP_UP_ADDRESS.toLowerCase();

  const gasExplainResponse = useExplainGas({
    gasUsed,
    gasPrice: selectedGas?.price || 0,
    chainId,
    nativeTokenPrice: txDetail?.native_token.price || 0,
    tx,
    wallet,
    gasLimit,
    isReady,
  });

  const checkErrors = useCheckGasAndNonce({
    recommendGasLimit,
    recommendNonce,
    gasLimit: Number(gasLimit),
    nonce: Number(realNonce || tx.nonce),
    gasExplainResponse,
    isSpeedUp,
    isCancel,
    tx,
    isGnosisAccount: isGnosisAccount || isCoboArugsAccount,
    nativeTokenBalance,
    recommendGasLimitRatio,
  });

  const isGasNotEnough = useMemo(() => {
    return checkErrors.some((e) => e.code === 3001);
  }, [checkErrors]);

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

  const txs = useMemo(() => {
    return [
      {
        ...tx,
        nonce: realNonce || tx.nonce,
        gasPrice: tx.gasPrice || tx.maxFeePerGas,
        gas: gasLimit,
      },
    ] as Tx[];
  }, [tx, realNonce, gasLimit]);

  const {
    gasAccountCost,
    gasMethod,
    setGasMethod,
    isGasAccountLogin,
    gasAccountCanPay,
    canGotoUseGasAccount,
  } = useGasAccountTxsCheck({
    isReady,
    txs,
    noCustomRPC,
    isSupportedAddr,
  });

  useAutoLoginOnSwitchedGasAccount({
    isGasAccountLogin,
    isPayByGasAccount: gasMethod === 'gasAccount',
    gasAccountCanPay,
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

  const explainTx = async (address: string) => {
    let recommendNonce = '0x0';
    if (!isGnosisAccount && !isCoboArugsAccount) {
      try {
        recommendNonce = await wallet.getRecommendNonce({
          from: tx.from,
          chainId,
        });
        setRecommendNonce(recommendNonce);
      } catch (e) {
        if (await wallet.hasCustomRPC(chain.enum)) {
          triggerCustomRPCErrorModal();
        }
      }
    }
    if (updateNonce && !isGnosisAccount && !isCoboArugsAccount) {
      setRealNonce(recommendNonce);
    } // do not overwrite nonce if from === to(cancel transaction)
    const preExecPromise = wallet.openapi
      .preExecTx({
        tx: {
          ...tx,
          nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1', // set a mock nonce for explain if dapp not set it
          data: tx.data,
          value: tx.value || '0x0',
          gas: tx.gas || '', // set gas limit if dapp not set
        },
        origin: origin || '',
        address,
        updateNonce,
        pending_tx_list: await getPendingTxs({
          recommendNonce,
          wallet,
          address,
        }),
      })
      .then(async (res) => {
        let estimateGas = 0;
        if (res.gas.success) {
          estimateGas = res.gas.gas_limit || res.gas.gas_used;
        }
        const {
          gas: gasRaw,
          needRatio,
          gasUsed,
        } = await wallet.getRecommendGas({
          gasUsed: res.gas.gas_used,
          gas: estimateGas,
          tx,
          chainId,
        });
        const gas = new BigNumber(gasRaw);
        setGasUsed(gasUsed);
        setRecommendGasLimit(`0x${gas.toString(16)}`);
        if (tx.gas && origin === INTERNAL_REQUEST_ORIGIN) {
          setGasLimit(intToHex(Number(tx.gas))); // use origin gas as gasLimit when tx is an internal tx with gasLimit(i.e. for SendMax native token)
        } else if (!gasLimit) {
          const { gasLimit, recommendGasLimitRatio } = await calcGasLimit({
            chain,
            tx,
            gas,
            selectedGas,
            nativeTokenBalance,
            explainTx: res,
            needRatio,
            wallet,
          });
          setGasLimit(gasLimit);
          setRecommendGasLimitRatio(recommendGasLimitRatio);
        }
        setTxDetail(res);

        setPreprocessSuccess(res.pre_exec.success);
        return res;
      });

    return wallet.openapi
      .parseTx({
        chainId: chain.serverId,
        tx: {
          ...tx,
          gas: '0x0',
          nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
          value: tx.value || '0x0',
          // todo
          to: tx.to || '',
        },
        origin: origin || '',
        addr: address,
      })
      .then(async (actionData) => {
        logId.current = actionData.log_id;
        actionType.current = actionData?.action?.type || '';
        return preExecPromise.then(async (res) => {
          const parsed = parseAction({
            type: 'transaction',
            data: actionData.action,
            balanceChange: res.balance_change,
            tx: {
              ...tx,
              gas: '0x0',
              nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
              value: tx.value || '0x0',
            },
            preExecVersion: res.pre_exec_version,
            gasUsed: res.gas.gas_used,
            sender: tx.from,
          });
          const requiredData = await fetchActionRequiredData({
            type: 'transaction',
            actionData: parsed,
            contractCall: actionData.contract_call,
            chainId: chain.serverId,
            sender: address,
            walletProvider: {
              findChain,
              ALIAS_ADDRESS,
              hasPrivateKeyInWallet: wallet.hasPrivateKeyInWallet,
              hasAddress: wallet.hasAddress,
              getWhitelist: wallet.getWhitelist,
              isWhitelistEnabled: wallet.isWhitelistEnabled,
              getPendingTxsByNonce: wallet.getPendingTxsByNonce,
            },
            tx: {
              ...tx,
              gas: '0x0',
              nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
              value: tx.value || '0x0',
            },
            apiProvider: isTestnet(chain.serverId)
              ? wallet.testnetOpenapi
              : wallet.openapi,
          });
          const ctx = await formatSecurityEngineContext({
            type: 'transaction',
            actionData: parsed,
            requireData: requiredData,
            chainId: chain.serverId,
            isTestnet: isTestnet(chain.serverId),
            provider: {
              getTimeSpan,
              hasAddress: wallet.hasAddress,
            },
          });
          securityEngineCtx.current = ctx;
          const result = await executeEngine(ctx);
          setEngineResults(result);
          setActionData(parsed);
          setActionRequireData(requiredData);
          const approval = await getApproval();

          approval.signingTxId &&
            (await wallet.updateSigningTx(approval.signingTxId, {
              rawTx: {
                nonce: updateNonce ? recommendNonce : tx.nonce,
              },
              explain: {
                ...res,
                approvalId: approval.id,
                calcSuccess: !(checkErrors.length > 0),
              },
              action: {
                actionData: parsed,
                requiredData,
              },
            }));
        });
      });
  };

  const explain = async () => {
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;
    try {
      setIsReady(false);
      await explainTx(currentAccount.address);
      setIsReady(true);
    } catch (e: any) {
      Modal.error({
        title: 'Error',
        content: e.message || JSON.stringify(e),
        className: 'modal-support-darkmode',
      });
    }
  };

  const handleGnosisConfirm = async (account: Account) => {
    if (!safeInfo) return;
    setGnosisFooterBarVisible(true);
    setCurrentGnosisAdmin(account);
  };
  const handleGnosisSign = async () => {
    const account = currentGnosisAdmin;
    if (!safeInfo || !account) {
      return;
    }
    if (activeApprovalPopup()) {
      return;
    }

    if (account?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(account.address);
    }

    wallet.reportStats('signTransaction', {
      type: KEYRING_TYPE.GnosisKeyring,
      category: KEYRING_CATEGORY_MAP[KEYRING_CLASS.GNOSIS],
      chainId: chain.serverId,
      preExecSuccess:
        checkErrors.length > 0 || !txDetail?.pre_exec.success ? false : true,
      createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
      source: params?.$ctx?.ga?.source || '',
      trigger: params?.$ctx?.ga?.trigger || '',
      networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
    });
    if (!isViewGnosisSafe) {
      const params: any = {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        safeTxGas: safeTxGas,
      };
      params.nonce = realNonce;
      await wallet.buildGnosisTransaction(
        tx.from,
        account,
        params,
        safeInfo.version,
        chain.network
      );
    }
    const typedData = await wallet.gnosisGenerateTypedData();
    if (!typedData) {
      throw new Error('Failed to generate typed data');
    }

    if (WaitingSignMessageComponent[account.type]) {
      wallet.signTypedDataWithUI(
        account.type,
        account.address,
        typedData as any,
        {
          brandName: account.brandName,
          version: 'V4',
        }
      );
      if (isSend) {
        wallet.clearPageStateCache();
      }
      resolveApproval({
        uiRequestComponent: WaitingSignMessageComponent[account.type],
        type: account.type,
        address: account.address,
        data: [account.address, JSON.stringify(typedData)],
        isGnosis: true,
        account: account,
        extra: {
          popupProps: {
            maskStyle: {
              backgroundColor: 'transparent',
            },
          },
        },
      });
    } else {
      // it should never go to here
      try {
        let result = await wallet.signTypedData(
          account.type,
          account.address,
          typedData as any,
          {
            version: 'V4',
          }
        );
        result = adjustV('eth_signTypedData', result);

        const sigs = await wallet.getGnosisTransactionSignatures();
        if (sigs.length > 0) {
          await wallet.gnosisAddConfirmation(account.address, result);
        } else {
          await wallet.gnosisAddSignature(account.address, result);
          await wallet.postGnosisTransaction();
        }
        if (isSend) {
          wallet.clearPageStateCache();
        }
        resolveApproval();
      } catch (e) {
        message.error({
          content: e.message,
          className: 'modal-support-darkmode',
        });
      }
    }
    return;
  };

  const {
    loading: isSubmittingGnosis,
    runAsync: runHandleGnosisSign,
  } = useRequest(handleGnosisSign, {
    manual: true,
  });

  const handleCoboArugsConfirm = async (account: Account) => {
    if (!coboArgusInfo) return;

    wallet.reportStats('signTransaction', {
      type: KEYRING_TYPE.CoboArgusKeyring,
      category: KEYRING_CATEGORY_MAP[KEYRING_CLASS.CoboArgus],
      chainId: chain.serverId,
      preExecSuccess:
        checkErrors.length > 0 || !txDetail?.pre_exec.success ? false : true,
      createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
      source: params?.$ctx?.ga?.source || '',
      trigger: params?.$ctx?.ga?.trigger || '',
      networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
    });

    let newTx;

    try {
      newTx = await wallet.coboSafeBuildTransaction({
        tx: {
          ...tx,
        },
        chainServerId: coboArgusInfo.networkId,
        coboSafeAddress: coboArgusInfo.safeModuleAddress,
        account,
      });
    } catch (e) {
      wallet.coboSafeResetCurrentAccount();
      let content = e.message || JSON.stringify(e);
      if (content.includes('E48')) {
        content = t('page.signTx.coboSafeNotPermission');
      }
      Modal.error({
        title: 'Error',
        content,
      });
      return;
    }

    const approval = await getApproval();

    wallet.sendRequest({
      $ctx: params.$ctx,
      method: 'eth_sendTransaction',
      params: [
        {
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          chainId: tx.chainId,
          ...newTx,
          isCoboSafe: true,
        },
      ],
    });
    resolveApproval({
      ...tx,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
      traceId: txDetail?.trace_id,
      signingTxId: approval.signingTxId,
      pushType: pushInfo.type,
      lowGasDeadline: pushInfo.lowGasDeadline,
      reqId,
      logId: logId.current,
    });
    wallet.clearPageStateCache();
  };

  const { activeApprovalPopup } = useCommonPopupView();
  const invokeEnterPassphrase = useEnterPassphraseModal('address');
  const handleAllow = async () => {
    if (!selectedGas) return;

    if (activeApprovalPopup()) {
      return;
    }

    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;

    if (currentAccount?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(currentAccount.address);
    }

    try {
      validateGasPriceRange(tx);
    } catch (e) {
      Modal.error({
        title: 'Error',
        content: e.message || JSON.stringify(e),
      });
      return;
    }

    const selected: ChainGas = {
      lastTimeSelect: selectedGas.level === 'custom' ? 'gasPrice' : 'gasLevel',
    };
    if (selectedGas.level === 'custom') {
      if (support1559) {
        selected.gasPrice = parseInt(tx.maxFeePerGas!);
      } else {
        selected.gasPrice = parseInt(tx.gasPrice!);
      }
    } else {
      selected.gasLevel = selectedGas.level;
    }
    if (!isSpeedUp && !isCancel && !isSwap) {
      await wallet.updateLastTimeGasSelection(chainId, selected);
    }
    const transaction: Tx = {
      from: tx.from,
      to: tx.to,
      data: tx.data,
      nonce: tx.nonce,
      value: tx.value,
      chainId: tx.chainId,
      gas: '',
    };
    if (support1559) {
      transaction.maxFeePerGas = tx.maxFeePerGas;
      transaction.maxPriorityFeePerGas =
        maxPriorityFee <= 0
          ? tx.maxFeePerGas
          : intToHex(Math.round(maxPriorityFee));
    } else {
      (transaction as Tx).gasPrice = tx.gasPrice;
    }
    const approval = await getApproval();
    gaEvent('allow');

    approval.signingTxId &&
      (await wallet.updateSigningTx(approval.signingTxId, {
        rawTx: {
          nonce: realNonce || tx.nonce,
        },
        explain: {
          ...txDetail!,
          approvalId: approval.id,
          calcSuccess: !(checkErrors.length > 0),
        },
        action: {
          actionData,
          requiredData: actionRequireData,
        },
      }));

    if (currentAccount?.type && WaitingSignComponent[currentAccount.type]) {
      resolveApproval({
        ...transaction,
        isSend,
        nonce: realNonce || tx.nonce,
        gas: gasLimit,
        uiRequestComponent: WaitingSignComponent[currentAccount.type],
        type: currentAccount.type,
        address: currentAccount.address,
        traceId: txDetail?.trace_id,
        extra: {
          brandName: currentAccount.brandName,
        },
        $ctx: params.$ctx,
        signingTxId: approval.signingTxId,
        pushType: pushInfo.type,
        lowGasDeadline: pushInfo.lowGasDeadline,
        reqId,
        isGasLess: gasMethod === 'native' ? useGasLess : false,
        isGasAccount: gasAccountCanPay,
        logId: logId.current,
      });

      return;
    }
    if (isGnosisAccount || isCoboArugsAccount) {
      setDrawerVisible(true);
      return;
    }

    await wallet.reportStats('signTransaction', {
      type: currentAccount.brandName,
      chainId: chain.serverId,
      category: KEYRING_CATEGORY_MAP[currentAccount.type],
      preExecSuccess:
        checkErrors.length > 0 || !txDetail?.pre_exec.success ? false : true,
      createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
      source: params?.$ctx?.ga?.source || '',
      trigger: params?.$ctx?.ga?.trigger || '',
      networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
    });

    matomoRequestEvent({
      category: 'Transaction',
      action: 'Submit',
      label: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
    });

    ga4.fireEvent(`Submit_${chain?.isTestnet ? 'Custom' : 'Integrated'}`, {
      event_category: 'Transaction',
    });

    resolveApproval({
      ...transaction,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
      traceId: txDetail?.trace_id,
      signingTxId: approval.signingTxId,
      pushType: pushInfo.type,
      lowGasDeadline: pushInfo.lowGasDeadline,
      reqId,
      logId: logId.current,
    });
  };

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
    const beforeNonce = realNonce || tx.nonce;
    const afterNonce = intToHex(gas.nonce);
    if (support1559) {
      setTx({
        ...tx,
        maxFeePerGas: intToHex(Math.round(gas.price)),
        gas: intToHex(gas.gasLimit),
        nonce: afterNonce,
      });
      setMaxPriorityFee(Math.round(gas.maxPriorityFee));
    } else {
      setTx({
        ...tx,
        gasPrice: intToHex(Math.round(gas.price)),
        gas: intToHex(gas.gasLimit),
        nonce: afterNonce,
      });
    }
    setGasLimit(intToHex(gas.gasLimit));
    if (Number(gasLimit) !== gas.gasLimit) {
      setManuallyChangeGasLimit(true);
    }
    if (!isGnosisAccount) {
      setRealNonce(afterNonce);
    } else {
      if (safeInfo && safeInfo.nonce <= gas.nonce) {
        setRealNonce(afterNonce);
      } else {
        safeInfo && setRealNonce(`0x${safeInfo.nonce.toString(16)}`);
      }
    }
    if (beforeNonce !== afterNonce) {
      setNonceChanged(true);
    }
  };

  const handleAdvancedSettingsChange = (gas: GasSelectorResponse) => {
    const beforeNonce = realNonce || tx.nonce;
    const afterNonce = intToHex(gas.nonce);
    if (support1559) {
      setTx({
        ...tx,
        gas: intToHex(gas.gasLimit),
        nonce: afterNonce,
      });
    } else {
      setTx({
        ...tx,
        gas: intToHex(gas.gasLimit),
        nonce: afterNonce,
      });
    }
    setGasLimit(intToHex(gas.gasLimit));
    if (Number(gasLimit) !== gas.gasLimit) {
      setManuallyChangeGasLimit(true);
    }
    if (!isGnosisAccount) {
      setRealNonce(afterNonce);
    } else {
      if (safeInfo && safeInfo.nonce <= gas.nonce) {
        setRealNonce(afterNonce);
      } else {
        safeInfo && setRealNonce(`0x${safeInfo.nonce.toString(16)}`);
      }
    }
    if (beforeNonce !== afterNonce) {
      setNonceChanged(true);
    }
  };

  const handleCancel = () => {
    gaEvent('cancel');
    rejectApproval('User rejected the request.');
  };

  const handleDrawerCancel = () => {
    setDrawerVisible(false);
  };

  const handleTxChange = (obj: Record<string, any>) => {
    setTx({
      ...tx,
      ...obj,
    });
    // trigger explain
    setUpdateId((id) => id + 1);
  };

  const loadGasMarket = async (
    chain: Chain,
    custom?: number
  ): Promise<GasLevel[]> => {
    const list = await wallet.gasMarketV2({
      chain,
      customGas: custom && custom > 0 ? custom : undefined,
      tx,
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
    const session = params.session;
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;
    const site = await wallet.getConnectedSite(session.origin);

    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setCanProcess(false);
      setCantProcessReason(
        <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
      );
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring || isGnosis) {
      const networkIds = await wallet.getGnosisNetworkIds(
        currentAccount.address
      );

      if (
        !networkIds.includes((chainId || CHAINS[site!.chain].id).toString())
      ) {
        setCanProcess(false);
        setCantProcessReason(
          <div className="flex items-center gap-6">
            <img src={IconGnosis} alt="" className="w-[24px] flex-shrink-0" />
            {t('page.signTx.multiSigChainNotMatch')}
          </div>
        );
      }
    }
  };

  const checkGasLessStatus = async () => {
    const sendUsdValue =
      txDetail?.balance_change.send_token_list?.reduce((sum, item) => {
        return new BigNumber(item.raw_amount || 0)
          .div(10 ** item.decimals)
          .times(item.price || 0)
          .plus(sum);
      }, new BigNumber(0)) || new BigNumber(0);
    const receiveUsdValue =
      txDetail?.balance_change?.receive_token_list.reduce((sum, item) => {
        return new BigNumber(item.raw_amount || 0)
          .div(10 ** item.decimals)
          .times(item.price || 0)
          .plus(sum);
      }, new BigNumber(0)) || new BigNumber(0);
    try {
      setGasLessLoading(true);
      const res = await wallet.openapi.gasLessTxCheck({
        tx: {
          ...tx,
          nonce: realNonce,
          gasPrice: tx.gasPrice || tx.maxFeePerGas,
          gas: gasLimit,
        },
        usdValue: Math.max(sendUsdValue.toNumber(), receiveUsdValue.toNumber()),
        preExecSuccess: txDetail?.pre_exec.success || false,
        gasUsed: txDetail?.gas?.gas_used || 0,
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
    } catch (error) {
      console.error('gasLessTxCheck error', error);
      setCanUseGasLess(false);
      setGasLessConfig(undefined);
      setGasLessLoading(false);
    }
  };

  const getSafeInfo = async () => {
    const currentAccount = (await wallet.getCurrentAccount())!;
    const networkId = '' + chainId;
    let safeInfo: BasicSafeInfo | null = null;
    try {
      safeInfo = await wallet.getBasicSafeInfo({
        address: currentAccount.address,
        networkId,
      });
    } catch (e) {
      let networkIds: string[] = [];
      try {
        networkIds = await wallet.getGnosisNetworkIds(currentAccount.address);
      } catch (e) {
        console.error(e);
      }
      if (!networkIds.includes(networkId)) {
        throw new Error(
          t('page.signTx.safeAddressNotSupportChain', [chain.name])
        );
      } else {
        throw e;
      }
    }
    try {
      const pendingTxs = await Safe.getPendingTransactions(
        currentAccount.address,
        networkId,
        safeInfo.nonce
      );
      const maxNonceTx = maxBy(pendingTxs.results, (item) =>
        Number(item.nonce)
      );
      let recommendSafeNonce = maxNonceTx
        ? Number(maxNonceTx.nonce) + 1
        : safeInfo.nonce;
      setSafeInfo(safeInfo);
      setRecommendNonce(`0x${recommendSafeNonce.toString(16)}`);

      if (
        tx.nonce !== undefined &&
        tx.nonce !== null &&
        Number(tx.nonce || '0') >= safeInfo.nonce &&
        origin === INTERNAL_REQUEST_ORIGIN
      ) {
        recommendSafeNonce = Number(tx.nonce || '0');
        setRecommendNonce(tx.nonce || '0x0');
      }
      if (Number(tx.nonce || 0) < safeInfo.nonce) {
        setTx({
          ...tx,
          nonce: `0x${recommendSafeNonce.toString(16)}`,
        });
        setRealNonce(`0x${recommendSafeNonce.toString(16)}`);
      } else {
        setRealNonce(`0x${Number(tx.nonce).toString(16)}`);
      }
      if (tx.nonce === undefined || tx.nonce === null) {
        setTx({
          ...tx,
          nonce: `0x${recommendSafeNonce.toString(16)}`,
        });
        setRealNonce(`0x${recommendSafeNonce.toString(16)}`);
      }
    } catch (e) {
      throw new Error(t('page.signTx.safeServiceNotAvailable'));
    }
  };

  const getCoboDelegates = async () => {
    const currentAccount = (await wallet.getCurrentAccount())!;
    const accountDetail = await wallet.coboSafeGetAccountDetail(
      currentAccount.address
    );
    if (!accountDetail) {
      return;
    }
    const delegates = await wallet.coboSafeGetAllDelegates({
      coboSafeAddress: accountDetail.safeModuleAddress,
      chainServerId: chain.serverId,
    });
    setCoboArgusInfo({
      ...accountDetail,
      delegates,
    });
  };

  const handleIgnoreAllRules = () => {
    dispatch.securityEngine.processAllRules(
      engineResults.map((result) => result.id)
    );
  };

  const handleIgnoreRule = (id: string) => {
    dispatch.securityEngine.processRule(id);
    dispatch.securityEngine.closeRuleDrawer();
  };

  const handleUndoIgnore = (id: string) => {
    dispatch.securityEngine.unProcessRule(id);
    dispatch.securityEngine.closeRuleDrawer();
  };

  const handleRuleEnableStatusChange = async (id: string, value: boolean) => {
    if (currentTx.processedRules.includes(id)) {
      dispatch.securityEngine.unProcessRule(id);
    }
    await wallet.ruleEnableStatusChange(id, value);
    dispatch.securityEngine.init();
  };

  const handleRuleDrawerClose = (update: boolean) => {
    if (update) {
      executeSecurityEngine();
    }
    dispatch.securityEngine.closeRuleDrawer();
  };

  const { run: reportLogId } = useDebounceFn(
    (rules) => {
      wallet.openapi.postActionLog({
        id: logId.current,
        type: 'tx',
        rules,
      });
    },
    { wait: 1000 }
  );

  const init = async () => {
    dispatch.securityEngine.init();
    dispatch.securityEngine.resetCurrentTx();
    try {
      const currentAccount =
        isGnosis && account ? account : (await wallet.getCurrentAccount())!;

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

      wallet.reportStats('createTransaction', {
        type: currentAccount.brandName,
        category: KEYRING_CATEGORY_MAP[currentAccount.type],
        chainId: chain.serverId,
        createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
        source: params?.$ctx?.ga?.source || '',
        trigger: params?.$ctx?.ga?.trigger || '',
        networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
        swapUseSlider: params?.$ctx?.ga?.swapUseSlider ?? '',
      });

      matomoRequestEvent({
        category: 'Transaction',
        action: 'init',
        label: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
      });

      ga4.fireEvent(`Init_${chain?.isTestnet ? 'Custom' : 'Integrated'}`, {
        event_category: 'Transaction',
      });

      if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
        setIsGnosisAccount(true);
        await getSafeInfo();
      }
      if (currentAccount.type === KEYRING_TYPE.CoboArgusKeyring) {
        setIsCoboArugsAccount(true);
        await getCoboDelegates();
      }

      checkCanProcess();
      const lastTimeGas: ChainGas | null = await wallet.getLastTimeGasSelection(
        chainId
      );
      let customGasPrice = 0;
      if (lastTimeGas?.lastTimeSelect === 'gasPrice' && lastTimeGas.gasPrice) {
        // use cached gasPrice if exist
        customGasPrice = lastTimeGas.gasPrice;
      }
      if (
        isSpeedUp ||
        isCancel ||
        ((isSend || isSwap || isBridge) && tx.gasPrice)
      ) {
        // use gasPrice set by dapp when it's a speedup or cancel tx
        customGasPrice = parseInt(tx.gasPrice!);
      }
      const gasList = await loadGasMarket(chain, customGasPrice);
      loadGasMedian(chain);
      let gas: GasLevel | null = null;

      if (
        ((isSend || isSwap || isBridge) && customGasPrice) ||
        isSpeedUp ||
        isCancel ||
        lastTimeGas?.lastTimeSelect === 'gasPrice'
      ) {
        gas = gasList.find((item) => item.level === 'custom')!;
      } else if (
        lastTimeGas?.lastTimeSelect &&
        lastTimeGas?.lastTimeSelect === 'gasLevel'
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
      const fee = calcMaxPriorityFee(
        gasList,
        gas,
        chainId,
        isCancel || isSpeedUp
      );
      setMaxPriorityFee(fee);

      setSelectedGas(gas);
      setSupport1559(is1559);
      if (is1559) {
        setTx(
          convertLegacyTo1559({
            ...tx,
            gasPrice: intToHex(gas.price),
          })
        );
      } else {
        setTx({
          ...tx,
          gasPrice: intToHex(gas.price),
        });
      }
      setInited(true);
    } catch (e) {
      Modal.error({
        className: 'modal-support-darkmode',
        title: 'Error',
        content: e.message || JSON.stringify(e),
      });
    }
  };

  const handleIsGnosisAccountChange = async () => {
    if (!isViewGnosisSafe) {
      await wallet.clearGnosisTransaction();
    }
    // if (SELF_HOST_SAFE_NETWORKS.includes(chainId.toString())) {
    //   const hasConfirmed = await wallet.hasConfirmSafeSelfHost(
    //     chainId.toString()
    //   );
    //   const sigs = await wallet.getGnosisTransactionSignatures();
    //   const isNewTx = sigs.length <= 0;
    //   if (isNewTx && !hasConfirmed) {
    //     Modal.info({
    //       closable: false,
    //       centered: true,
    //       width: 320,
    //       className: 'modal-support-darkmode external-link-alert-modal',
    //       title: t('page.signTx.safeTx.selfHostConfirm.title'),

    //       content: (
    //         <Trans i18nKey={'page.signTx.safeTx.selfHostConfirm.content'} />
    //       ),
    //       okText: t('page.signTx.safeTx.selfHostConfirm.button'),
    //       okButtonProps: {
    //         className: 'w-full',
    //       },
    //       cancelText: null,
    //       onOk() {
    //         wallet.setConfirmSafeSelfHost(chainId.toString());
    //       },
    //       onCancel() {
    //         wallet.setConfirmSafeSelfHost(chainId.toString());
    //       },
    //     });
    //   }
    // }
  };

  const executeSecurityEngine = async () => {
    const ctx = await formatSecurityEngineContext({
      type: 'transaction',
      actionData: actionData,
      requireData: actionRequireData,
      chainId: chain.serverId,
      isTestnet: isTestnet(chain.serverId),
      provider: {
        getTimeSpan,
        hasAddress: wallet.hasAddress,
      },
    });
    const result = await executeEngine(ctx);
    setEngineResults(result);
  };

  const hasUnProcessSecurityResult = useMemo(() => {
    const { processedRules } = currentTx;
    const enableResults = engineResults.filter((item) => item.enable);
    // const hasForbidden = enableResults.find(
    //   (result) => result.level === Level.FORBIDDEN
    // );
    const hasSafe = !!enableResults.find(
      (result) => result.level === Level.SAFE
    );
    const needProcess = enableResults.filter(
      (result) =>
        (result.level === Level.DANGER ||
          result.level === Level.WARNING ||
          result.level === Level.FORBIDDEN) &&
        !processedRules.includes(result.id)
    );
    // if (hasForbidden) return true;
    if (needProcess.length > 0) {
      return !hasSafe;
    } else {
      return false;
    }
  }, [engineResults, currentTx]);

  useEffect(() => {
    renderStartAt.current = Date.now();
    init();
  }, []);

  useEffect(() => {
    if (isReady) {
      if (scrollRef.current && scrollRef.current.scrollTop > 0) {
        scrollRef.current && (scrollRef.current.scrollTop = 0);
      }
      const duration = Date.now() - renderStartAt.current;
      stats.report('signPageRenderTime', {
        type: 'transaction',
        actionType: actionType.current,
        chain: chain?.serverId || '',
        duration,
      });
    }
  }, [isReady]);

  useEffect(() => {
    if (
      isReady &&
      !gasExplainResponse.isExplainingGas &&
      !isGnosisAccount &&
      !isCoboArugsAccount
    ) {
      if (isSupportedAddr && noCustomRPC) {
        checkGasLessStatus();
      } else {
        setGasLessLoading(false);
      }
    }
  }, [
    isReady,
    nativeTokenBalance,
    gasLimit,
    tx,
    realNonce,
    txDetail,
    isSupportedAddr,
    noCustomRPC,
    gasExplainResponse,
    isGnosisAccount,
    isCoboArugsAccount,
  ]);

  useEffect(() => {
    if (isGnosisAccount) {
      handleIsGnosisAccountChange();
    }
  }, [isGnosisAccount]);

  useEffect(() => {
    if (!inited) return;
    explain();
  }, [inited, updateId]);

  useEffect(() => {
    executeSecurityEngine();
  }, [userData, rules]);

  useEffect(() => {
    if (logId.current && isReady && securityEngineCtx.current) {
      try {
        const keys = Object.keys(securityEngineCtx.current);
        const key: any = keys[0];
        const notTriggeredRules = defaultRules.filter((rule) => {
          return (
            rule.requires.includes(key) &&
            !engineResults.some((item) => item.id === rule.id)
          );
        });
        reportLogId([
          ...notTriggeredRules.map((rule) => ({
            id: rule.id,
            level: null,
          })),
          ...engineResults.map((result) => ({
            id: result.id,
            level: result.level,
          })),
        ]);
      } catch (e) {
        // IGNORE
      }
    }
  }, [isReady, engineResults]);

  useEffect(() => {
    if (scrollRef.current && scrollInfo && scrollRefSize) {
      const avaliableHeight =
        scrollRef.current.scrollHeight - scrollRefSize.height;
      if (avaliableHeight <= 0) {
        setFooterShowShadow(false);
      } else {
        setFooterShowShadow(avaliableHeight - 20 > scrollInfo.y);
      }
    }
  }, [scrollInfo, scrollRefSize]);

  return (
    <>
      <div
        className={clsx('approval-tx', {
          'pre-process-failed': !preprocessSuccess,
        })}
        ref={scrollRef}
      >
        {txDetail && (
          <>
            {txDetail && (
              <TxTypeComponent
                isReady={isReady}
                actionData={actionData}
                actionRequireData={actionRequireData}
                chain={chain}
                txDetail={txDetail}
                raw={{
                  ...tx,
                  nonce: realNonce || tx.nonce,
                  gas: gasLimit!,
                }}
                onChange={handleTxChange}
                isSpeedUp={isSpeedUp}
                engineResults={engineResults}
                origin={origin}
                originLogo={params.session.icon}
              />
            )}

            {isGnosisAccount && isReady && (
              <SafeNonceSelector
                disabled={isViewGnosisSafe}
                isReady={isReady}
                chainId={chainId}
                value={realNonce}
                safeInfo={safeInfo}
                onChange={(v) => {
                  setRealNonce(v);
                  setNonceChanged(true);
                }}
              />
            )}
          </>
        )}
        {!isGnosisAccount &&
        !isCoboArugsAccount &&
        swapPreferMEVGuarded &&
        isReady ? (
          <BroadcastMode
            chain={chain.enum}
            value={pushInfo}
            isCancel={isCancel}
            isSpeedUp={isSpeedUp}
            isGasTopUp={isGasTopUp}
            onChange={(value) => {
              setPushInfo(value);
            }}
          />
        ) : null}

        {!isGnosisAccount && !isCoboArugsAccount && txDetail && isReady ? (
          <SignAdvancedSettings
            disabled={isGnosisAccount || isCoboArugsAccount}
            isReady={isReady}
            gasLimit={gasLimit}
            recommendGasLimit={recommendGasLimit}
            recommendNonce={recommendNonce}
            onChange={handleAdvancedSettingsChange}
            nonce={realNonce || tx.nonce}
            disableNonce={isSpeedUp || isCancel}
            manuallyChangeGasLimit={manuallyChangeGasLimit}
          />
        ) : null}

        {isGnosisAccount && safeInfo && (
          <Drawer
            placement="bottom"
            height="400px"
            className="gnosis-drawer is-support-darkmode"
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            maskClosable
          >
            <GnosisDrawer
              safeInfo={safeInfo}
              onCancel={handleDrawerCancel}
              onConfirm={handleGnosisConfirm}
            />
          </Drawer>
        )}

        {isGnosisAccount && safeInfo && currentGnosisAdmin && (
          <Drawer
            placement="bottom"
            height="fit-content"
            className="gnosis-footer-bar is-support-darkmode"
            visible={gnosisFooterBarVisible}
            onClose={() => setGnosisFooterBarVisible(false)}
            maskClosable
            closable={false}
            bodyStyle={{
              padding: 0,
            }}
          >
            <FooterBar
              origin={params.session.origin}
              originLogo={params.session.icon}
              chain={chain}
              gnosisAccount={currentGnosisAdmin}
              onCancel={handleCancel}
              // securityLevel={securityLevel}
              // hasUnProcessSecurityResult={hasUnProcessSecurityResult}
              onSubmit={runHandleGnosisSign}
              enableTooltip={
                currentGnosisAdmin?.type === KEYRING_TYPE.WatchAddressKeyring
              }
              tooltipContent={
                currentGnosisAdmin?.type ===
                KEYRING_TYPE.WatchAddressKeyring ? (
                  <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
                ) : null
              }
              disabledProcess={
                currentGnosisAdmin?.type === KEYRING_TYPE.WatchAddressKeyring
              }
              isSubmitting={isSubmittingGnosis}
              isTestnet={chain?.isTestnet}
              onIgnoreAllRules={handleIgnoreAllRules}
            />
          </Drawer>
        )}

        {isCoboArugsAccount && coboArgusInfo && (
          <Drawer
            placement="bottom"
            height="260px"
            className="gnosis-drawer is-support-darkmode"
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            maskClosable
          >
            <CoboDelegatedDrawer
              owners={coboArgusInfo.delegates}
              onCancel={handleDrawerCancel}
              onConfirm={handleCoboArugsConfirm}
              networkId={chain.network}
            />
          </Drawer>
        )}
        <RuleDrawer
          selectRule={currentTx.ruleDrawer.selectRule}
          visible={currentTx.ruleDrawer.visible}
          onIgnore={handleIgnoreRule}
          onUndo={handleUndoIgnore}
          onRuleEnableStatusChange={handleRuleEnableStatusChange}
          onClose={handleRuleDrawerClose}
        />
      </div>
      {txDetail && (
        <>
          <FooterBar
            Header={
              <GasSelectorHeader
                tx={tx}
                gasAccountCost={gasAccountCost}
                gasMethod={gasMethod}
                onChangeGasMethod={setGasMethod}
                pushType={pushInfo.type}
                disabled={isGnosisAccount || isCoboArugsAccount}
                isReady={isReady}
                gasLimit={gasLimit}
                noUpdate={isCancel || isSpeedUp}
                gasList={gasList}
                selectedGas={selectedGas}
                version={txDetail.pre_exec_version}
                gas={{
                  error: txDetail.gas.error,
                  success: txDetail.gas.success,
                  gasCostUsd: gasExplainResponse.gasCostUsd,
                  gasCostAmount: gasExplainResponse.gasCostAmount,
                }}
                gasCalcMethod={(price) => {
                  return explainGas({
                    gasUsed,
                    gasPrice: price,
                    chainId,
                    nativeTokenPrice: txDetail?.native_token.price || 0,
                    tx,
                    wallet,
                    gasLimit,
                  });
                }}
                recommendGasLimit={recommendGasLimit}
                recommendNonce={recommendNonce}
                chainId={chainId}
                onChange={handleGasChange}
                nonce={realNonce || tx.nonce}
                disableNonce={isSpeedUp || isCancel}
                isSpeedUp={isSpeedUp}
                isCancel={isCancel}
                is1559={support1559}
                isHardware={isHardware}
                manuallyChangeGasLimit={manuallyChangeGasLimit}
                errors={checkErrors}
                engineResults={engineResults}
                nativeTokenBalance={nativeTokenBalance}
                gasPriceMedian={gasPriceMedian}
              />
            }
            isWatchAddr={
              currentAccountType === KEYRING_TYPE.WatchAddressKeyring
            }
            noCustomRPC={noCustomRPC}
            gasMethod={gasMethod}
            gasAccountCost={gasAccountCost}
            gasAccountCanPay={gasAccountCanPay}
            canGotoUseGasAccount={canGotoUseGasAccount}
            isGasAccountLogin={isGasAccountLogin}
            isWalletConnect={
              currentAccountType === KEYRING_TYPE.WalletConnectKeyring
            }
            onChangeGasAccount={() => setGasMethod('gasAccount')}
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
            origin={origin}
            originLogo={params.session.icon}
            hasUnProcessSecurityResult={hasUnProcessSecurityResult}
            securityLevel={securityLevel}
            gnosisAccount={isGnosis ? account : undefined}
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
              (isGnosisAccount ? !safeInfo : false) ||
              (isCoboArugsAccount ? !coboArgusInfo : false) ||
              !canProcess ||
              !!checkErrors.find((item) => item.level === 'forbidden') ||
              hasUnProcessSecurityResult ||
              (isGnosisAccount &&
                new BigNumber(realNonce || 0).isLessThan(safeInfo?.nonce || 0))
            }
          />
        </>
      )}
      <TokenDetailPopup
        token={tokenDetail.selectToken}
        visible={tokenDetail.popupVisible}
        onClose={() => dispatch.sign.closeTokenDetailPopup()}
        canClickToken={false}
        hideOperationButtons
        variant="add"
      />
    </>
  );
};

const SignTxWrap = (props: SignTxProps) => {
  const { params, origin } = props;
  const chainId = params?.data?.[0]?.chainId;
  const chain = chainId ? findChain({ id: +chainId }) : undefined;

  return chain?.isTestnet ? (
    <SignTestnetTx {...props} />
  ) : (
    <SignTx {...props} />
  );
};

export default SignTxWrap;
