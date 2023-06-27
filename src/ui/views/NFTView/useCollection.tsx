import { useWallet } from '@/ui/utils';
import React from 'react';
import { CollectionList } from '@rabby-wallet/rabby-api/dist/types';
import { useRabbySelector } from '@/ui/store';
import { Token } from '@/background/service/preference';

export const useCollection = () => {
  const wallet = useWallet();
  const [starredToken, setStarredToken] = React.useState<Token[]>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [list, setList] = React.useState<CollectionList[]>([]);
  const [starredList, setStarredList] = React.useState<CollectionList[]>([]);
  const { currentAccount } = useRabbySelector((s) => s.account);

  const checkStarred = React.useCallback(
    (collection: CollectionList) => {
      return starredList?.some(
        (item) => item.id === collection.id && item.chain === collection.chain
      );
    },
    [starredList]
  );

  const fetchData = React.useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const collections = await wallet.openapi.collectionList({
        id,
        isAll: false,
      });

      setList(collections);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onToggleStar = React.useCallback(
    async (collection: CollectionList) => {
      if (checkStarred(collection)) {
        await wallet.removeCollectionStarred({
          address: collection.id,
          chain: collection.chain,
        });
      } else {
        await wallet.addCollectionStarred({
          address: collection.id,
          chain: collection.chain,
        });
      }

      await wallet.getCollectionStarred().then(setStarredToken);
    },
    [checkStarred, fetchData]
  );

  React.useEffect(() => {
    wallet.getCollectionStarred().then(setStarredToken);
  }, []);

  React.useEffect(() => {
    if (currentAccount) {
      fetchData(currentAccount.address);
    }
  }, [currentAccount, fetchData]);

  React.useEffect(() => {
    if (starredToken && list.length) {
      const starredList = list.filter((item) =>
        starredToken.some(
          (starred) =>
            starred.address === item.id && starred.chain === item.chain
        )
      );
      setStarredList(starredList);
    }
  }, [starredToken, list]);

  return {
    isLoading,
    list,
    starredList,
    onToggleStar,
    checkStarred,
  };
};
