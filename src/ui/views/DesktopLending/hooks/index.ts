import { useCallback, useMemo, useState, useEffect } from 'react';

import dayjs from 'dayjs';
import { ethers } from 'ethers';
import { debounce } from 'lodash';
import { BigNumber } from 'bignumber.js';

import { CHAINS_ENUM } from '@debank/common';
import { findChainByID } from '@/utils/chain';
import { isValidAddress } from '@ethereumjs/util';
import {
  formatReserves,
  formatReservesAndIncentives,
  formatUserSummaryAndIncentives,
  nativeToUSD,
  normalize,
  USD_DECIMALS,
} from '@aave/math-utils';
import {
  EmodeDataHumanized,
  Pool,
  PoolBundle,
  ReservesDataHumanized,
  UiPoolDataProvider,
  UserReserveDataHumanized,
  UserWalletBalancesResponse,
  WalletBalanceProvider,
} from '@aave/contract-helpers';

import wrapperToken from '../config/wrapperToken';
import { API_ETH_MOCK_ADDRESS } from '../utils/constant';
import { nativeToWrapper } from '../config/nativeToWrapper';
import { DisplayPoolReserveInfo, UserSummary } from '../types';
import { fetchIconSymbolAndName, IconSymbolInterface } from '../utils/icon';
import { CustomMarket, MarketDataType, marketsData } from '../config/market';
import { FormattedReservesAndIncentives, formatUserYield } from '../utils/apy';
import { isSameAddress } from '@/ui/utils';
import { useLendingService } from './useLendingService';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { UpdaterOrPartials, resolveValFromUpdater } from '../types/store';
import { getDataKey, useLendingDataContext } from './LendingDataContext';
import { getProviderByWallet } from '../utils/provider';
import { useWallet } from '@/ui/utils/WalletContext';

//TODO: 有点乱，要整理下
const getMarketInfo = (market?: CustomMarket) => {
  const marketData: MarketDataType | undefined =
    !!market && marketsData[market as CustomMarket]
      ? marketsData[market as CustomMarket]
      : undefined;
  const chainEnum = marketData?.chainId
    ? findChainByID(marketData?.chainId)?.enum
    : undefined;
  const chainInfo = marketData?.chainId
    ? findChainByID(marketData?.chainId)
    : undefined;
  const isMainnet = chainEnum === CHAINS_ENUM.ETH;
  return {
    marketData,
    chainEnum,
    chainInfo,
    isMainnet,
  };
};

function useSelectedMarketKey() {
  const { lastSelectedChain, setLastSelectedChain } = useLendingService();

  return {
    marketKey: lastSelectedChain,
    setMarketKey: setLastSelectedChain,
  };
}

export const useSelectedMarket = () => {
  const { marketKey, setMarketKey } = useSelectedMarketKey();
  const { marketData, chainEnum, chainInfo, isMainnet } = useMemo(
    () => getMarketInfo(marketKey),
    [marketKey]
  );

  return {
    marketKey: marketKey,
    selectedMarketData: marketData,
    setMarketKey,
    chainEnum,
    chainInfo,
    isMainnet,
  };
};

const poolsMap = new Map<
  CustomMarket,
  {
    provider: ethers.providers.Web3Provider;
    uiPoolDataProvider: UiPoolDataProvider;
    walletBalanceProvider: WalletBalanceProvider;
    pool: Pool;
    poolBundle: PoolBundle;
  }
>();

