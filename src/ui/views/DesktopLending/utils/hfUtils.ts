import { ReserveDataHumanized } from '@aave/contract-helpers';
import {
  calculateHealthFactorFromBalancesBigUnits,
  FormatReserveUSDResponse,
  FormatUserSummaryAndIncentivesResponse,
  UserReserveData,
  valueToBigNumber,
} from '@aave/math-utils';
import { BigNumber } from 'bignumber.js';
import { DisplayPoolReserveInfo } from '../types';

interface CalculateHFAfterWithdrawProps {
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >;
  poolReserve: ReserveDataHumanized & FormatReserveUSDResponse;
  userReserve: UserReserveData;
  withdrawAmount: string;
}

interface CalculateHFAfterSwapRepayProps {
  amount: string;
  debt: string;
  usdPrice?: string;
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >;
}

interface CalculateHFAfterCollateralRepayProps {
  amountToReceiveAfterSwap: string;
  amountToSwap: string;
  fromAssetData: ReserveDataHumanized & FormatReserveUSDResponse;
  toAssetData: ReserveDataHumanized & FormatReserveUSDResponse;
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >;
  repayWithUserReserve?: UserReserveData;
  debt: string;
}

export const effectUserAvailable = (
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >,
  poolReserve: ReserveDataHumanized & FormatReserveUSDResponse
) => {
  return (
    user &&
    ((!user.isInIsolationMode && !poolReserve.isIsolated) ||
      (user.isInIsolationMode &&
        user.isolatedReserve?.underlyingAsset === poolReserve.underlyingAsset))
  );
};

export const calculateHFAfterSupply = (
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >,
  poolReserve: ReserveDataHumanized & FormatReserveUSDResponse,
  supplyAmountInEth: BigNumber
) => {
  let healthFactorAfterDeposit = user
    ? valueToBigNumber(user.healthFactor)
    : '-1';

  const totalCollateralMarketReferenceCurrencyAfter = user
    ? valueToBigNumber(user.totalCollateralMarketReferenceCurrency).plus(
        supplyAmountInEth
      )
    : '-1';

  const liquidationThresholdAfter = user
    ? valueToBigNumber(user.totalCollateralMarketReferenceCurrency)
        .multipliedBy(user.currentLiquidationThreshold)
        .plus(
          supplyAmountInEth.multipliedBy(
            poolReserve.formattedReserveLiquidationThreshold
          )
        )
        .dividedBy(totalCollateralMarketReferenceCurrencyAfter)
    : '-1';

  if (
    user &&
    ((!user.isInIsolationMode && !poolReserve.isIsolated) ||
      (user.isInIsolationMode &&
        user.isolatedReserve?.underlyingAsset === poolReserve.underlyingAsset))
  ) {
    healthFactorAfterDeposit = calculateHealthFactorFromBalancesBigUnits({
      collateralBalanceMarketReferenceCurrency: totalCollateralMarketReferenceCurrencyAfter,
      borrowBalanceMarketReferenceCurrency: valueToBigNumber(
        user.totalBorrowsMarketReferenceCurrency
      ),
      currentLiquidationThreshold: liquidationThresholdAfter,
    });
  }

  return healthFactorAfterDeposit;
};

export const calculateHFAfterWithdraw = ({
  user,
  userReserve,
  poolReserve,
  withdrawAmount,
}: CalculateHFAfterWithdrawProps) => {
  let totalCollateralInETHAfterWithdraw = valueToBigNumber(
    user.totalCollateralMarketReferenceCurrency
  );
  let liquidationThresholdAfterWithdraw = user.currentLiquidationThreshold;
  let healthFactorAfterWithdraw = valueToBigNumber(user.healthFactor);

  const userEMode = poolReserve.eModes.find(
    (elem) => elem.id === user.userEmodeCategoryId
  );
  const isInEmode = user.userEmodeCategoryId !== 0;

  const reserveLiquidationThreshold =
    isInEmode && userEMode
      ? userEMode.eMode.formattedLiquidationThreshold
      : poolReserve.formattedReserveLiquidationThreshold;

  if (
    userReserve?.usageAsCollateralEnabledOnUser &&
    poolReserve.reserveLiquidationThreshold !== '0'
  ) {
    const amountToWithdrawInEth = valueToBigNumber(withdrawAmount).multipliedBy(
      poolReserve.formattedPriceInMarketReferenceCurrency
    );
    totalCollateralInETHAfterWithdraw = totalCollateralInETHAfterWithdraw.minus(
      amountToWithdrawInEth
    );

    liquidationThresholdAfterWithdraw = valueToBigNumber(
      user.totalCollateralMarketReferenceCurrency
    )
      .multipliedBy(valueToBigNumber(user.currentLiquidationThreshold))
      .minus(
        valueToBigNumber(amountToWithdrawInEth).multipliedBy(
          reserveLiquidationThreshold
        )
      )
      .div(totalCollateralInETHAfterWithdraw)
      .toFixed(4, BigNumber.ROUND_DOWN);

    healthFactorAfterWithdraw = calculateHealthFactorFromBalancesBigUnits({
      collateralBalanceMarketReferenceCurrency: totalCollateralInETHAfterWithdraw,
      borrowBalanceMarketReferenceCurrency:
        user.totalBorrowsMarketReferenceCurrency,
      currentLiquidationThreshold: liquidationThresholdAfterWithdraw,
    });
  }

  return healthFactorAfterWithdraw;
};

