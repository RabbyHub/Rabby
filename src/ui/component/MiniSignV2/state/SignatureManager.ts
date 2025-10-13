import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { hasConnectedLedgerDevice } from '@/ui/utils';

import type { WalletControllerType } from '@/ui/utils';
import type { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import type { SignerConfig } from '@/ui/component/MiniSignV2/domain/types';
import type { SignerCtx } from '@/ui/component/MiniSignV2/domain/ctx';
import type { Tx } from '@rabby-wallet/rabby-api/dist/types';

import type {
  SignatureAction,
  SignatureFlowState,
  SignatureRequest,
} from './types';

import { signatureReducer } from './machine';
import { signatureService } from '@/ui/component/MiniSignV2/services';
import { CHAINS_ENUM, EVENTS, KEYRING_CLASS } from '@/constant';
import eventBus from '@/eventBus';
import { findChain } from '@/utils/chain';

export const MINI_SIGN_ERROR = {
  GAS_FEE_TOO_HIGH: 'selectedGasCost too high',
  PREFETCH_FAILURE: 'prepare failure',
  USER_CANCELLED: 'User cancelled',
};

type Subscriber = (state: SignatureFlowState) => void;

type RunContext = {
  id: number;
  fingerprint: string;
};

const createErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err ?? 'Unknown error');

class SignatureManager {
  private state: SignatureFlowState = {
    status: 'idle',
  };
  private subscribers = new Set<Subscriber>();
  private run: RunContext | null = null;
  private seq = 0;
  private pendingCtx = new Map<string, Promise<SignerCtx>>();
  private pendingResult: {
    resolve: (hashes: string[]) => void;
    reject: (reason: any) => void;
  } | null = null;

  private dispatch(action: SignatureAction) {
    const next = signatureReducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    this.notify();
  }

  private notify() {
    for (const fn of this.subscribers) {
      fn(this.state);
    }
  }

  private markRun(fingerprint: string, currentPendingId?: number) {
    if (currentPendingId && this.run?.fingerprint === fingerprint) {
      return currentPendingId;
    }
    const id = ++this.seq;
    this.run = { id, fingerprint };
    return id;
  }

  private isActive(id: number, fingerprint: string) {
    return (
      !!this.run && this.run.id === id && this.run.fingerprint === fingerprint
    );
  }

  private ensureContext(
    request: SignatureRequest,
    wallet: WalletControllerType,
    opId?: number
  ) {
    const fingerprint = signatureService.fingerprint(request.txs);

    this.dispatch({ type: 'SET_CONFIG', payload: request.config });

    if (
      this.state.fingerprint === fingerprint &&
      this.state.ctx &&
      this.state.status !== 'error'
    ) {
      return Promise.resolve(this.state.ctx);
    }

    const cached = this.pendingCtx.get(fingerprint);
    if (cached) return cached;
    const currentOpId = this.markRun(fingerprint, opId);
    const skeleton = this.createSkeletonCtx(request.txs, fingerprint);

    this.dispatch({
      type: 'PREFETCH_START',
      fingerprint,
      config: request.config,
      ctx: skeleton,
    });

    const promise = signatureService
      .prepare({
        wallet,
        txs: request.txs,
        config: request.config,
        enableSecurityEngine: request.enableSecurityEngine,
        gasSelection: request.gasSelection,
      })
      .then((ctx) => {
        if (this.isActive(currentOpId, fingerprint)) {
          this.dispatch({ type: 'PREFETCH_SUCCESS', fingerprint, ctx });
        }
        return ctx;
      })
      .catch((error) => {
        const message = createErrorMessage(error);
        if (this.isActive(currentOpId, fingerprint)) {
          this.dispatch({
            type: 'PREFETCH_FAILURE',
            fingerprint,
            error: message,
          });
        }
        throw MINI_SIGN_ERROR.PREFETCH_FAILURE;
      })
      .finally(() => {
        const current = this.pendingCtx.get(fingerprint);
        if (current === promise) {
          this.pendingCtx.delete(fingerprint);
        }
      });

    this.pendingCtx.set(fingerprint, promise);
    return promise;
  }

  private createSkeletonCtx(txs: Tx[], fingerprint: string): SignerCtx {
    const chainId = txs[0]?.chainId || 0;
    return {
      fingerprint,
      open: true,
      mode: 'ui',
      txs,
      chainId,
      is1559: false,
      gasList: [],
      selectedGas: null,
      txsCalc: [],
      nativeTokenPrice: 0,
      nativeTokenBalance: '0x0',
      checkErrors: [],
      gasless: undefined,
      gasAccount: undefined,
      engineResults: undefined,
      gasMethod: 'native',
      useGasless: false,
      noCustomRPC: undefined,
      supportedAddrType: undefined,
      error: undefined,
      isGasNotEnough: false,
      signInfo: undefined,
    };
  }

