import BigNumber from 'bignumber.js';

export type AmountInputMode = 'token' | 'usd';

export type SendAmountInputUrlState = {
  mode: 'usd';
  usdInputValue: string;
  usdPrice: number;
  tokenKey: string;
  isUsdMaxAmountActive: boolean;
};

export type AmountInputUsdPriceSnapshot = {
  tokenKey: string;
  price: number | null;
};

export const USD_INPUT_RE = /^\d*(\.\d{0,2})?$/;

const AMOUNT_INPUT_MODE_QUERY_KEY = 'amountInputMode';
const USD_INPUT_VALUE_QUERY_KEY = 'usdInputValue';
const USD_PRICE_QUERY_KEY = 'usdPrice';
const USD_TOKEN_KEY_QUERY_KEY = 'usdTokenKey';
const USD_MAX_QUERY_KEY = 'usdMax';

export const AMOUNT_INPUT_STATE_QUERY_KEYS = [
  AMOUNT_INPUT_MODE_QUERY_KEY,
  USD_INPUT_VALUE_QUERY_KEY,
  USD_PRICE_QUERY_KEY,
  USD_TOKEN_KEY_QUERY_KEY,
  USD_MAX_QUERY_KEY,
];

export function normalizeAmountInputTokenKey(tokenKey?: string | null) {
  return (tokenKey || '').toLowerCase();
}

export function isValidUsdPrice(price?: number | string | null) {
  const numericPrice = Number(price || 0);
  return Number.isFinite(numericPrice) && numericPrice > 0;
}

export function areAmountInputTokenAmountsEqual(
  a?: string | number | null,
  b?: string | number | null
) {
  const left = a ?? '';
  const right = b ?? '';

  if (left === right) {
    return true;
  }

  if (left === '' || right === '') {
    return false;
  }

  const leftBn = new BigNumber(left);
  const rightBn = new BigNumber(right);

  if (
    !leftBn.isFinite() ||
    leftBn.isNaN() ||
    !rightBn.isFinite() ||
    rightBn.isNaN()
  ) {
    return false;
  }

  return leftBn.eq(rightBn);
}

export function createUsdAmountInputUrlState(input: {
  tokenKey: string;
  usdInputValue: string;
  usdPrice?: number | string | null;
  isUsdMaxAmountActive?: boolean;
}): SendAmountInputUrlState | null {
  const { tokenKey, usdInputValue, usdPrice, isUsdMaxAmountActive } = input;
  const normalizedTokenKey = normalizeAmountInputTokenKey(tokenKey);
  const numericPrice = Number(usdPrice || 0);

  if (!normalizedTokenKey || !USD_INPUT_RE.test(usdInputValue)) {
    return null;
  }

  if (!isValidUsdPrice(numericPrice)) {
    return null;
  }

  return {
    mode: 'usd',
    usdInputValue,
    usdPrice: numericPrice,
    tokenKey: normalizedTokenKey,
    isUsdMaxAmountActive: Boolean(isUsdMaxAmountActive),
  };
}

export function chooseRestoredUsdAmountInputState(input: {
  paramState?: SendAmountInputUrlState | null;
  cachedState?: SendAmountInputUrlState | null;
}) {
  const { paramState, cachedState } = input;

  if (!paramState) {
    return cachedState || null;
  }

  if (!cachedState) {
    return paramState;
  }

  if (
    paramState.tokenKey === cachedState.tokenKey &&
    paramState.usdInputValue === '' &&
    cachedState.usdInputValue !== ''
  ) {
    return cachedState;
  }

  return paramState;
}

export function getNextUsdPriceSnapshot(input: {
  prev: AmountInputUsdPriceSnapshot;
  tokenKey: string;
  tokenUsdPrice?: number | string | null;
  amountInputMode: AmountInputMode;
  amountInputHasValue: boolean;
}): AmountInputUsdPriceSnapshot {
  const {
    prev,
    tokenKey,
    tokenUsdPrice,
    amountInputMode,
    amountInputHasValue,
  } = input;
  const normalizedTokenKey = normalizeAmountInputTokenKey(tokenKey);
  const nextPrice = isValidUsdPrice(tokenUsdPrice)
    ? Number(tokenUsdPrice)
    : null;

  if (
    amountInputMode === 'usd' &&
    prev.tokenKey &&
    prev.tokenKey !== normalizedTokenKey &&
    amountInputHasValue
  ) {
    return prev;
  }

  if (prev.tokenKey !== normalizedTokenKey) {
    return {
      tokenKey: normalizedTokenKey,
      price: nextPrice,
    };
  }

  if (amountInputMode === 'usd' && amountInputHasValue) {
    return prev;
  }

  if (prev.price !== nextPrice) {
    return {
      tokenKey: normalizedTokenKey,
      price: nextPrice,
    };
  }

  return prev;
}

