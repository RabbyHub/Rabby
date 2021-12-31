import {
  Collection,
  NFTItem,
  UserCollection,
} from '@/background/service/openapi';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';
import { add, groupBy, keyBy } from 'lodash';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import CollectionList from './CollectionList';
import Dropdown from './Dropdown';
import NFTList from './NFTList';

type Props = {
  address?: string;
  startAnimate?: boolean;
  animate?: string;
  type?: 'nft' | 'collection';
};

const NFTListContainer = React.forwardRef(
  ({ startAnimate, animate, type = 'collection' }: Props, ref) => {
    const nftRef = useRef<any>();
    useImperativeHandle(ref, () => ({
      fetchData: (address: string) => {
        return nftRef && nftRef.current(address);
      },
    }));

    const [isLoading, setIsLoading] = useState(false);
    const [list, setList] = useState<NFTItem[]>([]);
    const [collectionList, setCollectionList] = useState<UserCollection[]>([]);
    const wallet = useWallet();
    const fetchData = async (id: string) => {
      try {
        setIsLoading(true);
        const [data, collections]: [
          NFTItem[],
          Collection[]
        ] = await Promise.all([
          wallet.openapi.listNFT(id),
          wallet.openapi.listCollection(),
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
        setList(list);
        setCollectionList(collectionList);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    nftRef.current = fetchData;
    // useEffect(() => {
    //   if (address && forceUpdate) {
    //     fetchData(address);
    //   }
    // }, [address, forceUpdate]);

    if (!startAnimate) {
      return <></>;
    }
    return (
      <div
        className={clsx('mt-12', animate, animate === 'fadeIn' && 'relative')}
      >
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
  }
);

export default NFTListContainer;
