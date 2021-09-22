import { createPersistStore } from 'background/utils';
import maxBy from 'lodash/maxBy';
import openapiService, { Tx, ExplainTxResponse } from './openapi';
import { CHAINS, CHAINS_ENUM } from 'consts';

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

  getPendingCount(address: string) {
    const normalizedAddress = address.toLowerCase();
    return Object.values(
      this.store.transactions[normalizedAddress] || {}
    ).filter((item) => item.isPending).length;
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
    const list = Object.values(
      this.store.transactions[address.toLowerCase()] || {}
    );
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
      completeds: completeds
        .sort((a, b) => {
          return b.createdAt - a.createdAt;
        })
        .slice(0, 10),
    };
  }

  completeTx({
    address,
    chainId,
    nonce,
    hash,
    success = true,
    gasUsed,
  }: {
    address: string;
    chainId: number;
    nonce: number;
    hash: string;
    success?: boolean;
    gasUsed?: number;
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
      if (gasUsed) {
        target.txs[index].gasUsed = gasUsed;
      }
    }
    this.store.transactions = {
      ...this.store.transactions,
      [normalizedAddress]: {
        ...this.store.transactions[normalizedAddress],
        [key]: target,
      },
    };
    this.clearBefore({ address, chainId, nonce });
    this.clearExpiredTxs(address);
  }

  clearExpiredTxs(address: string) {
    // maximum keep 20 transactions in storage each address since chrome storage maximum useage 5MB
    const normalizedAddress = address.toLowerCase();
    if (this.store.transactions[normalizedAddress]) {
      const txs = Object.values(this.store.transactions[normalizedAddress]);
      if (txs.length <= 20) return;
      txs.sort((a, b) => {
        return a.createdAt - b.createdAt > 0 ? -1 : 1;
      });
      this.store.transactions[normalizedAddress] = txs
        .slice(0, 20)
        .reduce((res, current) => {
          return {
            ...res,
            [`${current.chainId}-${current.nonce}`]: current,
          };
        }, {});
    }
  }

  clearBefore({
    address,
    chainId,
    nonce,
  }: {
    address: string;
    chainId: number;
    nonce: number;
  }) {
    const normalizedAddress = address.toLowerCase();
    const copyHistory = this.store.transactions[normalizedAddress];
    const copyExplain = this.store.cacheExplain;
    for (const k in copyHistory) {
      const t = copyHistory[k];
      if (t.chainId === chainId && t.nonce < nonce && t.isPending) {
        delete copyHistory[k];
      }
    }
    for (const k in copyExplain) {
      const [addr, cacheChainId, cacheNonce] = k.split('-');
      if (
        addr.toLowerCase() === normalizedAddress &&
        Number(cacheChainId) === chainId &&
        Number(cacheNonce) < nonce
      ) {
        delete copyExplain[k];
      }
    }
    this.store.transactions = {
      ...this.store.transactions,
      [normalizedAddress]: copyHistory,
    };
    this.store.cacheExplain = copyExplain;
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

  getNonceByChain(address: string, chainId: number) {
    const list = Object.values(
      this.store.transactions[address.toLowerCase()] || {}
    );
    const maxNonceTx = maxBy(
      list.filter((item) => item.chainId === chainId),
      (item) => item.nonce
    );

    if (!maxNonceTx) return null;

    return maxNonceTx.nonce + 1;
  }
}

export default new TxHistory();
