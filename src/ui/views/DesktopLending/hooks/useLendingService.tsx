import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMemoizedFn } from 'ahooks';
import { CustomMarket } from '../config/market';
import { useWallet } from '@/ui/utils';

interface LendingServiceStore {
  lastSelectedChain: CustomMarket;
  skipHealthFactorWarning: boolean;
}

type LendingContextValue = {
  lastSelectedChain: CustomMarket;
  skipHealthFactorWarning: boolean;
  lendingStore: LendingServiceStore;
  setLastSelectedChain: (chainId: CustomMarket) => Promise<void>;
  getLastSelectedChain: () => Promise<CustomMarket>;
  setSkipHealthFactorWarning: (skip: boolean) => Promise<void>;
  getSkipHealthFactorWarning: () => Promise<boolean>;
  syncState: () => Promise<void>;
};

const LendingContext = createContext<LendingContextValue | null>(null);

const defaultStore: LendingServiceStore = {
  lastSelectedChain: CustomMarket.proto_mainnet_v3,
  skipHealthFactorWarning: false,
};

export const LendingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lendingStore, setLendingStore] = useState<LendingServiceStore>(
    defaultStore
  );
  const wallet = useWallet();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const initAndLoad = async () => {
      try {
        const [chainId, skipWarning] = await Promise.all([
          wallet.getLastSelectedLendingChain(),
          wallet.getSkipHealthFactorWarning(),
        ]);

        if (!mountedRef.current) return;
        setLendingStore({
          lastSelectedChain: chainId,
          skipHealthFactorWarning: skipWarning,
        });
      } catch (error) {
        console.error('Failed to initialize lending service state:', error);
        // 如果初始化失败，使用默认值
        if (!mountedRef.current) return;
        setLendingStore(defaultStore);
      }
    };

    initAndLoad();
  }, []);

  const setLastSelectedChain = useMemoizedFn(async (chainId: CustomMarket) => {
    try {
      await wallet.setLastSelectedLendingChain(chainId);
      setLendingStore((prev) => ({
        ...prev,
        lastSelectedChain: chainId,
      }));
    } catch (error) {
      console.error('Failed to set last selected chain:', error);
    }
  });

  const getLastSelectedChain = useMemoizedFn(async () => {
    try {
      const chainId = await wallet.getLastSelectedLendingChain();
      setLendingStore((prev) => ({
        ...prev,
        lastSelectedChain: chainId,
      }));
      return chainId;
    } catch (error) {
      console.error('Failed to get last selected chain:', error);
      return CustomMarket.proto_mainnet_v3;
    }
  });

  const setSkipHealthFactorWarning = useMemoizedFn(async (skip: boolean) => {
    try {
      await wallet.setSkipHealthFactorWarning(skip);
      setLendingStore((prev) => ({
        ...prev,
        skipHealthFactorWarning: skip,
      }));
    } catch (error) {
      console.error('Failed to set skip health factor warning:', error);
    }
  });

  const getSkipHealthFactorWarning = useMemoizedFn(async () => {
    try {
      const skip = await wallet.getSkipHealthFactorWarning();
      setLendingStore((prev) => ({
        ...prev,
        skipHealthFactorWarning: skip,
      }));
      return skip;
    } catch (error) {
      console.error('Failed to get skip health factor warning:', error);
      return false;
    }
  });

  const syncState = useMemoizedFn(async () => {
    try {
      const [chainId, skipWarning] = await Promise.all([
        wallet.getLastSelectedLendingChain(),
        wallet.getSkipHealthFactorWarning(),
      ]);
      setLendingStore({
        lastSelectedChain: chainId,
        skipHealthFactorWarning: skipWarning,
      });
    } catch (error) {
      console.error('Failed to sync lending service state:', error);
    }
  });

  const contextValue = useMemo<LendingContextValue>(
    () => ({
      lastSelectedChain:
        lendingStore.lastSelectedChain || CustomMarket.proto_mainnet_v3,
      skipHealthFactorWarning: lendingStore.skipHealthFactorWarning || false,
      lendingStore,
      setLastSelectedChain,
      getLastSelectedChain,
      setSkipHealthFactorWarning,
      getSkipHealthFactorWarning,
      syncState,
    }),
    [
      lendingStore,
      setLastSelectedChain,
      getLastSelectedChain,
      setSkipHealthFactorWarning,
      getSkipHealthFactorWarning,
      syncState,
    ]
  );
  return (
    <LendingContext.Provider value={contextValue}>
      {children}
    </LendingContext.Provider>
  );
};

export const useLendingService = () => {
  const ctx = useContext(LendingContext);
  if (!ctx) {
    throw new Error('useLendingService must be used within LendingProvider');
  }
  return ctx;
};
