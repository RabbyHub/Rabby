import type BigNumber from 'bignumber.js';
import type React from 'react';
import type { DrawerProps } from 'antd';
import type { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import type { ExplainTxResponse } from 'background/service/openapi';
import type { Result } from '@rabby-wallet/rabby-security-engine';
import type { OpenApiService } from '@rabby-wallet/rabby-api';
import type {
  ActionRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import type { Account } from '@/background/service/preference';

export type CalcItem = {
  tx: Tx;
  gasUsed: number;
  gasLimit: string;
  recommendGasLimitRatio: number;
  gasCost: {
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
    maxGasCostAmount: BigNumber;
  };
  preExecResult: ExplainTxResponse;
  hash?: string;
};

export type SecurityResult = {
  parsedTransactionActionData: ParsedTransactionActionData;
  actionRequireData: ActionRequireData;
  parsedTransactionActionDataList?: ParsedTransactionActionData[];
  actionRequireDataList?: ActionRequireData[];
  engineResultList?: Result[][];
  engineResult: Result[];
};

export type SignerConfig = {
  account: Account;
  getContainer?: DrawerProps['getContainer'];
  title?: React.ReactNode;
  ga?: Record<string, any>;
  session?: any;
  showSimulateChange?: boolean;
  disableSignBtn?: boolean;
  onPreExecChange?: (p: ExplainTxResponse) => void;
  onPreExecError?: () => void;
  onRedirectToDeposit?: () => void;
  originGasPrice?: string; // for speed up / cancel
  checkGasFeeTooHigh?: boolean; //default false
  enableSecurityEngine?: boolean;
  updateMiniGasStore?: (params: {
    gasLevel: 'normal' | 'slow' | 'fast' | 'custom';
    chainId: number;
    customGasPrice?: number;
    fixed?: boolean;
  }) => void;
};

export type PreparedContext = {
  chainId: number;
  is1559: boolean;
  gasList: GasLevel[];
  selectedGas: GasLevel;
  txsCalc: CalcItem[];
  nativeTokenPrice?: number;
  nativeTokenBalance: string;
  checkErrors?: {
    code: number;
    msg: string;
    level?: 'warn' | 'danger' | 'forbidden';
  }[];
  gasless?: Awaited<ReturnType<OpenApiService['gasLessTxsCheck']>>;
  gasAccount?: GasAccountCheckResult;
  engineResults?: SecurityResult;
  isGasNotEnough?: boolean;
  noCustomRPC?: boolean;
  selectedGasCost?: {
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
    maxGasCostAmount: BigNumber;
  };
  gasPriceMedian?: number;
};

export type RetryInfo = {
  errorText: string;
};

export type SendOptions = {
  ga?: Record<string, any>;
  session?: any;
  isGasLess?: boolean;
  isGasAccount?: boolean;
  ignoreChecks?: boolean;
  pushType?: 'default' | 'mev';
};

export type GasSelectionOptions = {
  flags?: {
    isSend?: boolean;
    isSwap?: boolean;
    isBridge?: boolean;
    isSpeedUp?: boolean;
    isCancel?: boolean;
  };
  lastSelection?: {
    lastTimeSelect?: 'gasPrice' | 'gasLevel';
    gasLevel?: GasLevel['level'];
    gasPrice?: number;
  };
};

export type GasAccountCheckResult = {
  gas_account_cost?: {
    total_cost?: number | string;
    tx_cost?: number;
    gas_cost?: number | string;
    estimate_tx_cost?: number;
  };
  is_gas_account?: boolean;
  balance_is_enough?: boolean;
  chain_not_support?: boolean;
};
