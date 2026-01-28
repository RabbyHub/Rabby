// Until CoW shares a more sophisticated way to recognize token groups, we'll maintain a lists with popular tokens
// Same Categories will be used to determine slippage for Paraswap
// Set all tokens to uppercase to avoid case sensitivity issues
export const TOKEN_GROUPS: Record<
  'stable' | 'correlatedEth' | 'correlatedBtc',
  string[]
> = {
  stable: [
    'USDC',
    'USDT',
    'DAI',
    'GHO',
    'EURC',
    'USDBC',
    'USDE',
    'USDS',
    'SUSDE',
    'RLUSD',
    'PYUSD',
    'LUSD',
    'SDAI',
    'CRVUSD',
    'USD₮0',
    'USDC.E',
    'EURE',
    'XDAI',
    'WXDAI',
  ],
  correlatedEth: [
    'WEETH',
    'ETH',
    'WETH',
    'WSTETH',
    'CBETH',
    'EZETH',
    'WRSETH',
    'OSETH',
    'RETH',
    'ETHX',
  ],
  correlatedBtc: ['CBBTC', 'WBTC', 'LBTC', 'TBTC', 'EBTC'],
} as const;

export const getAssetGroup = (
  symbol: string
): keyof typeof TOKEN_GROUPS | 'unknown' => {
  for (const [groupName, tokens] of Object.entries(TOKEN_GROUPS)) {
    // Allow for prefix matching e.g. aTokens
    if (tokens.some((token) => symbol.toUpperCase().endsWith(token))) {
      return groupName as keyof typeof TOKEN_GROUPS;
    }
  }
  return 'unknown';
};
