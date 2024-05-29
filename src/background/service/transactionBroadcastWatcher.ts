import { findChainByEnum, findChainByID } from '@/utils/chain';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import {
  openapiService,
  swapService,
  transactionWatchService,
} from 'background/service';
import { createPersistStore, isSameAddress } from 'background/utils';
import interval from 'interval-promise';
import { flatten } from 'lodash';
import { testnetOpenapiService } from './openapi';
import transactionHistory from './transactionHistory';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

interface WatcherItem {
  address: string;
  chainId: number;
  nonce: string;
  reqId: string;
}

interface TransactionBroadcastWatcherStore {
  pendingTx: Record<string, WatcherItem>;
}

class TransactionBroadcastWatcher {
  store!: TransactionBroadcastWatcherStore;
  timers = {};

  init = async () => {
    this.store = await createPersistStore<TransactionBroadcastWatcherStore>({
      name: 'transactionBroadcastWatcher',
      template: {
        pendingTx: {},
      },
    });
  };

  addTx = (reqId: string, data: WatcherItem) => {
    this.store.pendingTx = {
      ...this.store.pendingTx,
      [reqId]: data,
    };
  };

  updateTx = (id: string, data: Partial<WatcherItem>) => {
    const tx = this.store.pendingTx[id];
    if (!tx) {
      return;
    }
    Object.assign(tx, data);

    this.store.pendingTx = {
      ...this.store.pendingTx,
      [id]: tx,
    };
  };

  queryTxRequests = async () => {
    const list = Object.values(this.store.pendingTx);
    if (list.length <= 0) {
      return;
    }
    const { testnetList, mainnetList } = list.reduce(
      (res, item) => {
        const chainItem = findChainByID(item.chainId);

        if (chainItem?.isTestnet) {
          res.testnetList.push(item);
        } else {
          res.mainnetList.push(item);
        }
        return res;
      },
      { testnetList: [] as WatcherItem[], mainnetList: [] as WatcherItem[] }
    );

    const res = await Promise.all([
      [] as TxRequest[],
      mainnetList?.length
        ? openapiService
            .getTxRequests(mainnetList.map((item) => item.reqId))
            .catch(() => [] as TxRequest[])
        : ([] as TxRequest[]),
    ]);

    const addressList: string[] = [];
    flatten(res).forEach((item) => {
      if (
        item.is_finished ||
        item.is_withdraw ||
        (item.push_status === 'failed' && item.is_finished) ||
        item.tx_id
      ) {
        this.removeTx(item.id);
        transactionHistory.updateTxByTxRequest(item);
        addressList.push(item.signed_tx.from);
        if (item.tx_id) {
          const chain = findChainByID(item.signed_tx.chainId);
          if (chain) {
            swapService.postSwap(chain?.enum, item.tx_id, item.signed_tx);
          }
        }
      }
      if (item.tx_id) {
        const chain = findChainByID(item.signed_tx.chainId);
        if (!chain) {
          console.error('chain not found');
          return;
        }
        transactionWatchService.addTx(
          `${item.signed_tx.from}_${item.signed_tx.nonce}_${chain.enum}`,
          {
            nonce: item.signed_tx.nonce,
            hash: item.tx_id,
            chain: chain.enum,
          }
        );
      }
      if (addressList.length) {
        eventBus.emit(EVENTS.broadcastToUI, {
          method: EVENTS.RELOAD_TX,
          params: {
            addressList: addressList,
          },
        });
      }
    });
  };

  removeTx = (reqId: string) => {
    const pendingTx = { ...this.store.pendingTx };
    delete pendingTx[reqId];
    this.store.pendingTx = {
      ...pendingTx,
    };
  };

  // fetch pending txs status every 5s
  roll = () => {
    interval(async () => {
      this.queryTxRequests();
    }, 5000);
  };

  clearPendingTx = (address: string, chainId?: number) => {
    this.store.pendingTx = Object.entries(this.store.pendingTx).reduce(
      (m, [key, v]) => {
        if (!v) {
          return m;
        }
        const isSameAddr = isSameAddress(address, v.address);
        if (chainId ? +chainId === v.chainId && isSameAddr : isSameAddr) {
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
}

export const transactionBroadcastWatchService = new TransactionBroadcastWatcher();