export const calculateHFAfterRepay = ({
  user,
  amount,
  usdPrice,
  debt,
}: CalculateHFAfterSwapRepayProps) => {
  const repayAmountInUsd = valueToBigNumber(
    BigNumber.min(amount || '0', debt || '0')
  )
    .multipliedBy(usdPrice || '1')
    .toString(10);

  let debtLeftInUsd = valueToBigNumber(user.totalBorrowsUSD).minus(
    repayAmountInUsd
  );
  debtLeftInUsd = BigNumber.max(debtLeftInUsd, valueToBigNumber('0'));

  const hfAfterRepay = calculateHealthFactorFromBalancesBigUnits({
    collateralBalanceMarketReferenceCurrency: user.totalCollateralUSD,
    borrowBalanceMarketReferenceCurrency: debtLeftInUsd.toString(10),
    currentLiquidationThreshold: user.currentLiquidationThreshold,
  });

  return hfAfterRepay.isLessThan(0) && !hfAfterRepay.eq(-1) ? 0 : hfAfterRepay;
};

export const calculateHFAfterRepayWithAToken = ({
  user,
  amount,
  usdPrice,
  debt,
}: CalculateHFAfterSwapRepayProps) => {
  const collateralBalanceMarketReferenceCurrency = valueToBigNumber(
    user?.totalCollateralUSD || '0'
  ).minus(valueToBigNumber(usdPrice || '1').multipliedBy(amount));
  const repayAmountInUsd = valueToBigNumber(
    BigNumber.min(amount || '0', debt || '0')
  )
    .multipliedBy(usdPrice || '1')
    .toString(10);

  let debtLeftInUsd = valueToBigNumber(user.totalBorrowsUSD).minus(
    repayAmountInUsd
  );
  debtLeftInUsd = BigNumber.max(debtLeftInUsd, valueToBigNumber('0'));

  const hfAfterRepay = calculateHealthFactorFromBalancesBigUnits({
    collateralBalanceMarketReferenceCurrency,
    borrowBalanceMarketReferenceCurrency: debtLeftInUsd.toString(10),
    currentLiquidationThreshold: user.currentLiquidationThreshold,
  });

  return hfAfterRepay.isLessThan(0) && !hfAfterRepay.eq(-1) ? 0 : hfAfterRepay;
};

export const calculateHFAfterToggleCollateral = (
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >,
  userReserve: DisplayPoolReserveInfo
) => {
  const usageAsCollateralModeAfterSwitch = !userReserve.usageAsCollateralEnabledOnUser;
  const currenttotalCollateralMarketReferenceCurrency = valueToBigNumber(
    user.totalCollateralMarketReferenceCurrency
  );
  const totalCollateralAfterSwitchETH = currenttotalCollateralMarketReferenceCurrency[
    usageAsCollateralModeAfterSwitch ? 'plus' : 'minus'
  ](userReserve.underlyingBalanceMarketReferenceCurrency);
  return calculateHealthFactorFromBalancesBigUnits({
    collateralBalanceMarketReferenceCurrency: totalCollateralAfterSwitchETH,
    borrowBalanceMarketReferenceCurrency:
      user.totalBorrowsMarketReferenceCurrency,
    currentLiquidationThreshold: user.currentLiquidationThreshold,
  });
};

