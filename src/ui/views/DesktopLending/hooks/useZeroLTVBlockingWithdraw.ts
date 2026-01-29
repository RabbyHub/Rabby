import { useLendingISummary, useSelectedMarket } from '../hooks';

export const useZeroLTVBlockingWithdraw = () => {
  const { iUserSummary: userSummary } = useLendingISummary();
  const { selectedMarketData } = useSelectedMarket();

  if (!selectedMarketData?.v3 || !userSummary) {
    return [];
  }

  if (userSummary.totalBorrowsUSD === '0') {
    return [];
  }

  const zeroLTVBlockingWithdraw: string[] = [];
  userSummary.userReservesData.forEach((userReserve) => {
    if (
      Number(userReserve.scaledATokenBalance) > 0 &&
      userReserve.reserve.baseLTVasCollateral === '0' &&
      userReserve.usageAsCollateralEnabledOnUser &&
      userReserve.reserve.reserveLiquidationThreshold !== '0'
    ) {
      zeroLTVBlockingWithdraw.push(userReserve.reserve.symbol);
    }
  });

  return zeroLTVBlockingWithdraw;
};
