import {
  openapiService,
  i18n,
  transactionHistoryService,
} from 'background/service';
import { createPersistStore } from 'background/utils';
import { notification } from 'background/webapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { format } from 'utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import interval from 'interval-promise';

class Transaction {
  createdTime = 0;

  constructor(
    public nonce: string,
    public hash: string,
    public chain: CHAINS_ENUM
  ) {
    this.createdTime = +new Date();
  }
}

interface TransactionWatcherStore {
  pendingTx: Record<string, Transaction>;
}

class TransactionWatcher {
  store!: TransactionWatcherStore;
  timers = {};

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
      i18n.t('Transaction submitted'),
      i18n.t('click to view more information')
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

  notify = async (id: string, txReceipt) => {
    if (!this.store.pendingTx[id]) {
      return;
    }
    const { hash, chain, nonce } = this.store.pendingTx[id];
    const url = format(CHAINS[chain].scanLink, hash);
    const [address] = id.split('_');
    const chainId = Object.values(CHAINS).find((item) => item.enum === chain)!
      .id;

    if (txReceipt) {
      await transactionHistoryService.reloadTx({
        address,
        nonce: Number(nonce),
        chainId,
      });
    }

    const title =
      txReceipt.status === '0x1'
        ? i18n.t('Transaction completed')
        : i18n.t('Transaction failed');

    notification.create(
      url,
      title,
      i18n.t('click to view more information'),
      2
    );

    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.TX_COMPLETED,
      params: { address, hash },
    });
  };

  // fetch pending txs status every 5s
  roll = () => {
    interval(async () => {
      const list = Object.keys(this.store.pendingTx);
      // order by address, chain, nonce
      const idQueue = list.sort((a, b) => {
        const [aAddress, aNonceStr, aChain] = a.split('_');
        const [bAddress, bNonceStr, bChain] = b.split('_');

        const aNonce = Number(aNonceStr);
        const bNonce = Number(bNonceStr);

        if (aAddress !== bAddress) {
          return aAddress > bAddress ? 1 : -1;
        }

        if (aChain !== bChain) {
          return aChain > bChain ? 1 : -1;
        }
        return aNonce > bNonce ? 1 : -1;
      });

      return this._queryList(idQueue);
    }, 5000);
  };

  _queryList = async (ids: string[]) => {
    for (const id of ids) {
      try {
        const txReceipt = await this.checkStatus(id);

        if (txReceipt) {
          this.notify(id, txReceipt);
          this._removeTx(id);
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  _removeTx = (id: string) => {
    delete this.timers[id];
    this.store.pendingTx = Object.entries(this.store.pendingTx).reduce(
      (m, [k, v]) => {
        if (k !== id && v) {
          m[k] = v;
        }

        return m;
      },
      {}
    );
    this._clearBefore(id);
  };

  clearPendingTx = (address: string) => {
    this.store.pendingTx = Object.entries(this.store.pendingTx).reduce(
      (m, [key, v]) => {
        // address_chain_nonce
        if (!key.startsWith(address) && v) {
          m[key] = v;
        }

        return m;
      },
      {}
    );
  };

  _clearBefore = (id: string) => {
    const [address, nonceStr, chain] = id.split('_');
    const nonce = Number(nonceStr);

    const pendingTx = { ...this.store.pendingTx };

    for (const key in pendingTx) {
      const [kAddress, kNonceStr, kChain] = key.split('_');

      if (
        kAddress === address &&
        kChain === chain &&
        Number(kNonceStr) < nonce &&
        pendingTx[key]
      ) {
        delete pendingTx[key];
      }
    }

    this.store.pendingTx = pendingTx;
  };
}

export default new TransactionWatcher();
