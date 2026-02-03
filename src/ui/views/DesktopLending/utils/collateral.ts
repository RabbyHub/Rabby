import { DisplayPoolReserveInfo } from '../types';

export enum CollateralType {
  ENABLED,
  ISOLATED_ENABLED,
  DISABLED,
  ISOLATED_DISABLED,
  UNAVAILABLE,
  UNAVAILABLE_DUE_TO_ISOLATION,
}

export const getAssetCollateralType = (
  userReserve: DisplayPoolReserveInfo,
  userTotalCollateralUSD: string,
  userIsInIsolationMode: boolean,
  debtCeilingIsMaxed: boolean
): CollateralType => {
  const poolReserve = userReserve.reserve;

  // 1. 如果资产本身不支持作为抵押物
  if (!poolReserve.usageAsCollateralEnabled) {
    return CollateralType.UNAVAILABLE; // 显示 "Unavailable"
  }

  const collateralType: CollateralType = CollateralType.ENABLED;
  const userHasSuppliedReserve =
    userReserve && userReserve.scaledATokenBalance !== '0';
  const userHasCollateral = userTotalCollateralUSD !== '0';

  // 2. 如果是隔离资产
  if (poolReserve.isIsolated) {
    if (debtCeilingIsMaxed) {
      return CollateralType.UNAVAILABLE;
    } else if (userIsInIsolationMode) {
      // 用户在隔离模式
      if (userHasSuppliedReserve) {
        // 用户已供应该资产
        return userReserve.usageAsCollateralEnabledOnUser
          ? CollateralType.ISOLATED_ENABLED // "Isolated Enabled"
          : CollateralType.DISABLED; // "Disabled"
      } else {
        // 用户未供应该资产，但有其他抵押物
        if (userHasCollateral) {
          return CollateralType.UNAVAILABLE_DUE_TO_ISOLATION; // "Unavailable due to isolation"
        }
      }
    } else {
      // 用户不在隔离模式
      if (userHasCollateral) {
        return CollateralType.ISOLATED_DISABLED; // "Isolated Disabled"
      } else {
        return CollateralType.ISOLATED_ENABLED; // "Isolated Enabled"
      }
    }
  } else {
    // 3. 非隔离资产
    if (userIsInIsolationMode) {
      // 用户在其他资产的隔离模式
      return CollateralType.UNAVAILABLE_DUE_TO_ISOLATION;
    } else {
      // 正常情况
      if (userHasSuppliedReserve) {
        // 用户已供应该资产
        return userReserve.usageAsCollateralEnabledOnUser
          ? CollateralType.ENABLED // "Enabled" ✅
          : CollateralType.DISABLED; // "Disabled" ❌
      } else {
        // 用户未供应该资产
        return CollateralType.ENABLED; // 默认显示 "Enabled"（供应后可用）
      }
    }
  }

  return collateralType;
};

interface CollateralStateProps {
  collateralType: CollateralType;
}
export const getCollateralState = ({
  collateralType,
}: CollateralStateProps): [boolean, string] => {
  if (collateralType === CollateralType.ENABLED) {
    return [true, 'Enabled'];
  } else if (collateralType === CollateralType.DISABLED) {
    return [false, 'Disabled'];
  }
  return [false, 'Unavailable'];
};