const getCachePools = (
  wallet: ReturnType<typeof useWallet>,
  marketKey?: CustomMarket,
  account?: {
    address: string;
    type: string;
    brandName: string;
  }
) => {
  const { marketData: selectedMarketData, chainInfo } = getMarketInfo(
    marketKey
  );
  if (!marketKey || !selectedMarketData) {
    return undefined;
  }
  const existingPools = poolsMap.get(marketKey as CustomMarket);
  if (existingPools) {
    return existingPools;
  }

  const chainServerId = chainInfo?.serverId || '';
  if (!chainServerId || !selectedMarketData) {
    console.error('Failed to get chainId for market:', {
      marketKey,
      chainInfo,
      selectedMarketData: selectedMarketData?.chainId,
    });
    return undefined;
  }

  const provider = getProviderByWallet(wallet, chainServerId, account);
  const newPools = {
    provider,
    uiPoolDataProvider: new UiPoolDataProvider({
      uiPoolDataProviderAddress:
        selectedMarketData.addresses.UI_POOL_DATA_PROVIDER,
      provider,
      chainId: selectedMarketData.chainId,
    }),
    walletBalanceProvider: new WalletBalanceProvider({
      walletBalanceProviderAddress:
        selectedMarketData.addresses.WALLET_BALANCE_PROVIDER,
      provider,
    }),
    pool: new Pool(provider, {
      POOL: selectedMarketData.addresses.LENDING_POOL,
      REPAY_WITH_COLLATERAL_ADAPTER:
        selectedMarketData.addresses.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER:
        selectedMarketData.addresses.SWAP_COLLATERAL_ADAPTER,
      WETH_GATEWAY: selectedMarketData.addresses.WETH_GATEWAY,
      L2_ENCODER: selectedMarketData.addresses.L2_ENCODER,
    }),
    poolBundle: new PoolBundle(provider, {
      POOL: selectedMarketData.addresses.LENDING_POOL,
      WETH_GATEWAY: selectedMarketData.addresses.WETH_GATEWAY,
      L2_ENCODER: selectedMarketData.addresses.L2_ENCODER,
    }),
  };
  poolsMap.set(marketKey as CustomMarket, newPools);
  return newPools;
};

const fetchContractData = async (
  wallet: ReturnType<typeof useWallet>,
  address: string,
  marketKey?: CustomMarket,
  getMarketKeyFromContext?: () => CustomMarket,
  account?: {
    address: string;
    type: string;
    brandName: string;
  }
) => {
  const selectedMarketData = getSelectedMarketInfo(
    marketKey,
    getMarketKeyFromContext
  ).marketData;
  const pools = getPools(wallet, getMarketKeyFromContext, address, account);
  if (!selectedMarketData || !pools) {
    return {};
  }

  try {
    const [reserves, userReserves, walletBalances, eModes] = await Promise.all([
      pools.uiPoolDataProvider.getReservesHumanized({
        lendingPoolAddressProvider:
          selectedMarketData.addresses.LENDING_POOL_ADDRESS_PROVIDER,
      }),
      pools.uiPoolDataProvider.getUserReservesHumanized({
        lendingPoolAddressProvider:
          selectedMarketData.addresses.LENDING_POOL_ADDRESS_PROVIDER,
        user: address,
      }),
      pools.walletBalanceProvider.getUserWalletBalancesForLendingPoolProvider(
        address,
        selectedMarketData.addresses.LENDING_POOL_ADDRESS_PROVIDER
      ),
      pools.uiPoolDataProvider.getEModesHumanized({
        lendingPoolAddressProvider:
          selectedMarketData.addresses.LENDING_POOL_ADDRESS_PROVIDER,
      }),
    ]);

    return {
      reserves,
      userReserves,
      walletBalances,
      // walletBalances: EMPTY_WALLET_BALANCES as UserWalletBalancesResponse,
      eModes,
    };
  } catch (error) {
    console.error('CUSTOM_LOGGER:=>: error', error);
    return {};
  }
};
export const usePoolDataProviderContract = () => {
  const { selectedMarketData, marketKey, chainEnum } = useSelectedMarket();
  const wallet = useWallet();
  const [pools, setPools] = useState<
    | {
        provider: ethers.providers.Web3Provider;
        uiPoolDataProvider: UiPoolDataProvider;
        walletBalanceProvider: WalletBalanceProvider;
        pool: Pool;
        poolBundle: PoolBundle;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    if (!marketKey || !selectedMarketData) {
      setPools(undefined);
      return;
    }
    const pools = getCachePools(wallet, marketKey);
    if (pools) {
      setPools(pools);
    }
  }, [wallet, marketKey, selectedMarketData]);

  return {
    pools,
    selectedMarketData,
    chainEnum,
  };
};

const EMPTY_WALLET_BALANCES: UserWalletBalancesResponse = { 0: [], 1: [] };

