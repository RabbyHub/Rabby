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
  OP_STACK_ENUMS,
} from 'consts';
import { addHexPrefix, isHexPrefixed, isHexString } from 'ethereumjs-util';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useScroll } from 'react-use';
import { useSize } from 'ahooks';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import {
  useApproval,
  useWallet,
  isStringOrNumber,
  useCommonPopupView,
} from 'ui/utils';
import { WaitingSignComponent } from './map';
import GasSelector, { GasSelectorResponse } from './TxComponents/GasSelecter';
import GnosisDrawer from './TxComponents/GnosisDrawer';
import Loading from './TxComponents/Loading';
import { useLedgerDeviceConnected } from '@/utils/ledger';
import { TransactionGroup } from 'background/service/transactionHistory';
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
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { useSignPermissionCheck } from '../hooks/useSignPermissionCheck';
import { useTestnetCheck } from '../hooks/useTestnetCheck';
import { CoboDelegatedDrawer } from './TxComponents/CoboDelegatedDrawer';

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

const normalizeTxParams = (tx) => {
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
    if ('value' in copy) {
      if (!isStringOrNumber(copy.value)) {
        copy.value = '0x0';
      } else {
        copy.value = normalizeHex(copy.value);
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
  const chain = Object.values(CHAINS).find((item) => item.id === chainId);
  if (!chain) {
    throw new Error('chain not found');
  }
  const onChainNonce = await wallet.requestETHRpc(
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
  const chain = Object.values(CHAINS).find((item) => item.id === chainId);
  if (!chain) {
    throw new Error('chain not found');
  }
  const balance = await wallet.requestETHRpc(
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
  const chain = Object.values(CHAINS).find((item) => item.id === chainId);
  if (!chain) throw new Error(`${chainId} is not found in supported chains`);
  const isOpStack = OP_STACK_ENUMS.includes(chain.enum);
  if (isOpStack) {
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
}: Parameters<typeof explainGas>[0]) => {
  const [result, setResult] = useState({
    gasCostUsd: new BigNumber(0),
    gasCostAmount: new BigNumber(0),
    maxGasCostAmount: new BigNumber(0),
  });

  useEffect(() => {
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
    });
  }, [gasUsed, gasPrice, chainId, nativeTokenPrice, wallet, tx, gasLimit]);

  return {
    ...result,
  };
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

const getGasLimitBaseAccountBalance = ({
  gasPrice,
  nativeTokenBalance,
  nonce,
  pendingList,
  tx,
  recommendGasLimit,
  recommendGasLimitRatio,
}: {
  tx: Tx;
  nonce: number | string | BigNumber;
  gasPrice: number | string | BigNumber;
  pendingList: TransactionGroup[];
  nativeTokenBalance: string;
  recommendGasLimit: string | number;
  recommendGasLimitRatio: number;
}) => {
  let sendNativeTokenAmount = new BigNumber(tx.value); // current transaction native token transfer count
  sendNativeTokenAmount = isNaN(sendNativeTokenAmount.toNumber())
    ? new BigNumber(0)
    : sendNativeTokenAmount;
  const pendingsSumNativeTokenCost = pendingList
    .filter((item) => new BigNumber(item.nonce).lt(nonce))
    .reduce((sum, item) => {
      return sum.plus(
        item.txs
          .map((txItem) => ({
            value: isNaN(Number(txItem.rawTx.value))
              ? 0
              : Number(txItem.rawTx.value),
            gasPrice: txItem.rawTx.gasPrice || txItem.rawTx.maxFeePerGas,
            gasUsed:
              txItem.gasUsed || txItem.rawTx.gasLimit || txItem.rawTx.gas || 0,
          }))
          .reduce((sum, txItem) => {
            return sum.plus(
              new BigNumber(txItem.value).plus(
                new BigNumber(txItem.gasUsed).times(txItem.gasUsed)
              )
            );
          }, new BigNumber(0))
      );
    }, new BigNumber(0)); // sum native token cost in pending tx list which nonce less than current tx
  const avaliableGasToken = new BigNumber(nativeTokenBalance).minus(
    sendNativeTokenAmount.plus(pendingsSumNativeTokenCost)
  ); // avaliableGasToken = current native token balance - sendNativeTokenAmount - pendingsSumNativeTokenCost
  if (avaliableGasToken.lte(0)) {
    // avaliableGasToken less than 0 use 1.5x gasUsed as gasLimit
    return Math.floor(
      new BigNumber(recommendGasLimit)
        .times(Math.min(recommendGasLimitRatio, 1.5))
        .toNumber()
    );
  }
  if (
    avaliableGasToken.gt(
      new BigNumber(gasPrice).times(
        Number(recommendGasLimit) * recommendGasLimitRatio
      )
    )
  ) {
    // if avaliableGasToken is enough to pay gas fee of recommendGasLimit * recommendGasLimitRatio, use recommendGasLimit * recommendGasLimitRatio as gasLimit
    return Math.ceil(Number(recommendGasLimit) * recommendGasLimitRatio);
  }
  const adaptGasLimit = avaliableGasToken.div(gasPrice); // adapt gasLimit by account balance
  if (
    adaptGasLimit.lt(
      new BigNumber(recommendGasLimit).times(
        Math.min(recommendGasLimitRatio, 1.5)
      )
    )
  ) {
    return Math.floor(
      new BigNumber(recommendGasLimit)
        .times(Math.min(recommendGasLimitRatio, 1.5))
        .toNumber()
    );
  }
  return Math.floor(adaptGasLimit.toNumber());
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
    Object.values(CHAINS).find((item) => item.id === chainId)
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
    },
    {
      level: 'normal',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'fast',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'custom',
      price: 0,
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
  ]);
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
  const [useLedgerLive, setUseLedgerLive] = useState(false);
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const { userData, rules, currentTx, tokenDetail } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    currentTx: s.securityEngine.currentTx,
    tokenDetail: s.sign.tokenDetail,
  }));
  const [footerShowShadow, setFooterShowShadow] = useState(false);

  useSignPermissionCheck({
    origin,
    chainId,
    onDisconnect: () => {
      handleCancel();
    },
    onOk: () => {
      handleCancel();
    },
  });

  useTestnetCheck({
    chainId,
    onOk: () => {
      handleCancel();
    },
  });

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
    isViewGnosisSafe,
  } = normalizeTxParams(params.data[0]);

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

  const gasExplainResponse = useExplainGas({
    gasUsed,
    gasPrice: selectedGas?.price || 0,
    chainId,
    nativeTokenPrice: txDetail?.native_token.price || 0,
    tx,
    wallet,
    gasLimit,
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

  const explainTx = async (address: string) => {
    let recommendNonce = '0x0';
    if (!isGnosisAccount && !isCoboArugsAccount) {
      recommendNonce = await getRecommendNonce({
        tx,
        wallet,
        chainId,
      });
      setRecommendNonce(recommendNonce);
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
        let block = null;
        try {
          block = await wallet.requestETHRpc(
            {
              method: 'eth_getBlockByNumber',
              params: ['latest', false],
            },
            chain.serverId
          );
          setBlockInfo(block);
        } catch (e) {
          // DO NOTHING
        }
        if (tx.gas && origin === INTERNAL_REQUEST_ORIGIN) {
          setGasLimit(intToHex(Number(tx.gas))); // use origin gas as gasLimit when tx is an internal tx with gasLimit(i.e. for SendMax native token)
          reCalcGasLimitBaseAccountBalance({
            nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
            tx: {
              ...tx,
              nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1', // set a mock nonce for explain if dapp not set it
              data: tx.data,
              value: tx.value || '0x0',
              gas: tx.gas || '', // set gas limit if dapp not set
            },
            gasPrice: selectedGas?.price || 0,
            customRecommendGasLimit: gas.toNumber(),
            customGasLimit: Number(tx.gas),
            customRecommendGasLimitRatio: 1,
            block,
          });
        } else if (!gasLimit) {
          // use server response gas limit
          const ratio =
            SAFE_GAS_LIMIT_RATIO[chainId] || DEFAULT_GAS_LIMIT_RATIO;
          setRecommendGasLimitRatio(needRatio ? ratio : 1);
          const recommendGasLimit = needRatio
            ? gas.times(ratio).toFixed(0)
            : gas.toFixed(0);
          setGasLimit(intToHex(Number(recommendGasLimit)));
          reCalcGasLimitBaseAccountBalance({
            nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
            tx: {
              ...tx,
              nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1', // set a mock nonce for explain if dapp not set it
              data: tx.data,
              value: tx.value || '0x0',
              gas: tx.gas || '', // set gas limit if dapp not set
            },
            gasPrice: selectedGas?.price || 0,
            customRecommendGasLimit: gas.toNumber(),
            customGasLimit: Number(recommendGasLimit),
            customRecommendGasLimitRatio: needRatio ? ratio : 1,
            block,
          });
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
          });
          const ctx = formatSecurityEngineCtx({
            actionData: parsed,
            requireData: requiredData,
            chainId: chain.serverId,
          });
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
    stats.report('signTransaction', {
      type: KEYRING_TYPE.GnosisKeyring,
      category: KEYRING_CATEGORY_MAP[KEYRING_CLASS.GNOSIS],
      chainId: chain.serverId,
      preExecSuccess:
        checkErrors.length > 0 || !txDetail?.pre_exec.success ? false : true,
      createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
      source: params?.$ctx?.ga?.source || '',
      trigger: params?.$ctx?.ga?.trigger || '',
    });
    if (!isViewGnosisSafe) {
      const params: any = {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
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
      account: account,
      method: 'ethSignTypedDataV4',
      uiRequestComponent: 'SignTypedData',
    });
  };

  const handleCoboArugsConfirm = async (account: Account) => {
    if (!coboArgusInfo) return;

    stats.report('signTransaction', {
      type: KEYRING_TYPE.CoboArgusKeyring,
      category: KEYRING_CATEGORY_MAP[KEYRING_CLASS.CoboArgus],
      chainId: chain.serverId,
      preExecSuccess:
        checkErrors.length > 0 || !txDetail?.pre_exec.success ? false : true,
      createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
      source: params?.$ctx?.ga?.source || '',
      trigger: params?.$ctx?.ga?.trigger || '',
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
    });
    wallet.clearPageStateCache();
  };

  const { activeApprovalPopup } = useCommonPopupView();
  const handleAllow = async () => {
    if (!selectedGas) return;

    if (activeApprovalPopup()) {
      return;
    }

    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;

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
        maxPriorityFee <= 0 ? tx.maxFeePerGas : intToHex(maxPriorityFee);
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
      createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
      source: params?.$ctx?.ga?.source || '',
      trigger: params?.$ctx?.ga?.trigger || '',
    });

    matomoRequestEvent({
      category: 'Transaction',
      action: 'Submit',
      label: currentAccount.brandName,
    });
    resolveApproval({
      ...transaction,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
      traceId: txDetail?.trace_id,
      signingTxId: approval.signingTxId,
    });
  };

  const handleGasChange = (gas: GasSelectorResponse) => {
    setSelectedGas({
      level: gas.level,
      front_tx_count: gas.front_tx_count,
      estimated_seconds: gas.estimated_seconds,
      base_fee: gas.base_fee,
      price: gas.price,
    });
    if (gas.level === 'custom') {
      setGasList(
        gasList.map((item) => {
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
      setMaxPriorityFee(gas.maxPriorityFee);
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
    } else {
      reCalcGasLimitBaseAccountBalance({
        gasPrice: gas.price,
        tx: {
          ...tx,
          gasPrice: intToHex(Math.round(gas.price)),
          gas: intToHex(gas.gasLimit),
          nonce: afterNonce,
        },
        nonce: afterNonce,
        block: blockInfo,
      });
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

  const init = async () => {
    dispatch.securityEngine.resetCurrentTx();
    try {
      const currentAccount =
        isGnosis && account ? account : (await wallet.getCurrentAccount())!;
      const is1559 =
        support1559 && SUPPORT_1559_KEYRING_TYPE.includes(currentAccount.type);
      setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
      setUseLedgerLive(await wallet.isUseLedgerLive());
      setIsHardware(
        !!Object.values(HARDWARE_KEYRING_TYPES).find(
          (item) => item.type === currentAccount.type
        )
      );
      const balance = await getNativeTokenBalance({
        wallet,
        chainId,
        address: currentAccount.address,
      });

      setNativeTokenBalance(balance);

      wallet.reportStats('createTransaction', {
        type: currentAccount.brandName,
        category: KEYRING_CATEGORY_MAP[currentAccount.type],
        chainId: chain.serverId,
        createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
        source: params?.$ctx?.ga?.source || '',
        trigger: params?.$ctx?.ga?.trigger || '',
      });

      matomoRequestEvent({
        category: 'Transaction',
        action: 'init',
        label: currentAccount.brandName,
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
      const fee = calcMaxPriorityFee(gasList, gas, chainId);
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

  const reCalcGasLimitBaseAccountBalance = async ({
    gasPrice,
    nonce,
    tx,
    customRecommendGasLimit,
    customGasLimit,
    customRecommendGasLimitRatio,
    block,
  }: {
    tx: Tx;
    nonce: number | string | BigNumber;
    gasPrice: number | string | BigNumber;
    customRecommendGasLimit?: number;
    customGasLimit?: number;
    customRecommendGasLimitRatio?: number;
    block: BlockInfo | null;
  }) => {
    if (isGnosisAccount || isCoboArugsAccount) return; // Gnosis Safe transaction no need gasLimit
    const calcGasLimit = customGasLimit || gasLimit;
    const calcGasLimitRatio =
      customRecommendGasLimitRatio || recommendGasLimitRatio;
    const calcRecommendGasLimit = customRecommendGasLimit || recommendGasLimit;
    if (!calcGasLimit) return;
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;
    const { pendings } = await wallet.getTransactionHistory(
      currentAccount.address
    );
    let res = getGasLimitBaseAccountBalance({
      gasPrice,
      nonce,
      pendingList: pendings.filter((item) => item.chainId === chainId),
      nativeTokenBalance,
      tx,
      recommendGasLimit: calcRecommendGasLimit,
      recommendGasLimitRatio: calcGasLimitRatio,
    });

    if (block && res > Number(block.gasLimit)) {
      res = Number(block.gasLimit);
    }
    if (!new BigNumber(res).eq(calcGasLimit)) {
      setGasLimit(`0x${new BigNumber(res).toNumber().toString(16)}`);
      setManuallyChangeGasLimit(false);
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
    init();
  }, []);

  useEffect(() => {
    if (isReady) {
      if (scrollRef.current && scrollRef.current.scrollTop > 0) {
        scrollRef.current && (scrollRef.current.scrollTop = 0);
      }
    }
  }, [isReady]);

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
              />
            )}
            <GasSelector
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
              is1559={support1559}
              isHardware={isHardware}
              manuallyChangeGasLimit={manuallyChangeGasLimit}
              errors={checkErrors}
              engineResults={engineResults}
              nativeTokenBalance={nativeTokenBalance}
              gasPriceMedian={gasPriceMedian}
            />
          </>
        )}
        {isGnosisAccount && safeInfo && (
          <Drawer
            placement="bottom"
            height="400px"
            className="gnosis-drawer"
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
            className="gnosis-drawer"
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
              !canProcess ||
              !!checkErrors.find((item) => item.level === 'forbidden')
            }
            tooltipContent={
              checkErrors.find((item) => item.level === 'forbidden')
                ? checkErrors.find((item) => item.level === 'forbidden')!.msg
                : cantProcessReason
            }
            disabledProcess={
              !isReady ||
              (selectedGas ? selectedGas.price < 0 : true) ||
              (isGnosisAccount ? !safeInfo : false) ||
              (isCoboArugsAccount ? !coboArgusInfo : false) ||
              (isLedger && !useLedgerLive && !hasConnectedLedgerHID) ||
              !canProcess ||
              !!checkErrors.find((item) => item.level === 'forbidden') ||
              hasUnProcessSecurityResult
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

export default SignTx;