export interface CalculateHFAfterSwapProps {
  fromAmount: string;
  fromAssetData: ReserveDataHumanized & FormatReserveUSDResponse;
  fromAssetUserData: DisplayPoolReserveInfo;
  fromAssetType: 'collateral' | 'debt' | 'none';
  toAmountAfterSlippage: string;
  toAssetData: ReserveDataHumanized & FormatReserveUSDResponse;
  user: FormatUserSummaryAndIncentivesResponse<
    ReserveDataHumanized & FormatReserveUSDResponse
  >;
  toAssetType: 'collateral' | 'debt' | 'none';
}

export function calculateHFAfterSwap({
  fromAmount,
  fromAssetData,
  fromAssetUserData,
  fromAssetType,
  toAmountAfterSlippage,
  toAssetData,
  user,
  toAssetType,
}: CalculateHFAfterSwapProps) {
  // Base balances
  const currentCollateral = valueToBigNumber(
    user.totalCollateralMarketReferenceCurrency
  );
  const currentBorrows = valueToBigNumber(
    user.totalBorrowsMarketReferenceCurrency
  );
  const isInEmode = user.userEmodeCategoryId !== 0;

  // Collateral changes
  const canWithdrawFromCollateral =
    fromAssetType === 'collateral' &&
    fromAssetUserData.usageAsCollateralEnabledOnUser &&
    fromAssetData.reserveLiquidationThreshold !== '0';
  const canAddToCollateral =
    toAssetType === 'collateral' &&
    ((!user.isInIsolationMode && !toAssetData.isIsolated) ||
      (user.isInIsolationMode &&
        user.isolatedReserve?.underlyingAsset === toAssetData.underlyingAsset));

  const withdrawCollateralMR = canWithdrawFromCollateral
    ? valueToBigNumber(fromAmount).multipliedBy(
        fromAssetData.formattedPriceInMarketReferenceCurrency
      )
    : valueToBigNumber('0');
  const addCollateralMR = canAddToCollateral
    ? valueToBigNumber(toAmountAfterSlippage).multipliedBy(
        toAssetData.formattedPriceInMarketReferenceCurrency
      )
    : valueToBigNumber('0');

  // Debt changes
  const repayFromDebtMR =
    fromAssetType === 'debt'
      ? valueToBigNumber(fromAmount).multipliedBy(
          fromAssetData.formattedPriceInMarketReferenceCurrency
        )
      : valueToBigNumber('0');
  const toDebtMR =
    toAssetType === 'debt'
      ? valueToBigNumber(toAmountAfterSlippage).multipliedBy(
          toAssetData.formattedPriceInMarketReferenceCurrency
        )
      : valueToBigNumber('0');
  const repayToDebtMR =
    fromAssetType === 'collateral' && toAssetType === 'debt'
      ? toDebtMR
      : valueToBigNumber('0');
  const borrowToDebtMR =
    fromAssetType === 'debt' && toAssetType === 'debt'
      ? toDebtMR
      : valueToBigNumber('0');

  const newBorrows = BigNumber.max(
    currentBorrows
      .minus(repayFromDebtMR)
      .minus(repayToDebtMR)
      .plus(borrowToDebtMR),
    valueToBigNumber('0')
  );
  const newCollateral = currentCollateral
    .minus(withdrawCollateralMR)
    .plus(addCollateralMR);

  if (newCollateral.lte(0)) {
    return { hfEffectOfFromAmount: '0', hfAfterSwap: valueToBigNumber('-1') };
  }

  const fromEmode = fromAssetData.eModes.find(
    (elem) => elem.id === user.userEmodeCategoryId
  );
  const toEMode = toAssetData.eModes.find(
    (elem) => elem.id === user.userEmodeCategoryId
  );
  const fromReserveLT =
    isInEmode && fromEmode
      ? fromEmode.eMode.formattedLiquidationThreshold
      : fromAssetData.formattedReserveLiquidationThreshold;
  const toReserveLT =
    isInEmode && toEMode
      ? toEMode.eMode.formattedLiquidationThreshold
      : toAssetData.formattedReserveLiquidationThreshold;

  const ltTotalBefore = valueToBigNumber(
    user.totalCollateralMarketReferenceCurrency
  ).multipliedBy(user.currentLiquidationThreshold);
  const ltAfter = ltTotalBefore
    .minus(withdrawCollateralMR.multipliedBy(fromReserveLT))
    .plus(addCollateralMR.multipliedBy(toReserveLT))
    .div(newCollateral)
    .toFixed(4);

  const hfAfterSwap = calculateHealthFactorFromBalancesBigUnits({
    collateralBalanceMarketReferenceCurrency: newCollateral,
    borrowBalanceMarketReferenceCurrency: newBorrows,
    currentLiquidationThreshold: ltAfter,
  });

  // For gating flashloan flow: how risky is withdrawing the from collateral amount on its own
  let hfEffectOfFromAmount = '0';
  if (canWithdrawFromCollateral) {
    hfEffectOfFromAmount = calculateHealthFactorFromBalancesBigUnits({
      collateralBalanceMarketReferenceCurrency: valueToBigNumber(
        fromAmount
      ).multipliedBy(fromAssetData.formattedPriceInMarketReferenceCurrency),
      borrowBalanceMarketReferenceCurrency:
        user.totalBorrowsMarketReferenceCurrency,
      currentLiquidationThreshold: fromReserveLT,
    }).toString();
  }

  return { hfEffectOfFromAmount, hfAfterSwap };
}