  public getState() {
    return this.state;
  }

  public subscribe(fn: Subscriber) {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  public prefetch(request: SignatureRequest, wallet: WalletControllerType) {
    return this.ensureContext(request, wallet);
  }

  public async openUI(request: SignatureRequest, wallet: WalletControllerType) {
    const fingerprint = signatureService.fingerprint(request.txs);
    const opId = this.markRun(fingerprint);
    this.dispatch({ type: 'SET_CONFIG', payload: request.config });

    const prepared =
      this.pendingCtx.get(fingerprint) ||
      this.ensureContext(request, wallet, opId);

    const skeleton = this.createSkeletonCtx(request.txs, fingerprint);
    this.dispatch({ type: 'OPEN_UI_SKELETON', fingerprint, ctx: skeleton });

    try {
      const ctx = await signatureService.openUI({
        wallet,
        txs: request.txs,
        config: request.config,
        enableSecurityEngine: request.enableSecurityEngine,
        gasSelection: request.gasSelection,
        prepared,
      });
      if (!this.isActive(opId, fingerprint)) return ctx;
      this.dispatch({ type: 'OPEN_UI_SUCCESS', fingerprint, ctx });
      return ctx;
    } catch (error) {
      if (!this.isActive(opId, fingerprint)) return;
      const message = createErrorMessage(error);
      this.dispatch({ type: 'OPEN_UI_FAILURE', fingerprint, error: message });
      throw error instanceof Error ? error : new Error(message);
    }
  }

  public async updateGas(gas: GasLevel, wallet: WalletControllerType) {
    const { ctx, config, fingerprint } = this.state;
    if (!ctx || !config || !fingerprint) return;
    const opId = this.markRun(fingerprint);
    try {
      const nextCtxPromise = signatureService
        .updateGas({
          wallet,
          ctx,
          gas,
          account: config.account,
        })
        .catch((error) => {
          if (this.isActive(opId, fingerprint)) {
            const message = createErrorMessage(error);
            this.dispatch({
              type: 'OPEN_UI_FAILURE',
              fingerprint,
              error: message,
            });
          }
          throw error;
        });

      this.dispatch({
        type: 'UPDATE_CTX',
        fingerprint,
        ctx: { ...ctx, selectedGas: gas } as SignerCtx,
      });

      config?.updateMiniGasStore?.({
        gasLevel: gas.level as any,
        chainId: ctx.chainId,
        customGasPrice:
          gas.level === 'custom' ? Math.round(gas.price) : undefined,
        fixed: !!(gas as any)?.fixedMode,
      });

      const nextCtx = await nextCtxPromise;
      if (!this.isActive(opId, fingerprint)) return;
      this.dispatch({ type: 'UPDATE_CTX', fingerprint, ctx: nextCtx });
    } catch (error) {
      if (!this.isActive(opId, fingerprint)) return;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  public async updateGasLevel(gas: GasLevel, wallet: WalletControllerType) {
    return this.updateGas(gas, wallet);
  }

  public async send(wallet: WalletControllerType, retry?: boolean) {
    const { ctx, config, fingerprint } = this.state;
    if (!ctx || !config || !fingerprint) {
      throw new Error('Signature is not ready');
    }
    const opId = this.markRun(fingerprint);
    this.dispatch({ type: 'SEND_START', fingerprint });
    try {
      const res = await signatureService.send({
        wallet,
        ctx,
        config,
        retry,
        onProgress: (nextCtx) => {
          if (!this.isActive(opId, fingerprint)) return;
          this.dispatch({ type: 'SEND_PROGRESS', fingerprint, ctx: nextCtx });
        },
      });
      if (!this.isActive(opId, fingerprint)) return [];
      if (Array.isArray(res)) {
        const hashes = res.map((item) => item.txHash);
        this.dispatch({ type: 'SEND_SUCCESS', fingerprint, hashes });
        this.resolvePending(hashes);
        return hashes;
      }
      if ('errorText' in res && res.errorText !== undefined) {
        this.dispatch({
          type: 'SEND_FAILURE',
          fingerprint,
          error: res.errorText,
        });
        return res;
      }

      console.log('send result', res);
      const hashes = Array.isArray(res) ? res.map((item) => item.txHash) : [];
      this.dispatch({ type: 'SEND_SUCCESS', fingerprint, hashes });
      this.resolvePending(hashes);
      return hashes;
    } catch (error) {
      console.log('send error', error);
      if (!this.isActive(opId, fingerprint)) return [];
      const message = createErrorMessage(error);
      this.dispatch({ type: 'SEND_FAILURE', fingerprint, error: message });
      this.rejectPending(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  public reset() {
    this.run = null;
    this.pendingCtx.clear();
    this.seq++;
    if (this.pendingResult) {
      this.pendingResult.reject(MINI_SIGN_ERROR.USER_CANCELLED);
      this.pendingResult = null;
    }
    this.dispatch({ type: 'RESET' });
  }

  public updateConfig(config: Partial<SignerConfig>) {
    this.dispatch({ type: 'SET_CONFIG', payload: config });
  }

  public close() {
    this.reset();
  }

  private async checkHardWareConnected() {
    const { config } = this.state;
    const { account } = config || {};
    if (!account) {
      return false;
    }
    if (account.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      return hasConnectedLedgerDevice();
    }
    return true;
  }

  public async openDirect(
    request: SignatureRequest,
    wallet: WalletControllerType
  ) {
    const fingerprint = signatureService.fingerprint(request.txs);
    const resultPromise = this.createResultPromise();
    if (this.state.status === 'prefetch_failure') {
      this.rejectPending(MINI_SIGN_ERROR.PREFETCH_FAILURE);
      return resultPromise;
    }

    this.dispatch({ type: 'SET_CONFIG', payload: request.config });
    this.dispatch({
      type: 'UPDATE_CTX',
      fingerprint,
      ctx: { ...this.state.ctx, mode: 'direct' } as SignerCtx,
    });

    try {
      const prepared =
        this.pendingCtx.get(fingerprint) ||
        this.ensureContext(request, wallet, this.run?.id);
      await prepared;
      const chainInfo = findChain({ id: request.txs[0]?.chainId });
      if (
        this.state.config?.checkGasFeeTooHigh &&
        this.state.ctx?.selectedGasCost?.gasCostUsd.gt(
          chainInfo?.enum === CHAINS_ENUM.ETH ? 10 : 1
        )
      ) {
        this.rejectPending(MINI_SIGN_ERROR.GAS_FEE_TOO_HIGH);
        return resultPromise;
      }
      if (this.state.fingerprint !== fingerprint || !this.state.ctx) {
        throw new Error('Failed to prepare transactions');
      }
      this.dispatch({
        type: 'UPDATE_CTX',
        fingerprint,
        ctx: { ...this.state.ctx, mode: 'direct' } as SignerCtx,
      });
      const hardwareConnected = await this.checkHardWareConnected();
      console.log('hardwareConnected', hardwareConnected);
      if (hardwareConnected) {
        this.send(wallet).catch(() => undefined);
      } else {
        eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, 'DISCONNECTED');
      }
    } catch (error) {
      const message = createErrorMessage(error);
      this.rejectPending(message);
      throw error instanceof Error ? error : new Error(message);
    }
    return resultPromise;
  }

  public toggleGasless(value?: boolean) {
    const { ctx, fingerprint } = this.state;
    if (!ctx || !fingerprint) return;
    const useGasless = typeof value === 'boolean' ? value : !ctx.useGasless;
    this.dispatch({
      type: 'UPDATE_CTX',
      fingerprint,
      ctx: { ...ctx, useGasless } as SignerCtx,
    });
  }

  public setGasMethod(method: 'native' | 'gasAccount') {
    const { ctx, fingerprint } = this.state;
    if (!ctx || !fingerprint) return;
    this.dispatch({
      type: 'UPDATE_CTX',
      fingerprint,
      ctx: { ...ctx, gasMethod: method } as SignerCtx,
    });
  }

  public async retry(wallet: WalletControllerType) {
    return this.send(wallet, true);
  }

  public async startUI(
    request: SignatureRequest,
    wallet: WalletControllerType
  ): Promise<string[]> {
    const resultPromise = this.createResultPromise();

    this.openUI(request, wallet).catch((error) => {
      const message = createErrorMessage(error);
      this.rejectPending(message);
    });

    return resultPromise;
  }

  private createResultPromise() {
    if (this.pendingResult) {
      this.pendingResult.reject('Another signing operation is in progress');
      this.pendingResult = null;
    }
    return new Promise<string[]>((resolve, reject) => {
      this.pendingResult = { resolve, reject };
    });
  }

  private resolvePending(hashes: string[]) {
    if (this.pendingResult) {
      this.pendingResult.resolve(hashes);
      this.pendingResult = null;
    }
    this.run = null;
    this.pendingCtx.clear();
    this.dispatch({ type: 'RESET' });
  }

  private rejectPending(message: string) {
    if (this.pendingResult) {
      this.pendingResult.reject(message);
      this.pendingResult = null;
    }
    this.run = null;
    this.pendingCtx.clear();
  }
}

export const signatureManager = new SignatureManager();

export const useSignatureStore = <T = SignatureFlowState>(
  selector?: (state: SignatureFlowState) => T
) =>
  useSyncExternalStore(
    signatureManager.subscribe.bind(signatureManager),
    () => {
      const snapshot = signatureManager.getState();
      return (selector ? selector(snapshot) : snapshot) as T;
    },
    () => {
      const snapshot = signatureManager.getState();
      return (selector ? selector(snapshot) : snapshot) as T;
    }
  );
