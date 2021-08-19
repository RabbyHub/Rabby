import { createPersistStore } from 'background/utils';
import openapiService, { Tx, ExplainTxResponse } from './openapi';
import { CHAINS } from 'consts';

export interface TransactionHistoryItem {
  rawTx: Tx;
  createdAt: number;
  isCompleted: boolean;
  hash: string;
  failed: boolean;
  gasUsed?: number;
}

export interface TransactionGroup {
  chainId: number;
  nonce: number;
  txs: TransactionHistoryItem[];
  isPending: boolean;
  createdAt: number;
  explain: ExplainTxResponse;
  isFailed: boolean;
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
          ...this.store.transactions[from],
          [key]: {
            chainId: tx.rawTx.chainId,
            nonce,
            txs: [tx],
            createdAt: tx.createdAt,
            isPending: true,
            explain: explain,
            isFailed: false,
          },
        },
      };
    }

    this.removeExplainCache(`${from.toLowerCase()}-${chainId}-${nonce}`);
  }

  updateSingleTx(tx: TransactionHistoryItem) {
    const nonce = Number(tx.rawTx.nonce);
    const chainId = tx.rawTx.chainId;
    const key = `${chainId}-${nonce}`;
    const from = tx.rawTx.from.toLowerCase();
    const target = this.store.transactions[from][key];
    if (!this.store.transactions[from] || !target) return;
    const index = target.txs.findIndex((t) => t.hash === tx.hash);
    target.txs[index] = tx;
    this.store.transactions = {
      ...this.store.transactions,
      [from]: {
        ...this.store.transactions[from],
        [key]: target,
      },
    };
  }

  async reloadTx(
    {
      address,
      chainId,
      nonce,
    }: {
      address: string;
      chainId: number;
      nonce: number;
    },
    duration = 0
  ) {
    const key = `${chainId}-${nonce}`;
    const from = address.toLowerCase();
    const target = this.store.transactions[from][key];
    const chain = Object.values(CHAINS).find((c) => c.id === chainId)!;
    if (!target) return;
    const { txs } = target;
    try {
      const results = await Promise.all(
        txs.map((tx) =>
          openapiService.getTx(
            chain.serverId,
            tx.hash,
            Number(tx.rawTx.gasPrice)
          )
        )
      );
      const completed = results.find(
        (result) => result.code === 0 && result.status !== 0
      );
      if (!completed) {
        if (duration < 1000 * 15) {
          // maximum retry 15 times;
          setTimeout(() => {
            this.reloadTx({ address, chainId, nonce });
          }, duration + 1000);
        }
        return;
      }
      const completedTx = txs.find((tx) => tx.hash === completed.hash)!;
      this.updateSingleTx({
        ...completedTx,
        gasUsed: completed.gas_used,
      });
      this.completeTx({
        address,
        chainId,
        nonce,
        hash: completedTx.hash,
        success: completed.status === 1,
      });
    } catch (e) {
      if (duration < 1000 * 15) {
        // maximum retry 15 times;
        setTimeout(() => {
          this.reloadTx({ address, chainId, nonce });
        }, duration + 1000);
      }
    }
  }

  getList(address: string) {
    const list = Object.values(this.store.transactions[address] || {});
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
          return b.nonce - a.nonce;
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
    success = true,
  }: {
    address: string;
    chainId: number;
    nonce: number;
    hash: string;
    success?: boolean;
  }) {
    const key = `${chainId}-${nonce}`;
    const normalizedAddress = address.toLowerCase();
    const target = this.store.transactions[normalizedAddress][key];
    target.isPending = false;
    target.isFailed = !success;
    const index = target.txs.findIndex((tx) => tx.hash === hash);
    if (index !== -1) {
      target.txs[index].isCompleted = true;
      target.txs[index].failed = !success;
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
