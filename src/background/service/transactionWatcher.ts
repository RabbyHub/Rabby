import { openapiService } from 'background/service';
import { createPersistStore } from 'background/utils';
import { notification } from 'background/webapi';
import { CHAINS, CHAINS_ENUM } from 'consts';

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
    {
      hash,
      chain,
      title,
      message,
    }: { hash: string; chain: CHAINS_ENUM; title?: string; message?: string }
  ) => {
    this.store.pendingTx[id] = new Transaction(hash, chain);
    const _title = title || `transaction on ${chain}`;
    notification.create(hash, _title, message || 'submit');
  };

  checkStatus = async (id: string) => {
    if (this.store.pendingTx[id]) {
      const { hash, chain } = this.store.pendingTx[id];

      return openapiService
        .ethRpc(chain, {
          method: 'eth_getTransactionReceipt',
          params: [hash],
        })
        .catch(() => null);
    }
  };

  notify = (id: string, txReceipt) => {
    const { hash, chain } = this.store.pendingTx[id];
    const url = CHAINS[chain].scanLink.replace('{}', hash);

    const title = `transaction on ${chain}`;
    const message = txReceipt.status === '0x1' ? 'confirmed' : 'failed';

    notification.create(url, title, message);

    console.log('-----', id, hash, txReceipt);
    delete this.store.pendingTx[id];
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
