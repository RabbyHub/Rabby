import { createPersistStore } from 'background/utils';
import maxBy from 'lodash/maxBy';
import cloneDeep from 'lodash/cloneDeep';
import { Object as ObjectType } from 'ts-toolbelt';
import openapiService, {
  Tx,
  ExplainTxResponse,
  TxPushType,
  testnetOpenapiService,
  TxRequest,
} from './openapi';
import { CHAINS, INTERNAL_REQUEST_ORIGIN, CHAINS_ENUM, EVENTS } from 'consts';
import stats from '@/stats';
import permissionService, { ConnectedSite } from './permission';
import { nanoid } from 'nanoid';
import { findChainByID } from '@/utils/chain';
import { makeTransactionId } from '@/utils/transaction';
import {
  ActionRequireData,
  ParsedActionData,
} from '@/ui/views/Approval/components/Actions/utils';
import { sortBy, max, groupBy } from 'lodash';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import eventBus from '@/eventBus';
import { isManifestV3 } from '@/utils/env';
import browser from 'webextension-polyfill';
import { ALARMS_RELOAD_TX } from '../utils/alarms';

export interface TransactionHistoryItem {
  rawTx: Tx;
  createdAt: number;
  isCompleted: boolean;
  hash?: string;
  failed: boolean;
  gasUsed?: number;
  isSubmitFailed?: boolean;
  site?: ConnectedSite;

