import {
  Collection,
  NFTItem,
  UserCollection,
} from '@/background/service/openapi';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';
import { groupBy, keyBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
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
  const wallet = useWallet();

  const fetchCollection = useMemo(() => wallet.openapi.listCollection(), []);

  const fetchData = async (id: string, isAll = false) => {
    try {
      setIsLoading(true);
      const [data, collections]: [NFTItem[], Collection[]] = await Promise.all([
        wallet.openapi.listNFT(id, isAll),
        fetchCollection,
      ]);
      const dict = keyBy(collections, 'id');
      const list = data
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
      } else {
        setCollectionList(collectionList);
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
  }, [address]);
  useEffect(() => {
    if (address && animate?.indexOf('fadeIn') !== -1) {
      if (type === 'nft' && list.length <= 0) {
        fetchData(address, true);
      }
      if (type === 'collection' && collectionList.length <= 0) {
        fetchData(address, false);
      }
    }
  }, [address, type, list, collectionList, animate]);

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
