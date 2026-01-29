import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { debounce } from 'lodash';
import { CustomMarket } from '../config/market';
import { UpdaterOrPartials, resolveValFromUpdater } from '../types/store';
import {
  ReservesDataHumanized,
  UserReserveDataHumanized,
  UserWalletBalancesResponse,
  EmodeDataHumanized,
} from '@aave/contract-helpers';
import { FormattedReservesAndIncentives } from '../utils/apy';
import { DisplayPoolReserveInfo, UserSummary } from '../types';
import { computeWrapperPoolReserveAndFinalDisplayPoolReserves } from '.';

const EMPTY_WALLET_BALANCES: UserWalletBalancesResponse = { 0: [], 1: [] };

type RemoteDataKey = `${CustomMarket}::${string}`;

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

function getInitRemoteData(): RemoteDataState {
  return {
    reserves: undefined,
    userReserves: undefined,
    walletBalances: EMPTY_WALLET_BALANCES,
    eModes: undefined,
  };
}

type IndexedComputedInfo = {
  formattedReservesAndIncentivesState: {
    formattedReserves: null | any[];
    formattedPoolReservesAndIncentives: FormattedReservesAndIncentives[];
  };
  iUserSummary: null | UserSummary;
  mappedBalances: { address: string; amount: string }[];
  displayPoolReserves: DisplayPoolReserveInfo[];
  wrapperPoolReserveAndFinalDisplayPoolReserves: ReturnType<
    typeof computeWrapperPoolReserveAndFinalDisplayPoolReserves
  >;
  apyInfo: null | any;
};

function getInitComputedInfo(): IndexedComputedInfo {
  return {
    formattedReservesAndIncentivesState: {
      formattedReserves: null,
      formattedPoolReservesAndIncentives: [],
    },
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

type LendingDataContextValue = {
  remoteDataState: Record<RemoteDataKey, RemoteDataState>;
  computedInfoState: Record<RemoteDataKey, IndexedComputedInfo>;
  lendingLoadState: {
    addrMarketLoading: Record<string, boolean>;
    refreshHistoryId: number;
  };
  setRemoteData: (
    addr: string,
    marketKey: CustomMarket,
    valOrFunc: UpdaterOrPartials<RemoteDataState>
  ) => void;
  setComputedInfo: (
    lendingDataKey: RemoteDataKey,
    computedInfo: IndexedComputedInfo
  ) => void;
  setLoading: (
    loading: boolean,
    indexes?: {
      address?: string;
      marketKey?: CustomMarket;
    }
  ) => void;
  setRefreshHistoryId: (valOrFunc: UpdaterOrPartials<number>) => void;
  getRemoteData: (lendingDataKey: RemoteDataKey) => RemoteDataState;
  getComputedInfo: (lendingDataKey: RemoteDataKey) => IndexedComputedInfo;
};

const LendingDataContext = createContext<LendingDataContextValue | null>(null);

export const LendingDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [remoteDataState, setRemoteDataState] = useState<
    Record<RemoteDataKey, RemoteDataState>
  >({} as Record<RemoteDataKey, RemoteDataState>);

  const [computedInfoState, setComputedInfoState] = useState<
    Record<RemoteDataKey, IndexedComputedInfo>
  >({} as Record<RemoteDataKey, IndexedComputedInfo>);

  const [lendingLoadState, setLendingLoadState] = useState<{
    addrMarketLoading: Record<string, boolean>;
    refreshHistoryId: number;
  }>({
    addrMarketLoading: {},
    refreshHistoryId: 0,
  });

  const setRemoteData = useCallback(
    (
      addr: string,
      marketKey: CustomMarket,
      valOrFunc: UpdaterOrPartials<RemoteDataState>
    ) => {
      const lendingDataKey = `${marketKey}::${addr}` as RemoteDataKey;
      setRemoteDataState((prev) => {
        const prevData = prev[lendingDataKey] || getInitRemoteData();
        const { newVal } = resolveValFromUpdater(prevData, valOrFunc, {
          strict: false,
        });
        return {
          ...prev,
          [lendingDataKey]: newVal,
        };
      });
    },
    []
  );

  const setComputedInfo = useCallback(
    (lendingDataKey: RemoteDataKey, computedInfo: IndexedComputedInfo) => {
      setComputedInfoState((prev) => ({
        ...prev,
        [lendingDataKey]: computedInfo,
      }));
    },
    []
  );

  const setLoading = useCallback(
    (
      loading: boolean,
      indexes?: {
        address?: string;
        marketKey?: CustomMarket;
      }
    ) => {
      if (!indexes?.address || !indexes?.marketKey) {
        console.warn('setLoading missing params', indexes);
        return;
      }

      const lendingDataKey = `${indexes.marketKey}::${indexes.address}`;
      setLendingLoadState((prev) => ({
        ...prev,
        addrMarketLoading: {
          ...prev.addrMarketLoading,
          [lendingDataKey]: loading,
        },
      }));
    },
    []
  );

  const setRefreshHistoryId = useCallback(
    (valOrFunc: UpdaterOrPartials<number>) => {
      setLendingLoadState((prev) => {
        const { newVal } = resolveValFromUpdater(
          prev.refreshHistoryId,
          valOrFunc,
          {
            strict: false,
          }
        );
        return {
          ...prev,
          refreshHistoryId: newVal,
        };
      });
    },
    []
  );

  const getRemoteData = useCallback(
    (lendingDataKey: RemoteDataKey): RemoteDataState => {
      return remoteDataState[lendingDataKey] || getInitRemoteData();
    },
    [remoteDataState]
  );

  const getComputedInfo = useCallback(
    (lendingDataKey: RemoteDataKey): IndexedComputedInfo => {
      return computedInfoState[lendingDataKey] || getInitComputedInfo();
    },
    [computedInfoState]
  );

  const debouncedSetRemoteData = useMemo(
    () =>
      debounce(
        (
          addr: string,
          marketKey: CustomMarket,
          valOrFunc: UpdaterOrPartials<RemoteDataState>
        ) => {
          setRemoteData(addr, marketKey, valOrFunc);
        },
        200
      ),
    [setRemoteData]
  );

  const contextValue = useMemo<LendingDataContextValue>(
    () => ({
      remoteDataState,
      computedInfoState,
      lendingLoadState,
      setRemoteData: debouncedSetRemoteData,
      setComputedInfo,
      setLoading,
      setRefreshHistoryId,
      getRemoteData,
      getComputedInfo,
    }),
    [
      remoteDataState,
      computedInfoState,
      lendingLoadState,
      debouncedSetRemoteData,
      setComputedInfo,
      setLoading,
      setRefreshHistoryId,
      getRemoteData,
      getComputedInfo,
    ]
  );

  return (
    <LendingDataContext.Provider value={contextValue}>
      {children}
    </LendingDataContext.Provider>
  );
};

export const useLendingDataContext = () => {
  const ctx = useContext(LendingDataContext);
  if (!ctx) {
    throw new Error(
      'useLendingDataContext must be used within LendingDataProvider'
    );
  }
  return ctx;
};