type RemoteDataState = {
  reserves: ReservesDataHumanized | undefined;
  userReserves:
    | {
        userReserves: UserReserveDataHumanized[];
        userEmodeCategoryId: number;
      }
    | undefined;
  walletBalances: UserWalletBalancesResponse;
  eModes: EmodeDataHumanized[] | undefined;
};

function getInitRemoteData() {
  return {
    reserves: undefined,
    userReserves: undefined,
    walletBalances: EMPTY_WALLET_BALANCES,
    eModes: undefined,
  };
}
type RemoteDataKey = `${CustomMarket}::${string}`;
function encodeRemoteDataKey(
  marketKey: CustomMarket,
  address: string
): RemoteDataKey {
  return `${marketKey}::${address}`;
}

function useCurrentLendingDataKey() {
  const { marketKey } = useSelectedMarketKey();
  const currentAccount = useCurrentAccount();
  const currentAddress = currentAccount?.address || '';
  const lendingDataKey = useMemo(() => {
    return !currentAddress
      ? ''
      : encodeRemoteDataKey(marketKey, currentAddress);
  }, [currentAddress, marketKey]);

  return {
    marketKey,
    currentAddress,
    lendingDataKey,
  };
}

const DEFAULT_LENDING_REMOTE_DATA = getInitRemoteData();
export function useLendingRemoteData() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getRemoteData } = useLendingDataContext();

  const remoteData = useMemo(
    () =>
      lendingDataKey
        ? getRemoteData(lendingDataKey as RemoteDataKey)
        : DEFAULT_LENDING_REMOTE_DATA,
    [lendingDataKey, getRemoteData]
  );

  return {
    reserves: remoteData.reserves,
    userReserves: remoteData.userReserves,
    walletBalances: remoteData.walletBalances,
    eModes: remoteData.eModes,
  };
}

function mapItem<T extends IconSymbolInterface>(item: T): T {
  return {
    ...item,
    ...fetchIconSymbolAndName(item),
  };
}

function re_formatReserves(params: Parameters<typeof formatReserves>[0]) {
  return (formatReserves(params) || []).map(mapItem);
}

const DEFAULT_RESERVES_AND_INCENTIVES = {
  formattedReserves: null as null | ReturnType<typeof re_formatReserves>,
  formattedPoolReservesAndIncentives: [] as FormattedReservesAndIncentives[],
};

function computeFormattedReservesAndIncentives({
  reserves,
  eModes,
}: {
  reserves: ReservesDataHumanized | undefined;
  eModes: EmodeDataHumanized[] | undefined;
}) {
  if (!reserves) {
    return DEFAULT_RESERVES_AND_INCENTIVES;
  }

  const reservesArray = reserves.reservesData;
  const baseCurrencyData = reserves.baseCurrencyData;
  const currentTimestamp = dayjs().unix();

  const formattedReserves = (
    formatReserves({
      reserves: reservesArray,
      currentTimestamp,
      eModes,
      marketReferenceCurrencyDecimals:
        baseCurrencyData.marketReferenceCurrencyDecimals,
      marketReferencePriceInUsd:
        baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    }) || []
  ).map(mapItem);
  const formattedPoolReservesAndIncentives = ((
    formatReservesAndIncentives({
      reserves: reservesArray,
      currentTimestamp,
      marketReferenceCurrencyDecimals:
        baseCurrencyData.marketReferenceCurrencyDecimals,
      marketReferencePriceInUsd:
        baseCurrencyData.marketReferenceCurrencyPriceInUsd,
      reserveIncentives: [],
      eModes,
    }) || []
  ).map(mapItem) as unknown) as FormattedReservesAndIncentives[];

  return {
    formattedReserves,
    formattedPoolReservesAndIncentives,
  };
}

export function useFormattedReservesAtom() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  return useMemo(
    () =>
      lendingDataKey
        ? getComputedInfo(lendingDataKey as RemoteDataKey)
            .formattedReservesAndIncentivesState.formattedReserves
        : null,
    [lendingDataKey, getComputedInfo]
  );
}

