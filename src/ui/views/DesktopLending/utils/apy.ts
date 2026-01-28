import { ReserveDataHumanized } from '@aave/contract-helpers';
import {
  formatReservesAndIncentives,
  FormatUserSummaryAndIncentivesResponse,
} from '@aave/math-utils';
import BigNumber from 'bignumber.js';

export interface IconMapInterface {
  iconSymbol?: string;
  name?: string;
  symbol?: string;
}

export type FormattedReservesAndIncentives = ReturnType<
  typeof formatReservesAndIncentives
>[number] &
  ReserveDataHumanized;

export const formatUserYield = (
  formattedPoolReserves: FormattedReservesAndIncentives[],
  user: FormatUserSummaryAndIncentivesResponse
) => {
  const proportions = user.userReservesData.reduce(
    (acc, value) => {
      const reserve = formattedPoolReserves.find(
        (r) => r.underlyingAsset === value.reserve.underlyingAsset
      );

      if (reserve) {
        if (value.underlyingBalanceUSD !== '0') {
          acc.positiveProportion = acc.positiveProportion.plus(
            new BigNumber(reserve.supplyAPY).multipliedBy(
              value.underlyingBalanceUSD
            )
          );
          // 内部激励
          if (reserve.aIncentivesData) {
            reserve.aIncentivesData.forEach((incentive) => {
              acc.positiveProportion = acc.positiveProportion.plus(
                new BigNumber(incentive.incentiveAPR).multipliedBy(
                  value.underlyingBalanceUSD
                )
              );
            });
          }
        }
        if (value.variableBorrowsUSD !== '0') {
          acc.negativeProportion = acc.negativeProportion.plus(
            new BigNumber(reserve.variableBorrowAPY).multipliedBy(
              value.variableBorrowsUSD
            )
          );
          if (reserve.vIncentivesData) {
            reserve.vIncentivesData.forEach((incentive) => {
              acc.positiveProportion = acc.positiveProportion.plus(
                new BigNumber(incentive.incentiveAPR).multipliedBy(
                  value.variableBorrowsUSD
                )
              );
            });
          }
        }
      } else {
        throw new Error('no possible to calculate net apy');
      }

      return acc;
    },
    {
      positiveProportion: new BigNumber(0),
      negativeProportion: new BigNumber(0),
    }
  );

  const earnedAPY = proportions.positiveProportion
    .dividedBy(user.totalLiquidityUSD)
    .toNumber();
  const debtAPY = proportions.negativeProportion
    .dividedBy(user.totalBorrowsUSD)
    .toNumber();
  const netAPY =
    (earnedAPY || 0) *
      (Number(user.totalLiquidityUSD) /
        Number(user.netWorthUSD !== '0' ? user.netWorthUSD : '1')) -
    (debtAPY || 0) *
      (Number(user.totalBorrowsUSD) /
        Number(user.netWorthUSD !== '0' ? user.netWorthUSD : '1'));
  return {
    earnedAPY,
    debtAPY,
    netAPY,
  };
};
