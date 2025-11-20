import type { SignatureAction, SignatureFlowState } from './types';

const deriveProgress = (state: SignatureFlowState) => {
  const signInfo = state.ctx?.signInfo;
  if (!signInfo) return undefined;
  const status =
    signInfo.status === 'signing'
      ? 'signing'
      : signInfo.status === 'signed'
      ? 'signed'
      : undefined;
  return {
    signed: signInfo.currentTxIndex,
    total: signInfo.totalTxs,
    status,
  };
};

export const signatureReducer = (
  state: SignatureFlowState,
  action: SignatureAction
): SignatureFlowState => {
  switch (action.type) {
    case 'RESET':
      return { status: 'idle' };

    case 'SET_CONFIG':
      return {
        ...state,
        config: { ...(state.config ?? {}), ...action.payload } as any,
      };
    case 'PREFETCH_START':
      return {
        status: 'prefetching',
        fingerprint: action.fingerprint,
        config: action.config,
        ctx: action.ctx,
        progress: undefined,
      };

    case 'PREFETCH_SUCCESS':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'ready',
        ctx: { ...state.ctx, ...action.ctx },
        error: undefined,
      };

    case 'PREFETCH_FAILURE':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'prefetch_failure',
        error: action.error,
      };

    case 'OPEN_UI_SKELETON':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'ui-open',
        ctx: action.ctx,
        error: undefined,
        progress: deriveProgress({ ...state, ctx: action.ctx }),
      };

    case 'OPEN_UI_SUCCESS':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'ui-open',
        ctx: action.ctx,
        error: undefined,
      };

    case 'OPEN_UI_FAILURE':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'error',
        error: action.error,
      };

    case 'UPDATE_CTX':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        ctx: action.ctx,
        progress: deriveProgress({ ...state, ctx: action.ctx }),
      };

    case 'SEND_START': {
      if (state.fingerprint !== action.fingerprint) return state;
      const nextCtx = state.ctx
        ? ({
            ...state.ctx,
            signInfo: {
              currentTxIndex: 0,
              totalTxs: state.ctx.txs.length,
              status: 'signing',
            },
          } as typeof state.ctx)
        : state.ctx;
      return {
        ...state,
        status: 'signing',
        error: undefined,
        hashes: undefined,
        ctx: nextCtx,
        progress: deriveProgress({ ...state, ctx: nextCtx }),
      };
    }

    case 'SEND_PROGRESS':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'signing',
        ctx: action.ctx,
        progress: deriveProgress({ ...state, ctx: action.ctx }),
      };

    case 'SEND_SUCCESS':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'completed',
        hashes: action.hashes,
        progress: {
          signed: action.hashes.length,
          total: action.hashes.length,
          status: 'signed',
        },
      };

    case 'SEND_FAILURE':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'error',
        error: action.error,
      };

    case 'SEND_PAUSED':
      if (state.fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        status: 'paused',
        ctx: action.ctx,
      };

    default:
      return state;
  }
};
