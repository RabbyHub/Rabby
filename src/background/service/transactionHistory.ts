import { createPersistStore } from 'background/utils';
import maxBy from 'lodash/maxBy';
import cloneDeep from 'lodash/cloneDeep';
import { Object as ObjectType } from 'ts-toolbelt';
import openapiService, { Tx, ExplainTxResponse } from './openapi';
import { CHAINS, INTERNAL_REQUEST_ORIGIN, CHAINS_ENUM } from 'consts';
import stats from '@/stats';
import permissionService, { ConnectedSite } from './permission';
import { nanoid } from 'nanoid';
import { findChainByID } from '@/utils/chain';
import { makeTransactionId } from '@/utils/transaction';
import {
  ActionRequireData,
  ParsedActionData,
} from '@/ui/views/Approval/components/Actions/utils';

export interface TransactionHistoryItem {
  rawTx: Tx;
  createdAt: number;
  isCompleted: boolean;
  hash: string;
  failed: boolean;
  gasUsed?: number;
  isSubmitFailed?: boolean;
  site?: ConnectedSite;
}

export interface TransactionSigningItem {
  rawTx: Tx;
  explain?: ObjectType.Merge<
    ExplainTxResponse,
    { approvalId: string; calcSuccess: boolean }
  >;
  action?: {
    actionData: ParsedActionData;
    requiredData: ActionRequireData;
  };
  id: string;
  isSubmitted?: boolean;
}

export interface TransactionGroup {
  chainId: number;
  nonce: number;
  txs: TransactionHistoryItem[];
  isPending: boolean;
  createdAt: number;
  explain: ObjectType.Merge<
    ExplainTxResponse,
    { approvalId: string; calcSuccess: boolean }
  >;
  action?: {
    actionData: ParsedActionData;
    requiredData: ActionRequireData;
  };
  isFailed: boolean;
  isSubmitFailed?: boolean;
  $ctx?: any;
}

interface TxHistoryStore {
  transactions: {
    [addr: string]: Record<string, TransactionGroup>;
  };
}

class TxHistory {
  /**
   * @description notice, always set store.transactions by calling `_setStoreTransaction`
   */
  store!: TxHistoryStore;

  private _signingTxList: TransactionSigningItem[] = [];
  private _availableTxs: TxHistory['store']['transactions'] = {};

  addSigningTx(tx: Tx) {
    const id = nanoid();

    this._signingTxList.push({
      rawTx: tx,
      id,
    });

    return id;
  }

  getSigningTx(id: string) {
    return this._signingTxList.find((item) => item.id === id);
  }

  removeSigningTx(id: string) {
    this._signingTxList = this._signingTxList.filter((item) => item.id !== id);
  }

  removeAllSigningTx() {
    this._signingTxList = [];
  }

  updateSigningTx(
    id: string,
    data: {
      explain?: Partial<TransactionSigningItem['explain']>;
      rawTx?: Partial<TransactionSigningItem['rawTx']>;
      action?: {
        actionData: ParsedActionData;
        requiredData: ActionRequireData;
      };
      isSubmitted?: boolean;
    }
  ) {
    const target = this._signingTxList.find((item) => item.id === id);
    if (target) {
      target.rawTx = {
        ...target.rawTx,
        ...data.rawTx,
      };
      target.explain = {
        ...target.explain,
        ...data.explain,
      } as TransactionSigningItem['explain'];
      if (data.action) {
        target.action = data.action;
      }
      target.isSubmitted = data.isSubmitted;
    }
  }

  async init() {
    this.store = await createPersistStore<TxHistoryStore>({
      name: 'txHistory',
      template: {
        transactions: {},
      },
    });
    if (!this.store.transactions) this.store.transactions = {};

    this._populateAvailableTxs();
  }

