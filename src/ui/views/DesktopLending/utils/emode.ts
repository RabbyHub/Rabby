import { EmodeCategory, UserSummary } from '../types';
import { FormattedReservesAndIncentives } from './apy';
import { fetchIconSymbolAndName } from './icon';

export const isEmodeEnabled = (
  user: Partial<Pick<UserSummary, 'userEmodeCategoryId'>>
) => {
  return !!user?.userEmodeCategoryId && user.userEmodeCategoryId !== 0;
};

export const formatEmodes = (reserves: FormattedReservesAndIncentives[]) => {
  const eModes: Record<number, EmodeCategory> = {};

  reserves.forEach((r) => {
    const { symbol, iconSymbol } = fetchIconSymbolAndName({
      underlyingAsset: r.underlyingAsset,
      symbol: r.symbol,
    });
    r.eModes.forEach((e) => {
      if (!eModes[e.id]) {
        eModes[e.id] = {
          id: e.id,
          label: e.eMode.label,
          ltv: e.eMode.ltv,
          liquidationThreshold: e.eMode.liquidationThreshold,
          liquidationBonus: e.eMode.liquidationBonus,
          assets: [
            {
              underlyingAsset: r.underlyingAsset,
              symbol,
              iconSymbol,
              collateral: e.collateralEnabled && r.baseLTVasCollateral !== '0',
              borrowable: e.borrowingEnabled,
            },
          ],
        };
      } else {
        eModes[e.id].assets.push({
          underlyingAsset: r.underlyingAsset,
          symbol,
          iconSymbol,
          collateral: e.collateralEnabled && r.baseLTVasCollateral !== '0',
          borrowable: e.borrowingEnabled,
        });
      }
    });
  });

  // If all reserves have an eMode cateogry other than 0, we need to add the default empty one.
  // The UI assumes that there is always an eMode category 0, which is 'none'.
  if (!eModes[0]) {
    eModes[0] = {
      id: 0,
      label: '',
      liquidationBonus: '0',
      liquidationThreshold: '0',
      ltv: '0',
      assets: [],
    };
  }

  return eModes;
};

// An E-Mode category is available if the user has no borrow positions outside of the category
export function isEModeCategoryAvailable(
  user: UserSummary,
  eMode: EmodeCategory
): boolean {
  const borrowableReserves = eMode.assets
    .filter((asset) => asset.borrowable)
    .map((asset) => asset.underlyingAsset);

  const hasIncompatiblePositions = user.userReservesData.some(
    (userReserve) =>
      Number(userReserve.scaledVariableDebt) > 0 &&
      !borrowableReserves.includes(userReserve.reserve.underlyingAsset)
  );

  return !hasIncompatiblePositions;
}
