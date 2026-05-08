import { hasConnectedLedgerDevice } from '@/ui/utils';

import type { WalletControllerType } from '@/ui/utils';
import type { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import type { SignerConfig } from '@/ui/component/MiniSignV2/domain/types';
import type { SignerCtx } from '@/ui/component/MiniSignV2/domain/ctx';
import type { TokenItem, Tx } from '@rabby-wallet/rabby-api/dist/types';

import type {
  SignatureAction,
  SignatureFlowState,
  SignatureRequest,
} from './types';

import { signatureReducer } from './machine';
import {
  signatureService,
  SignatureSteps,
} from '@/ui/component/MiniSignV2/services';
import { CHAINS_ENUM, EVENTS, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import eventBus from '@/eventBus';
import { findChain } from '@/utils/chain';
import { t } from 'i18next';
import { DrawerProps, ModalProps } from 'antd';
import BigNumber from 'bignumber.js';

const ETH_GAS_USD_LIMIT = 15;
const OTHER_GAS_USD_LIMIT = 5;

export const MINI_SIGN_ERROR = {
  GAS_FEE_TOO_HIGH: 'selectedGasCost too high',
  PREFETCH_FAILURE: 'prepare failure',
  USER_CANCELLED: 'User cancelled',
  CANT_PROCESS: 'Can not process',
  GAS_NOT_ENOUGH: 'Gas not enough',
};

type Subscriber = (state: SignatureFlowState) => void;

type RunContext = {
  id: number;
  fingerprint: string;
};

const defaultError = {
  status: 'FAILED',
  content: t('page.signFooterBar.qrcode.txFailed'),
  description: MINI_SIGN_ERROR.PREFETCH_FAILURE,
} as SignatureFlowState['error'];

const createErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err ?? 'Unknown error');

let nextInstanceId = 0;

export class SignatureManager {
  public readonly instanceId: string;
  constructor(
    private readonly options?: {
      onReset?: () => void;
    },
    instanceId?: string
  ) {
    this.instanceId = instanceId ?? `sig-${++nextInstanceId}`;
  }
  private state: SignatureFlowState = {
    status: 'idle',
  };
  private subscribers = [] as Subscriber[];
  private run: RunContext | null = null;
  private seq = 0;
  private pendingCtx = new Map<string, Promise<SignerCtx>>();
  private notifyScheduled = false;
  private pendingResult: {
    resolve: (hashes: string[]) => void;
    reject: (reason: any) => void;
  } | null = null;
  private pauseRequested = false;
  private signedHashes: string[] = [];
  private pausedIndex = 0;
  private pauseAfterThreshold: number | null = null;
  private manualGasMethod?: SignerCtx['gasMethod'];
  private manualGasFingerprint?: string;

  private dispatch(action: SignatureAction) {
    const next = signatureReducer(this.state, action);
    if (next === this.state) return;
    this.applyRuntimeState(next);
    this.state = next;
    this.notify();
  }

  private notify() {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    Promise.resolve().then(() => {
      this.notifyScheduled = false;
      const snapshot = this.state;
      for (const fn of this.subscribers) {
        fn(snapshot);
      }
    });
  }

  private applyRuntimeState(nextState: SignatureFlowState) {
    const ctx = nextState.ctx;
    if (!ctx?.txs?.length) return;
    ctx.disabledProcess = !this.canProcess(nextState);
    ctx.gasFeeTooHigh = this.isGasFeeTooHighFor(ctx, nextState.config);
  }

  private getFingerprint(txs: Tx[]) {
    return signatureService.fingerprint(txs);
  }

  private getGasUsdLimit(chainId?: number) {
    const chainInfo = findChain({ id: chainId });
    return chainInfo?.enum === CHAINS_ENUM.ETH
      ? ETH_GAS_USD_LIMIT
      : OTHER_GAS_USD_LIMIT;
  }

  private isPreExecResultFailed() {
    return this?.state.ctx?.txsCalc.some(
      (r) => !r?.preExecResult?.pre_exec?.success
    );
  }

  private isGasFeeTooHighFor(
    ctx?: SignerCtx | null,
    config?: SignerConfig | null
  ) {
    if (!ctx || !config?.checkGasFeeTooHigh || config.ignoreGasFeeTooHigh) {
      return false;
    }
    const limit = this.getGasUsdLimit(ctx.chainId);
    const gasCost = ctx.selectedGasCost?.gasCostUsd;
    return !!gasCost?.gt(limit);
  }

  private clearRunState() {
    this.run = null;
    this.pendingCtx.clear();
  }

  private getManualGasMethod(fingerprint?: string) {
    return fingerprint && this.manualGasFingerprint === fingerprint
      ? this.manualGasMethod
      : undefined;
  }

  private withManualGasMethod(ctx: SignerCtx, fingerprint = ctx.fingerprint) {
    const manualGasMethod = this.getManualGasMethod(fingerprint);
    return manualGasMethod
      ? ({
          ...ctx,
          gasMethod: manualGasMethod,
          useGasless: manualGasMethod === 'gasAccount' ? false : ctx.useGasless,
        } as SignerCtx)
      : ctx;
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
    const fingerprint = this.getFingerprint(request.txs);

    this.dispatch({ type: 'SET_CONFIG', payload: request.config });

    if (
      this.state.fingerprint === fingerprint &&
      this.state.ctx &&
      this.state.status !== 'error'
    ) {
      return Promise.resolve(
        this.withManualGasMethod(this.state.ctx, fingerprint)
      );
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
        const nextCtx = this.withManualGasMethod(ctx, fingerprint);
        if (this.isActive(currentOpId, fingerprint)) {
          this.dispatch({
            type: 'PREFETCH_SUCCESS',
            fingerprint,
            ctx: nextCtx,
          });
        }
        return nextCtx;
      })
      .catch((error) => {
        console.error('PREFETCH_FAILURE error', error);
        if (this.isActive(currentOpId, fingerprint)) {
          this.dispatch({
            type: 'PREFETCH_FAILURE',
            fingerprint,
            error: defaultError,
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
    const chain = findChain({ id: chainId });
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
      nativeTokenBalance: '0',
      gasToken: chain
        ? {
            tokenId: chain.nativeTokenAddress,
            symbol: chain.nativeTokenSymbol,
            decimals: chain.nativeTokenDecimals || 18,
            logoUrl: chain.nativeTokenLogo,
          }
        : undefined,
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

  private canProcess(state: SignatureFlowState = this.state) {
    const { ctx, config } = state;
    const gasMethod = ctx?.gasMethod;
    const gasAccountCanPay =
      ctx?.gasMethod === 'gasAccount' &&
      // isSupportedAddr &&
      ctx?.noCustomRPC &&
      !!ctx?.gasAccount?.balance_is_enough &&
      !ctx?.gasAccount.chain_not_support &&
      !!ctx?.gasAccount.is_gas_account &&
      !(ctx?.gasAccount as any).err_msg;

    const canUseGasLess = !!ctx?.gasless?.is_gasless;
    let gasLessConfig =
      canUseGasLess && ctx?.gasless?.promotion
        ? ctx?.gasless?.promotion?.config
        : undefined;
    if (
      gasLessConfig &&
      ctx?.gasless?.promotion?.id === '0ca5aaa5f0c9217e6f45fe1d109c24fb'
    ) {
      gasLessConfig = { ...gasLessConfig, dark_color: '', theme_color: '' };
    }

    const useGasLess =
      (ctx?.isGasNotEnough || !!gasLessConfig) &&
      !!canUseGasLess &&
      !!ctx?.useGasless;
    const loading = !ctx?.txsCalc?.length;
    // status === 'prefetching' || status === 'signing' || !ctx?.txsCalc?.length;

    const disabledProcess = ctx?.txsCalc?.length
      ? gasMethod === 'gasAccount'
        ? !gasAccountCanPay
        : useGasLess
        ? false
        : !!loading ||
          !ctx?.txsCalc?.length ||
          !!ctx.checkErrors?.some((e) => e.level === 'forbidden')
      : false;

    const autoUseGasFreeMethod =
      !loading &&
      disabledProcess &&
      config?.autoUseGasFree &&
      (ctx?.isGasNotEnough || !!gasLessConfig) &&
      !!canUseGasLess;

    if (autoUseGasFreeMethod && state.ctx) {
      state.ctx.useGasless = true;
      return true;
    }

    return !disabledProcess;
  }

  public getState = () => {
    return this.state;
  };

  public subscribe = (fn: Subscriber) => {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((e) => e !== fn);
    };
  };

  public prefetch(request: SignatureRequest, wallet: WalletControllerType) {
    this.close();
    return this.ensureContext(request, wallet);
  }

  public async openUI(request: SignatureRequest, wallet: WalletControllerType) {
    const fingerprint = this.getFingerprint(request.txs);
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
      this.dispatch({
        type: 'OPEN_UI_FAILURE',
        fingerprint,
        error: defaultError,
      });
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
              error: defaultError,
            });
          }
          throw error;
        });

      this.dispatch({
        type: 'UPDATE_CTX',
        fingerprint,
        ctx: {
          ...ctx,
          selectedGas: gas,
        } as SignerCtx,
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
      const latestCtx =
        this.state.fingerprint === fingerprint ? this.state.ctx : undefined;
      this.dispatch({
        type: 'UPDATE_CTX',
        fingerprint,
        ctx: {
          ...nextCtx,
          gasMethod:
            this.getManualGasMethod(fingerprint) ??
            latestCtx?.gasMethod ??
            nextCtx.gasMethod,
          useGasless: latestCtx?.useGasless ?? nextCtx.useGasless,
        } as SignerCtx,
      });
    } catch (error) {
      if (!this.isActive(opId, fingerprint)) return;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  public async updateGasLevel(gas: GasLevel, wallet: WalletControllerType) {
    return this.updateGas(gas, wallet);
  }

  public replaceTxs(nextTxs: Tx[]) {
    const { ctx, fingerprint } = this.state;
    if (!ctx || !fingerprint) return;

    const nextCalc = ctx.txsCalc.map((item, index) => {
      const nextTx = nextTxs[index];
      if (!nextTx) {
        return item;
      }

      return {
        ...item,
        tx: {
          ...item.tx,
          nonce: nextTx.nonce ?? item.tx.nonce,
        },
      };
    });

    this.dispatch({
      type: 'UPDATE_CTX',
      fingerprint,
      ctx: {
        ...ctx,
        txs: nextTxs,
        txsCalc: nextCalc,
      } as SignerCtx,
    });
  }

  public async send({
    wallet,
    retry,
    getContainer,
    pauseAfter,
    isHideErrorUI,
  }: {
    wallet: WalletControllerType;
    retry?: boolean;
    getContainer?: ModalProps['getContainer'] | DrawerProps['getContainer'];
    pauseAfter?: number;
    isHideErrorUI?: boolean;
  }) {
    this.pauseAfterThreshold =
      typeof pauseAfter === 'number' ? pauseAfter : this.pauseAfterThreshold;
    const { ctx, config, fingerprint } = this.state;
    if (!ctx || !config || !fingerprint) {
      throw new Error('Signature is not ready');
    }
    if (!this.canProcess()) {
      if (ctx.isGasNotEnough) {
        this.rejectPending(MINI_SIGN_ERROR.GAS_NOT_ENOUGH);
        throw MINI_SIGN_ERROR.GAS_NOT_ENOUGH;
      } else {
        this.rejectPending(MINI_SIGN_ERROR.CANT_PROCESS);
        throw MINI_SIGN_ERROR.CANT_PROCESS;
      }
    }
    this.pauseRequested = false;
    this.pausedIndex = 0;
    this.signedHashes = [];
    const opId = this.markRun(fingerprint);
    if (config.account.type === KEYRING_TYPE.HdKeyring) {
      try {
        await SignatureSteps.invokeEnterPassphraseModal({
          wallet: wallet,
          value: config.account.address,
          getContainer: getContainer || config.getContainer,
        });
      } catch (error) {
        this.rejectPending(MINI_SIGN_ERROR.USER_CANCELLED);
        return;
      }
    }
    this.dispatch({ type: 'SEND_START', fingerprint });
    try {
      const latestCtx =
        this.state.fingerprint === fingerprint && this.state.ctx
          ? this.state.ctx
          : ctx;
      const sendCtx = this.withManualGasMethod(latestCtx, fingerprint);
      const res = await signatureService.send({
        wallet,
        ctx: sendCtx,
        config,
        retry,
        shouldPause: (idx, signedCount) =>
          this.pauseRequested ||
          (typeof this.pauseAfterThreshold === 'number' &&
            this.pauseAfterThreshold >= 0 &&
            signedCount >= this.pauseAfterThreshold),
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
      if ((res as any).paused) {
        const paused = res as {
          paused: true;
          partial: { txHash: string }[];
          currentIndex: number;
        };
        this.signedHashes = paused.partial.map((p) => p.txHash);
        this.pausedIndex = paused.currentIndex;
        this.dispatch({
          type: 'SEND_PAUSED',
          fingerprint,
          ctx: {
            ...(this.state.ctx || sendCtx),
            signInfo: {
              currentTxIndex: this.pausedIndex,
              totalTxs: sendCtx.txs.length,
              status: 'signing',
            },
          } as SignerCtx,
        });
        return this.signedHashes;
      }
      if ((res as any).error) {
        if (isHideErrorUI) {
          this.rejectPending((res as any).error.description);
        } else {
          this.dispatch({
            type: 'SEND_FAILURE',
            fingerprint,
            error: (res as any).error,
          });
        }
        return res;
      }

      const hashes = Array.isArray(res) ? res.map((item) => item.txHash) : [];
      this.dispatch({ type: 'SEND_SUCCESS', fingerprint, hashes });
      this.resolvePending(hashes);
      return hashes;
    } catch (error) {
      if (!this.isActive(opId, fingerprint)) return [];
      const message = createErrorMessage(error);
      this.dispatch({ type: 'SEND_FAILURE', fingerprint, error: defaultError });
      this.rejectPending(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  // private removeSigningTx() {
  //   const signingTxId = notificationService.currentMiniApproval?.signingTxId;
  //   if (signingTxId) {
  //     transactionHistoryService.removeSigningTx(signingTxId);
  //     notificationService.currentMiniApproval = null;
  //   }
  // }

  public reset() {
    this.pauseRequested = false;
    this.signedHashes = [];
    this.pausedIndex = 0;
    this.pauseAfterThreshold = null;
    this.manualGasMethod = undefined;
    this.manualGasFingerprint = undefined;
    this.clearRunState();
    this.seq++;
    if (this.pendingResult) {
      this.pendingResult.reject(MINI_SIGN_ERROR.USER_CANCELLED);
      this.pendingResult = null;
    }
    this.dispatch({ type: 'RESET' });
    this.options?.onReset?.();
  }

  public updateConfig(config: Partial<SignerConfig>) {
    this.dispatch({ type: 'SET_CONFIG', payload: config });
  }

  public close() {
    this.reset();
  }

  public pause() {
    this.pauseRequested = true;
  }

  public async resume({
    wallet,
    getContainer,
  }: {
    wallet: WalletControllerType;
    getContainer?: ModalProps['getContainer'];
  }) {
    const { ctx, config, fingerprint } = this.state;
    if (!ctx || !config || !fingerprint) {
      throw new Error('Signature is not ready');
    }
    this.pauseRequested = false;
    return this.send({ wallet, getContainer });
  }

  private async checkHardWareConnected(cb: () => void) {
    const { config } = this.state;
    const { account } = config || {};
    if (!account) {
      this.pendingResult?.reject(MINI_SIGN_ERROR.PREFETCH_FAILURE);
      return;
    }
    if (account.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      try {
        const isConnected = await hasConnectedLedgerDevice();
        if (isConnected) {
          cb();
        } else {
          eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, 'DISCONNECTED');
        }
      } catch {
        this.pendingResult?.reject?.(MINI_SIGN_ERROR.USER_CANCELLED);
      }

      return;
    }

    cb();
    return;
  }

  public async openDirect(
    request: SignatureRequest,
    wallet: WalletControllerType,
    opts?: { pauseAfter?: number; isHideErrorUI?: boolean }
  ) {
    if (opts?.pauseAfter !== undefined) {
      this.pauseAfterThreshold = opts.pauseAfter;
    }
    const fingerprint = this.getFingerprint(request.txs);
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

      if (this.isPreExecResultFailed()) {
        this.rejectPending(MINI_SIGN_ERROR.PREFETCH_FAILURE);
        return resultPromise;
      }

      if (this.isGasFeeTooHighFor(this.state.ctx, this.state.config)) {
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

      await this.checkHardWareConnected(() =>
        this.send({ wallet, isHideErrorUI: opts?.isHideErrorUI }).catch(
          () => undefined
        )
      );
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

  public setGasMethod(
    method: 'native' | 'gasAccount',
    options?: { manual?: boolean }
  ) {
    const { ctx, fingerprint } = this.state;
    if (!ctx || !fingerprint) return;
    if (options?.manual) {
      this.manualGasMethod = method;
      this.manualGasFingerprint = fingerprint;
    }
    const nextGasMethod = this.getManualGasMethod(fingerprint) ?? method;
    this.dispatch({
      type: 'UPDATE_CTX',
      fingerprint,
      ctx: {
        ...ctx,
        gasMethod: nextGasMethod,
        useGasless: nextGasMethod === 'gasAccount' ? false : ctx.useGasless,
      } as SignerCtx,
    });
  }

  public setTempoFeeToken(
    token: TokenItem,
    options?: {
      applyFeeToken?: boolean;
      tempoPreferredFeeTokenId?: string;
    }
  ) {
    const { ctx, fingerprint } = this.state;
    if (!ctx || !fingerprint) return;
    const shouldApplyFeeToken =
      ctx.gasMethod !== 'gasAccount' && options?.applyFeeToken !== false;
    const tokenId = token.id;

    const txs = ctx.txs.map((tx) => {
      const next = { ...tx } as Tx & { feeToken?: string };
      if (shouldApplyFeeToken) {
        next.feeToken = tokenId;
      }
      return next as Tx;
    });

    const txsCalc = ctx.txsCalc.map((item) => {
      const nextTx = { ...item.tx } as Tx & { feeToken?: string };
      if (shouldApplyFeeToken) {
        nextTx.feeToken = tokenId;
      }
      return {
        ...item,
        tx: nextTx as Tx,
      };
    });

    this.dispatch({
      type: 'UPDATE_CTX',
      fingerprint,
      ctx: {
        ...ctx,
        txs,
        txsCalc,
        gasToken: {
          tokenId,
          symbol: token.display_symbol || token.symbol,
          decimals: token.decimals || 18,
          logoUrl: token.logo_url,
        },
        nativeTokenBalance: new BigNumber(
          token.raw_amount_hex_str || 0
        ).toFixed(0),
        tempoPreferredFeeTokenId:
          options?.tempoPreferredFeeTokenId ||
          (shouldApplyFeeToken ? tokenId : ctx.tempoPreferredFeeTokenId),
      } as SignerCtx,
    });
  }

  public async retry(params: Parameters<typeof this.send>[0]) {
    return this.send({ ...params, retry: true });
  }

  public async startUI(
    request: SignatureRequest,
    wallet: WalletControllerType,
    opts?: { pauseAfter?: number; isHideErrorUI?: boolean }
  ): Promise<string[]> {
    if (opts?.pauseAfter !== undefined) {
      this.pauseAfterThreshold = opts.pauseAfter;
    }
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
    this.clearRunState();
    this.dispatch({ type: 'RESET' });
  }

  private rejectPending(message: string) {
    if (this.pendingResult) {
      this.pendingResult.reject(message);
      this.pendingResult = null;
    }
    this.clearRunState();
  }
}

export const signatureManager = new SignatureManager();