export function useFormattedPoolReservesAndIncentivesAtom() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  return useMemo(
    () =>
      lendingDataKey
        ? getComputedInfo(lendingDataKey as RemoteDataKey)
            .formattedReservesAndIncentivesState
            .formattedPoolReservesAndIncentives
        : [],
    [lendingDataKey, getComputedInfo]
  );
}

function computeIUserSummary({
  userReserves,
  reserves,
  formattedReserves,
}: Pick<RemoteDataState, 'userReserves' | 'reserves'> & {
  formattedReserves: ReturnType<typeof formatReservesAndIncentives> | null;
}) {
  if (!userReserves || !formattedReserves) {
    return null;
  }

  const baseCurrencyData = reserves?.baseCurrencyData;
  if (!baseCurrencyData) {
    return null;
  }

  const currentTimestamp = dayjs().unix();
  const userReservesArray = userReserves.userReserves;

  const syncResult = formatUserSummaryAndIncentives({
    currentTimestamp,
    marketReferencePriceInUsd:
      baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    marketReferenceCurrencyDecimals:
      baseCurrencyData.marketReferenceCurrencyDecimals,
    userReserves: userReservesArray,
    formattedReserves,
    userEmodeCategoryId: userReserves.userEmodeCategoryId,
    reserveIncentives: [],
    userIncentives: [],
  });

  return syncResult;
}

type MappedBalances = Array<{ address: string; amount: string }>;

function computeMappedBalances({
  walletBalances,
}: Pick<RemoteDataState, 'walletBalances'>) {
  const { 0: tokenAddresses, 1: balances } = walletBalances;
  return tokenAddresses.map((_address, ix) => ({
    address: _address.toLowerCase(),
    amount: balances[ix]?.toString() || '',
  }));
}

function computeDisplayPoolReserves({
  reserves,
  iUserSummary,
  mappedBalances,
  market,
}: {
  reserves: ReservesDataHumanized | undefined;
  iUserSummary: null | ReturnType<typeof formatUserSummaryAndIncentives>;
  mappedBalances: MappedBalances;
  market: CustomMarket;
}) {
  if (!iUserSummary || !reserves?.baseCurrencyData) {
    return [];
  }

  const baseCurrencyData = reserves.baseCurrencyData;
  const chainEnum =
    findChainByID(marketsData[market]?.chainId)?.enum || CHAINS_ENUM.ETH;

  return iUserSummary.userReservesData.map((item) => {
    const balance = mappedBalances.find(
      (x) => x.address === item.reserve.underlyingAsset.toLowerCase()
    );
    return {
      ...item,
      chain: chainEnum,
      walletBalance: normalize(balance?.amount || '0', item.reserve.decimals),
      walletBalanceUSD: nativeToUSD({
        amount: new BigNumber(balance?.amount || '0'),
        currencyDecimals: item.reserve.decimals,
        priceInMarketReferenceCurrency:
          item.reserve.priceInMarketReferenceCurrency,
        marketReferenceCurrencyDecimals:
          baseCurrencyData?.marketReferenceCurrencyDecimals || 0,
        normalizedMarketReferencePriceInUsd: normalize(
          baseCurrencyData?.marketReferenceCurrencyPriceInUsd || '0',
          USD_DECIMALS
        ),
      }),
    };
  }) as DisplayPoolReserveInfo[];
}

