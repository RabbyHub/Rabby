import { NFT_SYNC_SCENE, CACHE_VALID_DURATION } from '@/db/constants';
import { nftDbService } from '@/db/services/nftDbService';
import { syncDbService } from '@/db/services/syncDbService';
import { isFullVersionAccountType } from '@/utils/account';
import { CollectionList } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useRef } from 'react';
import { isSameAddress } from '../utils';
import { useSafeState } from '../utils/safeState';
import { useWallet } from '../utils/WalletContext';

export const useNFTCollections = (userAddr: string | undefined) => {
  const wallet = useWallet();
  const abortProcess = useRef<AbortController>();
  const userAddrRef = useRef('');

  const [collections, setCollections] = useSafeState<CollectionList[]>([]);
  const [hasValue, setHasValue] = useSafeState(false);
  const [isLoading, setLoading] = useSafeState(true);

  const applyCollections = useCallback(
    (nextCollections: CollectionList[]) => {
      setCollections(nextCollections);
      setHasValue(nextCollections.length > 0);
    },
    [setCollections, setHasValue]
  );

  const loadProcess = useCallback(
    async ({ forceRefresh = false } = {}) => {
      if (!userAddr) {
        applyCollections([]);
        setLoading(false);
        return;
      }

      abortProcess.current?.abort();
      const currentAbort = new AbortController();
      abortProcess.current = currentAbort;

      setLoading(true);

      let currentCollections: CollectionList[] = [];
      const matchedAccount = await wallet.getAccountByAddress(userAddr);
      const shouldPersistNFTCache = matchedAccount
        ? isFullVersionAccountType(matchedAccount as any)
        : false;

      try {
        if (shouldPersistNFTCache) {
          currentCollections = await nftDbService.queryCollections(userAddr);

          if (currentAbort.signal.aborted) {
            setLoading(false);
            return;
          }

          if (currentCollections.length) {
            applyCollections(currentCollections);
            setLoading(false);
          }

          const updatedAt =
            (await syncDbService.getUpdatedAt({
              address: userAddr,
              scene: NFT_SYNC_SCENE,
            })) || 0;

          const shouldUseDbCache =
            currentCollections.length > 0 &&
            !forceRefresh &&
            updatedAt > Date.now() - CACHE_VALID_DURATION;

          if (shouldUseDbCache) {
            return;
          }
        } else {
          await Promise.all([
            nftDbService.deleteForAddress(userAddr),
            syncDbService.deleteSceneForAddress({
              address: userAddr,
              scene: NFT_SYNC_SCENE,
            }),
          ]);
        }
      } catch (error) {
        // ignore Dexie failures and continue with the remote snapshot
      }

      try {
        currentCollections = await wallet.openapi.collectionList({
          id: userAddr,
          isAll: true,
        });

        if (currentAbort.signal.aborted) {
          setLoading(false);
          return;
        }

        applyCollections(currentCollections);

        if (shouldPersistNFTCache) {
          await nftDbService.replaceAddressCollections(
            userAddr,
            currentCollections
          );
          await syncDbService.setUpdatedAt({
            address: userAddr,
            scene: NFT_SYNC_SCENE,
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        // keep stale data if the remote snapshot fails
      } finally {
        if (!currentAbort.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [applyCollections, setLoading, userAddr, wallet]
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (userAddr && !isSameAddress(userAddr, userAddrRef.current)) {
      applyCollections([]);
    }

    if (userAddr) {
      timer = setTimeout(() => {
        if (!isSameAddress(userAddr, userAddrRef.current)) {
          abortProcess.current?.abort();
          userAddrRef.current = userAddr;
          loadProcess();
        }
      });
    } else {
      applyCollections([]);
      setLoading(false);
    }

    return () => {
      abortProcess.current?.abort();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [applyCollections, loadProcess, setLoading, userAddr]);

  useEffect(() => {
    return () => {
      abortProcess.current?.abort();
    };
  }, []);

  const refresh = useCallback(async () => {
    await loadProcess({ forceRefresh: true });
  }, [loadProcess]);

  return {
    collections: collections || [],
    hasValue: !!hasValue,
    isLoading: !!isLoading,
    refresh,
  };
};
