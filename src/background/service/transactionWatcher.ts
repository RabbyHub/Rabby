import {
  openapiService,
  i18n,
  transactionHistoryService,
  RPCService,
} from 'background/service';
import { createPersistStore, isSameAddress } from 'background/utils';
import { notification } from 'background/webapi';
import { CHAINS_ENUM, EVENTS_IN_BG } from 'consts';
import { getTxScanLink } from '@/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import interval from 'interval-promise';
import { findChain, findChainByEnum } from '@/utils/chain';
import { customTestnetService } from './customTestnet';
import { Chain } from '@debank/common';

const DEFAULT_DURATION = 5000; // default 5 seconds
const MIN_DURATION = 2000; // minimum 2 seconds
const MAX_DURATION = 5000; // maximum 5 seconds

class Transaction {
  createdTime = 0;
  intervalDuration = DEFAULT_DURATION;

  constructor(
    public nonce: string,
    public hash: string,
    public chain: CHAINS_ENUM
  ) {
    this.createdTime = +new Date();
    const chainItem = findChain({ enum: chain });
    let intervalDuration = DEFAULT_DURATION;
    if (chainItem && (chainItem as Chain).blockInterval) {
      intervalDuration = Math.ceil(
        ((chainItem as Chain).blockInterval || 0) * 1000
      );
      // Ensure interval is between 2000 and 5000 ms
      intervalDuration = Math.max(
        MIN_DURATION,
        Math.min(intervalDuration, MAX_DURATION)
      );
    }
    this.intervalDuration = intervalDuration;
  }
}

interface TransactionWatcherStore {
  pendingTx: Record<string, Transaction>;
}

class TransactionWatcher {
  store!: TransactionWatcherStore;

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
    this.rollTx(id);
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

    const defaultRpc = RPCService.getDefaultRPC(chainItem.serverId);

    if (
      defaultRpc &&
      !RPCService.supportedRpcMethodByBE('eth_getTransactionReceipt')
    ) {
      return RPCService.requestDefaultRPC(
        chainItem.serverId,
        'eth_getTransactionReceipt',
        [hash]
      ).catch(() => null);
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
    let gasUsed: number | undefined;
    if (txReceipt) {
      gasUsed = await transactionHistoryService.reloadTx({
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
      params: { address, hash, gasUsed },
    });

    eventBus.emit(EVENTS_IN_BG.ON_TX_COMPLETED, {
      address,
      hash,
      status: txReceipt.status,
    });
  };

  // fetch pending txs status every 5s
  roll = () => {
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
    idQueue.forEach((id) => {
      this.rollTx(id);
    });
  };

  rollTx = (id: string) => {
    const tx = this.store.pendingTx[id];
    interval(async (times, stop) => {
      if (!this.store.pendingTx[id]) {
        stop();
        return;
      }
      const receipt = await this.queryTx(id);
      if (receipt) {
        stop();
        return;
      } else if (times > 10) {
        stop();
        this.store.pendingTx = {
          ...this.store.pendingTx,
          [id]: {
            ...tx,
            intervalDuration: Math.min(2 * tx.intervalDuration, 60000), // double the interval duration after 10 attempts
          },
        };
        this.rollTx(id);
      }
    }, tx.intervalDuration || DEFAULT_DURATION);
  };

  queryTx = async (id: string) => {
    try {
      const txReceipt = await this.checkStatus(id);

      if (txReceipt) {
        this.notify(id, txReceipt);
        this._removeTx(id);
        return txReceipt;
      }
      return null;
    } catch (error) {
      console.error(error);
    }
  };

  _removeTx = (id: string) => {
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

  removeLocalPendingTx = ({
    address,
    chainId,
    nonce,
  }: {
    address: string;
    chainId: number;
    nonce: number;
  }) => {
    this.store.pendingTx = Object.entries(this.store.pendingTx).reduce(
      (m, [key, v]) => {
        // address_chain_nonce
        const [kAddress, , _nonce] = key.split('_');
        const chainItem = findChainByEnum(v.chain);
        const isSameAddr = isSameAddress(address, kAddress);
        if (+chainId === chainItem?.id && isSameAddr && +_nonce === +nonce) {
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
        Number(kNonceStr) <= nonce &&
        pendingTx[key]
      ) {
        delete pendingTx[key];
      }
    }

    this.store.pendingTx = pendingTx;
  };
}

export default new TransactionWatcher();