export function computeWrapperPoolReserveAndFinalDisplayPoolReserves({
  displayPoolReserves,
  formattedPoolReservesAndIncentives,
  mappedBalances,
  reserves,
  market,
}: {
  displayPoolReserves: DisplayPoolReserveInfo[];
  formattedPoolReservesAndIncentives: ReturnType<
    typeof formatReservesAndIncentives
  >;
  mappedBalances: MappedBalances;
  reserves: ReservesDataHumanized | undefined;
  market: CustomMarket;
}) {
  const chainEnum =
    findChainByID(marketsData[market]?.chainId)?.enum || CHAINS_ENUM.ETH;
  if (
    !displayPoolReserves.length ||
    !formattedPoolReservesAndIncentives.length
  ) {
    return {
      wrapperPoolReserve: null,
      finalDisplayPoolReserves: displayPoolReserves,
    };
  }

  const wrapperReserve = displayPoolReserves.find((item) => {
    return isSameAddress(
      item.reserve.underlyingAsset,
      wrapperToken?.[chainEnum]?.address
    );
  });

  const wrapperPoolReserve = formattedPoolReservesAndIncentives.find((item) =>
    isSameAddress(item.underlyingAsset, wrapperToken?.[chainEnum]?.address)
  );

  const finalDisplayPoolReserves = [...displayPoolReserves];

  if (wrapperReserve && reserves?.baseCurrencyData) {
    const balance = mappedBalances.find((x) =>
      isSameAddress(x.address, API_ETH_MOCK_ADDRESS)
    );
    const baseCurrencyData = reserves.baseCurrencyData;

    finalDisplayPoolReserves.unshift({
      ...wrapperReserve,
      underlyingAsset: API_ETH_MOCK_ADDRESS.toLowerCase(),
      reserve: {
        ...wrapperReserve.reserve,
        symbol: wrapperToken?.[chainEnum]?.origin?.symbol || 'ETH',
        name: wrapperToken?.[chainEnum]?.origin?.name || 'ETH',
        underlyingAsset: API_ETH_MOCK_ADDRESS.toLowerCase(),
      },
      walletBalance: normalize(
        balance?.amount || '0',
        wrapperReserve.reserve.decimals
      ),
      chain: chainEnum,
      walletBalanceUSD: nativeToUSD({
        amount: new BigNumber(balance?.amount || '0'),
        currencyDecimals: wrapperReserve.reserve.decimals,
        priceInMarketReferenceCurrency:
          wrapperReserve.reserve.priceInMarketReferenceCurrency,
        marketReferenceCurrencyDecimals:
          baseCurrencyData?.marketReferenceCurrencyDecimals || 0,
        normalizedMarketReferencePriceInUsd: normalize(
          baseCurrencyData?.marketReferenceCurrencyPriceInUsd || '0',
          USD_DECIMALS
        ),
      }),
    });
  }

  return {
    wrapperPoolReserve,
    finalDisplayPoolReserves,
  };
}

function computeApyInfo({
  formattedPoolReservesAndIncentives,
  iUserSummary,
}: {
  formattedPoolReservesAndIncentives: FormattedReservesAndIncentives[];
  iUserSummary: null | UserSummary;
}) {
  if (!formattedPoolReservesAndIncentives.length || !iUserSummary) {
    return null;
  }

  return formatUserYield(formattedPoolReservesAndIncentives, iUserSummary);
}

type IndexedComputedInfo = {
  formattedReservesAndIncentivesState: typeof DEFAULT_RESERVES_AND_INCENTIVES;
  iUserSummary: null | UserSummary;
  mappedBalances: { address: string; amount: string }[];
  displayPoolReserves: DisplayPoolReserveInfo[];
  wrapperPoolReserveAndFinalDisplayPoolReserves: ReturnType<
    typeof computeWrapperPoolReserveAndFinalDisplayPoolReserves
  >;
  apyInfo: null | ReturnType<typeof formatUserYield>;
};
function getInitComputedInfo(): IndexedComputedInfo {
  return {
    formattedReservesAndIncentivesState: DEFAULT_RESERVES_AND_INCENTIVES,
    iUserSummary: null,
    mappedBalances: [],
    displayPoolReserves: [],
    wrapperPoolReserveAndFinalDisplayPoolReserves: {
      wrapperPoolReserve: null,
      finalDisplayPoolReserves: [],
    },
    apyInfo: null,
  };
}
const DEFAULT_COMPUTED_INFO = getInitComputedInfo();
function getComputedInfoByKey(
  lendingDataKey: string,
  getComputedInfo: (key: RemoteDataKey) => IndexedComputedInfo
) {
  return lendingDataKey
    ? getComputedInfo(lendingDataKey as RemoteDataKey)
    : DEFAULT_COMPUTED_INFO;
}

const useRefreshHistoryId = () => {
  const { lendingLoadState, setRefreshHistoryId } = useLendingDataContext();
  const refreshHistoryId = lendingLoadState.refreshHistoryId;
  const refresh = useCallback(() => {
    setRefreshHistoryId((e) => e + 1);
  }, [setRefreshHistoryId]);
  return { refreshHistoryId, refresh };
};

