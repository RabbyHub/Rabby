export const TOKEN_SYNC_SCENE = 'token';
export const DEFI_SYNC_SCENE = 'defi';
export const APPCHAIN_SYNC_SCENE = 'appchain';
export const BALANCE_SYNC_SCENE = 'balance';
export const NFT_SYNC_SCENE = 'nft';

// 十分钟有效期
export const CACHE_VALID_DURATION = 10 * 60 * 1000;

// Transaction history is only fetched, shown and kept for this window.
export const HISTORY_RETENTION_SECONDS = 90 * 24 * 60 * 60;

// Once a day, compare the server's tx count for the last day with local
// history and refetch that day if rows are missing.
export const HISTORY_TX_COUNT_SYNC_SCENE = 'historyTxCount';
export const HISTORY_TX_COUNT_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
export const HISTORY_TX_COUNT_WINDOW_SECONDS = 24 * 60 * 60;
