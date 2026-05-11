import { OptimalRate } from '@paraswap/sdk';
import { TxErrorType } from './tx';

/** All supported swap flows. */
export enum SwapType {
  Swap = 'swap',
  CollateralSwap = 'collateral_swap',
  DebtSwap = 'debt_swap',
  RepayWithCollateral = 'repay_with_collateral',
  WithdrawAndSwap = 'withdraw_and_swap',
}

/** Current execution/quote provider. */
export enum SwapProvider {
  COW_PROTOCOL = 'cowprotocol',
  PARASWAP = 'paraswap',
  NONE = 'none',
}

/**
 * Provider-agnostic quote shape used by the UI.
 * All providers must adapt their responses to this before rendering.
 */
export type BaseSwitchRates = {
  // Source token
  srcToken: string;
  srcSpotUSD: string;
  srcSpotAmount: string;
  srcDecimals: number;

  // Destination token
  destToken: string;
  destSpotUSD: string;
  destSpotAmount: string;
  destDecimals: number;

  afterFeesUSD: string;
  afterFeesAmount: string;

  srcTokenPriceUsd: number;
  destTokenPriceUsd: number;

  provider: SwapProvider;
};

/** ParaSwap-specific extension of BaseSwitchRates. */
export type ParaswapRatesType = BaseSwitchRates & {
  optimalRateData: OptimalRate;
  provider: SwapProvider.PARASWAP;
  suggestedSlippage?: number;
};

/**
 * Parameters required to fetch a quote from a provider.
 * The module converts from SwapState into this minimal, provider-agnostic shape.
 */
export type ProviderRatesParams = {
  swapType: SwapType;
  side?: 'buy' | 'sell';
  invertedQuoteRoute?: boolean;
  amount: string;
  srcToken: string;
  srcDecimals: number;

  destToken: string;
  destDecimals: number;

  chainId: number;
  user: string;
  options?: Record<string, unknown>;

  inputSymbol?: string;
  outputSymbol?: string;

  isInputTokenCustom?: boolean;
  isOutputTokenCustom?: boolean;
  appCode: string;

  setError?: (error: Error | TxErrorType) => void;
};

export enum TokenType {
  NATIVE,
  ERC20,
  USER_CUSTOM,
  COLLATERAL,
  DEBT,
}

/**
 * Minimal token shape used by the swap module.
 * Notes:
 * - addressToSwap is the address that providers expect for on-chain execution
 * - addressForUsdPrice enables price feeds to diverge from the swap address
 * - underlyingAddress is useful when swapping aTokens or debt tokens
 */
export type SwappableToken = {
  addressToSwap: string;
  addressForUsdPrice: string;
  underlyingAddress: string;
  decimals: number;
  symbol: string;
  name: string;
  balance: string;
  chainId: number;
  usdPrice?: string;
  supplyAPY?: string;
  variableBorrowAPY?: string;
  tokenType?: TokenType;
  logoURI?: string;
  debtBalance?: string;
  totalBorrowsUSD?: string;
  walletBalanceUSD?: string;
  totalDebtUSD?: string;
  underlyingUsdValue?: string;
};
