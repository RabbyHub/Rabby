import {
  openapiService,
  i18n,
  transactionHistoryService,
} from 'background/service';
import { createPersistStore, isSameAddress } from 'background/utils';
import { notification } from 'background/webapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { format } from '@/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import interval from 'interval-promise';
import { findChainByEnum } from '@/utils/chain';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';

class Transaction {
  createdTime = 0;

  constructor(
    public nonce: string,
    public chain: CHAINS_ENUM,
    public hash?: string,
    public reqId?: string
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
    {
      hash,
      chain,
      nonce,
      reqId,
    }: { hash?: string; chain: CHAINS_ENUM; nonce: string; reqId?: string }
  ) => {
    this.store.pendingTx = {
      ...this.store.pendingTx,
      [id]: new Transaction(nonce, chain, hash, reqId),
    };

    const chainItem = findChainByEnum(chain);
    if (!chainItem) {
      throw new Error(`[transactionWatcher::addTx] chain ${chain} not found`);
    }

    const url = format(chainItem.scanLink, hash);
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
    const chainItem = findChainByEnum(chain);
    if (!chainItem) {
      return;
    }

    if (hash) {
      return openapiService
        .ethRpc(chainItem.serverId, {
          method: 'eth_getTransactionReceipt',
          params: [hash],
        })
        .catch(() => null);
    }
  };

  // todo
  checkTxRequest = async (id: string) => {
    if (!this.store.pendingTx[id]) {
      return;
    }
    const { hash, chain, reqId, nonce } = this.store.pendingTx[id];
    if (!reqId || hash) {
      return;
    }
    const chainItem = findChainByEnum(chain);
    if (!chainItem) {
      throw new Error(`[transactionWatcher::notify] chain ${chain} not found`);
    }

    const [address] = id.split('_');
    const txGroup = transactionHistoryService.getTxGroup({
      address,
      nonce: Number(nonce),
      chainId: chainItem.id,
    });
    if (!txGroup) {
      this._removeTx(id);
      return;
    }

    const maxGasTx = findMaxGasTx(txGroup.txs);
    if (txGroup.isSubmitFailed || maxGasTx.isWithdrawed) {
      this._removeTx(id);
      return;
    }
    const isPendingBroadcast =
      txGroup.isPending &&
      !txGroup.isSubmitFailed &&
      !maxGasTx.isWithdrawed &&
      !maxGasTx.hash &&
      maxGasTx.reqId;
    if (isPendingBroadcast) {
      await transactionHistoryService.reloadTx(
        {
          address,
          nonce: Number(nonce),
          chainId: chainItem.id,
        },
        false
      );
    }
  };

  notify = async ({ id, txReceipt }: { id: string; txReceipt?: any }) => {
    if (!this.store.pendingTx[id]) {
      return;
    }
    const { hash, chain, nonce } = this.store.pendingTx[id];

    const chainItem = findChainByEnum(chain);
    if (!chainItem) {
      throw new Error(`[transactionWatcher::notify] chain ${chain} not found`);
    }

    const url = format(chainItem.scanLink, hash);
    const [address] = id.split('_');

    if (txReceipt) {
      await transactionHistoryService.reloadTx({
        address,
        nonce: Number(nonce),
        chainId: chainItem.id,
      });
    }

    const title =
      txReceipt?.status === '0x1'
        ? i18n.t('background.transactionWatcher.completed')
        : i18n.t('background.transactionWatcher.failed');

    notification.create(
      url,
      title,
      i18n.t('background.transactionWatcher.more'),
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
        this.checkTxRequest(id);
        const txReceipt = await this.checkStatus(id);

        if (txReceipt) {
          this.notify({
            id,
            txReceipt,
          });
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
        const [kAddress] = key.split('_');
        // keep pending txs of other addresses
        if (!isSameAddress(address, kAddress) && v) {
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
