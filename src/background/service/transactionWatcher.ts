import {
  openapiService,
  i18n,
  transactionHistoryService,
} from 'background/service';
import { createPersistStore, isSameAddress } from 'background/utils';
import { notification } from 'background/webapi';
import { CHAINS, CHAINS_ENUM, EVENTS_IN_BG } from 'consts';
import { format, getTxScanLink } from '@/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import interval from 'interval-promise';
import { findChain, findChainByEnum } from '@/utils/chain';
import { customTestnetService } from './customTestnet';

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

    const chainItem = findChainByEnum(chain);
    if (!chainItem) {
      throw new Error(`[transactionWatcher::addTx] chain ${chain} not found`);
    }

    const url = getTxScanLink(chainItem.scanLink, hash);
    // notification.create(
    //   url,
    //   i18n.t('background.transactionWatcher.submitted'),
    //   i18n.t('background.transactionWatcher.more')
    // );
  };

  checkStatus = async (id: string) => {
    if (!this.store.pendingTx[id]) {
      return;
    }
    const { hash, chain } = this.store.pendingTx[id];
    const chainItem = findChain({ enum: chain });
    if (!chainItem) {
      return;
    }

    if (chainItem.isTestnet) {
      return customTestnetService
        .getTransactionReceipt({
          chainId: chainItem.id,
          hash,
        })
        .catch(() => null);
    }

    return openapiService
      .ethRpc(chainItem.serverId, {
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

    const chainItem = findChain({ enum: chain });
    if (!chainItem) {
      throw new Error(`[transactionWatcher::notify] chain ${chain} not found`);
    }

    const url = getTxScanLink(chainItem.scanLink, hash);
    const [address] = id.split('_');

    if (txReceipt) {
      await transactionHistoryService.reloadTx({
        address,
        nonce: Number(nonce),
        chainId: chainItem.id,
      });
    }

    const title =
      txReceipt.status === '0x1'
        ? i18n.t('background.transactionWatcher.completed')
        : i18n.t('background.transactionWatcher.failed');

    const content =
      txReceipt.status === '0x1'
        ? i18n.t('background.transactionWatcher.txCompleteMoreContent', {
            chain: chainItem.name,
            nonce: Number(nonce),
          })
        : i18n.t('background.transactionWatcher.txFailedMoreContent', {
            chain: chainItem.name,
            nonce: Number(nonce),
          });

    notification.create(url, title, content, 2);

    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.TX_COMPLETED,
      params: { address, hash },
    });

    eventBus.emit(EVENTS_IN_BG.ON_TX_COMPLETED, {
      address,
      hash,
      status: txReceipt.status,
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

  clearPendingTx = (address: string, chainId?: number) => {
    this.store.pendingTx = Object.entries(this.store.pendingTx).reduce(
      (m, [key, v]) => {
        // address_chain_nonce
        const [kAddress] = key.split('_');
        const chainItem = findChainByEnum(v.chain);
        const isSameAddr = isSameAddress(address, kAddress);
        if (chainId ? +chainId === chainItem?.id && isSameAddr : isSameAddr) {
          return m;
        }
        // keep pending txs of other addresses
        if (v) {
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
        isSameAddress(kAddress, address) &&
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
