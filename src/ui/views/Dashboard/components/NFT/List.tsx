import {
  Collection,
  NFTItem,
  UserCollection,
} from '@/background/service/openapi';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';
import _ from 'lodash';
import { groupBy, keyBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { getChain } from '@/utils';
import CollectionList from './CollectionList';
import NFTList from './NFTList';

type Props = {
  address?: string;
  startAnimate?: boolean;
  animate?: string;
  type?: 'nft' | 'collection';
};

const NFTListContainer = ({
  startAnimate,
  animate,
  type = 'collection',
  address,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [list, setList] = useState<NFTItem[]>([]);
  const [collectionList, setCollectionList] = useState<UserCollection[]>([]);
  const [isDirtyList, setIsDirtyList] = useState(true);
  const [isDirtyCollection, setIsDirtyCollection] = useState(true);
  const wallet = useWallet();

  const fetchData = async (id: string, isAll = false) => {
    try {
      setIsLoading(true);

      const data = await wallet.openapi.listNFT(id, isAll);
      const ids = _.uniq(data.map((item) => item.collection_id)).filter(
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
      if (isAll) {
        setList(list);
        setIsDirtyList(false);
      } else {
        setCollectionList(collectionList);
        setIsDirtyCollection(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setList([]);
    setCollectionList([]);
    setIsDirtyList(true);
    setIsDirtyCollection(true);
  }, [address]);

  useEffect(() => {
    if (address && animate?.indexOf('fadeIn') !== -1) {
      if (type === 'nft' && isDirtyList) {
        fetchData(address, true);
      }
      if (type === 'collection' && isDirtyCollection) {
        fetchData(address, false);
      }
    }
  }, [address, type, animate, isDirtyList, isDirtyCollection]);

  if (!startAnimate) {
    return <></>;
  }
  return (
    <div className={clsx('mt-12', animate)}>
      {type === 'collection' ? (
        <CollectionList
          data={collectionList}
          isLoading={isLoading}
        ></CollectionList>
      ) : (
        <NFTList data={list} isLoading={isLoading}></NFTList>
      )}
    </div>
  );
};

export default NFTListContainer;
