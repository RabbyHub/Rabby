import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { DrawerProps, ModalProps } from 'antd';

import { Account } from '@/background/service/preference';
import { MINI_SIGN_ERROR } from './SignatureManager';
import { MiniTypedData } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';
import { hasConnectedLedgerDevice, WalletControllerType } from '@/ui/utils';
import { supportedHardwareDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { sendSignTypedData } from '@/ui/utils/sendTypedData';
import { SignatureSteps } from '../services';
import { isLedgerLockError } from '@/ui/utils/ledger';
import type { SigningRequestContext } from '@/utils/signingTypes';

type Subscriber = (state: TypedDataSignatureState) => void;

export type TypedDataSignerConfig = {
  account: Account;
  noShowModalLoading?: boolean;
  getContainer?: DrawerProps['getContainer'];
  mode?: 'UI' | 'DIRECT';
  title?: React.ReactNode;
};

export type TypedDataSignatureRequest = {
  txs: MiniTypedData[];
  config: TypedDataSignerConfig;
  wallet: WalletControllerType;
};

export type TypedDataSignatureState = {
  status: 'idle' | 'signing' | 'error';
  request?: TypedDataSignatureRequest;
  error?: string;
  progress?: {
    current: number;
    total: number;
  };
};

class TypedDataSignatureManager {
  private state: TypedDataSignatureState = {
    status: 'idle',
  };
  private subscribers: Subscriber[] = [];
  private lastRequest: TypedDataSignatureRequest | null = null;
  private resumeIndex = 0;
  private partialResults: string[] = [];
  private signingContext?: SigningRequestContext;
  private signingWallet?: WalletControllerType;
  private runId = 0;
  private pendingResult: {
    resolve: (hashes: string[]) => void;
    reject: (reason: any) => void;
  } | null = null;

  private notify() {
    const snapshot = this.state;
    for (const fn of this.subscribers) {
      fn(snapshot);
    }
  }

  private setState(next: TypedDataSignatureState) {
    this.state = next;
    this.notify();
  }

  public getState() {
    return this.state;
  }

  public subscribe(fn: Subscriber) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((e) => e !== fn);
    };
  }

  private ensureNoPending() {
    if (this.pendingResult) {
      this.pendingResult.reject(MINI_SIGN_ERROR.USER_CANCELLED);
      this.pendingResult = null;
    }
  }

  private discardSigningContext(
    context: SigningRequestContext,
    wallet: WalletControllerType
  ) {
    if (this.signingContext === context) {
      this.signingContext = undefined;
      this.signingWallet = undefined;
    }
    void wallet.cancelDirectSigning(context).catch((error) => {
      console.error('cancel stale direct typed-data signing failed', error);
    });
  }

  private invalidateRun() {
    this.runId += 1;
    if (this.signingContext && this.signingWallet) {
      this.discardSigningContext(this.signingContext, this.signingWallet);
    }
  }

  private isActiveRun(runId: number, request: TypedDataSignatureRequest) {
    return this.runId === runId && this.lastRequest === request;
  }

  private async checkHardWareConnected(runId: number, cb: () => void) {
    const account = this.state.request?.config.account;
    if (this.runId !== runId) return;
    if (!account) {
      this.reject(MINI_SIGN_ERROR.PREFETCH_FAILURE);
      return;
    }
    if (account.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      try {
        const isConnected = await hasConnectedLedgerDevice();
        if (this.runId !== runId) return;
        if (isConnected) {
          cb();
        } else {
          this.reject(MINI_SIGN_ERROR.USER_CANCELLED);
        }
      } catch {
        if (this.runId === runId) {
          this.reject(MINI_SIGN_ERROR.USER_CANCELLED);
        }
      }

      return;
    }

    cb();
    return;
  }

  public start(
    request: TypedDataSignatureRequest,
    config: {
      getContainer?: ModalProps['getContainer'];
    } = {}
  ) {
    if (!request.txs.length) {
      throw new Error('No typed data to sign');
    }
    this.invalidateRun();
    this.ensureNoPending();
    this.lastRequest = request;
    this.resumeIndex = 0;
    this.partialResults = [];
    const promise = new Promise<string[]>((resolve, reject) => {
      this.pendingResult = { resolve, reject };
    });
    this.setState({
      status: request.config.mode === 'UI' ? 'idle' : 'signing',
      request,
      error: undefined,
      progress: { current: 0, total: request.txs.length },
    });
    if (request.config.mode !== 'UI') {
      const runId = this.runId;
      this.checkHardWareConnected(runId, () => {
        if (!this.isActiveRun(runId, request)) return;
        void this.runSigningFlow({
          request,
          runId,
          startIndex: 0,
          existingResults: [],
          getContainer: config.getContainer || request.config.getContainer,
        });
      });
    }
    return promise;
  }

  private async runSigningFlow({
    request,
    runId,
    startIndex = 0,
    existingResults = [],
    getContainer,
  }: {
    request: TypedDataSignatureRequest;
    runId: number;
    startIndex?: number;
    existingResults?: string[];
    getContainer?: ModalProps['getContainer'] | DrawerProps['getContainer'];
  }) {
    const { wallet, txs, config } = request;
    const result: string[] = [...existingResults];

    if (config.account.type === KEYRING_TYPE.HdKeyring) {
      try {
        await SignatureSteps.invokeEnterPassphraseModal({
          wallet: wallet,
          value: config.account.address,
          getContainer: getContainer || config.getContainer,
        });
      } catch (error) {
        this.reject(MINI_SIGN_ERROR.USER_CANCELLED);
        return;
      }
    }
    if (!this.isActiveRun(runId, request)) return;

    let signingContext: SigningRequestContext | undefined;
    try {
      signingContext = await wallet.startDirectSigning({
        account: config.account,
      });
      if (!this.isActiveRun(runId, request)) {
        this.discardSigningContext(signingContext, wallet);
        return;
      }
      this.signingContext = signingContext;
      this.signingWallet = wallet;
      for (let idx = startIndex; idx < txs.length; idx++) {
        if (!this.isActiveRun(runId, request)) {
          this.discardSigningContext(signingContext, wallet);
          return;
        }
        const item = txs[idx];
        this.setState({
          ...this.state,
          status: 'signing',
          request,
          progress: { current: idx, total: txs.length },
        });

        const { txHash: hash } = await sendSignTypedData({
          ...item,
          wallet: request.wallet,
          account: request.config.account,
          hardwareOperation: supportedHardwareDirectSign(config.account.type)
            ? {
                kind: 'signing-attempt',
                attempt: signingContext.attempt,
              }
            : undefined,
          signing: signingContext,
        });
        if (!this.isActiveRun(runId, request)) {
          this.discardSigningContext(signingContext, wallet);
          return;
        }

        result.push(hash);
        this.setState({
          ...this.state,
          status: 'signing',
          request,
          progress: { current: idx + 1, total: txs.length },
        });
      }
      if (!this.isActiveRun(runId, request)) {
        this.discardSigningContext(signingContext, wallet);
        return;
      }
      this.partialResults = [];
      this.resumeIndex = 0;
      await this.finishSigningContext({ success: true, data: result });
      if (!this.isActiveRun(runId, request)) return;
      this.resolve(result);
    } catch (error) {
      if (signingContext && this.isActiveRun(runId, request)) {
        await this.finishSigningContext({ success: false, error });
      } else if (signingContext) {
        this.discardSigningContext(signingContext, wallet);
        return;
      }
      if (!this.isActiveRun(runId, request)) return;
      const message =
        error instanceof Error ? error.message || error.name : String(error);
      this.partialResults = result;
      this.resumeIndex = Math.min(
        txs.length - 1,
        Math.max(startIndex, this.state.progress?.current || startIndex)
      );
      if (!isLedgerLockError(message)) {
        this.setState({
          status: 'error',
          request,
          error: message,
          progress: { current: this.resumeIndex, total: txs.length },
        });
      }
    }
  }

  public resolve(hashes: string[]) {
    if (this.pendingResult) {
      this.pendingResult.resolve(hashes);
      this.pendingResult = null;
    }
    this.reset();
  }

  public reject(reason?: any, keepState = false) {
    if (this.pendingResult) {
      this.pendingResult.reject(reason ?? MINI_SIGN_ERROR.USER_CANCELLED);
      this.pendingResult = null;
    }
    if (!keepState) {
      this.reset();
    }
  }

  public close() {
    this.reject(MINI_SIGN_ERROR.USER_CANCELLED);
  }

  public retry({
    getContainer,
  }: {
    getContainer?: ModalProps['getContainer'];
  } = {}) {
    const request = this.state.request || this.lastRequest;
    if (!request) {
      throw new Error('No typed data request to retry');
    }
    this.invalidateRun();
    const runId = this.runId;
    const startIndex = this.resumeIndex || 0;
    const existingResults = [...this.partialResults];
    this.setState({
      status: 'signing',
      request,
      error: undefined,
      progress: { current: startIndex, total: request.txs.length },
    });
    this.checkHardWareConnected(runId, () => {
      if (!this.isActiveRun(runId, request)) return;
      void this.runSigningFlow({
        request,
        runId,
        startIndex,
        existingResults,
        getContainer,
      });
    });
  }

  private reset() {
    this.invalidateRun();
    this.lastRequest = null;
    this.resumeIndex = 0;
    this.partialResults = [];
    this.signingContext = undefined;
    this.signingWallet = undefined;
    this.setState({ status: 'idle' });
  }

  private async finishSigningContext(outcome: {
    success: boolean;
    data?: unknown;
    error?: unknown;
  }) {
    const context = this.signingContext;
    const wallet = this.signingWallet;
    if (!context || !wallet) return;
    this.signingContext = undefined;
    this.signingWallet = undefined;
    try {
      await wallet.finishDirectSigning(context, outcome);
    } catch (error) {
      console.error('finish direct typed-data signing failed', error);
      await wallet.cancelDirectSigning(context).catch((cancelError) => {
        console.error(
          'cancel direct typed-data signing after finish failed',
          cancelError
        );
      });
    }
  }
}

export const typedDataSignatureManager = new TypedDataSignatureManager();

export const useTypedDataSignatureStore = <T = TypedDataSignatureState>(
  selector?: (state: TypedDataSignatureState) => T
) =>
  useSyncExternalStore(
    typedDataSignatureManager.subscribe.bind(typedDataSignatureManager),
    () => {
      const snapshot = typedDataSignatureManager.getState();
      return (selector ? selector(snapshot) : snapshot) as T;
    },
    () => {
      const snapshot = typedDataSignatureManager.getState();
      return (selector ? selector(snapshot) : snapshot) as T;
    }
  );

export const typedDataSignatureStore = typedDataSignatureManager;
