import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { isSameAddress, useWallet } from '@/ui/utils';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  BRIDGE_HISTORY_INIT_SCAN_LIMIT,
  BRIDGE_HISTORY_TX_BATCH,
  HistoryListRow,
  collectInitialBridgeTxIds,
  collectViewportOutgoingTxIds,
  historyTxKey,
  shouldPollPendingBridge,
} from '../utils/mergeBridgeHistory';
import {
  enqueueBridgeLookups,
  getBridgeLookupSession,
  getBridgeLookupSnapshot,
  lookupSkipSet,
  subscribeBridgeLookup,
} from '../utils/bridgeHistoryLookup';

type LookupItem = {
  id: string;
  cate_id?: string | null;
  is_scam?: boolean;
  chain: string;
  owner_addr?: string;
  tx?: { from_addr?: string } | null;
};

const POLL_INTERVAL_MS = 3000;
const EMPTY_BRIDGES: BridgeHistory[] = [];

export const useBridgeHistoryByTxIds = (options: {
  enabled: boolean;
  pollingEnabled: boolean;
  address?: string;
  items: LookupItem[];
}) => {
  const { enabled, pollingEnabled, address = '', items } = options;
  const wallet = useWallet();
  const session = useMemo(() => getBridgeLookupSession(address), [address]);
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!enabled || !address) return () => {};
      return subscribeBridgeLookup(session, notify);
    },
    [address, enabled, session]
  );
  const getSnapshot = useCallback(
    () =>
      enabled && address ? getBridgeLookupSnapshot(session) : EMPTY_BRIDGES,
    [address, enabled, session]
  );
  const bridges = useSyncExternalStore(subscribe, getSnapshot);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const enqueueIds = useCallback(
    (ids: string[], polling = false) => {
      if (!enabled || !address) return;
      enqueueBridgeLookups(session, wallet, address, ids, polling);
    },
    [address, enabled, session, wallet]
  );

  useEffect(() => {
    if (!enabled || !address || !items.length) return;
    if (!items.some((item) => isSameAddress(item.owner_addr || '', address))) {
      return;
    }
    // 历史更新后重扫前 100 条。
    // 每轮最多 20 个新候选，缓存去重。
    const { ids } = collectInitialBridgeTxIds(
      items,
      address,
      lookupSkipSet(session),
      0,
      BRIDGE_HISTORY_TX_BATCH,
      BRIDGE_HISTORY_INIT_SCAN_LIMIT
    );
    enqueueIds(ids);
  }, [address, enabled, enqueueIds, items, session]);

  useEffect(() => {
    // 非 DB 账户仅查询和替换，不轮询。
    if (!enabled || !pollingEnabled || !address) return;
    const pendingIds = () =>
      Array.from(session.results.values())
        .filter((item) => shouldPollPendingBridge(item))
        .map((item) => item.from_tx?.tx_id)
        .filter((id): id is string => !!id);
    if (!pendingIds().length) return;
    const timer = setInterval(() => {
      const ids = pendingIds();
      // 无有效 pending 时停止。
      if (!ids.length) {
        clearInterval(timer);
        return;
      }
      if (
        session.queue.size ||
        session.queue.pending ||
        Date.now() - session.lastPoll < POLL_INTERVAL_MS
      ) {
        return;
      }
      session.lastPoll = Date.now();
      enqueueIds(ids, true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [address, enabled, pollingEnabled, enqueueIds, bridges, session]);

  /** 滚动时只查可见行所在的 20 条批次。 */
  const onRangeChanged = useCallback(
    (
      startIndex: number,
      endIndex: number,
      rows: HistoryListRow<{ chain: string; id: string }>[]
    ) => {
      if (!enabled || !address) return;
      const items = itemsRef.current;
      const indexByKey = new Map(
        items.map((item, index) => [historyTxKey(item.chain, item.id), index])
      );
      let start = items.length;
      let end = -1;
      for (let index = startIndex; index <= endIndex; index += 1) {
        const row = rows[index];
        if (!row) continue;
        const key =
          row.kind === 'tx'
            ? historyTxKey(row.item.chain, row.item.id)
            : row.anchorKey;
        const originalIndex = indexByKey.get(key);
        if (originalIndex == null) continue;
        start = Math.min(start, originalIndex);
        end = Math.max(end, originalIndex);
      }
      if (end < 0) return;
      enqueueIds(
        collectViewportOutgoingTxIds(
          items,
          address,
          lookupSkipSet(session),
          start,
          end
        )
      );
    },
    [address, enabled, enqueueIds, session]
  );

  return { bridges, onRangeChanged };
};
