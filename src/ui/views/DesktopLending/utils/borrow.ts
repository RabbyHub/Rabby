import { ReserveDataHumanized } from '@aave/contract-helpers';
import {
  FormatReserveUSDResponse,
  FormatUserSummaryAndIncentivesResponse,
  valueToBigNumber,
} from '@aave/math-utils';
import { FormattedReserveEMode } from '@aave/math-utils/dist/esm/formatters/emode';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

// Subset of ComputedReserveData
interface PoolReserveBorrowSubset {
  borrowCap: string;
  availableLiquidityUSD: string;
  totalDebt: string;
  isFrozen: boolean;
  decimals: number;
  formattedAvailableLiquidity: string;
  formattedPriceInMarketReferenceCurrency: string;
  borrowCapUSD: string;
}

export const roundToTokenDecimals = (
  inputValue: string,
  tokenDecimals: number
) => {
  const [whole, decimals] = inputValue.split('.');

  // If there are no decimal places or the number of decimal places is within the limit
  if (!decimals || decimals.length <= tokenDecimals) {
    return inputValue;
  }

  // Truncate the decimals to the specified number of token decimals
  const adjustedDecimals = decimals.slice(0, tokenDecimals);

  // Combine the whole and adjusted decimal parts
  return whole + '.' + adjustedDecimals;
};

/**
 * Calculates the maximum amount a user can borrow.
 * @param poolReserve
 * @param user
 */
export function getMaxAmountAvailableToBorrow(
  poolReserve: PoolReserveBorrowSubset,
  user: FormatUserSummaryAndIncentivesResponse
): string {
  const availableInPoolUSD = poolReserve.availableLiquidityUSD;
  const availableForUserUSD = BigNumber.min(
    user.availableBorrowsUSD,
    availableInPoolUSD
  );

  const availableBorrowCap =
    poolReserve.borrowCap === '0'
      ? valueToBigNumber(ethers.constants.MaxUint256.toString())
      : valueToBigNumber(Number(poolReserve.borrowCap)).minus(
          valueToBigNumber(poolReserve.totalDebt)
        );
  const availableLiquidity = BigNumber.max(
    BigNumber.min(poolReserve.formattedAvailableLiquidity, availableBorrowCap),
    0
  );

  const availableForUserMarketReferenceCurrency = valueToBigNumber(
    user?.availableBorrowsMarketReferenceCurrency || 0
  ).div(poolReserve.formattedPriceInMarketReferenceCurrency);

  const maxUserAmountToBorrow = BigNumber.min(
    availableForUserMarketReferenceCurrency,
    availableLiquidity
  );

  const shouldAddMargin =
    /**
     * When the user is trying to do a max borrow
     */
    maxUserAmountToBorrow.gte(availableForUserMarketReferenceCurrency) ||
    /**
     * When a user has borrows we assume the debt is increasing faster then the supply.
     * That's a simplification that might not be true, but doesn't matter in most cases.
     */
    (user.totalBorrowsMarketReferenceCurrency !== '0' &&
      availableForUserUSD.lt(availableInPoolUSD)) ||
    /**
     * When the user could in theory borrow all, but the debt accrues the available decreases from block to block.
     */
    (availableForUserUSD.eq(availableInPoolUSD) &&
      poolReserve.totalDebt !== '0') ||
    /**
     * When borrow cap could be reached and debt accumulates the debt would be surpassed.
     */
    (poolReserve.borrowCapUSD &&
      poolReserve.totalDebt !== '0' &&
      availableForUserUSD.gte(availableInPoolUSD)) ||
    /**
     * When the user would be able to borrow all the remaining ceiling we need to add a margin as existing debt.
     */
    (user.isInIsolationMode &&
      user.isolatedReserve?.isolationModeTotalDebt !== '0' &&
      // TODO: would be nice if userFormatter contained formatted reserve as this math is done twice now
      valueToBigNumber(user.isolatedReserve?.debtCeiling || '0')
        .minus(user.isolatedReserve?.isolationModeTotalDebt || '0')
        .shiftedBy(-(user.isolatedReserve?.debtCeilingDecimals || 0))
        .multipliedBy('0.99')
        .lt(user.availableBorrowsUSD));

  const amountWithMargin = shouldAddMargin
    ? maxUserAmountToBorrow.multipliedBy('0.99')
    : maxUserAmountToBorrow;
  return roundToTokenDecimals(
    amountWithMargin.toString(10),
    poolReserve.decimals
  );
}

export function assetCanBeBorrowedByUser(
  {
    borrowingEnabled,
    isActive,
    borrowableInIsolation,
    isFrozen,
    isPaused,
  }: ReserveDataHumanized,
  user: Pick<
    FormatUserSummaryAndIncentivesResponse<
      ReserveDataHumanized & FormatReserveUSDResponse
    >,
    'userEmodeCategoryId' | 'isInIsolationMode'
  >,
  eModes: FormattedReserveEMode[]
) {
  const isInEmode = user.userEmodeCategoryId !== 0;
  if (!borrowingEnabled || !isActive || isFrozen || isPaused) {
    return false;
  }
  if (isInEmode) {
    const reserveEmode = eModes.find(
      (emode) => emode.id === user.userEmodeCategoryId
    );
    if (!reserveEmode) {
      return false;
    }
    return reserveEmode.borrowingEnabled;
  }
  if (user?.isInIsolationMode && !borrowableInIsolation) {
    return false;
  }
  return true;
}