export function shouldDisplaySmallUsdMaxAmount(input: {
  tokenAmount?: string | number | null;
  usdPrice?: number | string | null;
  isUsdMaxAmountActive?: boolean;
}) {
  const { tokenAmount, usdPrice, isUsdMaxAmountActive } = input;
  if (!isUsdMaxAmountActive || !tokenAmount || !isValidUsdPrice(usdPrice)) {
    return false;
  }

  const usdValue = new BigNumber(tokenAmount).times(usdPrice || 0);
  return usdValue.isFinite() && usdValue.gt(0) && usdValue.lt(0.01);
}

export function normalizeUsdAmountInputUrlStateForTokenAmount(
  state: SendAmountInputUrlState | null | undefined,
  tokenAmount?: string | number | null
) {
  if (!state) {
    return null;
  }

  if (
    !shouldDisplaySmallUsdMaxAmount({
      tokenAmount,
      usdPrice: state.usdPrice,
      isUsdMaxAmountActive: state.isUsdMaxAmountActive,
    })
  ) {
    return state;
  }

  if (state.usdInputValue === '') {
    return state;
  }

  return {
    ...state,
    usdInputValue: '',
  };
}

export function getUsdAmountInputDisplayState(input: {
  state?: SendAmountInputUrlState | null;
  tokenAmount?: string | number | null;
}) {
  const normalizedState = normalizeUsdAmountInputUrlStateForTokenAmount(
    input.state,
    input.tokenAmount
  );
  const shouldShowSmallUsdMaxAmount = shouldDisplaySmallUsdMaxAmount({
    tokenAmount: input.tokenAmount,
    usdPrice: normalizedState?.usdPrice,
    isUsdMaxAmountActive: normalizedState?.isUsdMaxAmountActive,
  });

  return {
    state: normalizedState,
    usdInputValue: shouldShowSmallUsdMaxAmount
      ? ''
      : normalizedState?.usdInputValue || '',
    shouldShowSmallUsdMaxAmount,
  };
}

function getQueryValue(
  query: URLSearchParams | Record<string, string>,
  key: string
) {
  return query instanceof URLSearchParams
    ? query.get(key) || ''
    : query[key] || '';
}

export function parseAmountInputUrlState(
  query: URLSearchParams | Record<string, string>
) {
  if (getQueryValue(query, AMOUNT_INPUT_MODE_QUERY_KEY) !== 'usd') {
    return null;
  }

  return createUsdAmountInputUrlState({
    tokenKey: getQueryValue(query, USD_TOKEN_KEY_QUERY_KEY),
    usdInputValue: getQueryValue(query, USD_INPUT_VALUE_QUERY_KEY),
    usdPrice: getQueryValue(query, USD_PRICE_QUERY_KEY),
    isUsdMaxAmountActive: getQueryValue(query, USD_MAX_QUERY_KEY) === '1',
  });
}

export function buildAmountInputQueryFields(
  state?: SendAmountInputUrlState | null
) {
  if (!state) {
    return {};
  }

  const result: Record<string, string> = {
    [AMOUNT_INPUT_MODE_QUERY_KEY]: state.mode,
    [USD_INPUT_VALUE_QUERY_KEY]: state.usdInputValue,
    [USD_PRICE_QUERY_KEY]: String(state.usdPrice),
    [USD_TOKEN_KEY_QUERY_KEY]: state.tokenKey,
  };

  if (state.isUsdMaxAmountActive) {
    result[USD_MAX_QUERY_KEY] = '1';
  }

  return result;
}

export function applyAmountInputUrlStateToSearchParams(
  searchParams: URLSearchParams,
  state?: SendAmountInputUrlState | null
) {
  AMOUNT_INPUT_STATE_QUERY_KEYS.forEach((key) => searchParams.delete(key));

  const fields = buildAmountInputQueryFields(state);
  Object.keys(fields).forEach((key) => {
    searchParams.set(key, fields[key]);
  });
}
