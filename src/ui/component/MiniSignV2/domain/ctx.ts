import type { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import type { CalcItem, GasAccountCheckResult, SecurityResult } from './types';
import type { OpenApiService } from '@rabby-wallet/rabby-api';
import BigNumber from 'bignumber.js';

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
  };
};

export const buildFingerprint = (txs: Tx[]) =>
  txs
    .map(
      (t) =>
        `${t.chainId}|${t.to || ''}|${t.value || ''}|${(t.data || '').length}`
    )
    .join(';');
