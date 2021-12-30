import {
  Collection,
  NFTItem,
  UserCollection,
} from '@/background/service/openapi';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';
import { groupBy, keyBy } from 'lodash';
import React, { useEffect, useState } from 'react';
import CollectionList from './CollectionList';
import Dropdown from './Dropdown';
import NFTList from './NFTList';

type Props = {
  address: string;
  startAnimate?: boolean;
  defiAnimate?: string;
};

const NFTListContainer = ({ address, startAnimate, defiAnimate }: Props) => {
  const [type, setType] = useState<'collection' | 'nft'>('collection');
  const [isLoading, setIsLoading] = useState(false);
  const [list, setList] = useState<NFTItem[]>([]);
  const [collectionList, setCollectionList] = useState<UserCollection[]>([]);
  const wallet = useWallet();
  const fetchData = async (id: string) => {
    try {
      setIsLoading(true);
      const [data, collections]: [NFTItem[], Collection[]] = await Promise.all([
        wallet.openapi.listNFT(id),
        wallet.openapi.listCollection(),
      ]);
      const dict = keyBy(collections, 'id');
      const list = data.map((item) => ({
        ...item,
        collection: item.collection_id ? dict[item?.collection_id] : null,
      }));
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
      setList(list);
      setCollectionList(collectionList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (startAnimate) {
      fetchData(address);
    }
  }, [address, startAnimate]);

  if (!startAnimate) {
    return <></>;
  }
  return (
    <div className={clsx('relative mt-12', defiAnimate)}>
      <div className="absolute top-[-36px] right-0">
        <Dropdown value={type} onChange={setType} />
      </div>
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