// const setRemoteTaskRef: RefLikeObject<null | ReturnType<
//   typeof InteractionManager.runAfterInteractions
// >> = { current: null };
const createGlobalSets = (
  setRemoteData: (
    addr: string,
    marketKey: CustomMarket,
    valOrFunc: UpdaterOrPartials<RemoteDataState>
  ) => void,
  setComputedInfo: (
    lendingDataKey: RemoteDataKey,
    computedInfo: IndexedComputedInfo
  ) => void,
  setLoading: (
    loading: boolean,
    indexes?: {
      address?: string;
      marketKey?: CustomMarket;
    }
  ) => void,
  getMarketKey: () => CustomMarket,
  getRemoteData: (lendingDataKey: RemoteDataKey) => RemoteDataState
) => {
  return {
    setRemoteData: debounce(
      (
        addr: string,
        marketKey: CustomMarket,
        valOrFunc: UpdaterOrPartials<RemoteDataState>
      ) => {
        const lendingDataKey = encodeRemoteDataKey(marketKey, addr);

        setRemoteData(addr, marketKey, valOrFunc);

        const prevData = getRemoteData(lendingDataKey);
        const { newVal } = resolveValFromUpdater(prevData, valOrFunc, {
          strict: false,
        });

        const formattedReservesAndIncentives = computeFormattedReservesAndIncentives(
          newVal
        );

        const iUserSummary = computeIUserSummary({
          ...newVal,
          formattedReserves: formattedReservesAndIncentives.formattedReserves,
        });

        const mappedBalances = computeMappedBalances({
          walletBalances: newVal.walletBalances,
        });

        const currentMarketKey = getMarketKey();

        const displayPoolReserves = computeDisplayPoolReserves({
          ...newVal,
          iUserSummary: iUserSummary as UserSummary,
          mappedBalances: mappedBalances,
          market: currentMarketKey,
        });

        const wrapperPoolReserveAndFinalDisplayPoolReserves = computeWrapperPoolReserveAndFinalDisplayPoolReserves(
          {
            displayPoolReserves: displayPoolReserves,
            formattedPoolReservesAndIncentives:
              formattedReservesAndIncentives.formattedPoolReservesAndIncentives,
            mappedBalances: mappedBalances,
            reserves: newVal.reserves,
            market: currentMarketKey,
          }
        );

        const apyInfo = computeApyInfo({
          formattedPoolReservesAndIncentives:
            formattedReservesAndIncentives.formattedPoolReservesAndIncentives,
          iUserSummary: iUserSummary as UserSummary,
        });

        setComputedInfo(lendingDataKey, {
          formattedReservesAndIncentivesState: formattedReservesAndIncentives,
          iUserSummary: iUserSummary as UserSummary | null,
          mappedBalances: mappedBalances,
          displayPoolReserves: displayPoolReserves,
          wrapperPoolReserveAndFinalDisplayPoolReserves: {
            wrapperPoolReserve:
              wrapperPoolReserveAndFinalDisplayPoolReserves.wrapperPoolReserve ||
              null,
            finalDisplayPoolReserves:
              wrapperPoolReserveAndFinalDisplayPoolReserves.finalDisplayPoolReserves,
          },
          apyInfo: apyInfo,
        });
      },
      200
    ),

    setLoading,
  };
};

const createFetchLendingData = (
  globalSets: ReturnType<typeof createGlobalSets>,
  getMarketKeyFromContext: () => CustomMarket,
  wallet: ReturnType<typeof useWallet>
) => {
  return debounce(
    async (options?: {
      accountAddress?: string;
      account?: {
        address: string;
        type: string;
        brandName: string;
      };
      ignoreLoading?: boolean;
      persistOnly?: boolean;
      marketKey?: CustomMarket;
    }) => {
      const { accountAddress, account, marketKey: paramMarketKey } =
        options || {};

      const requestAddress = accountAddress;
      if (!requestAddress) {
        return;
      }

      const marketKey = paramMarketKey || getMarketKey(getMarketKeyFromContext);
      if (!marketKey) return;

      globalSets.setLoading(true, { address: requestAddress, marketKey });
      return fetchContractData(
        wallet,
        requestAddress,
        marketKey,
        getMarketKeyFromContext,
        account
      )
        .then(async (data) => {
          globalSets.setRemoteData(requestAddress, marketKey, data);

          globalSets.setLoading(false, {
            address: requestAddress,
            marketKey,
          });
        })
        .catch(() => {
          globalSets.setLoading(false, { address: requestAddress, marketKey });
        });
    },
    500
  );
};

