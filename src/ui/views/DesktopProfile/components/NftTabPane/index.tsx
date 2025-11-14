import { Skeleton, Switch } from 'antd';
import clsx from 'clsx';
import { omit, range, set } from 'lodash';
import React from 'react';
import { NftDetailModal } from './components/NftDetailModal';
import { CancelListingModal } from './components/CancelListingModal';
import { CreateListingModal } from './components/CreateListingModal';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import {
  CollectionList,
  NFTCollection,
  NFTItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { findChain } from '@/utils/chain';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { NFTCardItem } from './components/NFTCardItem';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { RcIconNftEmpty } from '@/ui/assets/desktop/common';

export const NftTabPane = () => {
  const wallet = useWallet();
  const [isAll, setIsAll] = React.useState(false);
  const [selectedNft, setSelectedNft] = React.useState<{
    nft: NFTItem;
    collection: Omit<CollectionList, 'nft_list'>;
  } | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = React.useState(false);

  const currentAccount = useCurrentAccount();

  const { data: list, loading } = useRequest(
    async () => {
      if (!currentAccount?.address) {
        return [];
      }
      const collections = await wallet.openapi.collectionList({
        id: currentAccount?.address,
        isAll: isAll,
      });

      const result: {
        nft: NFTItem;
        collection: Omit<CollectionList, 'nft_list'>;
      }[] = [];

      for (const collection of collections) {
        collection.nft_list.forEach((nft) => {
          result.push({ nft, collection: omit(collection, 'nft_list') });
        });
      }

      return result;
    },
    {
      refreshDeps: [isAll, currentAccount?.address],
    }
  );

  return (
    <div className="py-[16px] px-[20px]">
      {loading ? (
        <div className="flex items-center justify-between mb-[16px]">
          <Skeleton.Input className="w-[100px] h-[30px] rounded-[4px]" active />
          <Skeleton.Input className="w-[198px] h-[30px] rounded-[4px]" active />
        </div>
      ) : (
        <header className="flex items-center justify-between mb-[16px]">
          <div className={clsx('rounded-[10px] p-[2px] bg-rb-neutral-bg-0')}>
            <div
              className={clsx(
                'py-[6px] px-[12px] rounded-[8px] bg-rb-neutral-foot',
                'text-rb-neutral-InvertHighlight text-[12px] leading-[14px] font-medium'
              )}
            >
              All ({list?.length || 0})
            </div>
          </div>
          <label className="flex items-center gap-[6px] cursor-pointer">
            <Switch
              checked={!isAll}
              onChange={(v) => {
                setIsAll(!v);
              }}
            />
            <div className="text-rb-neutral-title-1 text-[14px] leading-[17px]">
              Hide Low-Value NFTs
            </div>
          </label>
        </header>
      )}
      {loading}
      <main>
        <div className="flex items-center flex-wrap gap-[12px]">
          {loading ? (
            <>
              {range(10).map((i) => (
                <div key={i} className={clsx('w-[204px]')}>
                  <Skeleton.Input
                    className="w-[198px] h-[198px] rounded-[4px]"
                    active
                  />
                  <Skeleton.Input
                    className="w-[198px] h-[24px] rounded-[4px]"
                    active
                  />
                </div>
              ))}
            </>
          ) : list?.length ? (
            <>
              {list?.map((item) => {
                return (
                  <NFTCardItem
                    key={`${item.nft.id}-${item.nft.chain}-${item.collection.id}`}
                    item={item}
                    onClick={() => {
                      setIsDetailModalVisible(true);
                      setSelectedNft(item);
                    }}
                  />
                );
              })}
            </>
          ) : (
            <div className="w-full py-[160px] flex flex-col items-center justify-center gap-[8px]">
              <ThemeIcon src={RcIconNftEmpty}></ThemeIcon>
              <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
                No NFTs
              </div>
            </div>
          )}
        </div>
      </main>
      <NftDetailModal
        visible={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedNft(null);
        }}
        nft={selectedNft?.nft}
        collection={selectedNft?.collection}
      />
      <CancelListingModal visible={false} />
      <CreateListingModal visible={false} />
    </div>
  );
};