  pushType?: TxPushType;
  reqId?: string;
  isWithdrawed?: boolean;
  explain?: TransactionGroup['explain'];
  action?: TransactionGroup['action'];
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
  private _txHistoryLimit = 100;

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
      (item) => {
        return checkIsPendingTxGroup(item);
      }
    ).length;
  }

  getPendingTxsByNonce(address: string, chainId: number, nonce: number) {
    const normalizedAddress = address.toLowerCase();
    const pendingTxs = Object.values(
      this.store.transactions[normalizedAddress] || {}
    ).filter((item) => {
      return checkIsPendingTxGroup(item);
    });
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
    if (explain) {
      tx.explain = explain;
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

  addTx({
    tx,
    explain,
    actionData,
    origin,
    $ctx,
    isDropFailed = true,
  }: {
    tx: TransactionHistoryItem;
    explain: TransactionGroup['explain'];
    actionData: TransactionGroup['action'];
    origin: string;
    $ctx?: any;
    isDropFailed?: boolean;
  }) {
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

    if (explain) {
      tx.explain = explain;
    }
    if (actionData) {
      tx.action = actionData;
    }

    if (!this.store.transactions[from]) {
      this.store.transactions[from] = {};
    }

    const addNewTxGroup = () => {
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
    };

    if (this.store.transactions[from][key]) {
      const group = this.store.transactions[from][key];
      const maxGasTx = findMaxGasTx(group.txs);
      const isFailed = group.isSubmitFailed || maxGasTx?.isWithdrawed;

      if (isDropFailed && isFailed) {
        addNewTxGroup();
      } else {
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
      }
    } else {
      addNewTxGroup();
    }

    this.clearAllExpiredTxs();

    // this.removeExplainCache(`${from.toLowerCase()}-${chainId}-${nonce}`);
  }

  updateSingleTx(tx: TransactionHistoryItem) {
    const nonce = Number(tx.rawTx.nonce);
    const chainId = tx.rawTx.chainId;
    const key = `${chainId}-${nonce}`;
    const from = tx.rawTx.from.toLowerCase();
    const target = this.store.transactions[from][key];
    if (!this.store.transactions[from] || !target) return;
    const index = target.txs.findIndex(
      (t) => (t.hash && t.hash === tx.hash) || (t.reqId && t.reqId === tx.reqId)
    );

    if (index === -1) {
      return;
    }

    target.txs[index] = tx;
    this._setStoreTransaction({
      ...this.store.transactions,
      [from]: {
        ...this.store.transactions[from],
        [key]: target,
      },
    });
  }

  updateTxByTxRequest = (txRequest: TxRequest) => {
    const { chainId, from } = txRequest.signed_tx;
    const nonce = txRequest.nonce;

    const key = `${chainId}-${nonce}`;
    const address = from.toLowerCase();

    console.log('TxRequest', txRequest);
    const group = this.store.transactions[address][key];
    console.log('group', group);
    if (!this.store.transactions[address] || !group) {
      return;
    }

    const tx = group.txs.find(
      (item) => item.reqId && item.reqId === txRequest.id
    );
    console.log(tx);
    if (!tx) {
      return;
    }

    const isSubmitFailed =
      txRequest.push_status === 'failed' && txRequest.is_finished;

    this.updateSingleTx({
      ...tx,
      hash: txRequest.tx_id || undefined,
      isWithdrawed:
        txRequest.is_withdraw ||
        (txRequest.is_finished && !txRequest.tx_id && !txRequest.push_status),
      isSubmitFailed: isSubmitFailed,
    });
    const target = this.store.transactions[from][key];
    const maxGasTx = findMaxGasTx(target.txs);
    if (maxGasTx.isSubmitFailed) {
      target.isSubmitFailed = isSubmitFailed;
      this._setStoreTransaction({
        ...this.store.transactions,
        [from]: {
          ...this.store.transactions[from],
          [key]: target,
        },
      });
    }
  };

  reloadTxRequest = async ({
    address,
    chainId,
    nonce,
  }: {
    address: string;
    chainId: number;
    nonce: number;
  }) => {
    const key = `${chainId}-${nonce}`;
    const from = address.toLowerCase();
    const target = this.store.transactions[from][key];
    const chain = Object.values(CHAINS).find((c) => c.id === chainId)!;
    console.log('reloadTxRequest', target);
    if (!target) {
      return;
    }
    const { txs } = target;
    const unbroadcastedTxs = txs.filter(
      (tx) =>
        tx && tx.reqId && !tx.hash && !tx.isSubmitFailed && !tx.isWithdrawed
    ) as (TransactionHistoryItem & { reqId: string })[];

    console.log('reloadTxRequest', unbroadcastedTxs);
    if (unbroadcastedTxs.length) {
      const openapi = chain?.isTestnet ? testnetOpenapiService : openapiService;
      await openapi
        .getTxRequests(unbroadcastedTxs.map((tx) => tx.reqId))
        .then((res) => {
          res.forEach((item, index) => {
            this.updateTxByTxRequest(item);

            eventBus.emit(EVENTS.broadcastToUI, {
              method: EVENTS.RELOAD_TX,
              params: {
                addressList: [address],
              },
            });
          });
        })
        .catch((e) => console.error(e));
    }
  };

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
    const target = this.store.transactions[from]?.[key];
    const chain = Object.values(CHAINS).find((c) => c.id === chainId)!;
    if (!target) return;
    const { txs } = target;

    const broadcastedTxs = txs.filter(
      (tx) => tx && tx.hash && !tx.isSubmitFailed && !tx.isWithdrawed
    ) as (TransactionHistoryItem & { hash: string })[];

    try {
      const results = await Promise.all(
        broadcastedTxs.map((tx) =>
          openapiService.getTx(
            chain.serverId,
            tx.hash!,
            Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
          )
        )
      );
      const completed = results.find(
        (result) => result.code === 0 && result.status !== 0
      );
      if (!completed) {
        if (duration !== false && duration < 1000 * 15) {
          const timeout = Number(duration) + 1000;
          // maximum retry 15 times;
          if (isManifestV3) {
            browser.alarms.create(ALARMS_RELOAD_TX, {
              delayInMinutes: timeout / 60000,
            });
            browser.alarms.onAlarm.addListener((alarm) => {
              if (alarm.name === ALARMS_RELOAD_TX) {
                this.reloadTx({ address, chainId, nonce });
              }
            });
          } else {
            setTimeout(() => {
              this.reloadTx({ address, chainId, nonce });
            }, timeout);
          }
        }
        return;
      }
      const completedTx = txs.find((tx) => tx.hash === completed.hash)!;
      this.updateSingleTx({
        ...completedTx,
        gasUsed: completed.gas_used,
      });
      // TOFIX
      this.completeTx({
        address,
        chainId,
        nonce,
        hash: completedTx.hash,
        success: completed.status === 1,
        reqId: completedTx.reqId,
      });
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.RELOAD_TX,
        params: {
          addressList: [address],
        },
      });
    } catch (e) {
      if (duration !== false && duration < 1000 * 15) {
        const timeout = Number(duration) + 1000;
        // maximum retry 15 times;
        if (isManifestV3) {
          browser.alarms.create(ALARMS_RELOAD_TX, {
            delayInMinutes: timeout / 60000,
          });
          browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === ALARMS_RELOAD_TX) {
              this.reloadTx({ address, chainId, nonce });
            }
          });
        } else {
          setTimeout(() => {
            this.reloadTx({ address, chainId, nonce });
          }, timeout);
        }
      }
    }
  }

  /**
   * @deprecated
   * @param address
   * @returns
   */
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
      if (checkIsPendingTxGroup(list[i])) {
        pendings.push(list[i]);
      } else {
        completeds.push(list[i]);
      }
      // if (list[i].isPending && !list[i].isSubmitFailed) {
      //   pendings.push(list[i]);
      // } else {
      //   completeds.push(list[i]);
      // }
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
    reqId,
  }: {
    address: string;
    chainId: number;
    nonce: number;
    hash?: string;
    reqId?: string;
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
    const index = target.txs.findIndex(
      (tx) => (tx.hash && tx.hash === hash) || (tx.reqId && tx.reqId === reqId)
    );
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

  /**
   * @description clear expired txs, keep this.txHistoryLimit 100 compoleted transactions
   */
  clearAllExpiredTxs() {
    const transactionGroups: {
      address: string;
      key: string;
      value: TransactionGroup;
    }[] = [];

    Object.entries(this.store.transactions).map(([address, record]) => {
      Object.entries(record).map(([key, value]) => {
        const isPending = checkIsPendingTxGroup(value);
        if (isPending) {
          return;
        }
        transactionGroups.push({
          address,
          key: key,
          value,
        });
      });
    });

    const txsToDelete = sortBy(
      transactionGroups,
      (item) => item.value.createdAt
    )
      .reverse()
      .slice(this._txHistoryLimit);

    const transactions = this.store.transactions;
    txsToDelete.forEach((item) => {
      delete transactions[item.address][item.key];
    });
    this._setStoreTransaction(transactions);
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
      list.filter((item) => {
        const maxGasTx = findMaxGasTx(item.txs);
        return (
          item.chainId === chainId &&
          !item.isSubmitFailed &&
          !maxGasTx?.isWithdrawed
        );
      }),
      (item) => item.nonce
    );

    const firstSigningTx = this._signingTxList.find((item) => {
      return item.rawTx.chainId === chainId && !item.isSubmitted;
    });
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

  getSkipedTxs(address: string) {
    const dict = groupBy(
      Object.values(this.store.transactions[address.toLowerCase()] || {}),
      (item) => item.chainId
    );

    return Object.entries(dict).reduce((res, [key, list]) => {
      const maxNonce =
        maxBy(
          list.filter((item) => {
            const maxGasTx = findMaxGasTx(item.txs);
            return !item.isSubmitFailed && !maxGasTx?.isWithdrawed;
          }),
          (item) => item.nonce
        )?.nonce || 0;

      res[key] = sortBy(
        list.filter(
          (item) =>
            item.nonce < maxNonce && findMaxGasTx(item.txs)?.isWithdrawed
        ),
        (item) => -item.nonce
      );

      return res;
    }, {} as Record<string, TransactionGroup[]>);
  }

  quickCancelTx = async ({
    address,
    chainId,
    nonce,
    reqId,
  }: {
    address: string;
    chainId: number;
    nonce: number;
    reqId: string;
  }) => {
    const chain = findChainByID(chainId);
    const service = chain?.isTestnet ? testnetOpenapiService : openapiService;
    let error: any = null;
    try {
      await service.withdrawTx(reqId);
    } catch (e) {
      error = e;
    }
    this.reloadTxRequest({ address, chainId, nonce });
    if (error) {
      throw error;
    }
  };

  retryPushTx = async ({
    address,
    chainId,
    nonce,
    reqId,
  }: {
    address: string;
    chainId: number;
    nonce: number;
    reqId: string;
  }) => {
    const chain = findChainByID(chainId);
    const service = chain?.isTestnet ? testnetOpenapiService : openapiService;
    try {
      await service.retryPushTx(reqId);
      this.reloadTxRequest({ address, chainId, nonce });
    } catch (e) {
      this.reloadTxRequest({ address, chainId, nonce });
      throw e;
    }
  };

  getTxGroup = ({
    address,
    chainId,
    nonce,
  }: {
    address: string;
    chainId: number;
    nonce: number;
  }) => {
    const key = `${chainId}-${nonce}`;
    const normalizedAddress = address.toLowerCase();
    const target = this.store.transactions[normalizedAddress][key];
    if (!target) return null;
    return target;
  };
}

export default new TxHistory();