function getSelectedMarketInfo(
  marketKey?: CustomMarket,
  getMarketKeyFromContext?: () => CustomMarket
) {
  const market =
    marketKey || getMarketKeyFromContext?.() || CustomMarket.proto_mainnet_v3;
  return getMarketInfo(market);
}
function getMarketKey(getMarketKeyFromContext?: () => CustomMarket) {
  return getMarketKeyFromContext?.() || CustomMarket.proto_mainnet_v3;
}
function getPools(
  wallet: ReturnType<typeof useWallet>,
  getMarketKeyFromContext?: () => CustomMarket,
  accountAddress?: string,
  account?: {
    address: string;
    type: string;
    brandName: string;
  }
) {
  const marketKey = getMarketKey(getMarketKeyFromContext);
  const selectedMarketData = getSelectedMarketInfo(
    marketKey,
    getMarketKeyFromContext
  ).marketData;
  if (!marketKey || !selectedMarketData) {
    return undefined;
  }
  return getCachePools(wallet, marketKey, account);
}

export const useApisLending = () => {
  const wallet = useWallet();
  const {
    setRemoteData,
    setComputedInfo,
    setLoading,
    getRemoteData,
  } = useLendingDataContext();
  const { lastSelectedChain } = useLendingService();

  const getMarketKeyFromContext = useCallback(() => lastSelectedChain, [
    lastSelectedChain,
  ]);

  const globalSets = useMemo(
    () =>
      createGlobalSets(
        setRemoteData,
        setComputedInfo,
        setLoading,
        getMarketKeyFromContext,
        getRemoteData
      ),
    [
      setRemoteData,
      setComputedInfo,
      setLoading,
      getMarketKeyFromContext,
      getRemoteData,
    ]
  );

  const fetchLendingData = useMemo(() => {
    return createFetchLendingData(globalSets, getMarketKeyFromContext, wallet);
  }, [globalSets, getMarketKeyFromContext, wallet]);

  return {
    fetchLendingData,
    setLoading: globalSets.setLoading,
  };
};

const useFetchLendingData = () => {
  const currentAccount = useCurrentAccount();
  const { marketKey } = useSelectedMarketKey();
  const { fetchLendingData, setLoading } = useApisLending();

  const fetchData = useCallback(() => {
    return fetchLendingData({
      accountAddress: currentAccount?.address,
      account: currentAccount
        ? {
            address: currentAccount.address,
            type: currentAccount.type,
            brandName: currentAccount.brandName,
          }
        : undefined,
      marketKey,
    });
  }, [fetchLendingData, currentAccount, marketKey]);

  const setFetchLoading = useCallback(
    (loading: boolean) => {
      setLoading(loading, { address: currentAccount?.address, marketKey });
    },
    [currentAccount?.address, marketKey, setLoading]
  );

  return {
    fetchData,
    setFetchLoading,
  };
};

const useLendingSummary = () => {
  const { iUserSummary } = useLendingISummary();
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  const {
    formattedReservesAndIncentivesState: { formattedPoolReservesAndIncentives },
    wrapperPoolReserveAndFinalDisplayPoolReserves: {
      finalDisplayPoolReserves,
      wrapperPoolReserve,
    },
    apyInfo,
  } = useMemo(
    () =>
      lendingDataKey
        ? getComputedInfo(lendingDataKey as RemoteDataKey)
        : getInitComputedInfo(),
    [lendingDataKey, getComputedInfo]
  );

  const getTargetReserve = useCallback(
    (underlyingAsset: string) => {
      const validAddress = isValidAddress(underlyingAsset);
      const nativeWrapperReserveAddress = wrapperPoolReserve?.underlyingAsset;
      const defaultAddress = nativeToWrapper[underlyingAsset];
      const realTimeReserve = finalDisplayPoolReserves?.find((item) =>
        isSameAddress(
          item.underlyingAsset,
          validAddress
            ? underlyingAsset
            : nativeWrapperReserveAddress || defaultAddress
        )
      );
      return realTimeReserve;
    },
    [finalDisplayPoolReserves, wrapperPoolReserve?.underlyingAsset]
  );

  return {
    displayPoolReserves: finalDisplayPoolReserves,
    iUserSummary,
    formattedPoolReservesAndIncentives,
    wrapperPoolReserve,
    apyInfo,
    getTargetReserve,
  };
};

