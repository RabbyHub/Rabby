import { createPersistStore, isSameAddress } from 'background/utils';
import maxBy from 'lodash/maxBy';
import cloneDeep from 'lodash/cloneDeep';
import { Object as ObjectType } from 'ts-toolbelt';
import openapiService, {
  Tx,
  ExplainTxResponse,
  TxPushType,
  testnetOpenapiService,
  TxRequest,
  TokenItem,
  NFTItem,
  BridgeHistory,
} from './openapi';
import { INTERNAL_REQUEST_ORIGIN, CHAINS_ENUM, EVENTS } from 'consts';
import stats from '@/stats';
import permissionService, { ConnectedSite } from './permission';
import { nanoid } from 'nanoid';
import { findChain, findChainByID } from '@/utils/chain';
import { makeTransactionId } from '@/utils/transaction';
import { sortBy, groupBy } from 'lodash';
import {
  checkIsPendingTxGroup,
  checkIsSubmittedTxGroup,
  findMaxGasTx,
} from '@/utils/tx';
import eventBus from '@/eventBus';
import { customTestnetService } from './customTestnet';
import {
  ActionRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { RPCService, uninstalledService } from '.';

export interface TransactionHistoryItem {
  rawTx: Tx;
  createdAt: number;
  isCompleted: boolean;
  completedAt?: number;
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
    actionData: ParsedTransactionActionData;
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
  completedAt?: number;
  explain?: ObjectType.Merge<
    ExplainTxResponse,
    { approvalId: string; calcSuccess: boolean }
  >;
  action?: {
    actionData: ParsedTransactionActionData;
    requiredData: ActionRequireData;
  };
  isFailed: boolean;
  isSubmitFailed?: boolean;
  $ctx?: any;
}

export interface BridgeTxHistoryItem {
  address: string;
  fromChainId: number;
  toChainId: number;
  fromToken: TokenItem;
  toToken: TokenItem;
  slippage: number;
  fromAmount: number;
  toAmount: number; // quote est amount
  dexId: string;
  status: 'pending' | 'fromSuccess' | 'fromFailed' | 'allSuccess' | 'failed';
  hash: string;
  acceleratedHash?: string;
  estimatedDuration: number; // ms from server
  createdAt: number;
  fromTxCompleteTs?: number;
  actualToToken?: TokenItem; // actual token, may be not toToken
  actualToAmount?: number; // actual amount
  completedAt?: number;
}

export interface SwapTxHistoryItem {
  address: string;
  chainId: number;
  fromToken: TokenItem;
  toToken: TokenItem;
  slippage: number;
  fromAmount: number;
  toAmount: number;
  dexId: string;
  status: 'pending' | 'success' | 'failed';
  hash: string;
  createdAt: number;
  completedAt?: number;
}

export interface SendTxHistoryItem {
  address: string;
  chainId: number;
  from: string;
  to: string;
  token: TokenItem;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  hash: string;
  createdAt: number;
  completedAt?: number;
}

export interface SendNftTxHistoryItem {
  address: string;
  chainId: number;
  from: string;
  to: string;
  token: NFTItem;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  hash: string;
  createdAt: number;
  completedAt?: number;
}

export interface ApproveTokenTxHistoryItem {
  address: string;
  chainId: number;
  amount: number;
  token: TokenItem;
  status: 'pending' | 'success' | 'failed';
  hash: string;
  createdAt: number;
  completedAt?: number;
}

type InnerTxHistoryMap = {
  swap: SwapTxHistoryItem;
  send: SendTxHistoryItem;
  bridge: BridgeTxHistoryItem;
  sendNft: SendNftTxHistoryItem;
  approveSwap: ApproveTokenTxHistoryItem;
  approveBridge: ApproveTokenTxHistoryItem;
};

interface TxHistoryStore {
  transactions: {
    [addr: string]: Record<string, TransactionGroup>;
  };
  swapTxHistory: SwapTxHistoryItem[];
  sendTxHistory: SendTxHistoryItem[];
  sendNftTxHistory: SendNftTxHistoryItem[];
  bridgeTxHistory: BridgeTxHistoryItem[];
  approveSwapTxHistory: InnerTxHistoryMap['approveSwap'][];
  approveBridgeTxHistory: InnerTxHistoryMap['approveBridge'][];
}

interface CacheHistoryData {
  [key: string]: {
    [K in keyof InnerTxHistoryMap]: {
      type: K;
      data: Omit<InnerTxHistoryMap[K], 'hash'>;
    };
  }[keyof InnerTxHistoryMap];
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
    uninstalledService.setTx();

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
        actionData: ParsedTransactionActionData;
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
      if (target.explain || data.explain) {
        target.explain = {
          ...target.explain,
          ...data.explain,
        } as TransactionSigningItem['explain'];
      }
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
        swapTxHistory: [],
        sendTxHistory: [],
        bridgeTxHistory: [],
        sendNftTxHistory: [],
        approveSwapTxHistory: [],
        approveBridgeTxHistory: [],
      },
    });

    if (!Array.isArray(this.store.swapTxHistory)) {
      this.store.swapTxHistory = [];
    }

    if (!Array.isArray(this.store.sendTxHistory)) {
      this.store.sendTxHistory = [];
    }

    if (!Array.isArray(this.store.bridgeTxHistory)) {
      this.store.bridgeTxHistory = [];
    }

    if (!this.store.transactions) this.store.transactions = {};

    // Clear cache on initialization
    this.cacheHistoryData = {};

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

  cacheHistoryData: CacheHistoryData = {};

  addCacheHistoryData<K extends keyof InnerTxHistoryMap>(
    key: string, //`${chain}-${tx.data}`;
    data: Omit<InnerTxHistoryMap[K], 'hash'>,
    type: K
  ) {
    this.cacheHistoryData[key] = {
      data,
      type,
    } as CacheHistoryData[string];
  }

  postCacheHistoryData(key: string, txHash: string) {
    if (this.cacheHistoryData[key]) {
      const { data, type } = this.cacheHistoryData[key];
      if (!data) return;
      delete this.cacheHistoryData[key];

      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.INNER_HISTORY_ITEM_PENDING,
        params: {
          type,
          key,
          txHash,
        },
      });

      if (type === 'swap') {
        this.addSwapTxHistory({
          ...(data as SwapTxHistoryItem),
          hash: txHash,
        });
      }

      if (type === 'send') {
        this.addSendTxHistory({
          ...(data as SendTxHistoryItem),
          hash: txHash,
        });
      }

      if (type === 'bridge') {
        this.addBridgeTxHistory({
          ...(data as BridgeTxHistoryItem),
          hash: txHash,
        });
      }

      if (type === 'sendNft') {
        this.addSendNftTxHistory({
          ...(data as SendNftTxHistoryItem),
          hash: txHash,
        });
      }

      if (type === 'approveSwap') {
        this.addApproveSwapTokenTxHistory({
          ...(data as InnerTxHistoryMap['approveSwap']),
          hash: txHash,
        });
      }
      if (type === 'approveBridge') {
        this.addApproveBridgeTokenTxHistory({
          ...(data as InnerTxHistoryMap['approveBridge']),
          hash: txHash,
        });
      }
    }
  }

  addApproveSwapTokenTxHistory(tx: InnerTxHistoryMap['approveSwap']) {
    this.store.approveSwapTxHistory = [...this.store.approveSwapTxHistory, tx]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  }

  addApproveBridgeTokenTxHistory(tx: InnerTxHistoryMap['approveBridge']) {
    this.store.approveBridgeTxHistory = [
      ...this.store.approveBridgeTxHistory,
      tx,
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  }

  addSwapTxHistory(tx: SwapTxHistoryItem) {
    this.store.swapTxHistory = [...this.store.swapTxHistory, tx]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  }

  addSendTxHistory(tx: SendTxHistoryItem) {
    this.store.sendTxHistory = [...this.store.sendTxHistory, tx]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 500);
  }

  addBridgeTxHistory(tx: BridgeTxHistoryItem) {
    this.store.bridgeTxHistory = [...this.store.bridgeTxHistory, tx]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  }

  addSendNftTxHistory(tx: SendNftTxHistoryItem) {
    this.store.sendNftTxHistory = [...this.store.sendNftTxHistory, tx]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  }

  getRecentPendingTxHistory(address: string, type: keyof InnerTxHistoryMap) {
    const recentItem = this.store[`${type}TxHistory`]
      .filter((item) => {
        return isSameAddress(address, item.address);
      })
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (
      recentItem?.status === 'pending' ||
      recentItem?.status === 'fromSuccess'
    ) {
      return recentItem;
    } else {
      return null;
    }
  }

  getRecentTxHistory(
    address: string,
    hash: string,
    chainId: number,
    type: keyof InnerTxHistoryMap
  ) {
    return this.store[`${type}TxHistory`].find(
      (item) =>
        isSameAddress(address, item.address) &&
        item.hash === hash &&
        ('chainId' in item ? item.chainId : item.fromChainId) === chainId
    );
  }

  completeRecentTxHistory(
    txs: TransactionHistoryItem[],
    chainId: number,
    status: SwapTxHistoryItem['status'],
    completedHash?: string
  ) {
    const hashArr = txs.map((item) => item.hash);
    const completedAt = Date.now();

    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.INNER_HISTORY_ITEM_COMPLETE,
      params: {
        hashArr,
        chainId,
      },
    });

    this.store.swapTxHistory = this.store.swapTxHistory.map((item) => {
      if (item.chainId === chainId && hashArr.includes(item.hash)) {
        return {
          ...item,
          status,
          completedAt,
        };
      }
      return item;
    });

    this.store.sendTxHistory = this.store.sendTxHistory.map((item) => {
      if (item.chainId === chainId && hashArr.includes(item.hash)) {
        return {
          ...item,
          status,
          completedAt,
        };
      }

      return item;
    });

    this.store.bridgeTxHistory = this.store.bridgeTxHistory.map((item) => {
      if (item.fromChainId === chainId && hashArr.includes(item.hash)) {
        return {
          ...item,
          status: status === 'success' ? 'fromSuccess' : 'fromFailed',
          acceleratedHash: completedHash || item.hash,
          fromTxCompleteTs: completedAt,
        };
      }
      return item;
    });

    this.store.sendNftTxHistory = this.store.sendNftTxHistory.map((item) => {
      if (item.chainId === chainId && hashArr.includes(item.hash)) {
        return {
          ...item,
          status,
          completedAt,
        };
      }
      return item;
    });

    this.store.approveSwapTxHistory = this.store.approveSwapTxHistory.map(
      (item) => {
        if (item.chainId === chainId && hashArr.includes(item.hash)) {
          return {
            ...item,
            status,
            completedAt,
          };
        }
        return item;
      }
    );

    this.store.approveBridgeTxHistory = this.store.approveBridgeTxHistory.map(
      (item) => {
        if (item.chainId === chainId && hashArr.includes(item.hash)) {
          return {
            ...item,
            status,
            completedAt,
          };
        }
        return item;
      }
    );
  }

  completeBridgeTxHistory(
    from_tx_id: string,
    chainId: number,
    status: BridgeTxHistoryItem['status'],
    bridgeTx?: BridgeHistory
  ) {
    this.store.bridgeTxHistory = this.store.bridgeTxHistory.map((item) => {
      if (item.fromChainId === chainId && item.hash === from_tx_id) {
        return {
          ...item,
          status,
          actualToToken: bridgeTx?.to_actual_token,
          actualToAmount: bridgeTx?.actual.receive_token_amount,
          completedAt: Date.now(),
        };
      }
      return item;
    });
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

  addSubmitFailedTransaction({
    tx,
    explain,
    origin,
    actionData,
  }: {
    tx: TransactionHistoryItem;
    explain: TransactionGroup['explain'];
    actionData: TransactionGroup['action'];
    origin: string;
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
            action: actionData,
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

    const group = this.store.transactions[address][key];
    if (!this.store.transactions[address] || !group) {
      return;
    }

    const tx = group.txs.find(
      (item) => item.reqId && item.reqId === txRequest.id
    );
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
    const chain = findChain({
      id: chainId,
    });
    if (!target) {
      return;
    }
    const { txs } = target;
    const unbroadcastedTxs = txs.filter(
      (tx) =>
        tx && tx.reqId && !tx.hash && !tx.isSubmitFailed && !tx.isWithdrawed
    ) as (TransactionHistoryItem & { reqId: string })[];

    if (unbroadcastedTxs.length) {
      await openapiService
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

  getRpcTxReceipt = (chainServerId: string, hash: string) => {
    return RPCService.requestDefaultRPC({
      chainServerId,
      method: 'eth_getTransactionReceipt',
      params: [hash],
    })
      .then((res) => {
        return {
          hash: res.transactionHash,
          code: 0,
          status: parseInt(res.status, 16),
          gas_used: parseInt(res.gasUsed, 16),
        };
      })
      .catch((e) => {
        return {
          hash: hash,
          code: -1,
          status: 0,
          gas_used: 0,
        };
      });
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
    const chain = findChain({
      id: chainId,
    });
    if (!chain) {
      return;
    }
    if (!target) return;
    const { txs } = target;

    const broadcastedTxs = txs.filter(
      (tx) => tx && tx.hash && !tx.isSubmitFailed && !tx.isWithdrawed
    ) as (TransactionHistoryItem & { hash: string })[];

    try {
      const results = await Promise.all(
        broadcastedTxs.map((tx) => {
          if (chain.isTestnet) {
            return customTestnetService.getTx({
              chainId: chain.id,
              hash: tx.hash!,
            });
          } else {
            // Use standard RPC to get transaction receipt
            return this.getRpcTxReceipt(chain.serverId, tx.hash!);
          }
        })
      );
      const completed = results.find((result) => result.code === 0);

      if (!completed) {
        if (duration !== false && +duration < 1000 * 15) {
          const timeout = Number(duration) + 1000;
          // maximum retry 15 times;
          setTimeout(() => {
            this.reloadTx({ address, chainId, nonce });
          }, timeout);
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
      this.completeRecentTxHistory(
        txs,
        chainId,
        completed.status === 1 ? 'success' : 'failed',
        completedTx.hash
      );
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.RELOAD_TX,
        params: {
          addressList: [address],
        },
      });

      return completed.gas_used;
    } catch (e) {
      if (duration !== false && +duration < 1000 * 15) {
        const timeout = Number(duration) + 1000;
        // maximum retry 15 times;
        setTimeout(() => {
          this.reloadTx({ address, chainId, nonce });
        }, timeout);
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
    const maxCompletedNonceByChain: Record<string, number> = {};
    const pendings: TransactionGroup[] = [];
    const completeds: TransactionGroup[] = [];
    if (!list) return { pendings: [], completeds: [] };
    for (let i = 0; i < list.length; i++) {
      if (checkIsPendingTxGroup(list[i])) {
        pendings.push(list[i]);
      } else {
        const item = list[i];
        if (checkIsSubmittedTxGroup(list[i])) {
          maxCompletedNonceByChain[item.chainId] = Math.max(
            item.nonce,
            maxCompletedNonceByChain[item.chainId] ?? -1
          );
        }
        completeds.push(item);
        /**
         * TODO:
         * 1. repair other type tx
         * 2. maybe we need to migrate data once on bootstrap
         */
        // repair completedAt field from corresponding txs
        const isSend =
          item.$ctx?.ga?.category === 'Send' ||
          item.$ctx?.ga?.source === 'sendToken';
        if (isSend) {
          const storedItem =
            this.store.sendTxHistory.find(
              (tx) =>
                isSend &&
                tx.chainId === item.chainId &&
                tx.hash === item.txs[0]?.hash
            ) || null;
          if (storedItem && storedItem.completedAt) {
            item.completedAt = storedItem.completedAt;
          }
        }
      }
    }

    return {
      pendings: pendings
        .filter(
          (item) => item.nonce > (maxCompletedNonceByChain[item.chainId] ?? -1)
        )
        .sort((a, b) => {
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
    const chain = findChain({
      id: +target.chainId,
    });
    if (chain) {
      stats.report('completeTransaction', {
        chainId: chain.serverId,
        success,
        preExecSuccess: target?.explain
          ? target.explain?.pre_exec.success && target.explain?.calcSuccess
          : true,
        createdBy: target?.$ctx?.ga ? 'rabby' : 'dapp',
        source: target?.$ctx?.ga?.source || '',
        trigger: target?.$ctx?.ga?.trigger || '',
        networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
      });
    }
    this.clearBefore({ address, chainId, nonce });
  }

  clearExpiredTxs(address: string) {
    // maximum keep 20 transactions in storage each address since chrome storage maximum usage 5MB
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
        this.removeFeatPendingByLocal(copyHistory[k].txs[0], address, chainId);
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

  clearPendingTransactions(address: string, chainId?: number) {
    const transactions = this.store.transactions[address.toLowerCase()];
    if (!transactions) return;
    this._setStoreTransaction({
      ...this.store.transactions,
      [address.toLowerCase()]: Object.values(transactions)
        .filter((transaction) => {
          return chainId
            ? !(transaction.isPending && +chainId === +transaction.chainId)
            : !transaction.isPending;
        })
        .reduce((res, current) => {
          return {
            ...res,
            [`${current.chainId}-${current.nonce}`]: current,
          };
        }, {}),
    });
    this.store.swapTxHistory = this.store.swapTxHistory.filter((item) => {
      return !(
        isSameAddress(address, item.address) && item.status === 'pending'
      );
    });
    this.store.sendTxHistory = this.store.sendTxHistory.filter((item) => {
      return !(
        isSameAddress(address, item.address) && item.status === 'pending'
      );
    });
    this.store.bridgeTxHistory = this.store.bridgeTxHistory.filter((item) => {
      return !(
        isSameAddress(address, item.address) && item.status !== 'allSuccess'
      );
    });
    this.store.sendNftTxHistory = this.store.sendNftTxHistory.filter((item) => {
      return !(
        isSameAddress(address, item.address) && item.status === 'pending'
      );
    });
  }

  removeFeatPendingByLocal(
    localItem: TransactionHistoryItem,
    address: string,
    chainId: number
  ) {
    this.store.swapTxHistory = this.store.swapTxHistory.filter(
      (tx) =>
        !(
          isSameAddress(address, tx.address) &&
          tx.status === 'pending' &&
          chainId === tx.chainId &&
          localItem?.hash === tx.hash
        )
    );
    this.store.sendTxHistory = this.store.sendTxHistory.filter(
      (tx) =>
        !(
          isSameAddress(address, tx.address) &&
          tx.status === 'pending' &&
          chainId === tx.chainId &&
          localItem?.hash === tx.hash
        )
    );
    this.store.sendNftTxHistory = this.store.sendNftTxHistory.filter(
      (tx) =>
        !(
          isSameAddress(address, tx.address) &&
          tx.status === 'pending' &&
          chainId === tx.chainId &&
          localItem?.hash === tx.hash
        )
    );
    this.store.bridgeTxHistory = this.store.bridgeTxHistory.filter(
      (tx) =>
        !(
          isSameAddress(address, tx.address) &&
          tx.status !== 'allSuccess' &&
          chainId === tx.fromChainId &&
          localItem?.hash === tx.hash
        )
    );
  }

  removeLocalPendingTx({
    address,
    chainId,
    nonce,
  }: {
    address: string;
    chainId: number;
    nonce: number;
  }) {
    const transactions = this.store.transactions[address.toLowerCase()];
    if (!transactions) return;
    this._setStoreTransaction({
      ...this.store.transactions,
      [address.toLowerCase()]: Object.values(transactions)
        .filter((transaction) => {
          const needFilter =
            transaction.isPending &&
            +chainId === +transaction.chainId &&
            +transaction.nonce === +nonce;
          if (needFilter) {
            this.removeFeatPendingByLocal(transaction.txs[0], address, chainId);
          }
          return !needFilter;
        })
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
      return (
        item.rawTx.chainId === chainId &&
        !item.isSubmitted &&
        isSameAddress(item.rawTx.from, address)
      );
    });
    const processingTx = this._signingTxList.find(
      (item) =>
        item.rawTx.chainId === chainId &&
        item.isSubmitted &&
        isSameAddress(item.rawTx.from, address)
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
