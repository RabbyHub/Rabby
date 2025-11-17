import { createPersistStore } from 'background/utils';
import { TxHistoryResult } from './openapi';

const MAX_TRANSACTION_HISTORY_COUNT = 20;

export interface TransactionStore {
  data: Record<string, TxHistoryResult>;
}

class Transactions {
  private store: TransactionStore = {
    data: {},
  };
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  init = async () => {
    const storage = await createPersistStore<TransactionStore>({
      name: 'transactionsCache',
      template: {
        data: {},
      },
    });
    this.store = storage || this.store;
  };

  private ensureReady = async () => {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  };

  private clampHistory = (data: TxHistoryResult): TxHistoryResult => {
    const historyList = (data.history_list || []).slice(
      0,
      MAX_TRANSACTION_HISTORY_COUNT
    );
    return {
      ...data,
      history_list: historyList,
    };
  };

  updateTransactions = async (address: string, data: TxHistoryResult) => {
    await this.ensureReady();
    this.store.data = {
      ...this.store.data,
      [address]: this.clampHistory(data),
    };
  };

  getTransactions = async (address: string) => {
    await this.ensureReady();
    return this.store.data[address];
  };
}

export default new Transactions();