export const calculateHFAfterCollateralRepay = ({
  user,
  amountToReceiveAfterSwap,
  amountToSwap,
  fromAssetData,
  toAssetData,
  repayWithUserReserve,
  debt,
}: CalculateHFAfterCollateralRepayProps) => {
  const fromEmode = fromAssetData.eModes.find(
    (elem) => elem.id === user.userEmodeCategoryId
  );
  const isInEmode = user.userEmodeCategoryId !== 0;
  // it takes into account if in emode as threshold is different
  const reserveLiquidationThreshold =
    isInEmode && fromEmode
      ? fromEmode.eMode.formattedLiquidationThreshold
      : fromAssetData.formattedReserveLiquidationThreshold;

  // hf indicating how the state would be if we withdrew this amount.
  // this is needed because on contracts hf can't be < 1 so in the case
  // that fromHF < 1 we need to do a flashloan to not go below
  let hfInitialEffectOfFromAmount = '0';

  if (
    repayWithUserReserve?.usageAsCollateralEnabledOnUser &&
    fromAssetData.usageAsCollateralEnabled
  ) {
    hfInitialEffectOfFromAmount = calculateHealthFactorFromBalancesBigUnits({
      collateralBalanceMarketReferenceCurrency: valueToBigNumber(
        amountToSwap
      ).multipliedBy(fromAssetData.formattedPriceInMarketReferenceCurrency),
      borrowBalanceMarketReferenceCurrency:
        user.totalBorrowsMarketReferenceCurrency,
      currentLiquidationThreshold: reserveLiquidationThreshold,
    }).toString();
  }

  const fromAmountInMarketReferenceCurrency = valueToBigNumber(
    BigNumber.min(amountToReceiveAfterSwap, debt)
  )
    .multipliedBy(toAssetData.priceInUSD)
    .toString(10);
  let debtLeftInMarketReference = valueToBigNumber(user.totalBorrowsUSD).minus(
    fromAmountInMarketReferenceCurrency
  );

  debtLeftInMarketReference = BigNumber.max(
    debtLeftInMarketReference,
    valueToBigNumber('0')
  );

  const hfAfterRepayBeforeWithdraw = calculateHealthFactorFromBalancesBigUnits({
    collateralBalanceMarketReferenceCurrency: user.totalCollateralUSD,
    borrowBalanceMarketReferenceCurrency: debtLeftInMarketReference.toString(
      10
    ),
    currentLiquidationThreshold: user.currentLiquidationThreshold,
  });

  const hfRealEffectOfFromAmount =
    fromAssetData.reserveLiquidationThreshold !== '0' &&
    repayWithUserReserve?.usageAsCollateralEnabledOnUser
      ? calculateHealthFactorFromBalancesBigUnits({
          collateralBalanceMarketReferenceCurrency: valueToBigNumber(
            amountToSwap
          ).multipliedBy(fromAssetData.priceInUSD),
          borrowBalanceMarketReferenceCurrency: debtLeftInMarketReference.toString(
            10
          ),
          currentLiquidationThreshold:
            fromAssetData.formattedReserveLiquidationThreshold,
        }).toString()
      : '0';

  const hfAfterSwap = hfAfterRepayBeforeWithdraw.eq(-1)
    ? hfAfterRepayBeforeWithdraw
    : hfAfterRepayBeforeWithdraw.minus(hfRealEffectOfFromAmount);

  return {
    hfEffectOfFromAmount: valueToBigNumber(hfInitialEffectOfFromAmount),
    hfAfterSwap:
      hfAfterSwap.isLessThan(0) && !hfAfterSwap.eq(-1) ? 0 : hfAfterSwap,
  };
};
