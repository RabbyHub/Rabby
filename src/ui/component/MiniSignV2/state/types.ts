import type {
  GasSelectionOptions,
  SignerConfig,
} from '@/ui/component/MiniSignV2/domain/types';
import type { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import type { SignerCtx } from '@/ui/component/MiniSignV2/domain/ctx';

export type SignatureStatus =
  | 'idle'
  | 'prefetching'
  | 'prefetch_failure'
  | 'ready'
  | 'ui-open'
  | 'signing'
  | 'completed'
  | 'error';

export type SignatureFlowState = {
  status: SignatureStatus;
  fingerprint?: string;
  config?: SignerConfig;
  ctx?: SignerCtx;
  error?: {
    status: 'REJECTED' | 'FAILED';
    content: string;
    description: string;
  };
  hashes?: string[];
};

export type SignatureRequest = {
  txs: Tx[];
  config: SignerConfig;
  enableSecurityEngine?: boolean;
  gasSelection?: GasSelectionOptions;
};

export type SignatureAction =
  | { type: 'RESET' }
  | { type: 'SET_CONFIG'; payload: Partial<SignerConfig> }
  | {
      type: 'PREFETCH_START';
      fingerprint: string;
      config: SignerConfig;
      ctx: SignerCtx;
    }
  | {
      type: 'PREFETCH_SUCCESS';
      fingerprint: string;
      ctx: SignerCtx;
    }
  | {
      type: 'PREFETCH_FAILURE';
      fingerprint: string;
      error: SignatureFlowState['error'];
    }
  | {
      type: 'OPEN_UI_SKELETON';
      fingerprint: string;
      ctx: SignerCtx;
    }
  | {
      type: 'OPEN_UI_SUCCESS';
      fingerprint: string;
      ctx: SignerCtx;
    }
  | {
      type: 'OPEN_UI_FAILURE';
      fingerprint: string;
      error: SignatureFlowState['error'];
    }
  | {
      type: 'UPDATE_CTX';
      fingerprint: string;
      ctx: SignerCtx;
    }
  | { type: 'SEND_START'; fingerprint: string }
  | {
      type: 'SEND_PROGRESS';
      fingerprint: string;
      ctx: SignerCtx;
    }
  | {
      type: 'SEND_SUCCESS';
      fingerprint: string;
      hashes: string[];
    }
  | {
      type: 'SEND_FAILURE';
      fingerprint: string;
      error: SignatureFlowState['error'];
    };
