import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { DrawerProps, ModalProps } from 'antd';

import { Account } from '@/background/service/preference';
import { MINI_SIGN_ERROR } from './SignatureManager';
import { MiniTypedData } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';
import { WalletControllerType } from '@/ui/utils';
import { KEYRING_TYPE } from '@/constant';
import { sendSignTypedData } from '@/ui/utils/sendTypedData';
import { SignatureSteps } from '../services';

type Subscriber = (state: TypedDataSignatureState) => void;

export type TypedDataSignerConfig = {
  account: Account;
  noShowModalLoading?: boolean;
  getContainer?: DrawerProps['getContainer'];
  /**
   * 静默模式，不展示全局弹层
   */
  silent?: boolean;
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

  public start(
    request: TypedDataSignatureRequest,
    config: {
      getContainer?: ModalProps['getContainer'];
    } = {}
  ) {
    const { getContainer } = config;
    if (!request.txs.length) {
      throw new Error('No typed data to sign');
    }
    this.ensureNoPending();
    this.lastRequest = request;
    this.resumeIndex = 0;
    this.partialResults = [];
    const promise = new Promise<string[]>((resolve, reject) => {
      this.pendingResult = { resolve, reject };
    });
    this.setState({
      status: 'signing',
      request,
      error: undefined,
      progress: { current: 0, total: request.txs.length },
    });
    this.runSigningFlow({ request, getContainer });
    return promise;
  }

  private async runSigningFlow({
    request,
    startIndex = 0,
    existingResults = [],
    getContainer,
  }: {
    request: TypedDataSignatureRequest;
    startIndex?: number;
    existingResults?: string[];
    getContainer?: ModalProps['getContainer'];
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

    try {
      for (let idx = startIndex; idx < txs.length; idx++) {
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
        });

        result.push(hash);
        this.setState({
          ...this.state,
          status: 'signing',
          request,
          progress: { current: idx + 1, total: txs.length },
        });
      }
      this.partialResults = [];
      this.resumeIndex = 0;
      this.resolve(result);
    } catch (error) {
      const message = error.message || error.name;
      this.partialResults = result;
      this.resumeIndex = Math.min(
        txs.length - 1,
        Math.max(startIndex, this.state.progress?.current || startIndex)
      );
      this.setState({
        status: 'error',
        request,
        error: message,
        progress: { current: this.resumeIndex, total: txs.length },
      });
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
    this.ensureNoPending();
    this.lastRequest = request;
    const promise = new Promise<string[]>((resolve, reject) => {
      this.pendingResult = { resolve, reject };
    });
    const startIndex = this.resumeIndex || 0;
    const existingResults = [...this.partialResults];
    this.setState({
      status: 'signing',
      request,
      error: undefined,
      progress: { current: startIndex, total: request.txs.length },
    });
    this.runSigningFlow({ request, startIndex, existingResults, getContainer });
    return promise;
  }

  private reset() {
    this.lastRequest = null;
    this.resumeIndex = 0;
    this.partialResults = [];
    this.setState({ status: 'idle' });
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
