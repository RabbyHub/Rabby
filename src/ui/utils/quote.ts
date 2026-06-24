import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';

const EARLY_QUOTE_MIN_RECEIVE_USD_RATIO = new BigNumber(97).div(100);

export const isQuoteReceiveValueTooLowForEarlyDisplay = ({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
}: {
  fromToken?: TokenItem;
  toToken?: TokenItem;
  fromAmount?: string | number;
  toAmount?: string | number;
}) => {
  const fromUsdValue = new BigNumber(fromAmount || 0).times(
    fromToken?.price || 0
  );
  const toUsdValue = new BigNumber(toAmount || 0).times(toToken?.price || 0);

  if (!fromUsdValue.gt(0) || !toUsdValue.gt(0)) {
    return false;
  }

  return toUsdValue.lt(fromUsdValue.times(EARLY_QUOTE_MIN_RECEIVE_USD_RATIO));
};
