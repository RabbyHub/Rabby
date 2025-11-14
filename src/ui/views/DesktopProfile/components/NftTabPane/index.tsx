import { Switch } from 'antd';
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

export const NftTabPane = () => {
  const wallet = useWallet();
  const [isAll, setIsAll] = React.useState(false);
  const [selectedNft, setSelectedNft] = React.useState<{
    nft: NFTItem;
    collection: Omit<CollectionList, 'nft_list'>;
  } | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = React.useState(false);

  const currentAccount = useCurrentAccount();

  const { data: list } = useRequest(
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
      <main>
        <div className="flex items-center flex-wrap gap-[12px]">
          {list?.map((item) => {
            const chain = findChain({ serverId: item.nft.chain });
            return (
              <div
                key={`${item.nft.token_id}-${item.collection.id}`}
                onClick={() => {
                  setIsDetailModalVisible(true);
                  setSelectedNft(item);
                }}
                className={clsx(
                  'rounded-[8px] border-[1px] border-solid border-rb-neutral-line p-[2px]',
                  'hover:border-rabby-blue-default cursor-pointer',
                  'w-[204px]'
                )}
              >
                <div className="relative">
                  <NFTAvatar
                    className="w-[198px] h-[198px] rounded-[4px]"
                    type={item.nft.content_type}
                    amount={item.nft.amount}
                    content={item.nft.content}
                  />
                  <img
                    src={chain?.logo}
                    alt="chain"
                    className={clsx(
                      'absolute top-[8px] left-[8px]',
                      'w-[24px] h-[24px] rounded-full',
                      'border-[1px] border-solid border-white'
                    )}
                  />
                  {item.nft.amount > 1 ? (
                    <div
                      className={clsx(
                        'absolute top-[8px] right-[8px]',
                        'rounded-[4px] py-[3px] px-[10px]',
                        'text-r-neutral-title2 font-medium text-[15px] leading-[18px]',
                        'bg-[rgba(0,0,0,0.5)]'
                      )}
                    >
                      x{item.nft.amount}
                    </div>
                  ) : null}
                </div>
                <div
                  className={clsx(
                    'pt-[8px] px-[4px] pb-[12px]',
                    'text-[15px] leading-[18px] font-medium text-rb-neutral-title-1 truncate'
                  )}
                >
                  {item.nft.name}
                </div>
              </div>
            );
          })}
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
