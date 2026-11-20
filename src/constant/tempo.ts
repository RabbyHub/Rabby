export const TEMPO_CHAIN_SERVER_ID = 'tempo';

export const TEMPO_FEE_MANAGER_ADDRESS =
  '0xfeec000000000000000000000000000000000000';

export const TEMPO_PATH_USD_TOKEN =
  '0x20c0000000000000000000000000000000000000';

// Since T13, OUSD is the protocol backup fee token: when a transaction selects
// no fee token (no `feeToken`, no stored user preference, nothing inferred)
// and pathUSD cannot cover the max fee, the fee is paid in OUSD.
export const TEMPO_OUSD_TOKEN = '0x20c0000000000000000000006a37da5c996874be';

// Ordered protocol fallback used when a transaction selects no fee token.
export const TEMPO_PROTOCOL_FALLBACK_FEE_TOKENS = [
  TEMPO_PATH_USD_TOKEN,
  TEMPO_OUSD_TOKEN,
] as const;

// TIP-20 tokens on Tempo are 6 decimals.
export const TEMPO_FEE_TOKEN_DECIMALS = 6;
