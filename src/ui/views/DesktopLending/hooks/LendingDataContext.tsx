import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { debounce } from 'lodash';
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
  remoteDataState: RemoteDataState;
  computedInfoState: IndexedComputedInfo;
  lendingLoadState: {
    loading: boolean;
    refreshHistoryId: number;
  };
  setRemoteData: (valOrFunc: UpdaterOrPartials<RemoteDataState>) => void;
  setComputedInfo: (computedInfo: IndexedComputedInfo) => void;
  setLoading: (loading: boolean) => void;
  getRemoteData: () => RemoteDataState;
  getComputedInfo: () => IndexedComputedInfo;
};

const LendingDataContext = createContext<LendingDataContextValue | null>(null);

export const LendingDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [remoteDataState, setRemoteDataState] = useState<RemoteDataState>(
    getInitRemoteData()
  );

  const [
    computedInfoState,
    setComputedInfoState,
  ] = useState<IndexedComputedInfo>(getInitComputedInfo());

  const [lendingLoadState, setLendingLoadState] = useState<{
    loading: boolean;
    refreshHistoryId: number;
  }>({
    loading: false,
    refreshHistoryId: 0,
  });

  const setRemoteData = useCallback(
    (valOrFunc: UpdaterOrPartials<RemoteDataState>) => {
      setRemoteDataState((prev) => {
        return {
          ...prev,
          ...valOrFunc,
        };
      });
    },
    []
  );

  const setComputedInfo = useCallback((computedInfo: IndexedComputedInfo) => {
    setComputedInfoState(computedInfo);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setLendingLoadState((prev) => ({
      ...prev,
      loading,
    }));
  }, []);

  const getRemoteData = useCallback((): RemoteDataState => {
    return remoteDataState;
  }, [remoteDataState]);

  const getComputedInfo = useCallback((): IndexedComputedInfo => {
    return computedInfoState;
  }, [computedInfoState]);

  const debouncedSetRemoteData = useMemo(
    () =>
      debounce((valOrFunc: UpdaterOrPartials<RemoteDataState>) => {
        setRemoteData(valOrFunc);
      }, 200),
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
