import stats from '@/stats';
import {
  convertLegacyTo1559,
  getKRCategoryByType,
  validateGasPriceRange,
} from '@/utils/transaction';
import Safe, { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import * as Sentry from '@sentry/browser';
import { Drawer, Modal } from 'antd';
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
  SAFE_GAS_LIMIT_RATIO,
  DEFAULT_GAS_LIMIT_RATIO,
  MINIMUM_GAS_LIMIT,
  GAS_TOP_UP_ADDRESS,
  CAN_ESTIMATE_L1_FEE_CHAINS,
} from 'consts';
import { addHexPrefix, isHexPrefixed, isHexString } from 'ethereumjs-util';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useScroll } from 'react-use';
import { useSize, useDebounceFn } from 'ahooks';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import {
  useApproval,
  useWallet,
  isStringOrNumber,
  useCommonPopupView,
} from 'ui/utils';
import { WaitingSignComponent } from './map';
import GnosisDrawer from './TxComponents/GnosisDrawer';
import Loading from './TxComponents/Loading';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
import { intToHex } from 'ui/utils/number';
import { calcMaxPriorityFee } from '@/utils/transaction';
import { FooterBar } from './FooterBar/FooterBar';
import {
  ParsedActionData,
  parseAction,
  fetchActionRequiredData,
  ActionRequireData,
  formatSecurityEngineCtx,
} from '../components/Actions/utils';
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
import { findChain } from '@/utils/chain';
import { SignTestnetTx } from './SignTestnetTx';
import { SignAdvancedSettings } from './SignAdvancedSettings';
import GasSelectorHeader, {
  GasSelectorResponse,
} from './TxComponents/GasSelectorHeader';
import { GasLessConfig } from './FooterBar/GasLessComponents';

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
  actionData: ParsedActionData;
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

// todo move to background
const getRecommendGas = async ({
  gas,
  wallet,
  tx,
  gasUsed,
}: {
  gasUsed: number;
  gas: number;
  wallet: ReturnType<typeof useWallet>;
  tx: Tx;
  chainId: number;
}) => {
  if (gas > 0) {
    return {
      needRatio: true,
      gas: new BigNumber(gas),
      gasUsed,
    };
  }
  const txGas = tx.gasLimit || tx.gas;
  if (txGas && new BigNumber(txGas).gt(0)) {
    return {
      needRatio: true,
      gas: new BigNumber(txGas),
      gasUsed: Number(txGas),
    };
  }
  try {
    const res = await wallet.openapi.historyGasUsed({
      tx: {
        ...tx,
        nonce: tx.nonce || '0x1', // set a mock nonce for explain if dapp not set it
        data: tx.data,
        value: tx.value || '0x0',
        gas: tx.gas || '', // set gas limit if dapp not set
      },
      user_addr: tx.from,
    });
    if (res.gas_used > 0) {
      return {
        needRatio: true,
        gas: new BigNumber(res.gas_used),
        gasUsed: res.gas_used,
      };
    }
  } catch (e) {
    // NOTHING
  }

  return {
    needRatio: false,
    gas: new BigNumber(1000000),
    gasUsed: 1000000,
  };
};

// todo move to background
const getRecommendNonce = async ({
  wallet,
  tx,
  chainId,
}: {
  wallet: ReturnType<typeof useWallet>;
  tx: Tx;
  chainId: number;
}) => {
  const chain = findChain({
    id: chainId,
  });
  if (!chain) {
    throw new Error('chain not found');
  }
  const onChainNonce = await wallet.requestETHRpc<any>(
    {
      method: 'eth_getTransactionCount',
      params: [tx.from, 'latest'],
    },
    chain.serverId
  );
  const localNonce = (await wallet.getNonceByChain(tx.from, chainId)) || 0;
  return `0x${BigNumber.max(onChainNonce, localNonce).toString(16)}`;
};

const getNativeTokenBalance = async ({
  wallet,
  address,
  chainId,
}: {
  wallet: ReturnType<typeof useWallet>;
  address: string;
  chainId: number;
}): Promise<string> => {
  const chain = findChain({
    id: chainId,
  });
  if (!chain) {
    throw new Error('chain not found');
  }
  const balance = await wallet.requestETHRpc<any>(
    {
      method: 'eth_getBalance',
      params: [address, 'latest'],
    },
    chain.serverId
  );
  return balance;
};