export function useLendingSummaryCard() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  const computedInfo = useMemo(
    () =>
      lendingDataKey
        ? getComputedInfo(lendingDataKey as RemoteDataKey)
        : getInitComputedInfo(),
    [lendingDataKey, getComputedInfo]
  );
  const iUserSummary = useMemo(
    () => ({
      totalLiquidityMarketReferenceCurrency:
        computedInfo.iUserSummary?.totalLiquidityMarketReferenceCurrency || '0',
      healthFactor: computedInfo.iUserSummary?.healthFactor || '0',
      netWorthUSD: computedInfo.iUserSummary?.netWorthUSD || '0',
      totalBorrowsUSD: computedInfo.iUserSummary?.totalBorrowsUSD || '0',
      totalLiquidityUSD: computedInfo.iUserSummary?.totalLiquidityUSD || '0',
    }),
    [computedInfo]
  );
  const apyInfo = useMemo(() => computedInfo.apyInfo, [computedInfo]);
  const netAPY = useMemo(() => apyInfo?.netAPY || 0, [apyInfo]);

  return { iUserSummary, netAPY, apyInfo };
}
export function useLendingIsLoading() {
  const currentAccount = useCurrentAccount();
  const currentAddress = currentAccount?.address || '';
  const { lendingLoadState } = useLendingDataContext();
  const { marketKey } = useSelectedMarketKey();
  const loading = useMemo(
    () =>
      lendingLoadState.addrMarketLoading[
        getDataKey(currentAddress, marketKey)
      ] || false,
    [lendingLoadState.addrMarketLoading, currentAddress, marketKey]
  );

  return { loading };
}
export function useLendingPoolContainer() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  const totalLiquidityMarketReferenceCurrency = useMemo(
    () =>
      lendingDataKey
        ? getComputedInfo(lendingDataKey as RemoteDataKey).iUserSummary
            ?.totalLiquidityMarketReferenceCurrency || '0'
        : '0',
    [lendingDataKey, getComputedInfo]
  );
  const { loading } = useLendingIsLoading();

  return {
    totalLiquidityMarketReferenceCurrency,
    loading,
  };
}
export function useLendingISummary() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  const iUserSummary = useMemo(
    () =>
      lendingDataKey
        ? getComputedInfo(lendingDataKey as RemoteDataKey).iUserSummary
        : null,
    [lendingDataKey, getComputedInfo]
  );

  return {
    iUserSummary,
  };
}
export function useHasUserSummary() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  const hasUserSummary = useMemo(
    () =>
      !!(
        lendingDataKey &&
        getComputedInfo(lendingDataKey as RemoteDataKey).iUserSummary
      ),
    [lendingDataKey, getComputedInfo]
  );

  return {
    hasUserSummary,
  };
}
export function useLendingHF() {
  const { lendingDataKey } = useCurrentLendingDataKey();
  const { getComputedInfo } = useLendingDataContext();
  const lendingHf = useMemo(() => {
    if (!lendingDataKey) return null;
    const state = getComputedInfo(lendingDataKey as RemoteDataKey);
    if (!state.iUserSummary) {
      return null;
    }
    return {
      healthFactor: state.iUserSummary?.healthFactor || '0',
      netWorthUSD: state.iUserSummary?.netWorthUSD || '0',
    };
  }, [lendingDataKey, getComputedInfo]);

  return {
    lendingHf,
  };
}

export { useFetchLendingData, useLendingSummary, useRefreshHistoryId };
