export const BRIDGE_QUOTE_CAPTURE_EVENT = 'rabby:bridge-quote-capture';

const DB_NAME = 'rabby-bridge-quote-capture';
const STORE_NAME = 'records';
const DB_VERSION = 1;
const MAX_RECORDS = 2000;

export type BridgeQuoteCaptureRequest = {
  userAddress: string;
  fromChainId: string;
  fromTokenId: string;
  fromTokenRawAmount: string;
  toChainId: string;
  toTokenId: string;
  slippage?: string;
  feeRate?: number;
};

export type BridgeQuoteCaptureContext = {
  amount: string;
  fromTokenSymbol?: string;
  toTokenSymbol?: string;
  alternativeTokenId?: string;
};

export type BridgeQuoteCaptureRecord = {
  id: string;
  requestedAt: number;
  aggregatorId: string;
  source: 'primary' | 'recommend';
  request: BridgeQuoteCaptureRequest;
  context: BridgeQuoteCaptureContext;
  quotes: unknown[];
  error?: string;
  builtTx?: unknown;
  buildError?: string;
};

export type BridgeQuoteCaptureBridgeCount = {
  key: string;
  name: string;
  count: number;
};

export type ExportedBridgeQuote = {
  requestedAt: number;
  aggregatorId: string;
  source: BridgeQuoteCaptureRecord['source'];
  request: BridgeQuoteCaptureRequest;
  context: BridgeQuoteCaptureContext;
  quote: unknown;
  builtTx?: unknown;
  buildError?: string;
};

const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('requestedAt', 'requestedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const notify = () => {
  window.dispatchEvent(new Event(BRIDGE_QUOTE_CAPTURE_EVENT));
};

export const saveBridgeQuoteCapture = async (
  input: Omit<BridgeQuoteCaptureRecord, 'id' | 'requestedAt'>
) => {
  if (!process.env.DEBUG) {
    return;
  }

  try {
    const record: BridgeQuoteCaptureRecord = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requestedAt: Date.now(),
      request: snapshot(input.request),
      context: snapshot(input.context),
      quotes: snapshot(input.quotes || []),
      builtTx:
        input.builtTx === undefined ? undefined : snapshot(input.builtTx),
    };
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.add(record);
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const all = (getAllReq.result || []) as BridgeQuoteCaptureRecord[];
          if (all.length <= MAX_RECORDS) {
            return;
          }
          all.sort((a, b) => a.requestedAt - b.requestedAt);
          const extra = all.length - MAX_RECORDS;
          for (let i = 0; i < extra; i += 1) {
            store.delete(all[i].id);
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
    notify();
  } catch (error) {
    console.error('save bridge quote capture failed', error);
  }
};

export const captureBuiltBridgeQuotes = async ({
  aggregatorId,
  source,
  request,
  context,
  quotes,
  buildTx,
}: {
  aggregatorId: string;
  source: BridgeQuoteCaptureRecord['source'];
  request: BridgeQuoteCaptureRequest;
  context: BridgeQuoteCaptureContext;
  quotes: unknown[];
  buildTx: (quote: any) => Promise<unknown>;
}) => {
  if (!process.env.DEBUG || !quotes?.length) {
    return;
  }

  await Promise.allSettled(
    quotes.map(async (quote) => {
      let builtTx: unknown;
      let buildError: string | undefined;
      try {
        builtTx = await buildTx(quote);
        if (!builtTx) {
          builtTx = undefined;
          buildError = 'empty tx';
        }
      } catch (error) {
        buildError = error instanceof Error ? error.message : String(error);
      }
      await saveBridgeQuoteCapture({
        aggregatorId,
        source,
        request,
        context,
        quotes: [quote],
        builtTx,
        buildError,
      });
    })
  );
};

export const listBridgeQuoteCaptures = async () => {
  const db = await openDb();
  try {
    const records = await requestToPromise(
      db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
    );
    return (records as BridgeQuoteCaptureRecord[]).sort(
      (a, b) => a.requestedAt - b.requestedAt
    );
  } finally {
    db.close();
  }
};

const readBridgeIdentity = (quote: unknown) => {
  if (!quote || typeof quote !== 'object') {
    return;
  }
  const value = quote as {
    bridge?: { id?: string; name?: string };
    bridge_id?: string;
  };
  const id = value.bridge?.id || value.bridge_id || '';
  const name = value.bridge?.name || id;
  if (!id && !name) {
    return;
  }
  return {
    key: id || name,
    name: name || id,
  };
};

export const countCapturedBridges = (records: BridgeQuoteCaptureRecord[]) => {
  const counts = new Map<string, BridgeQuoteCaptureBridgeCount>();

  records.forEach((record) => {
    if (record.error || !record.quotes?.length) {
      return;
    }
    record.quotes.forEach((quote) => {
      const identity = readBridgeIdentity(quote);
      if (!identity) {
        return;
      }
      const current = counts.get(identity.key);
      if (current) {
        current.count += 1;
        if (!current.name && identity.name) {
          current.name = identity.name;
        }
        return;
      }
      counts.set(identity.key, {
        key: identity.key,
        name: identity.name,
        count: 1,
      });
    });
  });

  const rows = Array.from(counts.values());
  const nameCount = new Map<string, number>();
  rows.forEach((row) => {
    nameCount.set(row.name, (nameCount.get(row.name) || 0) + 1);
  });

  return rows
    .map((row) => ({
      ...row,
      name:
        (nameCount.get(row.name) || 0) > 1 ? `${row.name} (${row.key})` : row.name,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

export const getBridgeQuoteCaptureStats = async () => {
  const records = await listBridgeQuoteCaptures();
  const validQuoteCount = records.reduce((sum, record) => {
    if (record.error || !record.quotes?.length) {
      return sum;
    }
    return sum + record.quotes.length;
  }, 0);
  const builtTxCount = records.filter((record) => record.builtTx).length;
  const buildFailCount = records.filter((record) => record.buildError).length;
  const latestRequestedAt = records.length
    ? records[records.length - 1].requestedAt
    : undefined;

  return {
    requestCount: records.length,
    validQuoteCount,
    builtTxCount,
    buildFailCount,
    latestRequestedAt,
    bridgeCounts: countCapturedBridges(records),
  };
};

export const exportValidBridgeQuotes = async () => {
  const records = await listBridgeQuoteCaptures();
  const items: ExportedBridgeQuote[] = [];

  records.forEach((record) => {
    if (record.error || !record.quotes?.length) {
      return;
    }
    record.quotes.forEach((quote) => {
      const singleQuote = record.quotes.length === 1;
      items.push({
        requestedAt: record.requestedAt,
        aggregatorId: record.aggregatorId,
        source: record.source,
        request: record.request,
        context: record.context,
        quote,
        builtTx: singleQuote ? record.builtTx : undefined,
        buildError: singleQuote ? record.buildError : undefined,
      });
    });
  });

  return {
    exportedAt: Date.now(),
    validQuoteCount: items.length,
    items,
  };
};

export const clearBridgeQuoteCaptures = async () => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  notify();
};

export const downloadJsonFile = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
