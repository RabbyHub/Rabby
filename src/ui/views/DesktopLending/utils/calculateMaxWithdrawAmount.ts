import { ReserveDataHumanized } from '@aave/contract-helpers';
import {
  ComputedUserReserve,
  FormatReserveUSDResponse,
  FormatUserSummaryAndIncentivesResponse,
  valueToBigNumber,
} from '@aave/math-utils';
import { BigNumber } from 'bignumber.js';

export const calculateMaxWithdrawAmount = (
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >,
  userReserve: ComputedUserReserve,
  poolReserve: ReserveDataHumanized & FormatReserveUSDResponse,
  hfThreshold: number
) => {
  const underlyingBalance = valueToBigNumber(
    userReserve?.underlyingBalance || '0'
  );
  const isInEmode = user.userEmodeCategoryId !== 0;

  const unborrowedLiquidity = valueToBigNumber(poolReserve.unborrowedLiquidity);
  let maxAmountToWithdraw = BigNumber.min(
    underlyingBalance,
    unborrowedLiquidity
  );
  let maxCollateralToWithdrawInETH = valueToBigNumber('0');
  const userEMode = poolReserve.eModes.find(
    (elem) => elem.id === user.userEmodeCategoryId
  );
  const reserveLiquidationThreshold =
    isInEmode && userEMode
      ? userEMode.eMode.formattedLiquidationThreshold
      : poolReserve.formattedReserveLiquidationThreshold;
  if (
    userReserve?.usageAsCollateralEnabledOnUser &&
    poolReserve.reserveLiquidationThreshold !== '0' &&
    user.totalBorrowsMarketReferenceCurrency !== '0'
  ) {
    // if we have any borrowings we should check how much we can withdraw to a minimum HF of 1.01
    const excessHF = valueToBigNumber(user.healthFactor).minus(hfThreshold);
    if (excessHF.gt('0')) {
      maxCollateralToWithdrawInETH = excessHF
        .multipliedBy(user.totalBorrowsMarketReferenceCurrency)
        .div(reserveLiquidationThreshold);
    }
    maxAmountToWithdraw = BigNumber.min(
      maxAmountToWithdraw,
      maxCollateralToWithdrawInETH.dividedBy(
        poolReserve.formattedPriceInMarketReferenceCurrency
      )
    );
  }

  return maxAmountToWithdraw;
};