const explainGas = async ({
  gasUsed,
  gasPrice,
  chainId,
  nativeTokenPrice,
  tx,
  wallet,
  gasLimit,
}: {
  gasUsed: number | string;
  gasPrice: number | string;
  chainId: number;
  nativeTokenPrice: number;
  tx: Tx;
  wallet: ReturnType<typeof useWallet>;
  gasLimit: string | undefined;
}) => {
  let gasCostTokenAmount = new BigNumber(gasUsed).times(gasPrice).div(1e18);
  let maxGasCostAmount = new BigNumber(gasLimit || 0).times(gasPrice).div(1e18);
  const chain = findChain({
    id: chainId,
  });
  if (!chain) throw new Error(`${chainId} is not found in supported chains`);
  if (CAN_ESTIMATE_L1_FEE_CHAINS.includes(chain.enum)) {
    const res = await wallet.fetchEstimatedL1Fee(
      {
        txParams: tx,
      },
      chain.enum
    );
    gasCostTokenAmount = new BigNumber(res).div(1e18).plus(gasCostTokenAmount);
    maxGasCostAmount = new BigNumber(res).div(1e18).plus(maxGasCostAmount);
  }
  const gasCostUsd = new BigNumber(gasCostTokenAmount).times(nativeTokenPrice);

  return {
    gasCostUsd,
    gasCostAmount: gasCostTokenAmount,
    maxGasCostAmount,
  };
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

const checkGasAndNonce = ({
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
}: {
  recommendGasLimitRatio: number;
  nativeTokenBalance: string;
  recommendGasLimit: number | string | BigNumber;
  recommendNonce: number | string | BigNumber;
  tx: Tx;
  gasLimit: number | string | BigNumber;
  nonce: number | string | BigNumber;
  gasExplainResponse: ReturnType<typeof useExplainGas>;
  isCancel: boolean;
  isSpeedUp: boolean;
  isGnosisAccount: boolean;
}) => {
  const errors: {
    code: number;
    msg: string;
    level?: 'warn' | 'danger' | 'forbidden';
  }[] = [];
  if (!isGnosisAccount && new BigNumber(gasLimit).lt(MINIMUM_GAS_LIMIT)) {
    errors.push({
      code: 3006,
      msg: i18n.t('page.signTx.gasLimitNotEnough'),
      level: 'forbidden',
    });
  }
  if (
    !isGnosisAccount &&
    new BigNumber(gasLimit).lt(
      new BigNumber(recommendGasLimit).times(recommendGasLimitRatio)
    ) &&
    new BigNumber(gasLimit).gte(21000)
  ) {
    if (recommendGasLimitRatio === DEFAULT_GAS_LIMIT_RATIO) {
      const realRatio = new BigNumber(gasLimit).div(recommendGasLimit);
      if (realRatio.lt(DEFAULT_GAS_LIMIT_RATIO) && realRatio.gt(1)) {
        errors.push({
          code: 3004,
          msg: i18n.t('page.signTx.gasLimitLessThanExpect'),
          level: 'warn',
        });
      } else if (realRatio.lt(1)) {
        errors.push({
          code: 3005,
          msg: i18n.t('page.signTx.gasLimitLessThanGasUsed'),
          level: 'danger',
        });
      }
    } else {
      if (new BigNumber(gasLimit).lt(recommendGasLimit)) {
        errors.push({
          code: 3004,
          msg: i18n.t('page.signTx.gasLimitLessThanExpect'),
          level: 'warn',
        });
      }
    }
  }
  let sendNativeTokenAmount = new BigNumber(tx.value); // current transaction native token transfer count
  sendNativeTokenAmount = isNaN(sendNativeTokenAmount.toNumber())
    ? new BigNumber(0)
    : sendNativeTokenAmount;
  if (
    !isGnosisAccount &&
    gasExplainResponse.maxGasCostAmount
      .plus(sendNativeTokenAmount.div(1e18))
      .isGreaterThan(new BigNumber(nativeTokenBalance).div(1e18))
  ) {
    errors.push({
      code: 3001,
      msg: i18n.t('page.signTx.nativeTokenNotEngouthForGas'),
      level: 'forbidden',
    });
  }
  if (new BigNumber(nonce).lt(recommendNonce) && !(isCancel || isSpeedUp)) {
    errors.push({
      code: 3003,
      msg: i18n.t('page.signTx.nonceLowerThanExpect', [
        new BigNumber(recommendNonce),
      ]),
    });
  }
  return errors;
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

interface BlockInfo {
  baseFeePerGas: string;
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactions: string[];
  transactionsRoot: string;
  uncles: string[];
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
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRefSize = useSize(scrollRef);
  const scrollInfo = useScroll(scrollRef);
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  if (!chain) throw new Error('No support chain found');
  const [support1559, setSupport1559] = useState(chain.eip['1559']);
  const [isLedger, setIsLedger] = useState(false);
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
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
    swapPreferMEVGuarded,
    isViewGnosisSafe,
    reqId,
    safeTxGas,
  } = normalizeTxParams(params.data[0]);

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
        recommendNonce = await getRecommendNonce({
          tx,
          wallet,
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
    const { pendings } = await wallet.getTransactionHistory(address);
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
        pending_tx_list: pendings
          .filter((item) =>
            new BigNumber(item.nonce).lt(
              updateNonce ? recommendNonce : tx.nonce
            )
          )
          .reduce((result, item) => {
            return result.concat(item.txs.map((tx) => tx.rawTx));
          }, [] as Tx[])
          .map((item) => ({
            from: item.from,
            to: item.to,
            chainId: item.chainId,
            data: item.data || '0x',
            nonce: item.nonce,
            value: item.value,
            gasPrice: `0x${new BigNumber(
              item.gasPrice || item.maxFeePerGas || 0
            ).toString(16)}`,
            gas: item.gas || item.gasLimit || '0x0',
          })),
      })
      .then(async (res) => {
        let estimateGas = 0;
        if (res.gas.success) {
          estimateGas = res.gas.gas_limit || res.gas.gas_used;
        }
        const { gas, needRatio, gasUsed } = await getRecommendGas({
          gasUsed: res.gas.gas_used,
          gas: estimateGas,
          tx,
          wallet,
          chainId,
        });
        setGasUsed(gasUsed);
        setRecommendGasLimit(`0x${gas.toString(16)}`);
        let block: null | BlockInfo = null;
        try {
          block = await wallet.requestETHRpc<any>(
            {
              method: 'eth_getBlockByNumber',
              params: ['latest', false],
            },
            chain.serverId
          );
          setBlockInfo(block);
        } catch (e) {
          // NOTHING
        }
        if (tx.gas && origin === INTERNAL_REQUEST_ORIGIN) {
          setGasLimit(intToHex(Number(tx.gas))); // use origin gas as gasLimit when tx is an internal tx with gasLimit(i.e. for SendMax native token)
        } else if (!gasLimit) {
          // use server response gas limit
          let ratio = SAFE_GAS_LIMIT_RATIO[chainId] || DEFAULT_GAS_LIMIT_RATIO;
          let sendNativeTokenAmount = new BigNumber(tx.value); // current transaction native token transfer count
          sendNativeTokenAmount = isNaN(sendNativeTokenAmount.toNumber())
            ? new BigNumber(0)
            : sendNativeTokenAmount;
          const gasNotEnough = gas
            .times(ratio)
            .times(selectedGas?.price || 0)
            .div(1e18)
            .plus(sendNativeTokenAmount.div(1e18))
            .isGreaterThan(new BigNumber(nativeTokenBalance).div(1e18));
          if (gasNotEnough) {
            ratio = res.gas.gas_ratio;
          }
          setRecommendGasLimitRatio(needRatio ? ratio : 1);
          let recommendGasLimit = needRatio
            ? gas.times(ratio).toFixed(0)
            : gas.toFixed(0);
          if (block && new BigNumber(recommendGasLimit).gt(block.gasLimit)) {
            recommendGasLimit = new BigNumber(block.gasLimit)
              .times(0.95)
              .toFixed(0);
          }
          setGasLimit(
            intToHex(Math.max(Number(recommendGasLimit), Number(tx.gas || 0)))
          );
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
          const parsed = parseAction(
            actionData.action,
            res.balance_change,
            {
              ...tx,
              gas: '0x0',
              nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
              value: tx.value || '0x0',
            },
            res.pre_exec_version,
            res.gas.gas_used
          );
          const requiredData = await fetchActionRequiredData({
            actionData: parsed,
            contractCall: actionData.contract_call,
            chainId: chain.serverId,
            address,
            wallet,
            tx: {
              ...tx,
              gas: '0x0',
              nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
              value: tx.value || '0x0',
            },
            origin,
          });
          const ctx = formatSecurityEngineCtx({
            actionData: parsed,
            requireData: requiredData,
            chainId: chain.serverId,
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
      });
    }
  };

  const handleGnosisConfirm = async (account: Account) => {
    if (!safeInfo) return;
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
    resolveApproval({
      data: [account.address, JSON.stringify(typedData)],
      session: params.session,
      isGnosis: true,
      isSend,
      account: account,
      method: 'ethSignTypedDataV4',
      uiRequestComponent: 'SignTypedData',
    });
  };

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
        isGasLess: useGasLess,
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
    const list = await wallet.openapi.gasMarket(
      chain.serverId,
      custom && custom > 0 ? custom : undefined
    );
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
        setGasLessConfig(res?.promotion?.config);
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
    const pendingTxs = await Safe.getPendingTransactions(
      currentAccount.address,
      networkId,
      safeInfo.nonce
    );
    const maxNonceTx = maxBy(pendingTxs.results, (item) => item.nonce);
    let recommendSafeNonce = maxNonceTx ? maxNonceTx.nonce + 1 : safeInfo.nonce;

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
      });

      matomoRequestEvent({
        category: 'Transaction',
        action: 'init',
        label: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
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
      if (isSpeedUp || isCancel || ((isSend || isSwap) && tx.gasPrice)) {
        // use gasPrice set by dapp when it's a speedup or cancel tx
        customGasPrice = parseInt(tx.gasPrice!);
      }
      const gasList = await loadGasMarket(chain, customGasPrice);
      loadGasMedian(chain);
      let gas: GasLevel | null = null;

      if (
        ((isSend || isSwap) && customGasPrice) ||
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
  };

  const executeSecurityEngine = async () => {
    const ctx = formatSecurityEngineCtx({
      actionData: actionData,
      requireData: actionRequireData,
      chainId: chain.serverId,
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
        {!isGnosisAccount && !isCoboArugsAccount && isReady ? (
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
              (isLedger && !hasConnectedLedgerHID) ||
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