  private _populateAvailableTxs() {
    const { actualTxs } = this.filterOutTxDataOnBootstrap();
    this._availableTxs = actualTxs;

    // // leave here for test robust
    // this._availableTxs = this.store.transactions;
  }

  private _setStoreTransaction(input: typeof this.store.transactions) {
    this.store.transactions = input;

    this._populateAvailableTxs();
  }

  filterOutTxDataOnBootstrap() {
    const deprecatedTxs = ({} as any) as typeof this.store.transactions;
    const actualTxs = cloneDeep({ ...this.store.transactions });
    const pendingTxIdsToRemove: string[] = [];

    Object.entries({ ...actualTxs }).forEach(([addr, txGroup]) => {
      const dtxGroup = {
        ...deprecatedTxs[addr],
      } as typeof txGroup;
      let changed = false;
      Object.entries(txGroup).forEach(([tid, item]) => {
        if (!findChainByID(item.chainId)) {
          changed = true;
          dtxGroup[tid] = item;
          delete txGroup[tid];
        }
      });
      if (changed) deprecatedTxs[addr] = dtxGroup;
    });

    Object.entries(deprecatedTxs).forEach(([addr, txGroup]) => {
      Object.values(txGroup).forEach((txData) => {
        const siteChain = txData.txs.find((item) => item.site?.chain)?.site
          ?.chain;
        if (!siteChain) return;
        pendingTxIdsToRemove.push(
          makeTransactionId(addr, txData.nonce, siteChain)
        );
      });
    });

    return {
      actualTxs,
      deprecatedTransactions: deprecatedTxs,
      pendingTxIdsToRemove,
    };
  }

  getPendingCount(address: string) {
    const normalizedAddress = address.toLowerCase();
    return Object.values(this._availableTxs[normalizedAddress] || {}).filter(
      (item) => item.isPending && !item.isSubmitFailed
    ).length;
  }

  getPendingTxsByNonce(address: string, chainId: number, nonce: number) {
    const normalizedAddress = address.toLowerCase();
    const pendingTxs = Object.values(
      this.store.transactions[normalizedAddress] || {}
    ).filter((item) => item.isPending && !item.isSubmitFailed);
    return pendingTxs.filter(
      (item) => item.nonce === nonce && item.chainId === chainId
    );
  }

