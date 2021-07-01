import { openapiService } from 'background/service';
import { createPersistStore } from 'background/utils';
import { notification } from 'background/webapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { format } from 'utils';

class Transaction {
  createdTime = 0;
  queryingTimer: number | null = null;

  constructor(
    public nonce: string,
    public hash: string,
    public chain: CHAINS_ENUM
  ) {
    this.createdTime = +new Date();
  }
}

// [interval, timeout]
const QUERY_FREQUENCY = [
  [60 * 1000, 1000],
  [10 * 60 * 1000, 5 * 1000],
  [60 * 60 * 1000, 30 * 1000],
];

interface TransactionWatcherStore {
  pendingTx: Record<string, Transaction>;
}

class TransactionWatcher {
  store!: TransactionWatcherStore;
  poolTimer: number | null = null;

  constructor(private poolInterval) {}

  init = async () => {
    this.store = await createPersistStore<TransactionWatcherStore>({
      name: 'transactions',
      template: {
        pendingTx: {},
      },
    });
  };

  addTx = (
    id: string,
    { hash, chain, nonce }: { hash: string; chain: CHAINS_ENUM; nonce: string }
  ) => {
    this.store.pendingTx = {
      ...this.store.pendingTx,
      [id]: new Transaction(nonce, hash, chain),
    };

    const url = format(CHAINS[chain].scanLink, hash);
    notification.create(
      url,
      'Transaction submitted',
      'click to view more information'
    );

    this._scheduleQuerying(id);
  };

  checkStatus = async (id: string) => {
    if (!this.store.pendingTx[id]) {
      return;
    }
    const { hash, chain } = this.store.pendingTx[id];

    return openapiService
      .ethRpc(CHAINS[chain].serverId, {
        method: 'eth_getTransactionReceipt',
        params: [hash],
      })
      .catch(() => null);
  };

  notify = (id: string, txReceipt) => {
    if (!this.store.pendingTx[id]) {
      return;
    }
    const { hash, chain } = this.store.pendingTx[id];
    const url = format(CHAINS[chain].scanLink, hash);

    const title = `Transaction ${
      txReceipt.status === '0x1' ? 'completed' : 'failed'
    }`;

    notification.create(url, title, 'click to view more information');
  };

  roll = () => {
    // make a copy
    const currentList = { ...this.store.pendingTx };

    Object.keys(currentList).forEach(this._scheduleQuerying);
  };

  _scheduleQuerying = (id) => {
    const tx = this.store.pendingTx[id];

    if (tx.queryingTimer) {
      clearTimeout(tx.queryingTimer);
      tx.queryingTimer = null;
    }

    const nextTimeout = tx.createdTime && this._findFrequency(tx.createdTime);

    if (nextTimeout) {
      tx.queryingTimer = window.setTimeout(() => {
        this.checkStatus(id).then((txReceipt) => {
          tx.queryingTimer = null;

          if (txReceipt) {
            this.notify(id, txReceipt);
            this._removeTx(id);
          } else {
            this._scheduleQuerying(id);
          }
        });
      }, nextTimeout);
    } else {
      this._removeTx(id);
    }
  };

  _findFrequency = (createTime) => {
    const now = +new Date();

    return QUERY_FREQUENCY.find(
      ([sinceCreate]) => now - createTime < sinceCreate
    )?.[1];
  };

  _removeTx = (id: string) => {
    this.store.pendingTx = Object.entries(this.store.pendingTx).reduce(
      (m, [k, v]) => {
        if (k !== id && v) {
          const { queryingTimer, ...rest } = v;
          m[k] = rest;
        }

        return m;
      },
      {}
    );
  };
}

export default new TransactionWatcher(5);
