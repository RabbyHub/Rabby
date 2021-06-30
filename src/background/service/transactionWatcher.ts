import { openapiService } from 'background/service';
import { createPersistStore } from 'background/utils';
import { notification } from 'background/webapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { format } from 'utils';

class Transaction {
  constructor(public hash: string, public chain: CHAINS_ENUM) {}
}

interface TransactionWatcherStore {
  pendingTx: Record<string, Transaction>;
}

class TransactionWatcher {
  store!: TransactionWatcherStore;
  poolTimer = 0;

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
    { hash, chain }: { hash: string; chain: CHAINS_ENUM }
  ) => {
    this.store.pendingTx = {
      ...this.store.pendingTx,
      [id]: new Transaction(hash, chain),
    };
    const url = format(CHAINS[chain].scanLink, hash);
    notification.create(
      url,
      'Transaction submitted',
      'click to view more information'
    );
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
    this.store.pendingTx = Object.entries(this.store.pendingTx).reduce(
      (m, [k, v]) => {
        if (k !== id && v) {
          m[k] = v;
        }

        return m;
      },
      {}
    );
  };

  roll = () => {
    if (this.poolTimer) {
      clearTimeout(this.poolInterval);
      this.poolInterval = 0;
    }

    Promise.all(
      Object.keys(this.store.pendingTx).map((id) =>
        this.checkStatus(id).then((txReceipt) => [id, txReceipt])
      )
    )
      .then((txs) => {
        txs.forEach(([id, txReceipt]) => {
          if (txReceipt) {
            this.notify(id, txReceipt);
          }
        });
      })
      .finally(() => {
        this.poolTimer = 0;
      });

    this.poolTimer = window.setTimeout(() => {
      this.roll();
    }, this.poolInterval * 1000);
  };
}

export default new TransactionWatcher(5);
