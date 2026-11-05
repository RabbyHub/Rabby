import type { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import type {
  CalcItem,
  GasAccountCheckResult,
  PreparedContext,
  SecurityResult,
} from './types';
import type { OpenApiService } from '@rabby-wallet/rabby-api';
import BigNumber from 'bignumber.js';
import type { GasTokenInfo } from '@/utils/transaction';

export type SignerCtx = {
  fingerprint: string;
  open: boolean;
  mode: 'ui' | 'direct';
  txs: Tx[];
  chainId: number;
  is1559: boolean;
  gasList: GasLevel[];
  selectedGas: GasLevel | null;
  txsCalc: CalcItem[];
  nativeTokenPrice?: number;
  nativeTokenBalance?: string;
  gasToken?: GasTokenInfo;
  checkErrors?: {
    code: number;
    msg: string;
    level?: 'warn' | 'danger' | 'forbidden';
  }[];
  gasless?: Awaited<ReturnType<OpenApiService['gasLessTxsCheck']>>;
  gasAccount?: GasAccountCheckResult;
  engineResults?: SecurityResult;
  gasMethod?: 'native' | 'gasAccount';
  useGasless?: boolean;
  noCustomRPC?: boolean;
  supportedAddrType?: boolean;
  error?: string;
  isGasNotEnough?: boolean;
  signInfo?: {
    currentTxIndex: number;
    totalTxs: number;
    status: 'pending' | 'signing' | 'signed' | 'failed';
  };
  selectedGasCost?: {
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
    maxGasCostAmount: BigNumber;
    gasCostRawAmount?: BigNumber;
    maxGasCostRawAmount?: BigNumber;
  };
  gasFeeTooHigh?: boolean;
  disabledProcess?: boolean;
  // tx from/to hit the blocked-address list; signing must be refused
  isBlocked?: boolean;
} & PreparedContext;

// Cached ctx (pre-exec, security checks, the txs actually signed) is reused
// whenever this matches, so it must cover everything that changes what is signed.
// Calldata stays as-is: lowercasing copies large strings, and a case-only
// mismatch just re-prefetches.
export const buildFingerprint = (txs: Tx[]) =>
  txs
    .map(
      (t) =>
        `${t.chainId}|${(t.from || '').toLowerCase()}|${(
          t.to || ''
        ).toLowerCase()}|${t.value || ''}|${t.data || ''}`
    )
    .join(';');
