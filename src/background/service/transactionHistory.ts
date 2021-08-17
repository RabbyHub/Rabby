import { createPersistStore } from 'background/utils';
import { Tx, ExplainTxResponse } from './openapi';

export interface TransactionHistoryItem {
  rawTx: Tx;
  createdAt: number;
  isCompleted: boolean;
  hash: string;
}

export interface TransactionGroup {
  chainId: number;
  nonce: number;
  txs: TransactionHistoryItem[];
  isPending: boolean;
  createdAt: number;
  explain: ExplainTxResponse;
}

interface TxHistoryStore {
  transactions: {
    [key: string]: Record<string, TransactionGroup>;
  };
  cacheExplain: {
    [key: string]: TransactionGroup['explain'];
  };
}

class TxHistory {
  store!: TxHistoryStore;

  async init() {
    this.store = await createPersistStore<TxHistoryStore>({
      name: 'txHistory',
      template: {
        transactions: {},
        cacheExplain: {},
      },
    });
    if (!this.store.transactions) this.store.transactions = {};
    if (!this.store.cacheExplain) this.store.cacheExplain = {};
  }

  addTx(tx: TransactionHistoryItem, explain: TransactionGroup['explain']) {
    const nonce = Number(tx.rawTx.nonce);
    const chainId = tx.rawTx.chainId;
    const key = `${chainId}-${nonce}`;
    const from = tx.rawTx.from.toLowerCase();

    if (!this.store.transactions[from]) {
      this.store.transactions[from] = {};
    }
    if (this.store.transactions[from][key]) {
      const group = this.store.transactions[from][key];
      group.txs.push(tx);
      this.store.transactions = {
        ...this.store.transactions,
        [from]: {
          ...this.store.transactions[from],
          [key]: group,
        },
      };
    } else {
      this.store.transactions = {
        ...this.store.transactions,
        [from]: {
          [key]: {
            chainId: tx.rawTx.chainId,
            nonce,
            txs: [tx],
            createdAt: tx.createdAt,
            isPending: true,
            explain: explain,
          },
        },
      };
    }

    this.removeExplainCache(`${from.toLowerCase()}-${chainId}-${nonce}`);
  }

  getList(address: string) {
    const list = Object.values(this.store.transactions[address]);
    const pendings: TransactionGroup[] = [];
    const completeds: TransactionGroup[] = [];
    if (!list) return { pendings: [], completeds: [] };
    for (let i = 0; i < list.length; i++) {
      if (list[i].isPending) {
        pendings.push(list[i]);
      } else {
        completeds.push(list[i]);
      }
    }
    return {
      pendings: pendings.sort((a, b) => {
        if (a.chainId === b.chainId) {
          return a.nonce - b.nonce;
        } else {
          return a.chainId - b.chainId;
        }
      }),
      completeds: completeds.sort((a, b) => {
        if (a.chainId === b.chainId) {
          return a.nonce - b.nonce;
        } else {
          return a.chainId - b.chainId;
        }
      }),
    };
  }

  completeTx({
    address,
    chainId,
    nonce,
    hash,
  }: {
    address: string;
    chainId: number;
    nonce: number;
    hash: string;
  }) {
    const key = `${chainId}-${nonce}`;
    const normalizedAddress = address.toLowerCase();
    const target = this.store.transactions[normalizedAddress][key];
    target.isPending = false;
    const index = target.txs.findIndex((tx) => tx.hash === hash);
    if (index !== -1) {
      target.txs[index].isCompleted = true;
    }
    this.store.transactions = {
      ...this.store.transactions,
      [normalizedAddress]: {
        ...this.store.transactions[normalizedAddress],
        [key]: target,
      },
    };
  }

  addExplainCache({
    address,
    chainId,
    nonce,
    explain,
  }: {
    address: string;
    chainId: number;
    nonce: number;
    explain: ExplainTxResponse;
  }) {
    const key = `${address.toLowerCase()}-${chainId}-${nonce}`;
    this.store.cacheExplain = {
      ...this.store.cacheExplain,
      [key]: explain,
    };
  }

  getExplainCache({
    address,
    chainId,
    nonce,
  }: {
    address: string;
    chainId: number;
    nonce: number;
  }) {
    const key = `${address.toLowerCase()}-${chainId}-${nonce}`;
    return this.store.cacheExplain[key];
  }

  removeExplainCache(key: string) {
    const { cacheExplain } = this.store;
    if (cacheExplain[key]) {
      delete cacheExplain[key];
      this.store.cacheExplain = cacheExplain;
    }
  }
}

export default new TxHistory();
