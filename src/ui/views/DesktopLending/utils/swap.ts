import {
  assetCanBeBorrowedByUser,
  getMaxAmountAvailableToBorrow,
} from './borrow';
import { SwappableToken } from '../types/swap';
import { UserSummary } from '../types';
import { CustomMarket } from '../config/market';
import { TOKEN_LIST } from '../config/TokenList';
import { FormattedReservesAndIncentives } from './apy';
import { SupportedChainId, WRAPPED_NATIVE_CURRENCIES } from './native';
import { isSameAddress } from '@/ui/utils';

// 虽然没有有效值，先放在这
const HIDDEN_ASSETS: Partial<Record<CustomMarket, string[]>> = {
  // [CustomMarket.proto_horizon_v3]: [
  //   '0x2255718832bc9fd3be1caf75084f4803da14ff01'.toLowerCase(), // VBILL
  // ],
};

const isAssetHidden = (market: CustomMarket, underlyingAsset: string) => {
  return HIDDEN_ASSETS[market]?.includes(underlyingAsset.toLowerCase());
};

// Tokens to are all potential borrow assets
export const getTokensTo = (
  user: UserSummary,
  reserves: FormattedReservesAndIncentives[],
  chainId: number,
  currentMarketData: CustomMarket
): SwappableToken[] => {
  if (!user) {
    return [];
  }
  return reserves
    .filter((reserve) =>
      user ? assetCanBeBorrowedByUser(reserve, user, reserve.eModes) : false
    )
    .filter(
      (reserve) => !isAssetHidden(currentMarketData, reserve.underlyingAsset)
    )
    .map<SwappableToken | undefined>((reserve) => {
      const availableBorrows = user
        ? Number(getMaxAmountAvailableToBorrow(reserve, user))
        : 0;

      const tokenFromList = TOKEN_LIST.tokens.find(
        (t) =>
          t.address?.toLowerCase() === reserve.underlyingAsset.toLowerCase() &&
          t.chainId === chainId
      );

      const isWrappedNative =
        WRAPPED_NATIVE_CURRENCIES[
          chainId as SupportedChainId
        ]?.address?.toLowerCase() === reserve.underlyingAsset.toLowerCase();
      const nativeToken = isWrappedNative
        ? TOKEN_LIST.tokens.find(
            (t) => t.extensions?.isNative && t.chainId === chainId
          )
        : undefined;

      if (!tokenFromList) {
        return undefined;
      }

      return {
        addressToSwap: reserve.underlyingAsset,
        addressForUsdPrice: reserve.underlyingAsset,
        underlyingAddress: reserve.underlyingAsset,
        name: nativeToken?.name ?? tokenFromList?.name ?? reserve.name,
        chainId,
        decimals: reserve.decimals,
        symbol: nativeToken?.symbol ?? tokenFromList?.symbol ?? reserve.symbol,
        balance: availableBorrows.toString(),
        usdPrice: reserve.priceInUSD,
        supplyAPY: reserve.supplyAPY,
        variableBorrowAPY: reserve.variableBorrowAPY,
        totalDebtUSD: reserve.totalDebtUSD,
      };
    })
    .filter((token): token is SwappableToken => token !== undefined);
};

export const getFromToken = (
  reserve: FormattedReservesAndIncentives,
  chainId: number,
  totalBorrows: string
): SwappableToken => {
  return {
    addressToSwap: reserve.underlyingAsset,
    addressForUsdPrice: reserve.underlyingAsset,
    underlyingAddress: reserve.underlyingAsset,
    name: reserve.name,
    chainId,
    decimals: reserve.decimals,
    symbol: reserve.symbol,
    balance: totalBorrows,
    usdPrice: reserve.priceInUSD,
    supplyAPY: reserve.supplyAPY,
    variableBorrowAPY: reserve.variableBorrowAPY,
    totalDebtUSD: reserve.totalDebtUSD,
  };
};

export const getDebtTokensToDisplay = ({
  user,
  reserves,
  displayPoolReserves,
  chainId,
  market,
  excludeTokenAddress,
}: {
  user: UserSummary | null | undefined;
  reserves: FormattedReservesAndIncentives[];
  displayPoolReserves: Array<{
    underlyingAsset: string;
    totalBorrowsUSD?: string;
    walletBalanceUSD?: string;
  }>;
  chainId?: number;
  market?: CustomMarket;
  excludeTokenAddress: string;
}): SwappableToken[] => {
  if (!user || !chainId || !market) {
    return [];
  }

  return getTokensTo(user, reserves, chainId, market)
    .filter(
      (item) => !isSameAddress(item.underlyingAddress, excludeTokenAddress)
    )
    .map((item) => {
      const displayPoolReserve = displayPoolReserves.find((pool) =>
        isSameAddress(pool.underlyingAsset, item.underlyingAddress)
      );

      return {
        ...item,
        totalBorrowsUSD: displayPoolReserve?.totalBorrowsUSD,
        walletBalanceUSD: displayPoolReserve?.walletBalanceUSD,
      };
    })
    .sort((a, b) => {
      if (Number(a.totalBorrowsUSD) === 0 && Number(b.totalBorrowsUSD) === 0) {
        return Number(b.totalDebtUSD || 0) - Number(a.totalDebtUSD || 0);
      }

      return Number(b.totalBorrowsUSD || 0) - Number(a.totalBorrowsUSD || 0);
    });
};

export const getCollateralTokens = (
  user: UserSummary,
  chainId: number
): SwappableToken[] => {
  if (!user) {
    return [] as SwappableToken[];
  }
  return (
    user?.userReservesData
      .filter((userReserve) => userReserve.underlyingBalance !== '0')
      .map<SwappableToken | undefined>((position) => {
        //const isWrappedNative =
        //  WRAPPED_NATIVE_CURRENCIES[
        //    chainId as SupportedChainId
        //  ]?.address?.toLowerCase() === position.underlyingAsset.toLowerCase();
        //const nativeToken = isWrappedNative
        //  ? TOKEN_LIST.tokens.find(
        //      t => t.extensions?.isNative && t.chainId === chainId,
        //    )
        //  : undefined;

        return {
          addressToSwap: position.reserve.aTokenAddress,
          addressForUsdPrice: position.reserve.aTokenAddress,
          underlyingAddress: position.reserve.underlyingAsset,
          decimals: position.reserve.decimals,
          symbol: position.reserve.symbol,
          name: position.reserve.name,
          balance: position.underlyingBalance,
          chainId,
          usdPrice: position.reserve.priceInUSD,
          supplyAPY: position.reserve.supplyAPY,
          variableBorrowAPY: position.reserve.variableBorrowAPY,
          totalDebtUSD: position.reserve.totalDebtUSD,
        };
      })
      .filter((token): token is SwappableToken => token !== undefined) || []
  );
};
export const getCollateralToken = (
  reserve: FormattedReservesAndIncentives,
  chainId: number,
  totalBorrows: string
): SwappableToken => {
  return {
    addressToSwap: reserve.aTokenAddress,
    addressForUsdPrice: reserve.aTokenAddress,
    underlyingAddress: reserve.underlyingAsset,
    name: reserve.name,
    chainId,
    decimals: reserve.decimals,
    symbol: reserve.symbol,
    balance: totalBorrows,
    usdPrice: reserve.priceInUSD,
    supplyAPY: reserve.supplyAPY,
    variableBorrowAPY: reserve.variableBorrowAPY,
    totalDebtUSD: reserve.totalDebtUSD,
  };
};
