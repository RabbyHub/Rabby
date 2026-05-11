import { useMemo } from 'react';
import { useZeroLTVBlockingWithdraw } from './useZeroLTVBlockingWithdraw';
import { valueToBigNumber } from '@aave/math-utils';
import { useLendingSummary } from '../hooks';
import { ReserveDataHumanized } from '@aave/contract-helpers';
import { DisplayPoolReserveInfo } from '../types';
import { useTranslation } from 'react-i18next';

export enum ErrorType {
  DO_NOT_HAVE_SUPPLIES_IN_THIS_CURRENCY,
  CAN_NOT_USE_THIS_CURRENCY_AS_COLLATERAL,
  CAN_NOT_SWITCH_USAGE_AS_COLLATERAL_MODE,
  ZERO_LTV_WITHDRAW_BLOCKED,
}

export const useCollateralWaring = ({
  afterHF,
  userReserve,
  poolReserve,
}: {
  afterHF?: string;
  userReserve: DisplayPoolReserveInfo | null;
  poolReserve?: ReserveDataHumanized;
}) => {
  const assetsBlockingWithdraw = useZeroLTVBlockingWithdraw();
  const { iUserSummary: userSummary } = useLendingSummary();
  const { t } = useTranslation();

  const errorType = useMemo(() => {
    let blockingError: ErrorType | undefined;
    if (!poolReserve || !userReserve || !afterHF) {
      return undefined;
    }
    if (
      assetsBlockingWithdraw.length > 0 &&
      !assetsBlockingWithdraw.includes(poolReserve.symbol)
    ) {
      blockingError = ErrorType.ZERO_LTV_WITHDRAW_BLOCKED;
    } else if (valueToBigNumber(userReserve.underlyingBalance).eq(0)) {
      blockingError = ErrorType.DO_NOT_HAVE_SUPPLIES_IN_THIS_CURRENCY;
    } else if (
      (!userReserve.usageAsCollateralEnabledOnUser &&
        poolReserve.reserveLiquidationThreshold === '0') ||
      poolReserve.reserveLiquidationThreshold === '0'
    ) {
      blockingError = ErrorType.CAN_NOT_USE_THIS_CURRENCY_AS_COLLATERAL;
    } else if (
      userReserve.usageAsCollateralEnabledOnUser &&
      userSummary?.totalBorrowsMarketReferenceCurrency !== '0' &&
      valueToBigNumber(afterHF).lte('1')
    ) {
      blockingError = ErrorType.CAN_NOT_SWITCH_USAGE_AS_COLLATERAL_MODE;
    }
    return blockingError;
  }, [
    afterHF,
    assetsBlockingWithdraw,
    poolReserve,
    userReserve,
    userSummary?.totalBorrowsMarketReferenceCurrency,
  ]);

  const errorMessage = useMemo(() => {
    switch (errorType) {
      case ErrorType.DO_NOT_HAVE_SUPPLIES_IN_THIS_CURRENCY:
        return t(
          'page.lending.toggleCollateralModal.toggleRiskTexts.doNotHaveSuppliesInThisCurrency'
        );
      case ErrorType.CAN_NOT_USE_THIS_CURRENCY_AS_COLLATERAL:
        return t(
          'page.lending.toggleCollateralModal.toggleRiskTexts.canNotUseThisCurrencyAsCollateral'
        );
      case ErrorType.CAN_NOT_SWITCH_USAGE_AS_COLLATERAL_MODE:
        return t(
          'page.lending.toggleCollateralModal.toggleRiskTexts.canNotSwitchUsageAsCollateralMode'
        );
      case ErrorType.ZERO_LTV_WITHDRAW_BLOCKED:
        return t(
          'page.lending.toggleCollateralModal.toggleRiskTexts.zeroLTVWithdrawBlocked',
          { assets: assetsBlockingWithdraw.join(', ') }
        );
      default:
        return null;
    }
  }, [assetsBlockingWithdraw, errorType, t]);
  return { errorType, errorMessage, isError: !!errorType };
};