  addSubmitFailedTransaction(
    tx: TransactionHistoryItem,
    explain: TransactionGroup['explain'],
    origin: string
  ) {
    const nonce = Number(tx.rawTx.nonce);
    const chainId = tx.rawTx.chainId;
    const key = `${chainId}-${nonce}`;
    const from = tx.rawTx.from.toLowerCase();

    if (origin === INTERNAL_REQUEST_ORIGIN) {
      const site = {
        origin: INTERNAL_REQUEST_ORIGIN,
        icon: '',
        name: 'Rabby Wallet',
        chain: CHAINS_ENUM.ETH,
        isSigned: false,
        isTop: false,
        isConnected: true,
      };
      tx.site = site;
    } else {
      const site = permissionService.getConnectedSite(origin);
      tx.site = site;
    }

    if (!this.store.transactions[from]) {
      this.store.transactions[from] = {};
    }
    if (this.store.transactions[from][key]) {
      const group = this.store.transactions[from][key];
      group.txs.push(tx);
      this._setStoreTransaction({
        ...this.store.transactions,
        [from]: {
          ...this.store.transactions[from],
          [key]: group,
        },
      });
    } else {
      this._setStoreTransaction({
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
            isSubmitFailed: true,
          },
        },
      });
    }
  }

  addTx(
    tx: TransactionHistoryItem,
    explain: TransactionGroup['explain'],
    actionData: TransactionGroup['action'],
    origin: string,
    $ctx?: any
  ) {
    const nonce = Number(tx.rawTx.nonce);
    const chainId = tx.rawTx.chainId;
    const key = `${chainId}-${nonce}`;
    const from = tx.rawTx.from.toLowerCase();
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      const site = {
        origin: INTERNAL_REQUEST_ORIGIN,
        icon: '',
        name: 'Rabby Wallet',
        chain: CHAINS_ENUM.ETH,
        isSigned: false,
        isTop: false,
        isConnected: true,
      };
      tx.site = site;
    } else {
      const site = permissionService.getConnectedSite(origin);
      tx.site = site;
    }

    if (!this.store.transactions[from]) {
      this.store.transactions[from] = {};
    }
    if (this.store.transactions[from][key]) {
      const group = this.store.transactions[from][key];
      group.txs.push(tx);
      if (group.isSubmitFailed) {
        group.isSubmitFailed = false;
      }
      this._setStoreTransaction({
        ...this.store.transactions,
        [from]: {
          ...this.store.transactions[from],
          [key]: group,
        },
      });
    } else {
      this._setStoreTransaction({
        ...this.store.transactions,
        [from]: {
          ...this.store.transactions[from],
          [key]: {
            chainId: tx.rawTx.chainId,
            nonce,
            txs: [tx],
            createdAt: tx.createdAt,
            isPending: true,
            explain,
            action: actionData,
            isFailed: false,
            $ctx,
          },
        },
      });
    }

    // this.removeExplainCache(`${from.toLowerCase()}-${chainId}-${nonce}`);
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
    this._setStoreTransaction({
      ...this.store.transactions,
      [from]: {
        ...this.store.transactions[from],
        [key]: target,
      },
    });
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
    duration: number | boolean = 0
  ) {
    const key = `${chainId}-${nonce}`;
    const from = address.toLowerCase();
    const target = this.store.transactions[from][key];
    const chain = Object.values(CHAINS).find((c) => c.id === chainId)!;
    if (!target) return;
    const { txs } = target;
    try {
      const results = await Promise.all(
        txs
          .filter((tx) => !!tx)
          .filter((tx) => !tx.isSubmitFailed)
          .map((tx) =>
            openapiService.getTx(
              chain.serverId,
              tx.hash,
              Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
            )
          )
      );
      const completed = results.find(
        (result) => result.code === 0 && result.status !== 0
      );
      if (!completed) {
        if (duration !== false && duration < 1000 * 15) {
          // maximum retry 15 times;
          setTimeout(() => {
            this.reloadTx({ address, chainId, nonce });
          }, Number(duration) + 1000);
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
      if (duration !== false && duration < 1000 * 15) {
        // maximum retry 15 times;
        setTimeout(() => {
          this.reloadTx({ address, chainId, nonce });
        }, Number(duration) + 1000);
      }
    }
  }

  async loadPendingListQueue(address) {
    const { pendings: pendingList } = await this.getList(address);

    const pendingListByChain = pendingList.reduce<
      Record<number, TransactionGroup[]>
    >((acc, cur) => {
      const chainId = cur.chainId;
      if (!acc[chainId]) {
        acc[chainId] = [];
      }
      acc[chainId].push(cur);
      return acc;
    }, {});

    await Promise.all(
      Object.keys(pendingListByChain).map(async (chainId) => {
        const list = pendingListByChain[Number(chainId)].reverse();

        for (const tx of list) {
          try {
            await this.reloadTx(
              {
                address,
                chainId: tx.chainId,
                nonce: tx.nonce,
              },
              false // don't retry
            );
          } catch (e) {
            console.error(e);
          }
        }
      })
    );

    return (await this.getList(address)).pendings;
  }

  getList(address: string) {
    const list = Object.values(this._availableTxs[address.toLowerCase()] || {});

    const pendings: TransactionGroup[] = [];
    const completeds: TransactionGroup[] = [];
    if (!list) return { pendings: [], completeds: [] };
    for (let i = 0; i < list.length; i++) {
      if (list[i].isPending && !list[i].isSubmitFailed) {
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
        return b.createdAt - a.createdAt;
      }),
    };
  }

  removeList(address: string) {
    const normalizedAddress = address.toLowerCase();
    delete this.store.transactions[normalizedAddress];
    this._setStoreTransaction({
      ...this.store.transactions,
    });
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
    if (!target.isPending) {
      return;
    }
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
    this._setStoreTransaction({
      ...this.store.transactions,
      [normalizedAddress]: {
        ...this.store.transactions[normalizedAddress],
        [key]: target,
      },
    });
    const chain = Object.values(CHAINS).find(
      (item) => item.id === Number(target.chainId)
    );
    if (chain) {
      stats.report('completeTransaction', {
        chainId: chain.serverId,
        success,
        preExecSuccess:
          target.explain.pre_exec.success && target.explain.calcSuccess,
        createBy: target?.$ctx?.ga ? 'rabby' : 'dapp',
        source: target?.$ctx?.ga?.source || '',
        trigger: target?.$ctx?.ga?.trigger || '',
      });
    }
    this.clearBefore({ address, chainId, nonce });
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
    // const copyExplain = this.store.cacheExplain;
    for (const k in copyHistory) {
      const t = copyHistory[k];
      if (t.chainId === chainId && t.nonce < nonce && t.isPending) {
        delete copyHistory[k];
      }
    }
    // for (const k in copyExplain) {
    //   const [addr, cacheChainId, cacheNonce] = k.split('-');
    //   if (
    //     addr.toLowerCase() === normalizedAddress &&
    //     Number(cacheChainId) === chainId &&
    //     Number(cacheNonce) < nonce
    //   ) {
    //     delete copyExplain[k];
    //   }
    // }
    this._setStoreTransaction({
      ...this.store.transactions,
      [normalizedAddress]: copyHistory,
    });
    this._populateAvailableTxs();
    // this.store.cacheExplain = copyExplain;
  }

  clearPendingTransactions(address: string) {
    const transactions = this.store.transactions[address.toLowerCase()];
    if (!transactions) return;
    this._setStoreTransaction({
      ...this.store.transactions,
      [address.toLowerCase()]: Object.values(transactions)
        .filter((transaction) => !transaction.isPending)
        .reduce((res, current) => {
          return {
            ...res,
            [`${current.chainId}-${current.nonce}`]: current,
          };
        }, {}),
    });
  }

  getPendingTxByHash(hash: string) {
    for (const address in this.store.transactions) {
      const addressTxMap = this.store.transactions[address];
      for (const id in addressTxMap) {
        const txGroup = addressTxMap[id];
        if (txGroup.isPending) {
          const target = txGroup.txs.find((tx) => tx.hash === hash);
          if (target) return target;
        }
      }
    }
    return null;
  }

  getNonceByChain(address: string, chainId: number) {
    const list = Object.values(
      this.store.transactions[address.toLowerCase()] || {}
    );
    const maxNonceTx = maxBy(
      list.filter((item) => item.chainId === chainId && !item.isSubmitFailed),
      (item) => item.nonce
    );

    const firstSigningTx = this._signingTxList.find(
      (item) => item.rawTx.chainId === chainId && !item.isSubmitted
    );
    const processingTx = this._signingTxList.find(
      (item) => item.rawTx.chainId === chainId && item.isSubmitted
    );

    if (!maxNonceTx) return null;

    const maxLocalNonce = maxNonceTx.nonce;
    const firstSigningNonce =
      parseInt(firstSigningTx?.rawTx.nonce ?? '0', 0) ?? 0;
    const processingNonce = parseInt(processingTx?.rawTx.nonce ?? '0', 0) ?? 0;

    const maxLocalOrProcessingNonce = Math.max(maxLocalNonce, processingNonce);

    if (maxLocalOrProcessingNonce < firstSigningNonce) {
      return firstSigningNonce;
    }

    return maxLocalOrProcessingNonce + 1;
  }
}

export default new TxHistory();
