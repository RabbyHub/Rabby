import { useWallet } from '@/ui/utils';
import React from 'react';
import { keyBy, uniq, groupBy } from 'lodash';
import { getChain } from '@/utils';
import { UserCollection } from '@rabby-wallet/rabby-api/dist/types';
import { useRabbySelector } from '@/ui/store';

export const useCollection = () => {
  const wallet = useWallet();
  const [ids, setIds] = React.useState<string[]>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [list, setList] = React.useState<UserCollection[]>([]);
  const [starredList, setStarredList] = React.useState<UserCollection[]>([]);
  const { currentAccount } = useRabbySelector((s) => s.account);

  const fetchData = React.useCallback(async (id: string) => {
    try {
      setIsLoading(true);

      const data = await wallet.openapi.listNFT(id, false);
      const ids = uniq(data.map((item) => item.collection_id)).filter(
        (item): item is string => !!item
      );
      const collections = await wallet.openapi.listCollection({
        collection_ids: ids.join(','),
      });

      const dict = keyBy(collections, 'id');
      const list = data
        .filter((item) => getChain(item.chain))
        .map((item) => ({
          ...item,
          collection: item.collection_id ? dict[item?.collection_id] : null,
        }))
        .sort((a, b) => {
          if (!a.name) {
            return 1;
          }
          if (!b.name) {
            return -1;
          }
          return a.name > b.name ? 1 : -1;
        });
      const collectionList = Object.values(
        groupBy(list, 'collection_id')
      ).reduce((r, item) => {
        const col = (item as any)[0]?.collection;
        if (col) {
          r.push({
            collection: col,
            list: item,
          });
        }
        return r;
      }, [] as UserCollection[]);

      setList(collectionList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onToggleStar = React.useCallback(
    async (id: string) => {
      if (starredList.find((item) => item.collection.id === id)) {
        await wallet.removeCollectionStarred(id);
      } else {
        await wallet.addCollectionStarred(id);
      }

      await wallet.getCollectionStarred().then(setIds);
    },
    [starredList, fetchData]
  );

  React.useEffect(() => {
    wallet.getCollectionStarred().then(setIds);
  }, []);

  React.useEffect(() => {
    if (currentAccount) {
      fetchData(currentAccount.address);
    }
  }, [currentAccount, fetchData]);

  React.useEffect(() => {
    if (ids && list.length) {
      const starredList = list.filter((item) =>
        ids.includes(item.collection.id)
      );
      setStarredList(starredList);
    }
  }, [ids, list]);

  return {
    isLoading,
    list,
    starredList,
    onToggleStar,
  };
};
